import os
import re
import html
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# Load env variables from root .env or proxy/.env
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

app = Flask(__name__)
SCOPUS_API_KEY = os.environ.get('SCOPUS_API_KEY', '').strip('"\'')

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
                oa_url = it.get('open_access', {}).get('oa_url', '')
                direct_url = oa_url or doi or f"https://openalex.org/{it.get('id', '')}"

                abstract_clean = reconstruct_openalex_abstract(it.get('abstract_inverted_index'))

                doc_type = it.get('type', 'article').replace('-', ' ').title()

                items.append({
                    "id": f"oa-{it.get('id', '')}",
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
