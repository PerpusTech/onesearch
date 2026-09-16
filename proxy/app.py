import os
import sys
import json
import re
import html
import time
import io
import csv
import threading
import requests
from urllib3.util import Retry
from requests.adapters import HTTPAdapter
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import hmac
from flask import Flask, request, jsonify, Response, redirect, send_file
from dotenv import load_dotenv

# Load env variables from root .env or proxy/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 160 * 1024 * 1024  # 160 MB for large PDF uploads
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

# ── PATHS & GLOBAL DIRECTORIES ──
ADMIN_SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY', 'ums-onesearch-secret-key').strip('"\'')
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
LOGS_DIR = os.path.join(BASE_DIR, 'logs', 'harvest')
STATE_FILE = os.path.join(DATA_DIR, 'scheduler_state.json')
INTERNATIONAL_CONFIG_FILE = os.path.join(DATA_DIR, 'international_config.json')
SUBSCRIBED_JOURNALS_FILE = os.path.join(DATA_DIR, 'subscribed_journals.json')
SUBSCRIBED_EBOOKS_FILE = os.path.join(DATA_DIR, 'subscribed_ebooks.json')
SUBSCRIBED_EBOOKS_PDF_DIR = os.path.join(DATA_DIR, 'ebooks_pdf')
os.makedirs(SUBSCRIBED_EBOOKS_PDF_DIR, exist_ok=True)
SEARCH_ANALYTICS_FILE = os.path.join(DATA_DIR, 'search_analytics.json')
_analytics_lock = threading.Lock()

DEFAULT_INTERNATIONAL_CONFIG = {
    "enabled": True,
    "sources": {
        "scopus": True,
        "springer": True,
        "semanticscholar": True,
        "lens": True,
        "openalex": True,
        "crossref": True,
        "emerald": True
    },
    "filter_subscribed_only_default": False
}

INITIAL_SUBSCRIBED_JOURNALS = [
    {
        "id": "JRN-001",
        "title": "Nature Machine Intelligence",
        "issn": "2522-5839",
        "eissn": "2522-5839",
        "publisher": "Springer Nature",
        "url": "https://www.nature.com/natmachintell/",
        "subject": "Informatika & Kecerdasan Buatan",
        "notes": "Langganan Resmi UMS 2026",
        "active": True
    },
    {
        "id": "JRN-002",
        "title": "The Lancet",
        "issn": "0140-6736",
        "eissn": "1474-547X",
        "publisher": "Elsevier",
        "url": "https://www.thelancet.com/",
        "subject": "Kedokteran & Kesehatan",
        "notes": "Langganan Resmi UMS 2026",
        "active": True
    },
    {
        "id": "JRN-003",
        "title": "IEEE Transactions on Education",
        "issn": "0018-9359",
        "eissn": "1557-9638",
        "publisher": "IEEE",
        "url": "https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=13",
        "subject": "Teknik & Ilmu Pendidikan",
        "notes": "Paket Konsorsium Kampus",
        "active": True
    },
    {
        "id": "JRN-004",
        "title": "Journal of Islamic Marketing",
        "issn": "1759-0833",
        "eissn": "1759-0833",
        "publisher": "Emerald Insight",
        "url": "https://www.emerald.com/insight/publication/issn/1759-0833",
        "subject": "Ekonomi & Bisnis Islam",
        "notes": "Langganan Mandiri UMS",
        "active": True
    },
    {
        "id": "JRN-005",
        "title": "Educational Technology Research and Development",
        "issn": "1042-1629",
        "eissn": "1556-6501",
        "publisher": "Springer",
        "url": "https://link.springer.com/journal/11423",
        "subject": "Teknologi Pendidikan & FKIP",
        "notes": "Langganan Resmi UMS 2026",
        "active": True
    }
]


def _check_admin_auth():
    """Verify admin secret key from header, query param, or JSON body using timing-safe comparison."""
    if not ADMIN_SECRET_KEY:
        return False
    auth_header = request.headers.get('X-Admin-Key', '').strip()
    if not auth_header:
        bearer = request.headers.get('Authorization', '').strip()
        if bearer.lower().startswith('bearer '):
            auth_header = bearer[7:].strip()
    query_key = (request.args.get('key') or request.args.get('secret') or request.args.get('admin_key') or '').strip()
    body_key = ''
    try:
        json_body = request.get_json(silent=True)
        if isinstance(json_body, dict):
            body_key = str(json_body.get('key') or json_body.get('secret') or json_body.get('admin_key') or '').strip()
    except Exception:
        pass
    provided = auth_header or query_key or body_key
    if not provided:
        return False
    return hmac.compare_digest(provided, ADMIN_SECRET_KEY)


def _load_json_file(filepath, default=None):
    if default is None:
        default = []
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return default


def _save_json_file(filepath, data, indent=2):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)


def _load_international_config():
    cfg = dict(DEFAULT_INTERNATIONAL_CONFIG)
    saved = _load_json_file(INTERNATIONAL_CONFIG_FILE, {})
    if isinstance(saved, dict):
        if "enabled" in saved:
            cfg["enabled"] = bool(saved["enabled"])
        if "sources" in saved and isinstance(saved["sources"], dict):
            cfg["sources"] = {**DEFAULT_INTERNATIONAL_CONFIG["sources"], **saved["sources"]}
        if "filter_subscribed_only_default" in saved:
            cfg["filter_subscribed_only_default"] = bool(saved["filter_subscribed_only_default"])
    return cfg


def _save_international_config(cfg):
    _save_json_file(INTERNATIONAL_CONFIG_FILE, cfg)


def _load_subscribed_journals():
    items = _load_json_file(SUBSCRIBED_JOURNALS_FILE, None)
    if items is None or not isinstance(items, list):
        _save_subscribed_journals(INITIAL_SUBSCRIBED_JOURNALS)
        return list(INITIAL_SUBSCRIBED_JOURNALS)
    return items


def _save_subscribed_journals(items):
    _save_json_file(SUBSCRIBED_JOURNALS_FILE, items)


def _norm_code(code_str):
    return re.sub(r'[^0-9xX]', '', str(code_str)).upper() if code_str else ""

_norm_issn = _norm_code
_norm_isbn = _norm_code


def _load_subscribed_ebooks():
    items = _load_json_file(SUBSCRIBED_EBOOKS_FILE, [])
    return items if isinstance(items, list) else []


def _save_subscribed_ebooks(items):
    _save_json_file(SUBSCRIBED_EBOOKS_FILE, items)


def _toggle_item_active(items, target_id, save_fn, label="Item"):
    target_id = str(target_id).strip().upper()
    for it in items:
        if it.get('id', '').upper() == target_id:
            it['active'] = not it.get('active', True)
            it['updated_at'] = datetime.now().isoformat()
            save_fn(items)
            return jsonify({
                "status": "SUCCESS",
                "message": f"Status '{it.get('title', target_id)}' diubah menjadi {'Aktif' if it['active'] else 'Nonaktif'}.",
                "active": it['active'],
                "items": items
            })
    return jsonify({"error": f"{label} dengan ID {target_id} tidak ditemukan."}), 404


def _generate_csv_download(headers, rows, filename):
    si = io.StringIO()
    writer = csv.writer(si)
    writer.writerow(headers)
    writer.writerows(rows)
    output = io.BytesIO(si.getvalue().encode('utf-8-sig'))
    return send_file(output, mimetype='text/csv', as_attachment=True, download_name=filename)


def _format_file_size(size_bytes):
    if not size_bytes or size_bytes < 0:
        return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}" if unit != 'B' else f"{int(size_bytes)} B"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


def _sanitize_pdf_filename(name):
    name = str(name or '').strip()
    name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', name)
    name = re.sub(r'_+', '_', name)
    if not name.lower().endswith('.pdf'):
        name += '.pdf'
    return name[:120]


def _norm_title_key(title_str):
    if not title_str:
        return ""
    return re.sub(r'[^a-zA-Z0-9]', '', str(title_str)).lower()


def _get_active_subscribed_lookup():
    """Build fast lookup map for active subscribed journals by normalized ISSN and title."""
    journals = _load_subscribed_journals()
    issn_map = {}
    title_map = {}
    for j in journals:
        if not j.get('active', True):
            continue
        issn1 = _norm_issn(j.get('issn', ''))
        issn2 = _norm_issn(j.get('eissn', ''))
        t_key = _norm_title_key(j.get('title', ''))
        
        if issn1:
            issn_map[issn1] = j
        if issn2:
            issn_map[issn2] = j
        if t_key:
            title_map[t_key] = j
            
    return issn_map, title_map


def _enrich_items_with_subscriptions(items):
    """Tag articles with isSubscribed: True and campus access details if they match subscribed journals."""
    if not items:
        return items
    issn_map, title_map = _get_active_subscribed_lookup()
    if not issn_map and not title_map:
        return items

    for it in items:
        matched = None
        # 1. Match by ISSN if present
        for raw_issn in [it.get('issn'), it.get('eissn'), it.get('issn_print'), it.get('issn_electronic')]:
            if raw_issn:
                for sub in str(raw_issn).replace(';', ',').split(','):
                    n = _norm_issn(sub)
                    if n and n in issn_map:
                        matched = issn_map[n]
                        break
            if matched:
                break

        # 2. Match by publicationName / journal title
        if not matched:
            pub_name = it.get('publicationName') or it.get('journal') or it.get('pub') or ''
            t_key = _norm_title_key(pub_name)
            if t_key and t_key in title_map:
                matched = title_map[t_key]

        if matched:
            it['isSubscribed'] = True
            it['subscribedJournalId'] = matched.get('id')
            it['subscribedJournalTitle'] = matched.get('title')
            it['subscribedUrl'] = matched.get('url') or ''
            it['subscribedPublisher'] = matched.get('publisher') or ''
            it['subscribedSubject'] = matched.get('subject') or ''
        else:
            it['isSubscribed'] = False

    return items




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


def clean_doi(val):
    """Extract a genuine standard DOI (10.xxxx/...) or return empty string."""
    if not val or not isinstance(val, str):
        return ""
    val = val.strip()
    m = re.search(r'(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)', val)
    if m:
        return m.group(1).rstrip(',.;')
    return ""


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
                doi_clean = clean_doi(work.get('doi') or '')
                doi_url = f"https://doi.org/{doi_clean}" if doi_clean else ""
                src_name = extract_openalex_source_name(work.get('primary_location'), venue_title_hint or 'International Journal')
                oa_info = work.get('open_access') or {}
                best_oa = work.get('best_oa_location') or {}
                prim_loc = work.get('primary_location') or {}
                pdf_link = best_oa.get('pdf_url') or prim_loc.get('pdf_url') or (oa_info.get('oa_url') if (oa_info.get('oa_url') or '').endswith('.pdf') else '')
                is_oa = bool(oa_info.get('is_oa', False)) or bool(oa_info.get('oa_url')) or bool(pdf_link)
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
                    "doi": doi_clean,
                    "url": doi_url or (f"https://openalex.org/{clean_id}" if clean_id else ""),
                    "pdfUrl": pdf_link or (oa_info.get('oa_url') if (oa_info.get('oa_url') or '').endswith('.pdf') else ""),
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

                        doi = clean_doi(it.get('DOI', ''))
                        doi_url = f"https://doi.org/{doi}" if doi else ""
                        springer_url = f"https://link.springer.com/doi/{doi}" if doi else (it.get('URL') or doi_url)

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
                            "doi": doi,
                            "url": springer_url or doi_url or (it.get('URL') or ''),
                            "pdfUrl": next((l.get('URL', '') for l in it.get('link', []) if 'pdf' in str(l.get('content-type', '')).lower() or str(l.get('URL', '')).endswith('.pdf')), '') if is_oa else '',
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

                        doi = clean_doi(it.get('DOI', ''))
                        doi_url = f"https://doi.org/{doi}" if doi else ""
                        emerald_url = f"https://www.emerald.com/insight/content/doi/{doi}" if doi else (it.get('URL') or doi_url)

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
                            "doi": doi,
                            "url": emerald_url or doi_url or (it.get('URL') or ''),
                            "pdfUrl": next((l.get('URL', '') for l in it.get('link', []) if 'pdf' in str(l.get('content-type', '')).lower() or str(l.get('URL', '')).endswith('.pdf')), '') if is_oa else '',
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
                'search': query,
                'page': page,
                'per-page': rows,
                'mailto': 'perpustakaan@ums.ac.id'
            }
            headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
            try:
                resp = HTTP_SESSION.get(url, params=params, headers=headers, timeout=(2.0, 3.5))
                
                if resp.status_code == 200:
                    CIRCUIT_BREAKERS["openalex"].record_success()
                    data = resp.json()
                    meta = data.get('meta', {})
                    total = meta.get('count', 0)
                    items_raw = data.get('results', [])
                    
                    for it in items_raw:
                        authors_str = extract_openalex_authors(it.get('authorships'))
                        title_str = clean_title(it.get('title', 'Untitled') or 'Untitled')
                        year = it.get('publication_year', 0)
                        date_str = it.get('publication_date', str(year or ""))
                        pub_name = extract_openalex_source_name(it.get('primary_location'), 'Open Access Repository')

                        doi = it.get('doi', '')
                        oa_info = it.get('open_access') if isinstance(it.get('open_access'), dict) else {}
                        oa_url = oa_info.get('oa_url', '') if isinstance(oa_info, dict) else ''
                        best_oa = it.get('best_oa_location') if isinstance(it.get('best_oa_location'), dict) else {}
                        primary_loc = it.get('primary_location') if isinstance(it.get('primary_location'), dict) else {}
                        pdf_link = (best_oa.get('pdf_url') or primary_loc.get('pdf_url') or (oa_url if str(oa_url).endswith('.pdf') else '')) if isinstance(best_oa, dict) and isinstance(primary_loc, dict) else ''
                        is_oa = bool(oa_info.get('is_oa', False)) or bool(oa_url) or bool(pdf_link)

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
                        doc_type = str(it.get('type', 'article') or 'article').replace('-', ' ').title()

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
                            "pdfUrl": pdf_link or (oa_url if (oa_url or '').endswith('.pdf') else ""),
                            "abstract": it.get('abstract') or '',
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

                        doi = clean_doi(it.get('DOI', ''))
                        doi_url = f"https://doi.org/{doi}" if doi else (it.get('URL') or '')

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
                            "doi": doi,
                            "url": doi_url,
                            "pdfUrl": next((l.get('URL', '') for l in it.get('link', []) if 'pdf' in str(l.get('content-type', '')).lower() or str(l.get('URL', '')).endswith('.pdf')), '') if is_oa else '',
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
                        doi_val = clean_doi(item.get('prism:doi', ''))
                        if not item_url and doi_val:
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
                            "doi": doi_val,
                            "url": item_url or (f"https://doi.org/{doi_val}" if doi_val else "https://www.scopus.com"),
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
                        doi_val = clean_doi(item.get('prism:doi', ''))
                        item_url = f"https://doi.org/{doi_val}" if doi_val else ""
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
                            "doi": doi_val,
                            "url": item_url or (f"https://doi.org/{doi_val}" if doi_val else "https://www.scopus.com"),
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
                        doi = clean_doi(ext_ids.get('DOI', ''))
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
                            "doi": doi,
                            "url": direct_url,
                            "pdfUrl": oa_pdf,
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
                        raw_doi = next((e.get('value') for e in ext_ids if e.get('type') == 'doi'), '')
                        doi = clean_doi(raw_doi)
                        doi_url = f"https://doi.org/{doi}" if doi else ""
                        lens_url = f"https://www.lens.org/lens/work/{lens_id}" if lens_id else (doi_url or "https://www.lens.org")

                        source_info = work.get('source') or {}
                        pub_name = source_info.get('title', 'The Lens Repository')
                        pub_year = work.get('year_published', 0)
                        pub_date = work.get('date_published', str(pub_year or ''))
                        raw_type = work.get('publication_type', 'journal_article')
                        content_type = raw_type.replace('_', ' ').title()

                        oa_info = work.get('open_access') or {}
                        is_oa = bool(oa_info.get('is_open_access', False))

                        oa_pdf = (oa_info.get('url') or '') if is_oa else ''
                        items.append({
                            "id": f"lens-{lens_id or doi}",
                            "title": clean_title(work.get('title', 'Untitled')),
                            "authors": authors_str,
                            "contentType": content_type,
                            "publicationName": pub_name,
                            "publicationType": "The Lens",
                            "date": pub_date,
                            "year": pub_year,
                            "doi": doi,
                            "url": lens_url,
                            "pdfUrl": oa_pdf,
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


# ── DIRECT PDF PROXY STREAMER (STRIPS X-FRAME-OPTIONS FOR IN-BROWSER PREVIEW) ──
@app.route('/api/pdf_proxy')
def pdf_proxy():
    raw_url = request.args.get('url', '').strip()
    if not raw_url or not raw_url.startswith(('http://', 'https://')):
        return jsonify({"error": "Invalid or missing url parameter"}), 400
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/pdf,application/octet-stream,*/*'
        }
        r = HTTP_SESSION.get(raw_url, headers=headers, stream=True, timeout=(6.0, 20.0), allow_redirects=True)
        if r.status_code != 200:
            return jsonify({"error": f"Upstream error HTTP {r.status_code}"}), r.status_code
        
        content_type = r.headers.get('Content-Type', '').lower()
        if 'application/pdf' not in content_type and 'octet-stream' not in content_type:
            # Publisher returned an HTML landing / paywall page. Redirect to origin URL.
            return redirect(raw_url)
            
        def generate():
            for chunk in r.iter_content(chunk_size=16384):
                if chunk:
                    yield chunk

        resp = Response(generate(), content_type=content_type or 'application/pdf')
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Content-Disposition'] = 'inline'
        resp.headers['X-Frame-Options'] = 'ALLOWALL'
        resp.headers['Content-Security-Policy'] = "frame-ancestors *"
        return resp
    except Exception as e:
        return jsonify({"error": f"PDF proxy error: {str(e)}"}), 500


# ── FEDERATED SEARCH ENDPOINT (AGGREGATION + CACHING) ──
@app.route('/api/federated')
def federated_search():
    source = request.args.get('source', 'scopus').lower()
    query = request.args.get('q', '').strip()
    page = int(request.args.get('page', 1))
    rows = int(request.args.get('rows', 10))

    if not query:
        return jsonify({"error": "Query parameter 'q' is required", "items": [], "total": 0}), 400

    cfg = _load_international_config()
    if not cfg.get('enabled', True):
        return jsonify({
            "source": "Jurnal Internasional",
            "sourceUrl": "#",
            "total": 0,
            "page": page,
            "totalPages": 0,
            "items": [],
            "disabled": True,
            "message": "Fitur pencarian jurnal internasional sedang dinonaktifkan oleh administrator perpustakaan."
        })

    # Multi-database aggregated search across all global sources
    if source in ('all', 'all_global', 'global', 'multi', 'federated_all'):
        cache_key = f"all_global:{query.lower().strip()}:{page}:{rows}"
        cached_res = QUERY_CACHE.get(cache_key)
        if cached_res is not None:
            return jsonify({**cached_res, "cached": True})

        enabled_sources = cfg.get('sources', {})
        available_sub_sources = ['scopus', 'semanticscholar', 'lens', 'openalex', 'crossref', 'springer', 'emerald']
        sub_sources = [s for s in available_sub_sources if enabled_sources.get(s, True)]

        if not sub_sources:
            return jsonify({
                "source": "Seluruh Jurnal Internasional",
                "sourceUrl": "#",
                "total": 0,
                "page": page,
                "totalPages": 0,
                "items": [],
                "disabled": True,
                "message": "Seluruh sumber basis data jurnal internasional sedang dinonaktifkan."
            })

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

        # Enrich items with subscription status
        combined_items = _enrich_items_with_subscriptions(combined_items)

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
    src_enabled = cfg.get('sources', {}).get(source, True)
    if not src_enabled:
        return jsonify({
            "source": source.title(),
            "sourceUrl": "#",
            "total": 0,
            "page": page,
            "totalPages": 0,
            "items": [],
            "disabled": True,
            "message": f"Pencarian sumber {source.title()} sedang dinonaktifkan oleh administrator perpustakaan."
        })

    result = _fetch_single_source(source, query, page, rows)
    if isinstance(result, dict) and "error" in result and result.get("total", 0) == 0 and "Unknown source" in result.get("error", ""):
        return jsonify(result), 400
        
    if isinstance(result, dict) and "items" in result:
        result["items"] = _enrich_items_with_subscriptions(result.get("items", []))

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
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401
    cb_statuses = {name: cb.status() for name, cb in CIRCUIT_BREAKERS.items()}
    return jsonify({
        "query_cache": QUERY_CACHE.stats(),
        "topics_cache": TOPICS_CACHE.stats(),
        "circuit_breakers": cb_statuses
    })


@app.route('/api/cache/clear', methods=['POST'])
def cache_clear():
    """Clear memory caches on-demand."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401
    QUERY_CACHE.clear()
    TOPICS_CACHE.clear()
    return jsonify({"status": "SUCCESS", "message": "In-memory query and topics caches cleared successfully."})


# ── PUBLIC INTERNATIONAL DISCOVERY & E-JOURNAL CATALOG ENDPOINTS ──

@app.route('/api/international/config')
def api_international_config_public():
    """Public endpoint to check if international discovery is enabled and which sources are active."""
    cfg = _load_international_config()
    journals = _load_subscribed_journals()
    active_journals_count = sum(1 for j in journals if j.get('active', True))
    return jsonify({
        "enabled": cfg.get("enabled", True),
        "sources": cfg.get("sources", {}),
        "filter_subscribed_only_default": cfg.get("filter_subscribed_only_default", False),
        "subscribed_journals_count": active_journals_count
    })


@app.route('/api/international/journals')
def api_international_journals_public():
    """Public A-Z listing of subscribed international journals with search & filter support."""
    cfg = _load_international_config()
    if not cfg.get('enabled', True):
        return jsonify({"items": [], "total": 0, "disabled": True})

    journals = _load_subscribed_journals()
    active_only = [j for j in journals if j.get('active', True)]

    q = request.args.get('q', '').strip().lower()
    subject = request.args.get('subject', '').strip().lower()
    publisher = request.args.get('publisher', '').strip().lower()

    filtered = []
    for j in active_only:
        if q:
            match_q = (
                q in j.get('title', '').lower() or
                q in j.get('issn', '').lower() or
                q in j.get('eissn', '').lower() or
                q in j.get('publisher', '').lower() or
                q in j.get('subject', '').lower()
            )
            if not match_q:
                continue
        if subject and subject != 'all' and subject not in j.get('subject', '').lower():
            continue
        if publisher and publisher != 'all' and publisher not in j.get('publisher', '').lower():
            continue
        filtered.append(j)

    filtered.sort(key=lambda x: x.get('title', '').lower())
    return jsonify({
        "items": filtered,
        "total": len(filtered),
        "total_all": len(active_only)
    })


# ── ADMIN INTERNATIONAL DISCOVERY & SUBSCRIBED JOURNALS MANAGEMENT ──

@app.route('/api/admin/international/config', methods=['GET', 'POST'])
def admin_international_config():
    """Manage international discovery master and provider switches."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    if request.method == 'GET':
        return jsonify(_load_international_config())

    data = request.get_json(silent=True) or {}
    cfg = _load_international_config()

    if "enabled" in data:
        cfg["enabled"] = bool(data["enabled"])
    if "sources" in data and isinstance(data["sources"], dict):
        cfg["sources"].update(data["sources"])
    if "filter_subscribed_only_default" in data:
        cfg["filter_subscribed_only_default"] = bool(data["filter_subscribed_only_default"])

    _save_international_config(cfg)
    return jsonify({
        "status": "SUCCESS",
        "message": "Konfigurasi Jurnal Internasional berhasil disimpan.",
        "config": cfg
    })


@app.route('/api/admin/international/journals', methods=['GET', 'POST'])
def admin_subscribed_journals():
    """List or Add/Update subscribed international journals."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    if request.method == 'GET':
        journals = _load_subscribed_journals()
        return jsonify({
            "items": journals,
            "total": len(journals),
            "active_count": sum(1 for j in journals if j.get('active', True))
        })

    data = request.get_json(silent=True) or {}
    jrn_id = str(data.get('id', '')).strip().upper()
    title = str(data.get('title', '')).strip()
    issn = str(data.get('issn', '')).strip()
    eissn = str(data.get('eissn', '')).strip()
    publisher = str(data.get('publisher', '')).strip()
    url = str(data.get('url', '')).strip()
    subject = str(data.get('subject', '')).strip()
    notes = str(data.get('notes', '')).strip()
    active = bool(data.get('active', True))

    if not title:
        return jsonify({"error": "Judul Jurnal wajib diisi."}), 400

    items = _load_subscribed_journals()

    if not jrn_id:
        jrn_id = f"JRN-{int(time.time())}"

    existing_idx = next((i for i, item in enumerate(items) if item.get('id', '').upper() == jrn_id), -1)

    new_obj = {
        "id": jrn_id,
        "title": title,
        "issn": issn,
        "eissn": eissn,
        "publisher": publisher,
        "url": url,
        "subject": subject,
        "notes": notes,
        "active": active,
        "updated_at": datetime.now().isoformat()
    }

    if existing_idx >= 0:
        items[existing_idx] = new_obj
        msg = f"Jurnal '{title}' berhasil diperbarui."
    else:
        items.insert(0, new_obj)
        msg = f"Jurnal '{title}' berhasil ditambahkan ke daftar langganan."

    _save_subscribed_journals(items)
    return jsonify({
        "status": "SUCCESS",
        "message": msg,
        "item": new_obj,
        "items": items,
        "total": len(items)
    })


@app.route('/api/admin/international/journals/<jrn_id>', methods=['DELETE'])
def admin_delete_subscribed_journal(jrn_id):
    """Delete a subscribed journal."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    jrn_id = jrn_id.strip().upper()
    items = _load_subscribed_journals()
    new_items = [it for it in items if it.get('id', '').upper() != jrn_id]

    if len(new_items) == len(items):
        return jsonify({"error": f"Jurnal dengan ID {jrn_id} tidak ditemukan."}), 404

    _save_subscribed_journals(new_items)
    return jsonify({
        "status": "SUCCESS",
        "message": "Jurnal berhasil dihapus dari daftar langganan.",
        "items": new_items,
        "total": len(new_items)
    })


@app.route('/api/admin/international/journals/toggle', methods=['POST'])
def admin_toggle_subscribed_journal():
    """Toggle active state of a subscribed journal."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401
    data = request.get_json(silent=True) or {}
    return _toggle_item_active(_load_subscribed_journals(), data.get('id', ''), _save_subscribed_journals, "Jurnal")


def _parse_tabular_records(raw_text, default_columns):
    """
    Parses pasted text from Excel/Google Sheets (Tab-separated) or CSV (comma/semicolon).
    Supports:
    1. Headers automatically recognized (Title/Judul, Author/Pengarang, Publisher/Penerbit, etc.)
    2. Positional columns if pasted without headers.
    """
    if not raw_text or not raw_text.strip():
        return []

    lines = [line.strip() for line in raw_text.strip().splitlines() if line.strip()]
    if not lines:
        return []

    first_line = lines[0]
    # Detect delimiter
    delimiter = ','
    if '\t' in first_line:
        delimiter = '\t'
    elif ';' in first_line and first_line.count(';') >= first_line.count(','):
        delimiter = ';'

    # Check if first line contains common header names
    lower_tokens = [tok.strip().lower() for tok in first_line.split(delimiter)]
    header_keywords = {'title', 'judul', 'publisher', 'penerbit', 'author', 'pengarang', 'penulis', 'issn', 'isbn', 'subject', 'subjek', 'url', 'link'}
    has_header = any(any(kw in tok for kw in header_keywords) for tok in lower_tokens)

    records = []
    if has_header:
        reader = csv.DictReader(io.StringIO(raw_text), delimiter=delimiter)
        for row in reader:
            records.append({k.strip(): (v or '').strip() for k, v in row.items() if k})
    else:
        reader = csv.reader(io.StringIO(raw_text), delimiter=delimiter)
        for row in reader:
            if not row or not any(field.strip() for field in row):
                continue
            rec = {}
            for col_idx, col_name in enumerate(default_columns):
                rec[col_name] = row[col_idx].strip() if col_idx < len(row) else ''
            records.append(rec)

    return records


@app.route('/api/admin/international/journals/import', methods=['POST'])
def admin_import_subscribed_journals():
    """Bulk import subscribed journals from direct paste (TSV/CSV) or file payload."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    raw_text = ''
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename != '':
            try:
                raw_text = file.read().decode('utf-8-sig', errors='ignore')
            except Exception as e:
                return jsonify({"error": f"Gagal membaca file: {str(e)}"}), 400
    else:
        data = request.get_json(silent=True) or {}
        raw_text = data.get('csv', '') or data.get('text', '') or data.get('pasted', '')

    if not raw_text.strip():
        return jsonify({"error": "Tidak ada data yang ditempel (paste) atau diunggah."}), 400

    default_columns = ['title', 'publisher', 'issn', 'eissn', 'subject', 'access_type', 'url', 'faculty', 'notes']
    rows = _parse_tabular_records(raw_text, default_columns)
    if not rows:
        return jsonify({"error": "Tidak ada baris data valid yang terdeteksi."}), 400

    items = _load_subscribed_journals()
    existing_by_title_or_issn = {}
    for it in items:
        t_key = _norm_title_key(it.get('title', ''))
        if t_key:
            existing_by_title_or_issn[t_key] = it
        issn1 = _norm_issn(it.get('issn', ''))
        if issn1:
            existing_by_title_or_issn[issn1] = it
        issn2 = _norm_issn(it.get('eissn', ''))
        if issn2:
            existing_by_title_or_issn[issn2] = it

    imported_count = 0
    updated_count = 0
    now_str = datetime.now().isoformat()

    for idx, row in enumerate(rows):
        title = (row.get('Title') or row.get('Judul') or row.get('title') or row.get('judul') or '').strip()
        issn = (row.get('ISSN') or row.get('issn') or row.get('Print ISSN') or row.get('p_issn') or '').strip()
        eissn = (row.get('E-ISSN') or row.get('eissn') or row.get('e_issn') or row.get('Online ISSN') or '').strip()
        publisher = (row.get('Publisher') or row.get('Penerbit') or row.get('publisher') or row.get('Database') or '').strip()
        url = (row.get('URL') or row.get('Url') or row.get('Link') or row.get('Akses') or row.get('url') or '').strip()
        subject = (row.get('Subject') or row.get('Subjek') or row.get('Fakultas') or row.get('subject') or '').strip()
        access_type = (row.get('Access') or row.get('access_type') or row.get('Akses') or 'kampus').strip().lower()
        faculty = (row.get('Faculty') or row.get('Fakultas') or row.get('faculty') or '').strip()
        notes = (row.get('Notes') or row.get('Catatan') or row.get('notes') or '').strip()

        if not title and not issn:
            continue

        match_key = _norm_issn(issn) or _norm_issn(eissn) or _norm_title_key(title)
        existing = existing_by_title_or_issn.get(match_key)

        if existing:
            existing['title'] = title or existing['title']
            if issn: existing['issn'] = issn
            if eissn: existing['eissn'] = eissn
            if publisher: existing['publisher'] = publisher
            if url: existing['url'] = url
            if subject: existing['subject'] = subject
            if access_type: existing['accessType'] = access_type
            if faculty: existing['faculty'] = faculty
            if notes: existing['notes'] = notes
            existing['updated_at'] = now_str
            updated_count += 1
        else:
            new_id = f"JRN-{int(time.time())}-{idx+1}"
            new_j = {
                "id": new_id,
                "title": title or f"Journal {issn}",
                "issn": issn,
                "eissn": eissn,
                "publisher": publisher or "Other",
                "accessType": access_type,
                "url": url,
                "subject": subject,
                "faculty": faculty,
                "notes": notes or "Impor Massal",
                "active": True,
                "updated_at": now_str
            }
            items.insert(0, new_j)
            if match_key:
                existing_by_title_or_issn[match_key] = new_j
            imported_count += 1

    _save_subscribed_journals(items)
    return jsonify({
        "status": "SUCCESS",
        "message": f"Berhasil mengimpor {imported_count} jurnal baru dan memperbarui {updated_count} jurnal yang ada.",
        "imported": imported_count,
        "updated": updated_count,
        "total": len(items),
        "items": items
    })


@app.route('/api/admin/international/journals/export')
def admin_export_subscribed_journals():
    """Export subscribed journals as CSV file."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    headers = ['ID', 'Title', 'ISSN', 'E-ISSN', 'Publisher', 'URL', 'Subject', 'Notes', 'Status']
    rows = [
        [j.get('id', ''), j.get('title', ''), j.get('issn', ''), j.get('eissn', ''),
         j.get('publisher', ''), j.get('url', ''), j.get('subject', ''), j.get('notes', ''),
         'Aktif' if j.get('active', True) else 'Nonaktif']
        for j in _load_subscribed_journals()
    ]
    return _generate_csv_download(headers, rows, f"ums_subscribed_journals_{datetime.now().strftime('%Y%m%d')}.csv")


@app.route('/api/admin/international/journals/template')
def admin_template_subscribed_journals():
    """Download sample CSV template for bulk import."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    headers = ['Title', 'ISSN', 'E-ISSN', 'Publisher', 'URL', 'Subject', 'Notes']
    rows = [
        ['Nature Machine Intelligence', '2522-5839', '2522-5839', 'Springer Nature', 'https://www.nature.com/natmachintell/', 'Informatika & AI', 'Langganan UMS 2026'],
        ['The Lancet', '0140-6736', '1474-547X', 'Elsevier', 'https://www.thelancet.com/', 'Kedokteran & Kesehatan', 'Langganan UMS 2026'],
        ['IEEE Transactions on Education', '0018-9359', '1557-9638', 'IEEE', 'https://ieeexplore.ieee.org/', 'Teknik & Pendidikan', 'Konsorsium 2026']
    ]
    return _generate_csv_download(headers, rows, "template_jurnal_langganan_ums.csv")


# ── SUBSCRIBED E-BOOKS MANAGEMENT & PUBLIC DISCOVERY ──

@app.route('/api/international/ebooks')
def api_international_ebooks_public():
    """Public A-Z listing of subscribed international e-books with search & filter support."""
    ebooks = _load_subscribed_ebooks()
    active_only = [b for b in ebooks if b.get('active', True)]

    q = request.args.get('q', '').strip().lower()
    subject = request.args.get('subject', '').strip().lower()
    publisher = request.args.get('publisher', '').strip().lower()
    access = request.args.get('access', '').strip().lower()

    filtered = []
    for b in active_only:
        if q:
            match_q = (
                q in b.get('title', '').lower() or
                q in b.get('author', '').lower() or
                q in b.get('isbn', '').lower() or
                q in b.get('publisher', '').lower() or
                q in b.get('subject', '').lower() or
                q in str(b.get('year', '')).lower() or
                q in b.get('notes', '').lower()
            )
            if not match_q:
                continue
        if subject and subject != 'all' and subject not in b.get('subject', '').lower():
            continue
        if publisher and publisher != 'all' and publisher not in b.get('publisher', '').lower():
            continue
        if access and access != 'all' and access not in b.get('access_type', '').lower():
            continue
        filtered.append(b)

    filtered.sort(key=lambda x: x.get('title', '').lower())
    return jsonify({
        "items": filtered,
        "total": len(filtered),
        "total_all": len(active_only)
    })


# ── INTERNATIONAL OPEN ACCESS E-BOOKS HARVESTER & DISCOVERY ──
INTL_EBOOKS_CACHE = TTLCache(maxsize=1000, default_ttl=7200)


def _fetch_doab_ebooks(query, page=1, limit=15):
    """Fetch open-access academic books from Directory of Open Access Books (DOAB)."""
    items = []
    try:
        offset = max(0, (page - 1) * limit)
        url = "https://directory.doabooks.org/rest/search"
        params = {
            "query": query,
            "expand": "metadata",
            "limit": limit,
            "offset": offset
        }
        headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
        resp = HTTP_SESSION.get(url, params=params, headers=headers, timeout=(3.0, 5.5))
        if resp.status_code == 200:
            data = resp.json()
            raw_items = data if isinstance(data, list) else []
            for it in raw_items:
                metadata = it.get('metadata', [])
                meta_map = {}
                for m in metadata:
                    k = m.get('key', '')
                    v = m.get('value', '')
                    if k not in meta_map:
                        meta_map[k] = []
                    meta_map[k].append(v)

                title = (meta_map.get('dc.title') or ['Untitled'])[0]
                authors = ', '.join(meta_map.get('dc.contributor.author') or meta_map.get('dc.creator') or ['Unknown Author'])
                publisher = (meta_map.get('publisher.name') or meta_map.get('dc.publisher') or ['Academic Publisher'])[0]
                year_str = (meta_map.get('dc.date.issued') or meta_map.get('dc.date.copyright') or [''])[0]
                year = year_str[:4] if len(year_str) >= 4 and year_str[:4].isdigit() else ''
                abstract = (meta_map.get('dc.description.abstract') or meta_map.get('dc.description') or [''])[0]
                subject = ', '.join((meta_map.get('dc.subject') or meta_map.get('dc.subject.other') or [])[:3])
                language = (meta_map.get('dc.language') or ['English'])[0]

                handle = it.get('handle', '')
                detail_url = f"https://directory.doabooks.org/handle/{handle}" if handle else ""

                pdf_urls = meta_map.get('oapen.relation.isAvailableAs') or meta_map.get('dc.identifier.uri') or []
                pdf_url = ""
                for u in pdf_urls:
                    if u.lower().endswith('.pdf') or 'pdf' in u.lower():
                        pdf_url = u
                        break
                if not pdf_url and pdf_urls:
                    pdf_url = pdf_urls[0]

                dois = meta_map.get('oapen.identifier.doi') or []
                doi_url = f"https://doi.org/{dois[0]}" if dois else ""

                items.append({
                    "id": f"doab-{it.get('id') or handle or hash(title)}",
                    "title": title,
                    "authors": authors,
                    "publisher": publisher,
                    "year": year,
                    "subject": subject or "Academic / Scientific",
                    "language": language,
                    "source": "DOAB (Directory of Open Access Books)",
                    "source_badge": "DOAB",
                    "cover_url": "",
                    "pdf_url": pdf_url or detail_url,
                    "url": doi_url or detail_url or pdf_url,
                    "abstract": abstract[:350] + '...' if len(abstract) > 350 else abstract,
                    "is_oa": True,
                    "access_type": "open"
                })
    except Exception as e:
        print(f"[DOAB EBOOKS] Error: {e}")
    return items


def _fetch_openlibrary_ebooks(query, page=1, limit=15):
    """Fetch free full-text ebooks from Open Library (Internet Archive)."""
    items = []
    try:
        url = "https://openlibrary.org/search.json"
        params = {
            "q": query,
            "page": page,
            "limit": limit,
            "mode": "ebooks"
        }
        headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
        resp = HTTP_SESSION.get(url, params=params, headers=headers, timeout=(3.0, 5.0))
        if resp.status_code == 200:
            data = resp.json()
            docs = data.get('docs', [])
            for doc in docs:
                title = doc.get('title') or 'Untitled'
                authors = ', '.join(doc.get('author_name', [])[:3]) or 'Unknown Author'
                year = str(doc.get('first_publish_year') or '')
                publishers = doc.get('publisher', [])
                publisher = publishers[0] if publishers else 'Open Library'
                cover_i = doc.get('cover_i')
                cover_url = f"https://covers.openlibrary.org/b/id/{cover_i}-M.jpg" if cover_i else ""

                ia_ids = doc.get('ia', [])
                key = doc.get('key', '')

                read_url = f"https://archive.org/details/{ia_ids[0]}" if ia_ids else f"https://openlibrary.org{key}"
                pdf_url = f"https://archive.org/download/{ia_ids[0]}/{ia_ids[0]}.pdf" if ia_ids else read_url

                subjects = doc.get('subject', [])
                subject = ', '.join(subjects[:3]) if subjects else "General Literature"
                clean_id = (ia_ids[0] if ia_ids else key.replace('/', '_')).strip('_')

                items.append({
                    "id": f"ol-{clean_id}",
                    "title": title,
                    "authors": authors,
                    "publisher": publisher,
                    "year": year,
                    "subject": subject,
                    "language": (doc.get('language', ['eng']) or ['eng'])[0],
                    "source": "Open Library (Internet Archive)",
                    "source_badge": "Open Library",
                    "cover_url": cover_url,
                    "pdf_url": pdf_url,
                    "url": read_url,
                    "abstract": f"E-book bebas akses dari pangkalan pustaka Open Library & Internet Archive (Tahun: {year})." if year else "Koleksi e-book digital Open Library.",
                    "is_oa": True,
                    "access_type": "open"
                })
    except Exception as e:
        print(f"[OPEN LIBRARY EBOOKS] Error: {e}")
    return items


def _fetch_openalex_ebooks(query, page=1, limit=15):
    """Fetch Open Access books and monographs from OpenAlex."""
    items = []
    try:
        url = "https://api.openalex.org/works"
        params = {
            "search": query,
            "filter": "type:book,is_oa:true",
            "per-page": limit,
            "page": page,
            "mailto": "perpustakaan@ums.ac.id"
        }
        headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
        resp = HTTP_SESSION.get(url, params=params, headers=headers, timeout=(3.0, 5.0))
        if resp.status_code == 200:
            data = resp.json()
            for work in data.get('results', []):
                clean_id = str(work.get('id', '')).split('/')[-1]
                title = clean_title(work.get('title') or 'Untitled')
                authors = extract_openalex_authors(work.get('authorships'))
                doi_clean = clean_doi(work.get('doi') or '')
                doi_url = f"https://doi.org/{doi_clean}" if doi_clean else ""

                src_name = extract_openalex_source_name(work.get('primary_location'), "Academic Publisher")
                oa_info = work.get('open_access') or {}
                best_oa = work.get('best_oa_location') or {}
                pdf_link = best_oa.get('pdf_url') or (oa_info.get('oa_url') if (oa_info.get('oa_url') or '').endswith('.pdf') else '')
                landing_url = best_oa.get('landing_page_url') or oa_info.get('oa_url') or doi_url or f"https://openalex.org/{clean_id}"

                abstract = reconstruct_openalex_abstract(work.get('abstract_inverted_index'))

                items.append({
                    "id": f"oa-bk-{clean_id}",
                    "title": title,
                    "authors": authors,
                    "publisher": src_name,
                    "year": str(work.get('publication_year') or ''),
                    "subject": "Monograph / Academic Book",
                    "language": "English",
                    "source": "OpenAlex Books",
                    "source_badge": "OpenAlex",
                    "cover_url": "",
                    "pdf_url": pdf_link or landing_url,
                    "url": landing_url,
                    "abstract": abstract[:350] + '...' if len(abstract) > 350 else abstract,
                    "is_oa": True,
                    "access_type": "open"
                })
    except Exception as e:
        print(f"[OPENALEX EBOOKS] Error: {e}")
    return items


@app.route('/api/international/ebooks/search')
def api_search_international_ebooks():
    """Live unified search across global Open Access e-book repositories (DOAB, Open Library, OpenAlex)."""
    q = request.args.get('q', '').strip()
    source = request.args.get('source', 'all').strip().lower()
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 15))

    if not q:
        q = "science"

    cache_key = f"intl_ebk_{source}_{q.lower()}_{page}_{limit}"
    cached = INTL_EBOOKS_CACHE.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    results = []
    futures = {}

    with ThreadPoolExecutor(max_workers=3) as executor:
        if source in ('all', 'doab'):
            futures[executor.submit(_fetch_doab_ebooks, q, page, limit)] = 'doab'
        if source in ('all', 'openlibrary'):
            futures[executor.submit(_fetch_openlibrary_ebooks, q, page, limit)] = 'openlibrary'
        if source in ('all', 'openalex'):
            futures[executor.submit(_fetch_openalex_ebooks, q, page, limit)] = 'openalex'

        for future in as_completed(futures):
            try:
                items = future.result()
                if items:
                    results.extend(items)
            except Exception as e:
                print(f"[INTL EBOOKS] Worker error: {e}")

    seen_titles = set()
    deduped = []
    for it in results:
        norm = re.sub(r'[^a-z0-9]', '', (it.get('title') or '').lower())
        if norm and norm in seen_titles:
            continue
        seen_titles.add(norm)
        deduped.append(it)

    resp_data = {
        "ok": True,
        "query": q,
        "source": source,
        "page": page,
        "total": len(deduped),
        "items": deduped
    }

    INTL_EBOOKS_CACHE.set(cache_key, resp_data)
    return jsonify(resp_data)


@app.route('/api/ebooks/<ebk_id>/pdf')
def api_ebook_stream_pdf(ebk_id):
    """Stream PDF for inline reading inside modal/iframe with permissive frame headers."""
    ebk_id = str(ebk_id).strip().upper()
    ebooks = _load_subscribed_ebooks()
    target = next((b for b in ebooks if b.get('id', '').upper() == ebk_id and b.get('active', True)), None)

    if not target:
        return jsonify({"error": "E-Book tidak ditemukan atau tidak aktif."}), 404

    pdf_filename = target.get('pdf_filename', '').strip()
    if pdf_filename:
        pdf_path = os.path.join(SUBSCRIBED_EBOOKS_PDF_DIR, pdf_filename)
        if os.path.exists(pdf_path):
            resp = send_file(pdf_path, mimetype='application/pdf', as_attachment=False)
            resp.headers['X-Frame-Options'] = 'ALLOWALL'
            resp.headers['Content-Security-Policy'] = "frame-ancestors *"
            resp.headers['Access-Control-Allow-Origin'] = "*"
            return resp

    fallback_url = target.get('pdf_url', '').strip() or target.get('url', '').strip()
    if fallback_url:
        return redirect(fallback_url)

    return jsonify({"error": "File PDF untuk e-book ini belum tersedia di server."}), 404


@app.route('/api/ebooks/<ebk_id>/pdf/download')
def api_ebook_download_pdf(ebk_id):
    """Direct attachment download of e-book PDF."""
    ebk_id = str(ebk_id).strip().upper()
    ebooks = _load_subscribed_ebooks()
    target = next((b for b in ebooks if b.get('id', '').upper() == ebk_id and b.get('active', True)), None)

    if not target:
        return jsonify({"error": "E-Book tidak ditemukan atau tidak aktif."}), 404

    if not target.get('allow_download', True):
        return jsonify({"error": "Fitur unduh PDF dinonaktifkan oleh administrator untuk judul ini."}), 403

    pdf_filename = target.get('pdf_filename', '').strip()
    if pdf_filename:
        pdf_path = os.path.join(SUBSCRIBED_EBOOKS_PDF_DIR, pdf_filename)
        if os.path.exists(pdf_path):
            clean_title = _sanitize_pdf_filename(target.get('title') or ebk_id)
            return send_file(pdf_path, mimetype='application/pdf', as_attachment=True, download_name=clean_title)

    fallback_url = target.get('pdf_url', '').strip() or target.get('url', '').strip()
    if fallback_url:
        return redirect(fallback_url)

    return jsonify({"error": "File PDF untuk e-book ini belum tersedia di server."}), 404


@app.route('/api/admin/international/ebooks/upload-pdf', methods=['POST'])
def admin_upload_ebook_pdf():
    """Upload PDF file for a subscribed e-book (max 150MB)."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    if 'file' not in request.files:
        return jsonify({"error": "File PDF tidak ditemukan dalam permintaan."}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({"error": "Nama file PDF kosong."}), 400

    orig_filename = file.filename.strip()
    if not orig_filename.lower().endswith('.pdf'):
        return jsonify({"error": "Hanya file berekstensi .pdf yang diperbolehkan."}), 400

    ebk_id = str(request.form.get('id', '')).strip().upper()
    if not ebk_id:
        ebk_id = f"EBK-{int(time.time())}"

    safe_base = _sanitize_pdf_filename(orig_filename)
    stored_filename = f"{ebk_id}_{safe_base}" if not safe_base.startswith(f"{ebk_id}_") else safe_base

    os.makedirs(SUBSCRIBED_EBOOKS_PDF_DIR, exist_ok=True)
    target_path = os.path.join(SUBSCRIBED_EBOOKS_PDF_DIR, stored_filename)

    try:
        file.save(target_path)
    except Exception as e:
        return jsonify({"error": f"Gagal menyimpan file PDF: {str(e)}"}), 500

    size_bytes = 0
    try:
        size_bytes = os.path.getsize(target_path)
    except Exception:
        pass

    formatted_size = _format_file_size(size_bytes)

    return jsonify({
        "ok": True,
        "status": "SUCCESS",
        "message": f"File '{orig_filename}' ({formatted_size}) berhasil diunggah.",
        "id": ebk_id,
        "pdf_filename": stored_filename,
        "pdf_size": formatted_size,
        "pdf_size_bytes": size_bytes,
        "pdf_url": f"/api/ebooks/{ebk_id}/pdf",
        "download_url": f"/api/ebooks/{ebk_id}/pdf/download",
        "original_filename": orig_filename
    })


@app.route('/api/admin/international/ebooks/<ebk_id>/pdf', methods=['DELETE'])
def admin_delete_ebook_pdf_file(ebk_id):
    """Detach and remove physical PDF file from an e-book entry."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    ebk_id = str(ebk_id).strip().upper()
    items = _load_subscribed_ebooks()
    target = next((b for b in items if b.get('id', '').upper() == ebk_id), None)
    if not target:
        return jsonify({"error": f"E-Book {ebk_id} tidak ditemukan."}), 404

    old_pdf = target.get('pdf_filename', '').strip()
    if old_pdf:
        pdf_path = os.path.join(SUBSCRIBED_EBOOKS_PDF_DIR, old_pdf)
        if os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except Exception:
                pass

    target['pdf_filename'] = ""
    target['pdf_size'] = ""
    target['pdf_url'] = ""
    target['updated_at'] = datetime.now().isoformat()
    _save_subscribed_ebooks(items)
    return jsonify({"status": "SUCCESS", "message": "File PDF berhasil dilepas dari e-book.", "item": target})


@app.route('/api/admin/international/ebooks', methods=['GET', 'POST'])
def admin_subscribed_ebooks():
    """List or Add/Update subscribed international e-books."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    if request.method == 'GET':
        ebooks = _load_subscribed_ebooks()
        return jsonify({
            "items": ebooks,
            "total": len(ebooks),
            "active_count": sum(1 for b in ebooks if b.get('active', True))
        })

    data = request.get_json(silent=True) or {}
    ebk_id = str(data.get('id', '')).strip().upper()
    title = str(data.get('title', '')).strip()
    author = str(data.get('author', '')).strip()
    publisher = str(data.get('publisher', '')).strip()
    year = data.get('year')
    try:
        year = int(year) if year else None
    except Exception:
        year = None
    isbn = str(data.get('isbn', '')).strip()
    url = str(data.get('url', '')).strip()
    cover_url = str(data.get('cover_url', '')).strip()
    subject = str(data.get('subject', '')).strip()
    access_type = str(data.get('access_type', 'kampus')).strip()
    notes = str(data.get('notes', '')).strip()
    pdf_filename = str(data.get('pdf_filename', '')).strip()
    pdf_size = str(data.get('pdf_size', '')).strip()
    pdf_url = str(data.get('pdf_url', '')).strip()
    allow_download = bool(data.get('allow_download', True))
    active = bool(data.get('active', True))

    if not title:
        return jsonify({"error": "Judul E-Book wajib diisi."}), 400

    items = _load_subscribed_ebooks()

    if not ebk_id:
        ebk_id = f"EBK-{int(time.time())}"

    existing_idx = next((i for i, item in enumerate(items) if item.get('id', '').upper() == ebk_id), -1)

    if existing_idx >= 0:
        old_obj = items[existing_idx]
        old_pdf = old_obj.get('pdf_filename', '').strip()
        # If PDF was replaced or removed, delete the old file
        if old_pdf and old_pdf != pdf_filename:
            old_pdf_path = os.path.join(SUBSCRIBED_EBOOKS_PDF_DIR, old_pdf)
            if os.path.exists(old_pdf_path):
                try:
                    os.remove(old_pdf_path)
                except Exception:
                    pass

    # If pdf_filename is set but pdf_url not explicitly provided, default to our streaming route
    effective_pdf_url = pdf_url or (f"/api/ebooks/{ebk_id}/pdf" if pdf_filename else "")

    new_obj = {
        "id": ebk_id,
        "title": title,
        "author": author,
        "publisher": publisher,
        "year": year,
        "isbn": isbn,
        "url": url,
        "cover_url": cover_url,
        "subject": subject,
        "access_type": access_type,
        "notes": notes,
        "pdf_filename": pdf_filename,
        "pdf_size": pdf_size,
        "pdf_url": effective_pdf_url,
        "allow_download": allow_download,
        "active": active,
        "updated_at": datetime.now().isoformat()
    }

    if existing_idx >= 0:
        items[existing_idx] = new_obj
        msg = f"E-Book '{title}' berhasil diperbarui."
    else:
        items.insert(0, new_obj)
        msg = f"E-Book '{title}' berhasil ditambahkan ke daftar langganan."

    _save_subscribed_ebooks(items)
    return jsonify({
        "status": "SUCCESS",
        "message": msg,
        "item": new_obj,
        "items": items,
        "total": len(items)
    })


@app.route('/api/admin/international/ebooks/<ebk_id>', methods=['DELETE'])
def admin_delete_subscribed_ebook(ebk_id):
    """Delete a subscribed e-book and its physical PDF file if present."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    ebk_id = ebk_id.strip().upper()
    items = _load_subscribed_ebooks()
    target_idx = next((i for i, it in enumerate(items) if it.get('id', '').upper() == ebk_id), -1)

    if target_idx < 0:
        return jsonify({"error": f"E-Book dengan ID {ebk_id} tidak ditemukan."}), 404

    target_item = items.pop(target_idx)
    target_pdf = target_item.get('pdf_filename', '').strip()
    if target_pdf:
        target_pdf_path = os.path.join(SUBSCRIBED_EBOOKS_PDF_DIR, target_pdf)
        if os.path.exists(target_pdf_path):
            try:
                os.remove(target_pdf_path)
            except Exception:
                pass

    _save_subscribed_ebooks(items)
    return jsonify({
        "status": "SUCCESS",
        "message": "E-Book berhasil dihapus dari daftar langganan.",
        "items": items,
        "total": len(items)
    })


@app.route('/api/admin/international/ebooks/toggle', methods=['POST'])
def admin_toggle_subscribed_ebook():
    """Toggle active state of a subscribed e-book."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401
    data = request.get_json(silent=True) or {}
    return _toggle_item_active(_load_subscribed_ebooks(), data.get('id', ''), _save_subscribed_ebooks, "E-Book")


@app.route('/api/admin/international/ebooks/import', methods=['POST'])
def admin_import_subscribed_ebooks():
    """Bulk import subscribed e-books from direct paste (TSV/CSV) or file payload."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    raw_text = ''
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename != '':
            try:
                raw_text = file.read().decode('utf-8-sig', errors='ignore')
            except Exception as e:
                return jsonify({"error": f"Gagal membaca file: {str(e)}"}), 400
    else:
        data = request.get_json(silent=True) or {}
        raw_text = data.get('csv', '') or data.get('text', '') or data.get('pasted', '')

    if not raw_text.strip():
        return jsonify({"error": "Tidak ada data yang ditempel (paste) atau diunggah."}), 400

    default_columns = ['title', 'author', 'publisher', 'year', 'isbn', 'subject', 'access_type', 'url', 'cover_url', 'notes']
    rows = _parse_tabular_records(raw_text, default_columns)
    if not rows:
        return jsonify({"error": "Tidak ada baris data valid yang terdeteksi."}), 400

    items = _load_subscribed_ebooks()
    existing_by_title_or_isbn = {}
    for it in items:
        t_key = _norm_title_key(it.get('title', ''))
        if t_key:
            existing_by_title_or_isbn[t_key] = it
        isbn1 = _norm_isbn(it.get('isbn', ''))
        if isbn1:
            existing_by_title_or_isbn[isbn1] = it

    imported_count = 0
    updated_count = 0
    now_str = datetime.now().isoformat()

    for idx, row in enumerate(rows):
        title = (row.get('Title') or row.get('Judul') or row.get('title') or row.get('judul') or '').strip()
        author = (row.get('Author') or row.get('Pengarang') or row.get('Penulis') or row.get('author') or row.get('penulis') or '').strip()
        publisher = (row.get('Publisher') or row.get('Penerbit') or row.get('publisher') or '').strip()
        year_val = (row.get('Year') or row.get('Tahun') or row.get('year') or row.get('tahun') or '').strip()
        year = None
        try:
            if year_val: year = int(re.sub(r'\D', '', year_val)[:4])
        except Exception:
            pass
        isbn = (row.get('ISBN') or row.get('isbn') or row.get('eISBN') or row.get('eisbn') or '').strip()
        url = (row.get('URL') or row.get('Url') or row.get('Link') or row.get('Akses') or row.get('url') or '').strip()
        cover_url = (row.get('Cover') or row.get('cover_url') or row.get('cover') or '').strip()
        subject = (row.get('Subject') or row.get('Subjek') or row.get('Kategori') or row.get('subject') or '').strip()
        access_type = (row.get('Access') or row.get('access_type') or row.get('Akses') or 'kampus').strip().lower()
        notes = (row.get('Notes') or row.get('Catatan') or row.get('notes') or '').strip()

        if not title and not isbn:
            continue

        match_key = _norm_isbn(isbn) or _norm_title_key(title)
        existing = existing_by_title_or_isbn.get(match_key)

        if existing:
            existing['title'] = title or existing['title']
            if author: existing['author'] = author
            if publisher: existing['publisher'] = publisher
            if year: existing['year'] = year
            if isbn: existing['isbn'] = isbn
            if url: existing['url'] = url
            if cover_url: existing['cover_url'] = cover_url
            if subject: existing['subject'] = subject
            if access_type: existing['access_type'] = access_type
            if notes: existing['notes'] = notes
            existing['updated_at'] = now_str
            updated_count += 1
        else:
            new_id = f"EBK-{int(time.time())}-{idx+1}"
            new_b = {
                "id": new_id,
                "title": title or f"E-Book {isbn}",
                "author": author or "Anonim",
                "publisher": publisher or "Other",
                "year": year,
                "isbn": isbn,
                "url": url,
                "cover_url": cover_url,
                "subject": subject,
                "access_type": access_type or "kampus",
                "notes": notes or "Impor Massal",
                "active": True,
                "created_at": now_str
            }
            items.insert(0, new_b)
            if match_key:
                existing_by_title_or_isbn[match_key] = new_b
            imported_count += 1

    _save_subscribed_ebooks(items)
    return jsonify({
        "status": "SUCCESS",
        "message": f"Berhasil mengimpor {imported_count} e-book baru dan memperbarui {updated_count} judul yang sudah ada.",
        "imported": imported_count,
        "updated": updated_count
    })


@app.route('/api/admin/international/ebooks/export')
def admin_export_subscribed_ebooks():
    """Export subscribed e-books as CSV file."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    headers = ['ID', 'Title', 'Author', 'Publisher', 'Year', 'ISBN', 'URL', 'Cover URL', 'Subject', 'Access Type', 'Notes', 'Status']
    rows = [
        [b.get('id', ''), b.get('title', ''), b.get('author', ''), b.get('publisher', ''),
         b.get('year', ''), b.get('isbn', ''), b.get('url', ''), b.get('cover_url', ''),
         b.get('subject', ''), b.get('access_type', 'kampus'), b.get('notes', ''),
         'Aktif' if b.get('active', True) else 'Nonaktif']
        for b in _load_subscribed_ebooks()
    ]
    return _generate_csv_download(headers, rows, f"ums_subscribed_ebooks_{datetime.now().strftime('%Y%m%d')}.csv")


@app.route('/api/admin/international/ebooks/template')
def admin_template_subscribed_ebooks():
    """Download sample CSV template for bulk e-book import."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

    headers = ['Title', 'Author', 'Publisher', 'Year', 'ISBN', 'URL', 'Cover URL', 'Subject', 'Access Type', 'Notes']
    rows = [
        ['Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', 'Pearson', '2021', '978-0134610993', 'https://www.pearson.com/', '', 'Informatika & Komputer', 'kampus', 'Langganan UMS 2026'],
        ['Research Design', 'John W. Creswell', 'SAGE Publications', '2023', '978-1071817940', 'https://us.sagepub.com/', '', 'Metodologi Penelitian', 'ezproxy', 'Akses Sivitas UMS']
    ]
    return _generate_csv_download(headers, rows, "template_ebook_langganan_ums.csv")


# ── ADMIN HARVEST & SCHEDULER MONITORING ──

@app.route('/api/admin/auth/verify', methods=['GET', 'POST'])
def admin_auth_verify():
    """Verify provided admin secret key."""
    if _check_admin_auth():
        return jsonify({"valid": True, "message": "Authentication successful."})
    return jsonify({"valid": False, "error": "Invalid admin secret key."}), 401


@app.route('/api/admin/harvest/status')
def harvest_status():
    """Check current harvest & scheduler state."""
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401
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
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized. Invalid admin secret key."}), 401

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
    items = _load_json_file(INSTITUTIONS_FILE, [])
    return items if isinstance(items, list) else []


def _save_institutions_data(items):
    _save_json_file(INSTITUTIONS_FILE, items)


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
    return _toggle_item_active(_load_institutions_data(), data.get('id', ''), _save_institutions_data, "Institusi")


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


# ── SEARCH ANALYTICS & ZERO-RESULT TRACKER ──
def _load_search_analytics():
    if os.path.exists(SEARCH_ANALYTICS_FILE):
        try:
            with open(SEARCH_ANALYTICS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "summary": {
            "total_searches": 0,
            "zero_result_searches": 0,
            "last_updated": ""
        },
        "top_queries": {},
        "zero_result_queries": {}
    }


def _save_search_analytics(data):
    try:
        tmp = SEARCH_ANALYTICS_FILE + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, SEARCH_ANALYTICS_FILE)
    except Exception as e:
        print(f"[ANALYTICS] Error saving: {e}")


@app.route('/api/analytics/log', methods=['POST'])
def log_search_query():
    """Anonymous search query logger with zero PII/IP logging."""
    data = request.get_json(silent=True) or {}
    query = str(data.get('query') or '').strip().lower()
    query = ' '.join(query.split())
    if len(query) < 3 or len(query) > 80:
        return jsonify({"ok": False, "message": "Query ignored"}), 200

    count = 0
    try:
        count = int(data.get('count', 0))
    except (ValueError, TypeError):
        count = 0

    now_iso = datetime.now().isoformat()
    now_date = datetime.now().strftime('%Y-%m-%d')

    with _analytics_lock:
        analytics = _load_search_analytics()
        summary = analytics.setdefault("summary", {"total_searches": 0, "zero_result_searches": 0, "last_updated": ""})
        summary["total_searches"] = summary.get("total_searches", 0) + 1
        summary["last_updated"] = now_iso

        top_queries = analytics.setdefault("top_queries", {})
        top_item = top_queries.setdefault(query, {"count": 0, "last": now_date})
        top_item["count"] += 1
        top_item["last"] = now_date

        if count == 0:
            summary["zero_result_searches"] = summary.get("zero_result_searches", 0) + 1
            zero_queries = analytics.setdefault("zero_result_queries", {})
            zero_item = zero_queries.setdefault(query, {"count": 0, "last": now_date})
            zero_item["count"] += 1
            zero_item["last"] = now_date

        if len(top_queries) > 500:
            sorted_top = sorted(top_queries.items(), key=lambda x: x[1]['count'], reverse=True)[:500]
            analytics["top_queries"] = dict(sorted_top)
        if len(analytics.get("zero_result_queries", {})) > 500:
            sorted_zero = sorted(analytics["zero_result_queries"].items(), key=lambda x: x[1]['count'], reverse=True)[:500]
            analytics["zero_result_queries"] = dict(sorted_zero)

        _save_search_analytics(analytics)

    return jsonify({"ok": True})


@app.route('/api/admin/analytics/summary', methods=['GET'])
def admin_analytics_summary():
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized"}), 401

    with _analytics_lock:
        data = _load_search_analytics()

    summary = data.get("summary", {"total_searches": 0, "zero_result_searches": 0, "last_updated": ""})
    total = summary.get("total_searches", 0)
    zero_total = summary.get("zero_result_searches", 0)
    zero_pct = round((zero_total / total * 100), 1) if total > 0 else 0.0

    top_list = [
        {"query": q, "count": info["count"], "last": info.get("last", "")}
        for q, info in data.get("top_queries", {}).items()
    ]
    top_list.sort(key=lambda x: x["count"], reverse=True)

    zero_list = [
        {"query": q, "count": info["count"], "last": info.get("last", "")}
        for q, info in data.get("zero_result_queries", {}).items()
    ]
    zero_list.sort(key=lambda x: x["count"], reverse=True)

    return jsonify({
        "ok": True,
        "summary": {
            "total_searches": total,
            "zero_result_searches": zero_total,
            "zero_result_pct": zero_pct,
            "last_updated": summary.get("last_updated", "")
        },
        "top_queries": top_list[:50],
        "zero_result_queries": zero_list[:50]
    })


@app.route('/api/admin/analytics/export', methods=['GET'])
def admin_analytics_export():
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized"}), 401

    with _analytics_lock:
        data = _load_search_analytics()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Kategori", "Kata Kunci Pencarian", "Frekuensi Dicari", "Terakhir Dicari"])

    top_queries = sorted(data.get("top_queries", {}).items(), key=lambda x: x[1]['count'], reverse=True)
    for q, info in top_queries:
        writer.writerow(["Populer", q, info.get("count", 0), info.get("last", "")])

    zero_queries = sorted(data.get("zero_result_queries", {}).items(), key=lambda x: x[1]['count'], reverse=True)
    for q, info in zero_queries:
        writer.writerow(["Zero Result (Tidak Ditemukan)", q, info.get("count", 0), info.get("last", "")])

    date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename=analitik_pencarian_{date_str}.csv"}
    )


@app.route('/api/admin/analytics/reset', methods=['POST'])
def admin_analytics_reset():
    if not _check_admin_auth():
        return jsonify({"error": "Unauthorized"}), 401

    with _analytics_lock:
        data = {
            "summary": {
                "total_searches": 0,
                "zero_result_searches": 0,
                "last_updated": datetime.now().isoformat()
            },
            "top_queries": {},
            "zero_result_queries": {}
        }
        _save_search_analytics(data)

    return jsonify({"ok": True, "message": "Log analitik pencarian berhasil direset."})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
