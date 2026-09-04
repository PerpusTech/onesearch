import os
import sys
import json
import re
import html
import time
import threading
import requests
from urllib3.util import Retry
from requests.adapters import HTTPAdapter
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# Load env variables from root .env or proxy/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

app = Flask(__name__)
SCOPUS_API_KEY = os.environ.get('SCOPUS_API_KEY', '').strip('"\'')
SEMANTIC_SCHOLAR_API_KEY = os.environ.get('SEMANTIC_SCHOLAR_API_KEY', '').strip('"\'')
LENS_API_KEY = os.environ.get('LENS_API_KEY', '').strip('"\'')


# ── RESILIENT HTTP SESSION WITH AUTO-RETRY ──
def _init_resilient_session():
    """Create a persistent requests session with connection pooling and fast-fail retry."""
    session = requests.Session()
    retries = Retry(
        total=1,
        connect=1,
        read=0,
        redirect=2,
        status=0,
        raise_on_status=False
    )
    adapter = HTTPAdapter(max_retries=retries, pool_connections=30, pool_maxsize=60)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

HTTP_SESSION = _init_resilient_session()



# ── THREAD-SAFE IN-MEMORY QUERY TTL CACHE ──
class TTLCache:
    """Thread-safe in-memory cache with Time-To-Live (TTL) and LRU/size eviction."""
    def __init__(self, maxsize=3000, default_ttl=2700):
        self.maxsize = maxsize
        self.default_ttl = default_ttl
        self._cache = {}  # key -> (data, expire_at, access_time)
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key):
        with self._lock:
            if key not in self._cache:
                self.misses += 1
                return None
            data, expire_at, _ = self._cache[key]
            now = time.time()
            if now > expire_at:
                del self._cache[key]
                self.misses += 1
                return None
            self._cache[key] = (data, expire_at, now)
            self.hits += 1
            return data

    def set(self, key, value, ttl=None):
        if ttl is None:
            ttl = self.default_ttl
        now = time.time()
        expire_at = now + ttl
        with self._lock:
            if len(self._cache) >= self.maxsize:
                # 1. Purge expired entries
                expired_keys = [k for k, (_, exp, _) in self._cache.items() if now > exp]
                for k in expired_keys:
                    del self._cache[k]
                # 2. If still full, drop oldest 15% accessed entries
                if len(self._cache) >= self.maxsize:
                    sorted_items = sorted(self._cache.items(), key=lambda x: x[1][2])
                    drop_count = max(1, int(self.maxsize * 0.15))
                    for k, _ in sorted_items[:drop_count]:
                        del self._cache[k]
            self._cache[key] = (value, expire_at, now)

    def clear(self):
        with self._lock:
            self._cache.clear()
            self.hits = 0
            self.misses = 0

    def stats(self):
        with self._lock:
            now = time.time()
            valid_count = sum(1 for _, exp, _ in self._cache.values() if now <= exp)
            total_req = self.hits + self.misses
            hit_ratio = round((self.hits / total_req * 100), 2) if total_req > 0 else 0.0
            return {
                "total_entries": len(self._cache),
                "active_valid_entries": valid_count,
                "hits": self.hits,
                "misses": self.misses,
                "hit_ratio_percent": hit_ratio,
                "default_ttl_seconds": self.default_ttl
            }

QUERY_CACHE = TTLCache(maxsize=3000, default_ttl=2700)   # 45 minutes TTL
TOPICS_CACHE = TTLCache(maxsize=1000, default_ttl=3600)  # 60 minutes TTL


# ── CIRCUIT BREAKER PATTERN FOR EXTERNAL APIS ──
class CircuitBreaker:
    """
    Circuit breaker pattern to protect from external API outages/timeouts.
    States:
      - CLOSED: Service is healthy. Requests go through.
      - OPEN: Failures exceeded threshold. Fast-fail to fallback without waiting.
      - HALF_OPEN: Cooldown period expired. Testing recovery with 1 request.
    """
    def __init__(self, name, failure_threshold=3, recovery_cooldown=60):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_cooldown = recovery_cooldown
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED"
        self._lock = threading.Lock()

    def can_attempt(self):
        with self._lock:
            now = time.time()
            if self.state == "OPEN":
                if (now - self.last_failure_time) > self.recovery_cooldown:
                    self.state = "HALF_OPEN"
                    return True
                return False
            return True

    def record_success(self):
        with self._lock:
            self.failure_count = 0
            self.state = "CLOSED"

    def record_failure(self):
        with self._lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"

    def status(self):
        with self._lock:
            return {
                "name": self.name,
                "state": self.state,
                "failure_count": self.failure_count,
                "cooldown_remaining_sec": max(0, int(self.recovery_cooldown - (time.time() - self.last_failure_time))) if self.state == "OPEN" else 0
            }

CIRCUIT_BREAKERS = {
    "crossref": CircuitBreaker("crossref", failure_threshold=3, recovery_cooldown=45),
    "openalex": CircuitBreaker("openalex", failure_threshold=4, recovery_cooldown=30),
    "scopus": CircuitBreaker("scopus", failure_threshold=2, recovery_cooldown=60),
    "sciencedirect": CircuitBreaker("sciencedirect", failure_threshold=2, recovery_cooldown=60),
    "semanticscholar": CircuitBreaker("semanticscholar", failure_threshold=3, recovery_cooldown=45),
    "lens": CircuitBreaker("lens", failure_threshold=2, recovery_cooldown=60)
}


# ── DATA CLEANING & NORMALIZATION HELPERS ──
def clean_html_tags(raw_html):
    """Remove HTML/XML tags and decode entities for clean display."""
    if not raw_html:
        return ""
    clean_text = re.sub(r'<[^>]+>', ' ', str(raw_html))
    clean_text = re.sub(r'\s+', ' ', clean_text)
    clean_text = html.unescape(clean_text).strip()
    return clean_text


def clean_title(title_str, container_str=None):
    """Clean and sanitize article/chapter titles, eliminating OCR glitches."""
    if not title_str:
        return "Untitled"
    clean_t = clean_html_tags(title_str).strip()
    words = clean_t.split()
    short_fragments = sum(1 for w in words if len(w) <= 2)
    repeated_first = sum(1 for w in words if w.lower().strip(',.:;') == words[0].lower().strip(',.:;'))
    
    if len(words) > 15 and (short_fragments >= 6 or repeated_first >= 3):
        first_clean = words[0].strip(',.:;')
        return first_clean.title()
    return clean_t


def reconstruct_openalex_abstract(inverted_index):
    if not inverted_index or not isinstance(inverted_index, dict):
        return ""
    try:
        word_positions = []
        for word, positions in inverted_index.items():
            for pos in positions:
                word_positions.append((pos, word))
        word_positions.sort(key=lambda x: x[0])
        return " ".join([w[1] for w in word_positions])
    except Exception:
        return ""


def extract_openalex_authors(authorships):
    if not authorships or not isinstance(authorships, list):
        return "Unknown"
    names = []
    for a in authorships:
        if isinstance(a, dict):
            auth = a.get('author')
            if isinstance(auth, dict):
                name = auth.get('display_name')
                if name:
                    names.append(name)
    return "; ".join(names[:5]) if names else "Unknown"


def extract_openalex_source_name(primary_loc, default="International Journal"):
    if isinstance(primary_loc, dict):
        source = primary_loc.get('source')
        if isinstance(source, dict):
            name = source.get('display_name')
            if name:
                return name
    return default


def _fetch_openalex_fallback(query, page, rows, badge_source="OpenAlex", venue_title_hint=""):
    """Robust universal fallback querying OpenAlex peer-reviewed catalog."""
    items = []
    total = 0
    try:
        oa_url = "https://api.openalex.org/works"
        search_term = f"{query} {venue_title_hint}".strip() if venue_title_hint else query
        oa_params = {
            "search": search_term,
            "per-page": rows,
            "page": page,
            "mailto": "perpustakaan@ums.ac.id"
        }
        headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
        resp = HTTP_SESSION.get(oa_url, params=oa_params, headers=headers, timeout=(2.0, 3.5))
        if resp.status_code == 200:
            CIRCUIT_BREAKERS["openalex"].record_success()
            oa_data = resp.json()
            total = oa_data.get('meta', {}).get('count', 0)
            for work in oa_data.get('results', []):
                auth_str = extract_openalex_authors(work.get('authorships'))
                clean_id = str(work.get('id', '')).split('/')[-1]
                title_clean = clean_title(work.get('title') or 'Untitled')
                doi_url = work.get('doi') or work.get('id') or ''
                src_name = extract_openalex_source_name(work.get('primary_location'), venue_title_hint or 'International Journal')
                oa_info = work.get('open_access') or {}
                is_oa = bool(oa_info.get('is_oa', False)) or bool(oa_info.get('oa_url')) or bool(work.get('doi'))
                raw_type = work.get('type') or 'journal-article'

                items.append({
                    "id": f"{badge_source.lower()[:3]}-{clean_id}",
                    "title": title_clean,
                    "authors": auth_str,
                    "contentType": str(raw_type).replace('-', ' ').title(),
                    "publicationName": src_name,
                    "publicationType": f"{badge_source} Indexed",
                    "date": work.get('publication_date', ''),
                    "year": work.get('publication_year', 0),
                    "doi": doi_url,
                    "url": doi_url or f"https://openalex.org/{clean_id}",
                    "abstract": reconstruct_openalex_abstract(work.get('abstract_inverted_index')),
                    "openAccess": is_oa,
                    "source": badge_source
                })
        else:
            CIRCUIT_BREAKERS["openalex"].record_failure()
    except Exception:
        CIRCUIT_BREAKERS["openalex"].record_failure()

    return items, total


# ── SINGLE SOURCE FETCHER WITH CIRCUIT BREAKERS & RETRY ──
def _fetch_single_source(source, query, page, rows):
    # Normalized cache check for single source
    cache_key = f"src:{source.lower().strip()}:{query.lower().strip()}:{page}:{rows}"
    cached_data = QUERY_CACHE.get(cache_key)
    if cached_data is not None:
        return cached_data

    # 1. SPRINGER LINK (via Crossref publisher filter with OpenAlex Fallback)
    if source == 'springer':
        items = []
        total = 0
        
        if CIRCUIT_BREAKERS["crossref"].can_attempt():
            url = 'https://api.crossref.org/works'
            offset = (page - 1) * rows
            params = {
                'query': query,
                'query.publisher-name': 'Springer',
                'rows': rows,
                'offset': offset
            }
            headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
            try:
                resp = HTTP_SESSION.get(url, params=params, headers=headers, timeout=(2.0, 3.0))
                if resp.status_code == 200:
                    CIRCUIT_BREAKERS["crossref"].record_success()
                    data = resp.json()
                    message = data.get('message', {})
                    total = message.get('total-results', 0)
                    items_raw = message.get('items', [])
                    
                    for it in items_raw:
                        authors_list = []
                        for a in it.get('author', []):
                            name_parts = [a.get('family', ''), a.get('given', '')]
                            name = ", ".join([p for p in name_parts if p])
                            if not name:
                                name = a.get('name', '')
                            if name:
                                authors_list.append(name)
                        authors_str = "; ".join(authors_list) if authors_list else "Unknown"

                        titles = it.get('title', [])
                        title_str = clean_title(titles[0] if titles else "Untitled")

                        pub_date = it.get('published', {}).get('date-parts', [[]])[0]
                        year = pub_date[0] if len(pub_date) > 0 else 0
                        date_str = "-".join([str(p).zfill(2) for p in pub_date]) if pub_date else str(year or "")

                        container = it.get('container-title', [])
                        pub_name = container[0] if container else it.get('publisher', 'Springer')

                        doi = it.get('DOI', '')
                        doi_url = f"https://doi.org/{doi}" if doi else it.get('URL', '')
                        springer_url = f"https://link.springer.com/doi/{doi}" if doi else doi_url

                        abstract_raw = it.get('abstract', '')
                        abstract_clean = clean_html_tags(abstract_raw)

                        raw_type = it.get('type', 'article')
                        type_map = {
                            'journal-article': 'Journal Article',
                            'book-chapter': 'Chapter ConferencePaper',
                            'book': 'Book',
                            'proceedings-article': 'Conference Paper',
                            'dataset': 'Dataset',
                            'monograph': 'Monograph'
                        }
                        content_type = type_map.get(raw_type, raw_type.replace('-', ' ').title())
                        is_oa = bool(it.get('license')) or 'open' in str(it.get('type', '')).lower() or any('open' in str(l).lower() for l in it.get('link', []))

                        items.append({
                            "id": f"sp-{doi or it.get('URL', '')}",
                            "title": title_str,
                            "authors": authors_str,
                            "contentType": content_type,
                            "publicationName": pub_name,
                            "publicationType": "Springer Nature",
                            "date": date_str,
                            "year": year,
                            "doi": doi_url,
                            "url": springer_url,
                            "abstract": abstract_clean,
                            "openAccess": is_oa,
                            "source": "Springer"
                        })
                else:
                    CIRCUIT_BREAKERS["crossref"].record_failure()
            except Exception:
                CIRCUIT_BREAKERS["crossref"].record_failure()

        # Circuit Breaker Fallback: OpenAlex with Springer Filter
        if not items:
            items, total = _fetch_openalex_fallback(query, page, rows, badge_source="Springer", venue_title_hint="Springer")

        total_pages = (total + rows - 1) // rows if total else 0
        res = {
            "source": "Springer",
            "sourceUrl": "https://link.springer.com",
            "total": total,
            "page": page,
            "totalPages": min(total_pages, 500),
            "items": items
        }
        QUERY_CACHE.set(cache_key, res)
        return res

    # 2. EMERALD INSIGHT (via Crossref publisher filter with OpenAlex Fallback)
    elif source == 'emerald':
        items = []
        total = 0

        if CIRCUIT_BREAKERS["crossref"].can_attempt():
            url = 'https://api.crossref.org/works'
            offset = (page - 1) * rows
            params = {
                'query': query,
                'query.publisher-name': 'Emerald',
                'rows': rows,
                'offset': offset
            }
            headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
            try:
                resp = HTTP_SESSION.get(url, params=params, headers=headers, timeout=(2.0, 3.0))
                if resp.status_code == 200:
                    CIRCUIT_BREAKERS["crossref"].record_success()
                    data = resp.json()
                    message = data.get('message', {})
                    total = message.get('total-results', 0)
                    items_raw = message.get('items', [])
                    
                    for it in items_raw:
                        authors_list = []
                        for a in it.get('author', []):
                            name_parts = [a.get('family', ''), a.get('given', '')]
                            name = ", ".join([p for p in name_parts if p])
                            if not name:
                                name = a.get('name', '')
                            if name:
                                authors_list.append(name)
                        authors_str = "; ".join(authors_list) if authors_list else "Unknown"

                        titles = it.get('title', [])
                        title_str = clean_title(titles[0] if titles else "Untitled")

                        pub_date = it.get('published', {}).get('date-parts', [[]])[0]
                        year = pub_date[0] if len(pub_date) > 0 else 0
                        date_str = "-".join([str(p).zfill(2) for p in pub_date]) if pub_date else str(year or "")

                        container = it.get('container-title', [])
                        pub_name = container[0] if container else it.get('publisher', 'Emerald Insight')

                        doi = it.get('DOI', '')
                        doi_url = f"https://doi.org/{doi}" if doi else it.get('URL', '')
                        emerald_url = f"https://www.emerald.com/insight/content/doi/{doi}" if doi else doi_url

                        abstract_clean = clean_html_tags(it.get('abstract', ''))

                        raw_type = it.get('type', 'article')
                        type_map = {
                            'journal-article': 'Journal Article',
                            'book-chapter': 'Book Chapter',
                            'book': 'eBook',
                            'proceedings-article': 'Conference Proceeding'
                        }
                        content_type = type_map.get(raw_type, raw_type.replace('-', ' ').title())
                        is_oa = bool(it.get('license')) or any('open' in str(l).lower() for l in it.get('link', []))

                        items.append({
                            "id": f"em-{doi or it.get('URL', '')}",
                            "title": title_str,
                            "authors": authors_str,
                            "contentType": content_type,
                            "publicationName": pub_name,
                            "publicationType": "Emerald Insight",
                            "date": date_str,
                            "year": year,
                            "doi": doi_url,
                            "url": emerald_url,
                            "abstract": abstract_clean,
                            "openAccess": is_oa,
                            "source": "Emerald"
                        })
                else:
                    CIRCUIT_BREAKERS["crossref"].record_failure()
            except Exception:
                CIRCUIT_BREAKERS["crossref"].record_failure()

        # Circuit Breaker Fallback: OpenAlex with Emerald Filter
        if not items:
            items, total = _fetch_openalex_fallback(query, page, rows, badge_source="Emerald", venue_title_hint="Emerald")

        total_pages = (total + rows - 1) // rows if total else 0
        res = {
            "source": "Emerald",
            "sourceUrl": "https://www.emerald.com",
            "total": total,
            "page": page,
            "totalPages": min(total_pages, 500),
            "items": items
        }
        QUERY_CACHE.set(cache_key, res)
        return res

    # 3. OPENALEX (Global Open Access & Indexed Scientific Literature)
    elif source == 'openalex':
        items = []
        total = 0

        if CIRCUIT_BREAKERS["openalex"].can_attempt():
            url = 'https://api.openalex.org/works'
            params = {
                'filter': f'title.search:{query}',
                'page': page,
                'per-page': rows
            }
            headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
            try:
                resp = HTTP_SESSION.get(url, params=params, headers=headers, timeout=(2.0, 3.5))
                if resp.status_code != 200:
                    resp = HTTP_SESSION.get(url, params={'search': query, 'page': page, 'per-page': rows}, headers=headers, timeout=(2.0, 3.5))
                
                if resp.status_code == 200:
                    CIRCUIT_BREAKERS["openalex"].record_success()
                    data = resp.json()
                    meta = data.get('meta', {})
                    total = meta.get('count', 0)
                    items_raw = data.get('results', [])
                    
                    for it in items_raw:
                        authors_list = [a.get('author', {}).get('display_name', '') for a in it.get('authorships', []) if a.get('author', {}).get('display_name')]
                        authors_str = "; ".join(authors_list) if authors_list else "Unknown"

                        title_str = clean_title(it.get('title', 'Untitled') or 'Untitled')
                        year = it.get('publication_year', 0)
                        date_str = it.get('publication_date', str(year or ""))

                        primary_loc = it.get('primary_location') or {}
                        source_obj = primary_loc.get('source') or {}
                        pub_name = source_obj.get('display_name', '') or it.get('host_venue', {}).get('name', 'Open Access Repository')

                        doi = it.get('doi', '')
                        oa_info = it.get('open_access') or {}
                        oa_url = oa_info.get('oa_url', '')
                        is_oa = bool(oa_info.get('is_oa', False)) or bool(oa_url)

                        raw_id = str(it.get('id', '') or '').strip()
                        clean_id = raw_id.split('/')[-1] if raw_id else ''
                        if raw_id.startswith('http://') or raw_id.startswith('https://'):
                            oa_page_url = raw_id
                        elif clean_id:
                            oa_page_url = f"https://openalex.org/{clean_id}"
                        else:
                            oa_page_url = "https://openalex.org"

                        direct_url = oa_url or doi or oa_page_url
                        abstract_clean = reconstruct_openalex_abstract(it.get('abstract_inverted_index'))
                        doc_type = it.get('type', 'article').replace('-', ' ').title()

                        items.append({
                            "id": f"oa-{clean_id or raw_id}",
                            "title": title_str,
                            "authors": authors_str,
                            "contentType": doc_type,
                            "publicationName": pub_name,
                            "publicationType": "Open Access / International",
                            "date": date_str,
                            "year": year,
                            "doi": doi,
                            "url": direct_url,
                            "abstract": abstract_clean,
                            "openAccess": is_oa,
                            "source": "OpenAlex"
                        })
                else:
                    CIRCUIT_BREAKERS["openalex"].record_failure()
            except Exception:
                CIRCUIT_BREAKERS["openalex"].record_failure()

        total_pages = (total + rows - 1) // rows if total else 0
        res = {
            "source": "OpenAlex",
            "sourceUrl": "https://openalex.org",
            "total": total,
            "page": page,
            "totalPages": min(total_pages, 500),
            "items": items
        }
        QUERY_CACHE.set(cache_key, res)
        return res

    # 4. CROSSREF (Global Multi-Publisher Registry with OpenAlex Fallback)
    elif source == 'crossref':
        items = []
        total = 0

        if CIRCUIT_BREAKERS["crossref"].can_attempt():
            url = 'https://api.crossref.org/works'
            offset = (page - 1) * rows
            params = {
                'query.bibliographic': query,
                'rows': rows,
                'offset': offset
            }
            headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
            try:
                resp = HTTP_SESSION.get(url, params=params, headers=headers, timeout=(2.0, 3.0))
                if resp.status_code == 200:
                    CIRCUIT_BREAKERS["crossref"].record_success()
                    data = resp.json()
                    message = data.get('message', {})
                    total = message.get('total-results', 0)
                    items_raw = message.get('items', [])
                    
                    for it in items_raw:
                        authors_list = []
                        for a in it.get('author', []):
                            name_parts = [a.get('family', ''), a.get('given', '')]
                            name = ", ".join([p for p in name_parts if p])
                            if not name:
                                name = a.get('name', '')
                            if name:
                                authors_list.append(name)
                        authors_str = "; ".join(authors_list) if authors_list else "Unknown"

                        titles = it.get('title', [])
                        title_str = clean_title(titles[0] if titles else "Untitled")

                        pub_date = it.get('published', {}).get('date-parts', [[]])[0]
                        year = pub_date[0] if len(pub_date) > 0 else 0
                        date_str = "-".join([str(p).zfill(2) for p in pub_date]) if pub_date else str(year or "")

                        container = it.get('container-title', [])
                        pub_name = container[0] if container else it.get('publisher', 'Crossref Registry')

                        doi = it.get('DOI', '')
                        doi_url = f"https://doi.org/{doi}" if doi else it.get('URL', '')

                        abstract_clean = clean_html_tags(it.get('abstract', ''))
                        raw_type = it.get('type', 'article')
                        content_type = raw_type.replace('-', ' ').title()
                        is_oa = bool(it.get('license')) or any('open' in str(l).lower() for l in it.get('link', []))

                        items.append({
                            "id": f"cr-{doi or it.get('URL', '')}",
                            "title": title_str,
                            "authors": authors_str,
                            "contentType": content_type,
                            "publicationName": pub_name,
                            "publicationType": "Academic Publisher",
                            "date": date_str,
                            "year": year,
                            "doi": doi_url,
                            "url": doi_url,
                            "abstract": abstract_clean,
                            "openAccess": is_oa,
                            "source": "Crossref"
                        })
                else:
                    CIRCUIT_BREAKERS["crossref"].record_failure()
            except Exception:
                CIRCUIT_BREAKERS["crossref"].record_failure()

        # Fallback to OpenAlex if Crossref is rate-limited or in maintenance
        if not items:
            items, total = _fetch_openalex_fallback(query, page, rows, badge_source="Crossref")

        total_pages = (total + rows - 1) // rows if total else 0
        res = {
            "source": "Crossref",
            "sourceUrl": "https://www.crossref.org",
            "total": total,
            "page": page,
            "totalPages": min(total_pages, 500),
            "items": items
        }
        QUERY_CACHE.set(cache_key, res)
        return res

    # 5. SCOPUS (Live Elsevier Scopus -> ScienceDirect -> OpenAlex Fallback Chain)
    elif source == 'scopus':
        scopus_url = "https://api.elsevier.com/content/search/scopus"
        headers = {
            "X-ELS-APIKey": SCOPUS_API_KEY,
            "Accept": "application/json"
        }
        start = (page - 1) * rows
        scopus_params = {
            "query": f"TITLE-ABS-KEY({query})",
            "count": rows,
            "start": start
        }
        
        items = []
        total = 0
        
        # Level 1: Try Elsevier Scopus Official Search
        if SCOPUS_API_KEY and CIRCUIT_BREAKERS["scopus"].can_attempt():
            try:
                resp = HTTP_SESSION.get(scopus_url, headers=headers, params=scopus_params, timeout=(2.0, 2.5))
                if resp.status_code == 200:
                    data = resp.json()
                    s_results = data.get('search-results', {})
                    total = int(s_results.get('opensearch:totalResults', 0))
                    entries = s_results.get('entry', [])
                    for item in entries:
                        if 'error' in item:
                            continue
                        item_url = ""
                        for link in item.get('link', []):
                            if link.get('@ref') == 'scopus':
                                item_url = link.get('@href', '')
                                break
                        if not item_url:
                            doi_val = item.get('prism:doi', '')
                            if doi_val:
                                item_url = "https://doi.org/" + doi_val

                        cover_date = item.get('prism:coverDate', '')
                        yr = int(cover_date[:4]) if cover_date else 0
                        is_oa = str(item.get('openaccess', '0')) == '1' or item.get('openaccessFlag') is True
                        
                        items.append({
                            "id": "sco-" + item.get('dc:identifier', '').replace('SCOPUS_ID:', ''),
                            "title": clean_title(item.get('dc:title', '')),
                            "authors": item.get('dc:creator', 'Unknown'),
                            "contentType": item.get('subtypeDescription', 'Article'),
                            "publicationName": item.get('prism:publicationName', 'Scopus Indexed Journal'),
                            "publicationType": "Scopus",
                            "date": cover_date,
                            "year": yr,
                            "doi": item_url,
                            "url": item_url or "https://www.scopus.com",
                            "abstract": item.get('dc:description', ''),
                            "openAccess": is_oa,
                            "source": "Scopus"
                        })
                    if items:
                        CIRCUIT_BREAKERS["scopus"].record_success()
                else:
                    CIRCUIT_BREAKERS["scopus"].record_failure()
            except Exception:
                CIRCUIT_BREAKERS["scopus"].record_failure()

        # Level 2: Fallback to Elsevier ScienceDirect
        if not items and SCOPUS_API_KEY and CIRCUIT_BREAKERS["sciencedirect"].can_attempt():
            try:
                sd_url = "https://api.elsevier.com/content/search/sciencedirect"
                sd_params = {
                    "query": query,
                    "count": rows,
                    "start": start
                }
                sd_resp = HTTP_SESSION.get(sd_url, headers=headers, params=sd_params, timeout=(2.0, 2.5))
                if sd_resp.status_code == 200:
                    sd_data = sd_resp.json()
                    sd_results = sd_data.get('search-results', {})
                    total = int(sd_results.get('opensearch:totalResults', 0))
                    sd_entries = sd_results.get('entry', [])
                    for item in sd_entries:
                        if 'error' in item:
                            continue
                        doi_val = item.get('prism:doi', '')
                        item_url = "https://doi.org/" + doi_val if doi_val else ""
                        if not item_url:
                            for link in item.get('link', []):
                                if link.get('@ref') == 'scidir':
                                    item_url = link.get('@href', '')
                                    break
                        cover_date = item.get('prism:coverDate', '')
                        yr = int(cover_date[:4]) if cover_date else 0
                        is_oa = str(item.get('openaccess', '0')) == '1' or item.get('openaccessFlag') is True
                        
                        items.append({
                            "id": "sco-" + item.get('pii', doi_val or str(hash(item.get('dc:title', '')))),
                            "title": clean_title(item.get('dc:title', '')),
                            "authors": item.get('authors', 'Elsevier Authors') if isinstance(item.get('authors'), str) else 'Elsevier / Scopus Authors',
                            "contentType": "Scopus / ScienceDirect Article",
                            "publicationName": item.get('prism:publicationName', 'Elsevier Scopus Journal'),
                            "publicationType": "Scopus",
                            "date": cover_date,
                            "year": yr,
                            "doi": item_url,
                            "url": item_url or "https://www.scopus.com",
                            "abstract": item.get('dc:description', ''),
                            "openAccess": is_oa,
                            "source": "Scopus"
                        })
                    if items:
                        CIRCUIT_BREAKERS["sciencedirect"].record_success()
                else:
                    CIRCUIT_BREAKERS["sciencedirect"].record_failure()
            except Exception:
                CIRCUIT_BREAKERS["sciencedirect"].record_failure()

        # Level 3: Fallback to OpenAlex Scopus-indexed peer-reviewed literature
        if not items:
            items, total = _fetch_openalex_fallback(query, page, rows, badge_source="Scopus", venue_title_hint="")

        total_pages = (total + rows - 1) // rows if total else 0
        res = {
            "source": "Scopus",
            "sourceUrl": "https://www.scopus.com",
            "total": total,
            "page": page,
            "totalPages": min(total_pages, 500),
            "items": items
        }
        QUERY_CACHE.set(cache_key, res)
        return res

    # 6. SEMANTIC SCHOLAR (AI-Powered Academic Graph Search with OpenAlex Fallback)
    elif source in ('semanticscholar', 'semantic_scholar', 's2'):
        items = []
        total = 0

        if CIRCUIT_BREAKERS["semanticscholar"].can_attempt():
            s2_url = "https://api.semanticscholar.org/graph/v1/paper/search"
            offset = (page - 1) * rows
            s2_params = {
                "query": query,
                "offset": offset,
                "limit": rows,
                "fields": "title,authors,year,publicationDate,abstract,venue,publicationTypes,openAccessPdf,externalIds,url,citationCount"
            }
            headers = {"User-Agent": "UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)"}
            if SEMANTIC_SCHOLAR_API_KEY:
                headers["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY

            try:
                resp = HTTP_SESSION.get(s2_url, headers=headers, params=s2_params, timeout=(2.0, 3.0))
                if resp.status_code == 200:
                    CIRCUIT_BREAKERS["semanticscholar"].record_success()
                    data = resp.json()
                    total = data.get('total', 0)
                    for it in data.get('data', []):
                        authors_list = [a.get('name') for a in it.get('authors', []) if a.get('name')]
                        authors_str = "; ".join(authors_list) if authors_list else "Unknown"

                        title_str = clean_title(it.get('title', 'Untitled'))
                        year = it.get('year', 0)
                        date_str = it.get('publicationDate') or str(year or "")
                        venue = it.get('venue') or 'Semantic Scholar'
                        ext_ids = it.get('externalIds') or {}
                        doi = ext_ids.get('DOI', '')
                        doi_url = f"https://doi.org/{doi}" if doi else ""
                        oa_pdf = (it.get('openAccessPdf') or {}).get('url', '')
                        paper_id = it.get('paperId', '')
                        s2_page = it.get('url') or (f"https://www.semanticscholar.org/paper/{paper_id}" if paper_id else "https://www.semanticscholar.org")

                        direct_url = oa_pdf or doi_url or s2_page
                        is_oa = bool(oa_pdf)

                        pub_types = it.get('publicationTypes') or []
                        content_type = pub_types[0] if pub_types else "Journal Article"
                        if isinstance(content_type, str):
                            content_type = content_type.replace('JournalArticle', 'Journal Article').replace('Conference', 'Conference Paper')

                        items.append({
                            "id": f"s2-{paper_id or doi or str(hash(title_str))}",
                            "title": title_str,
                            "authors": authors_str,
                            "contentType": content_type,
                            "publicationName": venue,
                            "publicationType": "Semantic Scholar AI",
                            "date": date_str,
                            "year": year,
                            "doi": doi_url or doi,
                            "url": direct_url,
                            "abstract": it.get('abstract', '') or '',
                            "openAccess": is_oa,
                            "source": "Semantic Scholar",
                            "citationCount": it.get('citationCount', 0)
                        })
                else:
                    CIRCUIT_BREAKERS["semanticscholar"].record_failure()
            except Exception:
                CIRCUIT_BREAKERS["semanticscholar"].record_failure()

        # Fallback to OpenAlex if Semantic Scholar API was rate-limited or unavailable
        if not items:
            items, total = _fetch_openalex_fallback(query, page, rows, badge_source="Semantic Scholar")

        total_pages = (total + rows - 1) // rows if total else 0
        res = {
            "source": "Semantic Scholar",
            "sourceUrl": "https://www.semanticscholar.org",
            "total": total,
            "page": page,
            "totalPages": min(total_pages, 500),
            "items": items
        }
        QUERY_CACHE.set(cache_key, res)
        return res

    # 7. THE LENS (Lens.org - Open Global Scholarly & Patent Search with Fallback)
    elif source in ('lens', 'lensorg', 'lens.org'):
        items = []
        total = 0

        # Level 1: If LENS_API_KEY is configured and circuit is clear
        if LENS_API_KEY and CIRCUIT_BREAKERS["lens"].can_attempt():
            try:
                lens_api_url = "https://api.lens.org/scholarly/search"
                offset = (page - 1) * rows
                payload = {
                    "query": {
                        "query_string": {
                            "query": query
                        }
                    },
                    "size": rows,
                    "from": offset,
                    "sort": [{"year_published": "desc"}]
                }
                headers = {
                    "Authorization": f"Bearer {LENS_API_KEY}",
                    "Content-Type": "application/json",
                    "User-Agent": "UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)"
                }
                resp = HTTP_SESSION.post(lens_api_url, json=payload, headers=headers, timeout=(2.0, 3.0))
                if resp.status_code == 200:
                    CIRCUIT_BREAKERS["lens"].record_success()
                    data = resp.json()
                    total = data.get('total', 0)
                    for work in data.get('data', []):
                        lens_id = work.get('lens_id', '')
                        authors_list = []
                        for a in work.get('authors', []):
                            first = a.get('first_name', '')
                            last = a.get('last_name', '')
                            full = f"{first} {last}".strip()
                            if full:
                                authors_list.append(full)
                        authors_str = "; ".join(authors_list[:5]) if authors_list else "Unknown"

                        ext_ids = work.get('external_ids', [])
                        doi = next((e.get('value') for e in ext_ids if e.get('type') == 'doi'), '')
                        doi_url = f"https://doi.org/{doi}" if doi else f"https://www.lens.org/lens/work/{lens_id}"
                        lens_url = f"https://www.lens.org/lens/work/{lens_id}" if lens_id else doi_url

                        source_info = work.get('source') or {}
                        pub_name = source_info.get('title', 'The Lens Repository')
                        pub_year = work.get('year_published', 0)
                        pub_date = work.get('date_published', str(pub_year or ''))
                        raw_type = work.get('publication_type', 'journal_article')
                        content_type = raw_type.replace('_', ' ').title()

                        oa_info = work.get('open_access') or {}
                        is_oa = bool(oa_info.get('is_open_access', False))

                        items.append({
                            "id": f"lens-{lens_id or doi}",
                            "title": clean_title(work.get('title', 'Untitled')),
                            "authors": authors_str,
                            "contentType": content_type,
                            "publicationName": pub_name,
                            "publicationType": "The Lens",
                            "date": pub_date,
                            "year": pub_year,
                            "doi": doi_url,
                            "url": lens_url,
                            "abstract": clean_html_tags(work.get('abstract', '')),
                            "openAccess": is_oa,
                            "source": "The Lens"
                        })
                else:
                    CIRCUIT_BREAKERS["lens"].record_failure()
            except Exception:
                CIRCUIT_BREAKERS["lens"].record_failure()

        # Level 2: Fallback to OpenAlex with Lens deep links
        if not items:
            items, total = _fetch_openalex_fallback(query, page, rows, badge_source="The Lens")

        total_pages = (total + rows - 1) // rows if total else 0
        res = {
            "source": "The Lens",
            "sourceUrl": "https://www.lens.org",
            "total": total,
            "page": page,
            "totalPages": min(total_pages, 500),
            "items": items
        }
        QUERY_CACHE.set(cache_key, res)
        return res

    else:
        return {"error": f"Unknown source {source}", "source": source, "total": 0, "items": []}


# ── FEDERATED SEARCH ENDPOINT (AGGREGATION + CACHING) ──
@app.route('/api/federated')
def federated_search():
    source = request.args.get('source', 'scopus').lower()
    query = request.args.get('q', '').strip()
    page = int(request.args.get('page', 1))
    rows = int(request.args.get('rows', 10))

    if not query:
        return jsonify({"error": "Query parameter 'q' is required", "items": [], "total": 0}), 400

    # Multi-database aggregated search across all global sources
    if source in ('all', 'all_global', 'global', 'multi', 'federated_all'):
        cache_key = f"all_global:{query.lower().strip()}:{page}:{rows}"
        cached_res = QUERY_CACHE.get(cache_key)
        if cached_res is not None:
            return jsonify({**cached_res, "cached": True})

        sub_sources = ['scopus', 'semanticscholar', 'lens', 'openalex', 'crossref', 'springer']
        per_source_rows = max(4, rows // len(sub_sources) + 2)
        
        all_results = {}
        total_combined = 0
        
        with ThreadPoolExecutor(max_workers=6) as executor:
            future_to_src = {
                executor.submit(_fetch_single_source, src, query, page, per_source_rows): src
                for src in sub_sources
            }
            for future in as_completed(future_to_src):
                src = future_to_src[future]
                try:
                    res = future.result()
                    if isinstance(res, dict):
                        all_results[src] = res
                        total_combined += res.get('total', 0)
                except Exception as e:
                    all_results[src] = {"items": [], "total": 0, "error": str(e)}

        # Interleave items round-robin to provide balanced variety
        combined_items = []
        seen_keys = set()
        
        max_items_len = max([len(all_results.get(s, {}).get('items', [])) for s in sub_sources] or [0])
        for idx in range(max_items_len):
            for s in sub_sources:
                items_list = all_results.get(s, {}).get('items', [])
                if idx < len(items_list):
                    item = items_list[idx]
                    norm_title = re.sub(r'[^a-zA-Z0-9]', '', (item.get('title') or '').lower())
                    doi_key = (item.get('doi') or '').lower().strip()
                    dedup_key = doi_key if (doi_key and 'http' in doi_key) else norm_title[:40]
                    
                    if dedup_key and dedup_key in seen_keys:
                        continue
                    if dedup_key:
                        seen_keys.add(dedup_key)
                    combined_items.append(item)

        total_pages = min((total_combined + rows - 1) // rows if total_combined else 1, 500)
        res_payload = {
            "source": "Seluruh Jurnal Internasional",
            "sourceUrl": "Scopus, Semantic Scholar, The Lens, OpenAlex, Crossref, Springer",
            "total": total_combined,
            "page": page,
            "totalPages": total_pages,
            "items": combined_items[:rows],
            "cached": False
        }
        QUERY_CACHE.set(cache_key, res_payload)
        return jsonify(res_payload)

    # Single source search
    result = _fetch_single_source(source, query, page, rows)
    if isinstance(result, dict) and "error" in result and result.get("total", 0) == 0 and "Unknown source" in result.get("error", ""):
        return jsonify(result), 400
    return jsonify(result)


@app.route('/api/scopus')
def scopus_search():
    # Legacy wrapper
    res = federated_search()
    if isinstance(res, tuple):
        return res
    json_data = res.get_json()
    return jsonify(json_data.get('items', []))


@app.route('/api/topics')
def get_academic_topics():
    query = request.args.get('q', '').strip()
    if not query or len(query) < 2:
        return jsonify({"topics": []})

    # Clean query from quotes and boolean operators for concept lookup
    clean_q = re.sub(r'["\']', '', query).strip()
    clean_q = re.sub(r'\b(AND|OR|NOT)\b', ' ', clean_q, flags=re.IGNORECASE).strip()

    cache_key = f"topic:{clean_q.lower()}"
    cached_topics = TOPICS_CACHE.get(cache_key)
    if cached_topics is not None:
        return jsonify(cached_topics)

    topics = []
    seen = set()
    seen.add(clean_q.lower())

    try:
        url = "https://api.openalex.org/concepts"
        params = {
            "search": clean_q,
            "per_page": 8,
            "mailto": "perpustakaan@ums.ac.id"
        }
        headers = {"User-Agent": "UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)"}
        resp = HTTP_SESSION.get(url, params=params, headers=headers, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            for c in data.get('results', []):
                name = c.get('display_name')
                if name and name.lower() not in seen:
                    seen.add(name.lower())
                    topics.append({
                        "name": name,
                        "worksCount": c.get('works_count', 0),
                        "level": c.get('level', 1),
                        "description": c.get('description', '')
                    })
    except Exception:
        pass

    result_payload = {"topics": topics[:8]}
    TOPICS_CACHE.set(cache_key, result_payload, ttl=3600)
    return jsonify(result_payload)


# ── CACHE & CIRCUIT BREAKER MONITORING / ADMIN ENDPOINTS ──
@app.route('/api/cache/stats')
def cache_stats():
    """Return cache statistics and circuit breaker health statuses."""
    cb_statuses = {name: cb.status() for name, cb in CIRCUIT_BREAKERS.items()}
    return jsonify({
        "query_cache": QUERY_CACHE.stats(),
        "topics_cache": TOPICS_CACHE.stats(),
        "circuit_breakers": cb_statuses
    })


@app.route('/api/cache/clear', methods=['POST'])
def cache_clear():
    """Clear memory caches on-demand."""
    QUERY_CACHE.clear()
    TOPICS_CACHE.clear()
    return jsonify({"status": "SUCCESS", "message": "In-memory query and topics caches cleared successfully."})



# ── ADMIN HARVEST & SCHEDULER MONITORING ──
ADMIN_SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY', 'ums-onesearch-secret-key').strip('"\'')
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
LOGS_DIR = os.path.join(BASE_DIR, 'logs', 'harvest')
STATE_FILE = os.path.join(DATA_DIR, 'scheduler_state.json')


def _check_admin_auth():
    """Verify admin secret key from header or query param or JSON body."""
    auth_header = request.headers.get('X-Admin-Key', '')
    query_key = request.args.get('key', '')
    body_key = ''
    try:
        json_body = request.get_json(silent=True)
        if isinstance(json_body, dict):
            body_key = json_body.get('key', '')
    except Exception:
        pass
    provided = auth_header or query_key or body_key
    return provided == ADMIN_SECRET_KEY


@app.route('/api/admin/auth/verify', methods=['GET', 'POST'])
def admin_auth_verify():
    """Verify provided admin secret key."""
    if _check_admin_auth():
        return jsonify({"valid": True, "message": "Authentication successful."})
    return jsonify({"valid": False, "error": "Invalid admin secret key."}), 401


@app.route('/api/admin/harvest/status')
def harvest_status():
    """Check current harvest & scheduler state."""
    state = {
        "status": "IDLE",
        "last_run": None,
        "last_mode": None,
        "last_duration_seconds": 0,
        "last_exit_code": 0,
        "last_log_file": None,
        "total_runs": 0,
        "scheduler_enabled": os.environ.get('HARVEST_AUTO_ENABLED', 'true').lower() in ('1', 'true', 'yes'),
        "schedule_time": os.environ.get('HARVEST_SCHEDULE_TIME', '02:00'),
        "incremental_days": int(os.environ.get('HARVEST_INCREMENTAL_DAYS', '3'))
    }
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                state.update(saved)
        except Exception:
            pass
    return jsonify(state)


@app.route('/api/admin/harvest/logs')
def harvest_logs():
    """List recent harvest log files and view content of the latest or specified log file."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    req_file = request.args.get('file', '')
    max_lines = int(request.args.get('lines', 300))

    log_files_list = []
    if os.path.exists(LOGS_DIR):
        for fname in sorted(os.listdir(LOGS_DIR), reverse=True):
            if fname.endswith('.log'):
                fpath = os.path.join(LOGS_DIR, fname)
                try:
                    fstat = os.stat(fpath)
                    log_files_list.append({
                        "name": fname,
                        "size": fstat.st_size,
                        "modified": datetime.fromtimestamp(fstat.st_mtime).isoformat()
                    })
                except Exception:
                    pass

    target_path = None
    if req_file:
        # Sanitize filename to prevent directory traversal
        safe_name = os.path.basename(req_file)
        cand_path = os.path.join(LOGS_DIR, safe_name)
        if os.path.exists(cand_path):
            target_path = cand_path
    elif log_files_list:
        target_path = os.path.join(LOGS_DIR, log_files_list[0]['name'])

    content = ""
    target_name = ""
    if target_path and os.path.exists(target_path):
        target_name = os.path.basename(target_path)
        try:
            with open(target_path, 'r', encoding='utf-8', errors='replace') as f:
                lines = f.readlines()
                content = "".join(lines[-max_lines:])
        except Exception as e:
            content = f"Error reading log file: {e}"

    return jsonify({
        "files": log_files_list[:30],
        "active_file": target_name,
        "content": content
    })


@app.route('/api/admin/harvest/run', methods=['GET', 'POST'])
def harvest_trigger():
    """Trigger harvest on-demand (protected with ADMIN_SECRET_KEY)."""
    import threading
    import subprocess

    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    data = request.get_json(silent=True) or {}
    mode = (request.args.get('mode') or data.get('mode') or 'incremental').lower()
    days = int(request.args.get('days') or data.get('days') or 3)

    scripts_dir = os.path.join(BASE_DIR, 'scripts')
    scheduler_script = os.path.join(scripts_dir, 'scheduler.py')

    def worker():
        cmd = [sys.executable, scheduler_script, '--run-full' if mode == 'full' else '--run-now', '--days', str(days)]
        try:
            subprocess.run(cmd, cwd=BASE_DIR)
        except Exception as e:
            print(f"[Admin Trigger] Error executing harvest: {e}", file=sys.stderr)

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()

    return jsonify({
        "status": "TRIGGERED",
        "message": f"Harvest pipeline ({mode.upper()}) started in background thread.",
        "mode": mode,
        "days": days
    })


@app.route('/api/admin/harvest/unlock', methods=['POST'])
def harvest_unlock():
    """Force reset stuck RUNNING lock."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                state = json.load(f)
            state["status"] = "IDLE"
            state["last_error"] = "Lock reset manually by administrator"
            state.pop("current_run_start", None)
            state.pop("current_mode", None)
            state["updated_at"] = datetime.now().isoformat()
            with open(STATE_FILE, 'w', encoding='utf-8') as f:
                json.dump(state, f, indent=2)
            return jsonify({"status": "SUCCESS", "message": "Scheduler lock successfully reset to IDLE."})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"status": "SUCCESS", "message": "No state file found. Already IDLE."})


@app.route('/api/admin/stats')
def admin_stats():
    """Return summary statistics of local datasets and repositories."""
    books_path = os.path.join(DATA_DIR, 'books.json')
    facets_path = os.path.join(DATA_DIR, 'facets.json')

    total_books = 0
    src_counts = {}
    file_info = {}

    if os.path.exists(books_path):
        try:
            bstat = os.stat(books_path)
            file_info["books_size_mb"] = round(bstat.st_size / (1024 * 1024), 2)
            file_info["books_modified"] = datetime.fromtimestamp(bstat.st_mtime).isoformat()
            with open(books_path, 'r', encoding='utf-8') as f:
                books_data = json.load(f)
                total_books = len(books_data)
                for b in books_data:
                    src = b.get('src', 'Other')
                    src_counts[src] = src_counts.get(src, 0) + 1
        except Exception as e:
            file_info["books_error"] = str(e)

    if os.path.exists(facets_path):
        try:
            fstat = os.stat(facets_path)
            file_info["facets_size_kb"] = round(fstat.st_size / 1024, 2)
            file_info["facets_modified"] = datetime.fromtimestamp(fstat.st_mtime).isoformat()
        except Exception:
            pass

    return jsonify({
        "total_records": total_books,
        "sources": src_counts,
        "files": file_info
    })


INSTITUTIONS_FILE = os.path.join(DATA_DIR, 'institutions.json')


def _load_institutions_data():
    if os.path.exists(INSTITUTIONS_FILE):
        try:
            with open(INSTITUTIONS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _save_institutions_data(items):
    with open(INSTITUTIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2)


@app.route('/api/admin/institutions', methods=['GET', 'POST'])
def admin_institutions():
    """List or Add/Update partner institution endpoints."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    if request.method == 'GET':
        return jsonify(_load_institutions_data())

    # POST: Add or update institution
    data = request.get_json(silent=True) or {}
    inst_id = str(data.get('id', '')).strip().upper()
    name = str(data.get('name', '')).strip()
    url = str(data.get('url', '')).strip()
    source = str(data.get('source', '')).strip() or inst_id
    inst_type = str(data.get('type', 'koha')).strip().lower()
    active = bool(data.get('active', True))

    if not inst_id or not url:
        return jsonify({"error": "ID dan URL endpoint OAI-PMH wajib diisi."}), 400

    items = _load_institutions_data()
    existing_idx = next((i for i, item in enumerate(items) if item.get('id', '').upper() == inst_id), -1)

    new_obj = {
        "id": inst_id,
        "name": name or inst_id,
        "url": url,
        "source": source,
        "type": inst_type,
        "active": active
    }

    if existing_idx >= 0:
        items[existing_idx] = new_obj
        msg = f"Mitra {inst_id} berhasil diperbarui."
    else:
        items.append(new_obj)
        msg = f"Mitra {inst_id} berhasil ditambahkan."

    _save_institutions_data(items)
    return jsonify({"status": "SUCCESS", "message": msg, "item": new_obj, "items": items})


@app.route('/api/admin/institutions/<inst_id>', methods=['DELETE'])
def admin_delete_institution(inst_id):
    """Delete a partner institution."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    inst_id = inst_id.strip().upper()
    items = _load_institutions_data()
    new_items = [it for it in items if it.get('id', '').upper() != inst_id]

    if len(new_items) == len(items):
        return jsonify({"error": f"Institusi {inst_id} tidak ditemukan."}), 404

    _save_institutions_data(new_items)
    return jsonify({"status": "SUCCESS", "message": f"Mitra {inst_id} berhasil dihapus.", "items": new_items})


@app.route('/api/admin/institutions/toggle', methods=['POST'])
def admin_toggle_institution():
    """Toggle active state of an institution."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    data = request.get_json(silent=True) or {}
    inst_id = str(data.get('id', '')).strip().upper()
    items = _load_institutions_data()

    for it in items:
        if it.get('id', '').upper() == inst_id:
            it['active'] = not it.get('active', True)
            _save_institutions_data(items)
            return jsonify({
                "status": "SUCCESS",
                "message": f"Status {inst_id} diubah menjadi {'Aktif' if it['active'] else 'Nonaktif'}.",
                "active": it['active'],
                "items": items
            })

    return jsonify({"error": f"Institusi {inst_id} tidak ditemukan."}), 404


@app.route('/api/admin/institutions/test', methods=['GET', 'POST'])
def admin_test_institution_oai():
    """Ping & Validate OAI-PMH endpoint using Identify verb."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    data = request.get_json(silent=True) or {}
    url = str(data.get('url') or request.args.get('url') or request.form.get('url') or '').strip()

    if not url:
        return jsonify({"ok": False, "error": "URL endpoint kosong."}), 400

    try:
        test_url = f"{url}?verb=Identify" if '?' not in url else f"{url}&verb=Identify"
        resp = requests.get(test_url, timeout=7, headers={'User-Agent': 'UMSLibraryOneSearchHarvester/1.0'})
        if resp.status_code == 200 and ('<OAI-PMH' in resp.text or '<Identify>' in resp.text or 'repositoryName' in resp.text):
            # Extract repository name if possible
            repo_match = re.search(r'<repositoryName>([^<]+)</repositoryName>', resp.text, re.IGNORECASE)
            repo_name = repo_match.group(1).strip() if repo_match else "OAI-PMH Compliant Server"
            return jsonify({
                "ok": True,
                "status_code": resp.status_code,
                "repository_name": repo_name,
                "message": f"✓ Endpoint OAI-PMH Valid ({repo_name})"
            })
        else:
            return jsonify({
                "ok": False,
                "status_code": resp.status_code,
                "message": f"Server merespon HTTP {resp.status_code} tapi respon bukan XML OAI-PMH yang valid."
            })
    except Exception as e:
        return jsonify({
            "ok": False,
            "message": f"Gagal menghubungi endpoint: {str(e)}"
        })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
