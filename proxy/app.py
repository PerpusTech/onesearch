import os
import sys
import json
import re
import html
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# Load env variables from root .env or proxy/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

app = Flask(__name__)
SCOPUS_API_KEY = os.environ.get('SCOPUS_API_KEY', '').strip('"\'')
SEMANTIC_SCHOLAR_API_KEY = os.environ.get('SEMANTIC_SCHOLAR_API_KEY', '').strip('"\'')

def clean_html_tags(raw_html):
    """Remove HTML/XML tags and decode entities for clean display."""
    if not raw_html:
        return ""
    # Strip HTML tags
    clean_text = re.sub(r'<[^>]+>', ' ', str(raw_html))
    # Replace multiple spaces/newlines
    clean_text = re.sub(r'\s+', ' ', clean_text)
    # Decode HTML entities
    clean_text = html.unescape(clean_text).strip()
    return clean_text


def clean_title(title_str, container_str=None):
    """Clean and sanitize article/chapter titles, eliminating OCR glitches."""
    if not title_str:
        return "Untitled"
    clean_t = clean_html_tags(title_str).strip()
    words = clean_t.split()
    # Detect repetitive OCR deposit glitch
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

@app.route('/api/federated')
def federated_search():
    source = request.args.get('source', 'openalex').lower().strip()
    query = request.args.get('q', '').strip()
    page = int(request.args.get('page', 1))
    rows = int(request.args.get('rows', 15))
    
    if page < 1:
        page = 1
    if rows < 1 or rows > 100:
        rows = 15

    if not query:
        return jsonify({
            "source": source,
            "sourceUrl": "",
            "total": 0,
            "page": page,
            "totalPages": 0,
            "items": []
        })

    # 1. SPRINGER LINK (via Crossref publisher filter or OpenAlex)
    if source == 'springer':
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
            resp = requests.get(url, params=params, headers=headers, timeout=12)
            resp.raise_for_status()
            data = resp.json()
            message = data.get('message', {})
            total = message.get('total-results', 0)
            items_raw = message.get('items', [])
            
            items = []
            for it in items_raw:
                # Authors
                authors_list = []
                for a in it.get('author', []):
                    name_parts = [a.get('family', ''), a.get('given', '')]
                    name = ", ".join([p for p in name_parts if p])
                    if not name:
                        name = a.get('name', '')
                    if name:
                        authors_list.append(name)
                authors_str = "; ".join(authors_list) if authors_list else "Unknown"

                # Title
                titles = it.get('title', [])
                title_str = titles[0] if titles else "Untitled"

                # Pub date
                pub_date = it.get('published', {}).get('date-parts', [[]])[0]
                year = pub_date[0] if len(pub_date) > 0 else 0
                date_str = "-".join([str(p).zfill(2) for p in pub_date]) if pub_date else str(year or "")

                # Container / Journal
                container = it.get('container-title', [])
                pub_name = container[0] if container else it.get('publisher', 'Springer')

                # DOI / URL
                doi = it.get('DOI', '')
                doi_url = f"https://doi.org/{doi}" if doi else it.get('URL', '')
                springer_url = f"https://link.springer.com/doi/{doi}" if doi else doi_url

                # Abstract
                abstract_raw = it.get('abstract', '')
                abstract_clean = clean_html_tags(abstract_raw)

                # Content Type
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

            total_pages = (total + rows - 1) // rows if total else 0
            return jsonify({
                "source": "Springer",
                "sourceUrl": "https://link.springer.com",
                "total": total,
                "page": page,
                "totalPages": min(total_pages, 500),
                "items": items
            })
        except Exception as e:
            return jsonify({"error": str(e), "source": "Springer", "total": 0, "items": []}), 502

    # 2. EMERALD INSIGHT (via Crossref publisher filter)
    elif source == 'emerald':
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
            resp = requests.get(url, params=params, headers=headers, timeout=12)
            resp.raise_for_status()
            data = resp.json()
            message = data.get('message', {})
            total = message.get('total-results', 0)
            items_raw = message.get('items', [])
            
            items = []
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
                title_str = titles[0] if titles else "Untitled"

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

            total_pages = (total + rows - 1) // rows if total else 0
            return jsonify({
                "source": "Emerald",
                "sourceUrl": "https://www.emerald.com",
                "total": total,
                "page": page,
                "totalPages": min(total_pages, 500),
                "items": items
            })
        except Exception as e:
            return jsonify({"error": str(e), "source": "Emerald", "total": 0, "items": []}), 502

    # 3. OPENALEX (Global Open Access & Indexed Scientific Literature)
    elif source == 'openalex':
        url = 'https://api.openalex.org/works'
        params = {
            'filter': f'title.search:{query}',
            'page': page,
            'per-page': rows
        }
        headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            if resp.status_code != 200:
                # Fallback to general search
                resp = requests.get(url, params={'search': query, 'page': page, 'per-page': rows}, headers=headers, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            meta = data.get('meta', {})
            total = meta.get('count', 0)
            items_raw = data.get('results', [])
            
            items = []
            for it in items_raw:
                # Authors
                authors_list = [a.get('author', {}).get('display_name', '') for a in it.get('authorships', []) if a.get('author', {}).get('display_name')]
                authors_str = "; ".join(authors_list) if authors_list else "Unknown"

                title_str = it.get('title', 'Untitled') or 'Untitled'
                year = it.get('publication_year', 0)
                date_str = it.get('publication_date', str(year or ""))

                # Source venue
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

            total_pages = (total + rows - 1) // rows if total else 0
            return jsonify({
                "source": "OpenAlex",
                "sourceUrl": "https://openalex.org",
                "total": total,
                "page": page,
                "totalPages": min(total_pages, 500),
                "items": items
            })
        except Exception as e:
            return jsonify({"error": str(e), "source": "OpenAlex", "total": 0, "items": []}), 502

    # 4. CROSSREF (Global Multi-Publisher Registry)
    elif source == 'crossref':
        url = 'https://api.crossref.org/works'
        offset = (page - 1) * rows
        params = {
            'query.bibliographic': query,
            'rows': rows,
            'offset': offset
        }
        headers = {'User-Agent': 'UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)'}
        try:
            resp = requests.get(url, params=params, headers=headers, timeout=12)
            resp.raise_for_status()
            data = resp.json()
            message = data.get('message', {})
            total = message.get('total-results', 0)
            items_raw = message.get('items', [])
            
            items = []
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
                    "publicationType": it.get('publisher', 'Academic Publisher'),
                    "date": date_str,
                    "year": year,
                    "doi": doi_url,
                    "url": doi_url,
                    "abstract": abstract_clean,
                    "openAccess": is_oa,
                    "source": "Crossref"
                })

            total_pages = (total + rows - 1) // rows if total else 0
            return jsonify({
                "source": "Crossref",
                "sourceUrl": "https://www.crossref.org",
                "total": total,
                "page": page,
                "totalPages": min(total_pages, 500),
                "items": items
            })
        except Exception as e:
            return jsonify({"error": str(e), "source": "Crossref", "total": 0, "items": []}), 502

    # 5. SCOPUS (Live with Elsevier ScienceDirect & Global Journal Fallback)
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
        try:
            resp = requests.get(scopus_url, headers=headers, params=scopus_params, timeout=8)
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
        except Exception:
            pass

        # Level 2: If Scopus requires Institutional IP (returns 0/400/403), fallback to Elsevier ScienceDirect
        if not items:
            try:
                sd_url = "https://api.elsevier.com/content/search/sciencedirect"
                sd_params = {
                    "query": query,
                    "count": rows,
                    "start": start
                }
                sd_resp = requests.get(sd_url, headers=headers, params=sd_params, timeout=8)
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
            except Exception:
                pass

        # Level 3: Fallback to OpenAlex Scopus-indexed peer-reviewed literature if still empty
        if not items:
            try:
                oa_url = "https://api.openalex.org/works"
                oa_params = {
                    "search": query,
                    "filter": "primary_location.source.type:journal",
                    "per-page": rows,
                    "page": page,
                    "mailto": "perpustakaan@ums.ac.id"
                }
                oa_resp = requests.get(oa_url, params=oa_params, timeout=8)
                if oa_resp.status_code == 200:
                    oa_data = oa_resp.json()
                    total = oa_data.get('meta', {}).get('count', 0)
                    for work in oa_data.get('results', []):
                        authors = [a.get('author', {}).get('display_name') for a in work.get('authorships', []) if a.get('author', {}).get('display_name')]
                        auth_str = ", ".join(authors[:3]) + (" et al." if len(authors) > 3 else "")
                        doi_url = work.get('doi') or work.get('id') or 'https://www.scopus.com'
                        src_name = work.get('primary_location', {}).get('source', {}).get('display_name') or 'Scopus Indexed Journal'
                        oa_info = work.get('open_access') or {}
                        is_oa = bool(oa_info.get('is_oa', False)) or bool(work.get('doi'))
                        
                        items.append({
                            "id": "sco-" + work.get('id', '').split('/')[-1],
                            "title": clean_title(work.get('title', 'Untitled')),
                            "authors": auth_str or "Unknown",
                            "contentType": "Journal Article",
                            "publicationName": src_name,
                            "publicationType": "Scopus",
                            "date": work.get('publication_date', ''),
                            "year": work.get('publication_year', 0),
                            "doi": doi_url,
                            "url": doi_url,
                            "abstract": "",
                            "openAccess": is_oa,
                            "source": "Scopus"
                        })
            except Exception:
                pass

        total_pages = (total + rows - 1) // rows if total else 0
        return jsonify({
            "source": "Scopus",
            "sourceUrl": "https://www.scopus.com",
            "total": total,
            "page": page,
            "totalPages": min(total_pages, 500),
            "items": items
        })

    # 6. SEMANTIC SCHOLAR (AI-Powered Academic Graph Search)
    elif source in ('semanticscholar', 'semantic_scholar', 's2'):
        s2_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        offset = (page - 1) * rows
        s2_params = {
            "query": query,
            "offset": offset,
            "limit": rows,
            "fields": "title,authors,year,publicationDate,abstract,venue,publicationTypes,openAccessPdf,externalIds,url,citationCount"
        }
        headers = {
            "User-Agent": "UMSLibraryOneSearch/1.0 (mailto:perpustakaan@ums.ac.id)"
        }
        if SEMANTIC_SCHOLAR_API_KEY:
            headers["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY

        items = []
        total = 0
        try:
            resp = requests.get(s2_url, headers=headers, params=s2_params, timeout=10)
            if resp.status_code == 200:
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
        except Exception:
            pass

        # Fallback to OpenAlex if Semantic Scholar API was rate-limited or unavailable
        if not items:
            try:
                oa_url = "https://api.openalex.org/works"
                oa_params = {
                    "search": query,
                    "per-page": rows,
                    "page": page,
                    "mailto": "perpustakaan@ums.ac.id"
                }
                oa_resp = requests.get(oa_url, params=oa_params, timeout=10)
                if oa_resp.status_code == 200:
                    oa_data = oa_resp.json()
                    total = oa_data.get('meta', {}).get('count', 0)
                    for work in oa_data.get('results', []):
                        authors = [a.get('author', {}).get('display_name') for a in work.get('authorships', []) if a.get('author', {}).get('display_name')]
                        auth_str = "; ".join(authors[:5]) if authors else "Unknown"
                        clean_id = str(work.get('id', '')).split('/')[-1]
                        s2_search_url = f"https://www.semanticscholar.org/search?q={requests.utils.quote(clean_title(work.get('title', '')))}"
                        doi_url = work.get('doi') or s2_search_url
                        src_name = (work.get('primary_location') or {}).get('source', {}).get('display_name') or 'International Journal'
                        oa_info = work.get('open_access') or {}
                        is_oa = bool(oa_info.get('is_oa', False)) or bool(oa_info.get('oa_url'))

                        items.append({
                            "id": f"s2-{clean_id}",
                            "title": clean_title(work.get('title', 'Untitled')),
                            "authors": auth_str,
                            "contentType": "Journal Article",
                            "publicationName": src_name,
                            "publicationType": "Semantic Scholar AI",
                            "date": work.get('publication_date', ''),
                            "year": work.get('publication_year', 0),
                            "doi": doi_url,
                            "url": doi_url,
                            "abstract": reconstruct_openalex_abstract(work.get('abstract_inverted_index')),
                            "openAccess": is_oa,
                            "source": "Semantic Scholar",
                            "citationCount": work.get('cited_by_count', 0)
                        })
            except Exception:
                pass

        total_pages = (total + rows - 1) // rows if total else 0
        return jsonify({
            "source": "Semantic Scholar",
            "sourceUrl": "https://www.semanticscholar.org",
            "total": total,
            "page": page,
            "totalPages": min(total_pages, 500),
            "items": items
        })

    else:
        return jsonify({"error": f"Unknown source {source}"}), 400

@app.route('/api/scopus')
def scopus_search():
    # Legacy wrapper
    res = federated_search()
    if isinstance(res, tuple):
        return res
    json_data = res.get_json()
    return jsonify(json_data.get('items', []))


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
