#!/usr/bin/env python3
"""
Universal OAI-PMH Harvester
Harvest bibliographic data from any OAI-PMH endpoint:
Koha, EPrints, SLiMS (Senayan), DSpace, etc.

Usage:
    python harvest_oai.py --url URL [--format FORMAT] [--from FROM_DATE]
"""

import xml.etree.ElementTree as ET
import urllib.request
import urllib.parse
import urllib.error
import csv
import json
import os
import sys
import time
import argparse
import ssl
import re
from datetime import datetime

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Resolve project root (parent of scripts/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(PROJECT_ROOT)


NAMESPACES = {
    'oai': 'http://www.openarchives.org/OAI/2.0/',
    'marc': 'http://www.loc.gov/MARC21/slim',
    'oai_dc': 'http://www.openarchives.org/OAI/2.0/oai_dc/',
    'dc': 'http://purl.org/dc/elements/1.1/',
}

FORMAT_PREFERENCE = ['marcxml', 'marc21', 'oai_dc']

def sanitize_xml(text_str):
    # Strip illegal bytes, surrogates, and specifically U+FFFE/FFFF
    bad_chars = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]')
    text_str = bad_chars.sub('', text_str)
    # Fix badly escaped ampersands
    text_str = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|#)', '&amp;', text_str)
    # Strip XML entities pointing to control characters
    text_str = re.sub(r'&#x0*[0-8B-CE-F];', '', text_str, flags=re.IGNORECASE)
    text_str = re.sub(r'&#0*[0-8];|&#0*1[12];|&#0*1[4-9];|&#0*2[0-9];|&#0*3[01];', '', text_str)
    return text_str



def make_oai_request(base_url, params, max_retries=10):
    """Send request to OAI-PMH endpoint with retry logic and WAF Bypass fallback."""
    query = urllib.parse.urlencode(params)
    url = f"{base_url}?{query}"

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    for attempt in range(max_retries):
        try:
            print(f"  Request: {url}")
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'text/xml, application/xml',
            })
            
            try:
                response = urllib.request.urlopen(req, timeout=120, context=ctx)
                data = response.read()
            except urllib.error.HTTPError as e:
                # Blok proteksi WAF (UMJ / UMMAD)
                if e.code in (403, 406, 468, 429, 503):
                    print(f"  HTTP {e.code}: WAF/Cloudflare diaktifkan. Membangun sesi Playwright (Bypass)...")
                    try:
                        from playwright.sync_api import sync_playwright
                        with sync_playwright() as p:
                            browser = p.chromium.launch(headless=True)
                            context = browser.new_context(
                                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                bypass_csp=True
                            )
                            page = context.new_page()
                            # Biarkan browser menangani challenge JS Cloudflare
                            page.goto(url, wait_until='networkidle', timeout=60000)
                            if "Just a moment" in page.title():
                                page.wait_for_timeout(5000)
                            # Jalankan fetch dari context clearance
                            xml_data = page.evaluate('''async (url) => {
                                const res = await fetch(url);
                                return await res.text();
                            }''', url)
                            data = xml_data.encode('utf-8')
                            browser.close()
                    except Exception as play_err:
                        print(f"  [Playwright Gagal] Fallback ke Curl. Err: {play_err}")
                        import subprocess
                        res = subprocess.run(
                            ['curl.exe', '-s', '-k', '-L',
                             '-H', 'User-Agent: Mozilla/5.0',
                             url],
                            capture_output=True, timeout=120
                        )
                        if res.returncode == 0 and res.stdout:
                            data = res.stdout
                        else:
                            raise e
                else:
                    raise e
            except Exception as outer_e:
                raise outer_e

            # Parsing XML
            try:
                root = ET.fromstring(data)
            except ET.ParseError:
                data_str = data.decode('utf-8', errors='replace')
                data_str = sanitize_xml(data_str)
                try:
                    root = ET.fromstring(data_str.encode('utf-8'))
                except ET.ParseError as e:
                    print(f"  [XML Cleanup Failed] Saving debug raw XML... error: {e}")
                    with open('error_debug.xml', 'w', encoding='utf-8') as f:
                        f.write(data_str)
                    raise
            return root
            
        except urllib.error.HTTPError as e:
            # Perlakuan khusus jika Error 500 Koha
            if e.code == 500:
                wait = (attempt + 1) * 30  # Sleep panjang: 30s, 60s, 90s (Max 5 menit)
                print(f"  Koha HTTP 500: Internal Server Overload.")
            else:
                wait = (attempt + 1) * 10
            
            print(f"  HTTP Error {e.code}: {e.reason}")
            if attempt < max_retries - 1:
                print(f"  [Throttling] Sistem mendinginkan mesin selama {wait}s... (percobaan ulang ke-{attempt+2}/{max_retries})")
                time.sleep(wait)
            else:
                raise
        except Exception as e:
            wait = (attempt + 1) * 10
            print(f"  Error Fatal: {e}")
            if attempt < max_retries - 1:
                print(f"  [Throttling] Mendinginkan mesin selama {wait}s... (percobaan ulang ke-{attempt+2}/{max_retries})")
                time.sleep(wait)
            else:
                raise
    return None


def identify(base_url):
    """Get repository information."""
    info = {}
    try:
        root = make_oai_request(base_url, {'verb': 'Identify'})
        if root is None:
            return info
        ident = root.find('.//oai:Identify', NAMESPACES)
        if ident is None:
            ident = root.find('.//{http://www.openarchives.org/OAI/2.0/}Identify')
        if ident is not None:
            fields = ['repositoryName', 'baseURL', 'protocolVersion',
                      'earliestDatestamp', 'granularity', 'adminEmail']
            for f in fields:
                el = (ident.find(f'oai:{f}', NAMESPACES)
                      or ident.find(f'{{http://www.openarchives.org/OAI/2.0/}}{f}'))
                if el is not None and el.text:
                    info[f] = el.text.strip()
            print(f"\n=== Repository Info ===")
            for k, v in info.items():
                print(f"  {k}: {v}")
    except Exception as e:
        print(f"  Could not identify: {e}")
    return info


def list_metadata_formats(base_url):
    """List available metadata formats."""
    formats = []
    try:
        root = make_oai_request(base_url, {'verb': 'ListMetadataFormats'})
        if root is None:
            return formats
        for mf in root.findall('.//oai:metadataPrefix', NAMESPACES):
            if mf.text:
                formats.append(mf.text.strip())
        if not formats:
            for mf in root.findall('.//{http://www.openarchives.org/OAI/2.0/}metadataPrefix'):
                if mf.text:
                    formats.append(mf.text.strip())
        print(f"\n=== Metadata Formats ===")
        for f in formats:
            print(f"  - {f}")
    except Exception as e:
        print(f"  Could not list formats: {e}")
    return formats


def list_sets(base_url):
    """List available sets."""
    sets = []
    try:
        root = make_oai_request(base_url, {'verb': 'ListSets'})
        if root is None:
            return sets
        for s in root.findall('.//oai:set', NAMESPACES):
            spec = s.find('oai:setSpec', NAMESPACES)
            name = s.find('oai:setName', NAMESPACES)
            if spec is None:
                spec = s.find('{http://www.openarchives.org/OAI/2.0/}setSpec')
            if name is None:
                name = s.find('{http://www.openarchives.org/OAI/2.0/}setName')
            if spec is not None and spec.text:
                sets.append({
                    'spec': spec.text,
                    'name': name.text if name is not None and name.text else spec.text
                })
        if sets:
            print(f"\n=== Sets ({len(sets)}) ===")
            for s in sets[:20]:
                print(f"  - {s['spec']}: {s['name']}")
            if len(sets) > 20:
                print(f"  ... and {len(sets)-20} more")
        else:
            print(f"\n=== Sets ===\n  (none)")
    except Exception as e:
        print(f"  Could not list sets: {e}")
    return sets


def auto_select_format(formats):
    """Auto-select the best metadata format."""
    for pref in FORMAT_PREFERENCE:
        if pref in formats:
            return pref
    return formats[0] if formats else 'oai_dc'


# ──── MARC parsing ────

def parse_marcxml_record(metadata):
    """Parse a MARCXML record."""
    ns = '{http://www.loc.gov/MARC21/slim}'
    record = metadata.find(f'.//{ns}record')
    if record is None:
        record = metadata.find('.//marc:record', NAMESPACES)
    if record is None:
        record = metadata

    def get_field(tag, subfield_code='a'):
        for df in record.findall(f'{ns}datafield[@tag="{tag}"]'):
            for sf in df.findall(f'{ns}subfield[@code="{subfield_code}"]'):
                if sf.text:
                    return sf.text.strip()
        for df in record.findall(f'marc:datafield[@tag="{tag}"]', NAMESPACES):
            for sf in df.findall(f'marc:subfield[@code="{subfield_code}"]', NAMESPACES):
                if sf.text:
                    return sf.text.strip()
        return ''

    def get_fields(tag, subfield_code='a'):
        values = []
        for df in record.findall(f'{ns}datafield[@tag="{tag}"]'):
            for sf in df.findall(f'{ns}subfield[@code="{subfield_code}"]'):
                if sf.text and sf.text.strip():
                    values.append(sf.text.strip())
        if not values:
            for df in record.findall(f'marc:datafield[@tag="{tag}"]', NAMESPACES):
                for sf in df.findall(f'marc:subfield[@code="{subfield_code}"]', NAMESPACES):
                    if sf.text and sf.text.strip():
                        values.append(sf.text.strip())
        return values

    def get_control(tag):
        el = record.find(f'{ns}controlfield[@tag="{tag}"]')
        if el is None:
            el = record.find(f'marc:controlfield[@tag="{tag}"]', NAMESPACES)
        return el.text.strip() if el is not None and el.text else ''

    data = {
        'title': get_field('245', 'a'),
        'subtitle': get_field('245', 'b'),
        'author_main': get_field('100', 'a'),
        'author_added': get_fields('700', 'a'),
        'publisher': get_field('260', 'b') or get_field('264', 'b'),
        'date_publication': get_field('260', 'c') or get_field('264', 'c'),
        'isbn': get_field('020', 'a'),
        'call_number_ddc': get_field('082', 'a'),
        'subject': get_fields('650', 'a') + get_fields('653', 'a'),
        'edition': get_field('250', 'a'),
        'physical_extent': get_field('300', 'a'),
        'item_type': '',
        '_dc_url': get_field('856', 'u'),
        '_dc_description': get_field('520', 'a')[:300] if get_field('520', 'a') else '',
    }

    # Item type from leader
    leader = get_control('000') or ''
    cf008 = get_control('008') or ''
    itemtype = get_field('942', 'c')
    if itemtype:
        data['item_type'] = itemtype
    elif len(leader) > 6:
        lt = leader[6]
        data['item_type'] = {'a': 'BKS', 'm': 'CF', 'e': 'MAP',
                             'c': 'MUS', 'i': 'REC', 'g': 'VIS'}.get(lt, 'BKS')

    return data


# ──── Dublin Core parsing ────

def parse_dc_record(metadata):
    """Parse a Dublin Core (oai_dc) record — universal for any OAI source."""
    dc = metadata.find('oai_dc:dc', NAMESPACES)
    if dc is None:
        dc = metadata.find('{http://www.openarchives.org/OAI/2.0/oai_dc/}dc')
    if dc is None:
        dc = metadata

    def get_dc(field):
        el = dc.find(f'dc:{field}', NAMESPACES)
        if el is None:
            el = dc.find(f'{{http://purl.org/dc/elements/1.1/}}{field}')
        return el.text.strip() if el is not None and el.text else ''

    def get_dc_all(field):
        vals = []
        for el in dc.findall(f'dc:{field}', NAMESPACES):
            if el.text and el.text.strip():
                vals.append(el.text.strip())
        if not vals:
            for el in dc.findall(f'{{http://purl.org/dc/elements/1.1/}}{field}'):
                if el.text and el.text.strip():
                    vals.append(el.text.strip())
        return vals

    title = get_dc('title')
    # Clean up title (EPrints sometimes has \r\n in titles)
    title = re.sub(r'[\r\n\t]+', ' ', title).strip()

    creators = get_dc_all('creator')
    # Filter out advisor-like creators (EPrints puts advisors as creators)
    authors = []
    for c in creators:
        c = c.strip().rstrip(',').strip()
        # Skip entries that start with ", " or look like advisor prefixes
        if c.startswith(',') or c.startswith('Drs') or c.startswith('Dr.') or c.startswith('Prof'):
            continue
        if c:
            authors.append(c)
    main_author = authors[0] if authors else (creators[0].strip().rstrip(',') if creators else '')

    subjects = get_dc_all('subject')
    identifiers = get_dc_all('identifier')
    dates = get_dc_all('date')
    types = get_dc_all('type')
    formats = get_dc_all('format')
    relations = get_dc_all('relation')

    # Extract DDC from various sources
    ddc = ''
    clean_subjects = []
    for s in subjects:
        s = s.strip()
        # Check if subject IS a DDC number (SLiMS puts DDC as subject)
        if re.match(r'^\d{3}(\.\d+)?$', s):
            if not ddc:
                ddc = s
        else:
            clean_subjects.append(s)

    # Check identifiers for DDC/call number (SLiMS: "811 CER")
    if not ddc:
        for ident in identifiers:
            m = re.match(r'^(\d{3}(?:\.\d+)?)\s', ident)
            if m:
                ddc = m.group(1)
                break

    # Try to extract year
    year = ''
    for d in dates:
        m = re.search(r'(19|20)\d{2}', str(d))
        if m:
            year = m.group(0)
            break

    # Determine type
    item_type = 'BKS'
    for t in types:
        tl = t.lower()
        if 'thesis' in tl or 'skripsi' in tl:
            item_type = 'THESIS'
        elif 'article' in tl or 'jurnal' in tl:
            item_type = 'JR'
        elif 'conference' in tl:
            item_type = 'CONF'
        elif 'book' in tl:
            item_type = 'BKS'
        elif 'report' in tl:
            item_type = 'RPT'

    # Find URL to the item
    url = ''
    for r in relations + identifiers:
        if r.startswith('http'):
            url = r
            break

    # Publisher
    publisher = get_dc('publisher')

    # Physical description
    phys = ''
    for f in formats:
        if not f.startswith('application/') and not f.startswith('text/'):
            phys = f
            break

    data = {
        'title': title,
        'author_main': main_author,
        'author_added': authors[1:] if len(authors) > 1 else [],
        'publisher': publisher,
        'date_publication': year,
        'call_number_ddc': ddc,
        'subject': clean_subjects,
        'item_type': item_type,
        'physical_extent': phys,
        'isbn': '',
        'edition': '',
        '_dc_url': url,
        '_dc_description': get_dc('description')[:300] if get_dc('description') else '',
    }
    return data


# ──── Harvesting ────

def find_element(parent, local_name):
    """Find element with or without namespace."""
    el = parent.find(f'oai:{local_name}', NAMESPACES)
    if el is None:
        el = parent.find(f'{{http://www.openarchives.org/OAI/2.0/}}{local_name}')
    if el is None:
        el = parent.find(local_name)
    return el


def auto_derive_source(base_url, repo_info=None):
    """Derive a short source/institution code from URL or repositoryName.
    
    Examples:
        https://perpus.ummad.ac.id/oai2.php → 'UMMAD'
        https://lib-smabasasolo.edutrend.id/oai2.php → 'SMA Basa Solo'
        http://172.16.10.43/cgi-bin/koha/oai.pl → 'UMS' (from repositoryName)
        http://eprints.ums.ac.id/cgi/oai2 → 'UMS'
    """
    # Try repositoryName first — most descriptive
    repo_name = (repo_info or {}).get('repositoryName', '')
    
    # Extract hostname
    m = re.search(r'https?://([^/:]+)', base_url)
    hostname = m.group(1) if m else ''
    
    # If IP address, use repositoryName
    if re.match(r'^\d+\.\d+\.\d+\.\d+$', hostname):
        if repo_name:
            # "Perpustakaan Universitas Muhammadiyah Surakarta" → "UMS"
            # Try acronym from significant words
            words = [w for w in repo_name.split() 
                     if w.lower() not in ('perpustakaan', 'library', 'universitas',
                                          'university', 'institut', 'institute',
                                          'sekolah', 'school', 'akademi', 'academy',
                                          'the', 'of', 'dan', 'and', 'digital')]
            if words:
                # Use initials of remaining words
                return ''.join(w[0].upper() for w in words if len(w) > 1)
        return hostname.replace('.', '-')
    
    # Parse hostname parts
    parts = hostname.split('.')
    
    # For .ac.id domains: extract institution part
    # perpus.ummad.ac.id → ummad
    # eprints.ums.ac.id → ums
    # lib-smabasasolo.edutrend.id → lib-smabasasolo
    if len(parts) >= 3:
        # Find the "institution" part (usually 2nd from domain suffix)
        # For .ac.id (4 parts): parts[-3] is institution
        # For .edutrend.id: parts[0] is the unique subdomain
        if parts[-2] == 'ac' or parts[-2] == 'or' or parts[-2] == 'go':
            # Academic/gov domain: perpus.ummad.ac.id → ummad
            inst = parts[-3] if len(parts) >= 4 else parts[0]
            # Skip generic prefixes
            if inst in ('perpus', 'lib', 'library', 'eprints', 'repo',
                        'repository', 'digilib', 'dspace', 'opac', 'www'):
                inst = parts[-3] if len(parts) >= 4 else parts[-4] if len(parts) >= 5 else inst
            return inst.upper()
        else:
            # Shared platform domain like edutrend.id
            # lib-smabasasolo.edutrend.id → subdomain is the identifier
            subdomain = parts[0]
            # Clean up: lib-smabasasolo → SMA Basa Solo
            subdomain = re.sub(r'^(lib-|perpus-|repo-)', '', subdomain)
            # Try to make it readable
            # smabasasolo → SMA Basa Solo (heuristic)
            # smamuhpksolo → SMA Muhpk Solo  
            return subdomain.upper()
    elif len(parts) == 2:
        return parts[0].upper()
    
    return hostname.upper()


def harvest_records(base_url, metadata_prefix='oai_dc', from_date=None,
                    until_date=None, set_spec=None, output_dir='output',
                    resume_token=None, source_name=None, repo_info=None):
    """Harvest all records from an OAI-PMH endpoint."""
    os.makedirs(output_dir, exist_ok=True)

    params = {'verb': 'ListRecords', 'metadataPrefix': metadata_prefix}
    if from_date:
        params['from'] = from_date
    if until_date:
        params['until'] = until_date
    if set_spec:
        params['set'] = set_spec

    all_records = []
    total = 0
    batch = 0
    resumption_token = resume_token

    print(f"\n=== Harvesting Records (format: {metadata_prefix}) ===")
    if resume_token:
        print(f"  RESUMING from token: {resume_token}")
    if from_date:
        print(f"  From: {from_date}")

    while True:
        batch += 1

        if resumption_token:
            req_params = {'verb': 'ListRecords', 'resumptionToken': resumption_token}
        else:
            req_params = params

        print(f"\n--- Batch {batch} ---")

        try:
            root = make_oai_request(base_url, req_params)
        except KeyboardInterrupt:
            print(f"\n  [Peringatan] Dihentikan oleh user (Ctrl+C). Menyimpan {total} data sementara...")
            break
        except Exception as e:
            print(f"  Fatal error: {e}")
            print("  Gagal setelah percobaan maksimal (10x).")
            print("  Menghentikan harvest untuk institusi ini dan otomatis melompat ke harvest berikutnya...")
            break

        if root is None:
            print("  No response received")
            break

        error = find_element(root, 'error')
        if error is None:
            error = root.find('.//oai:error', NAMESPACES)
        if error is not None:
            code = error.get('code', 'unknown')
            msg = error.text or ''
            print(f"  OAI Error [{code}]: {msg}")
            if code == 'noRecordsMatch':
                print("  No records match criteria.")
            break

        records = root.findall('.//oai:record', NAMESPACES)
        if not records:
            records = root.findall('.//{http://www.openarchives.org/OAI/2.0/}record')
        if not records:
            records = root.findall('.//record')

        batch_count = 0
        deleted_count = 0

        if batch == 1 and not records:
            print(f"  DEBUG: No records found. Root tag: {root.tag}")
            for child in root:
                print(f"  DEBUG:   {child.tag}")

        for record in records:
            header = find_element(record, 'header')
            metadata = find_element(record, 'metadata')

            if header is not None and header.get('status') == 'deleted':
                deleted_count += 1
                continue

            rec_data = {}
            if header is not None:
                ident_el = find_element(header, 'identifier')
                datestamp_el = find_element(header, 'datestamp')
                if ident_el is not None and ident_el.text:
                    rec_data['oai_identifier'] = ident_el.text.strip()
                if datestamp_el is not None and datestamp_el.text:
                    rec_data['oai_datestamp'] = datestamp_el.text.strip()

            if metadata is not None:
                if metadata_prefix in ('marcxml', 'marc21'):
                    parsed = parse_marcxml_record(metadata)
                else:
                    parsed = parse_dc_record(metadata)
                rec_data.update(parsed)
            
            if rec_data.get('title'):
                all_records.append(rec_data)
                batch_count += 1

        total += batch_count
        print(f"  Records: {batch_count} | Deleted: {deleted_count} | Total: {total}")

        rt = root.find('.//oai:resumptionToken', NAMESPACES)
        if rt is None:
            rt = root.find('.//{http://www.openarchives.org/OAI/2.0/}resumptionToken')
        if rt is None:
            rt = root.find('.//resumptionToken')

        if rt is not None and rt.text:
            resumption_token = rt.text.strip()
            size = rt.get('completeListSize', '?')
            cursor = rt.get('cursor', '?')
            print(f"  Progress: {cursor}/{size}")
            print(f"  Resumption token found, continuing...")
            time.sleep(1)
        else:
            print(f"\n  Harvesting complete!")
            resumption_token = None
            break

    # Save
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    if all_records:
        # Build metadata
        meta = {
            'source': source_name or auto_derive_source(base_url, repo_info),
            'repositoryName': (repo_info or {}).get('repositoryName', ''),
            'baseURL': base_url,
            'metadataPrefix': metadata_prefix,
            'totalRecords': total,
            'harvestedAt': datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
        }
        
        # Save JSON with metadata wrapper
        json_file = os.path.join(output_dir, f'biblio_{timestamp}.json')
        output_data = {
            '_meta': meta,
            'records': all_records,
        }
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        print(f"\n  Saved JSON: {json_file}")
        print(f"  Source: {meta['source']}")

        csv_file = os.path.join(output_dir, f'biblio_{timestamp}.csv')
        flat_records = []
        for rec in all_records:
            flat = {}
            for k, v in rec.items():
                if isinstance(v, list):
                    flat[k] = ' | '.join(str(i) for i in v)
                else:
                    flat[k] = v
            flat_records.append(flat)

        all_keys = set()
        for rec in flat_records:
            all_keys.update(rec.keys())
        all_keys = sorted(all_keys)

        with open(csv_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=all_keys)
            writer.writeheader()
            writer.writerows(flat_records)
        print(f"  Saved CSV: {csv_file}")

    print(f"\n=== Summary ===")
    print(f"  Total records: {total}")
    print(f"  Output: {os.path.abspath(output_dir)}")

    return all_records


def main():
    parser = argparse.ArgumentParser(
        description='Universal OAI-PMH Harvester (Koha, EPrints, SLiMS, DSpace, etc.)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Contoh penggunaan:
  # Harvest Koha (auto-detect best format)
  python harvest_oai.py --url http://172.16.10.43/cgi-bin/koha/oai.pl

  # Harvest EPrints
  python harvest_oai.py --url http://eprints.ums.ac.id/cgi/oai2

  # Harvest SLiMS
  python harvest_oai.py --url https://lib-smabasasolo.edutrend.id/oai2.php

  # Force specific format
  python harvest_oai.py --url URL --format oai_dc

  # Harvest with date range
  python harvest_oai.py --url URL --from 2024-01-01

  # Info only
  python harvest_oai.py --url URL --info

  # Resume interrupted harvest
  python harvest_oai.py --url URL --resume "TOKEN"
        """
    )

    parser.add_argument('--url', required=True, help='OAI-PMH endpoint URL')
    parser.add_argument('--format', default='auto',
                        help='Metadata format (auto, marcxml, oai_dc)')
    parser.add_argument('--from', dest='from_date', help='From date (YYYY-MM-DD)')
    parser.add_argument('--until', dest='until_date', help='Until date (YYYY-MM-DD)')
    parser.add_argument('--set', dest='set_spec', help='OAI set spec')
    parser.add_argument('--output', default='output', help='Output directory')
    parser.add_argument('--info', action='store_true', help='Show info only')
    parser.add_argument('--resume', default=None, help='Resume from token')
    parser.add_argument('--source', default=None,
                        help='Nama institusi/sumber (misal: "SMA Basa Solo"). '
                             'Jika tidak diberikan, otomatis dideteksi dari URL.')

    args = parser.parse_args()

    print("=" * 60)
    print("  Universal OAI-PMH Harvester")
    print(f"  Target: {args.url}")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    info = identify(args.url)
    formats = list_metadata_formats(args.url)
    list_sets(args.url)

    if args.info:
        print("\n(Info mode — no harvesting)")
        return

    # Show detected source
    source = args.source
    if source:
        print(f"\n  Source (manual): {source}")
    else:
        source = auto_derive_source(args.url, info)
        print(f"\n  Source (auto): {source}")

    # Auto-select format
    if args.format == 'auto':
        fmt = auto_select_format(formats) if formats else 'oai_dc'
        print(f"  Auto-selected format: {fmt}")
    else:
        fmt = args.format
        if formats and fmt not in formats:
            print(f"\n  Warning: '{fmt}' may not be available.")
            print(f"  Available: {', '.join(formats)}")

    harvest_records(
        base_url=args.url,
        metadata_prefix=fmt,
        from_date=args.from_date,
        until_date=args.until_date,
        set_spec=args.set_spec,
        output_dir=args.output,
        resume_token=args.resume,
        source_name=source,
        repo_info=info,
    )


if __name__ == '__main__':
    main()
