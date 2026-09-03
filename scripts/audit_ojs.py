#!/usr/bin/env python3
"""
Audit & Harvester Jurnal Ilmiah UMS (OJS Server 1 & Server 2)

Fitur:
- Mengaudit seluruh 100+ set jurnal OJS UMS untuk mendeteksi jumlah artikel real.
- Memanen artikel jurnal per-set secara presisi (mencegah timeout dan resumptionToken terputus).
- Melengkapi metadata abstrak (<dc:description>) dan link direct PDF / DOI.

Penggunaan:
    python scripts/audit_ojs.py --audit          # Cek status & jumlah artikel semua jurnal
    python scripts/audit_ojs.py --harvest        # Harvest semua jurnal per-set & rebuild
    python scripts/audit_ojs.py --only fg jep    # Harvest jurnal tertentu saja
"""

import xml.etree.ElementTree as ET
import urllib.request
import urllib.parse
import urllib.error
import ssl
import json
import os
import sys
import time
import re
import argparse
from datetime import datetime

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'output')
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

OJS_SERVERS = [
    {
        'name': 'UMS OJS Server 1',
        'base_url': 'https://journals.ums.ac.id/index.php/index/oai',
    },
    {
        'name': 'UMS OJS Server 2',
        'base_url': 'https://journals2.ums.ac.id/index.php/index/oai',
    }
]

NAMESPACES = {
    'oai': 'http://www.openarchives.org/OAI/2.0/',
    'oai_dc': 'http://www.openarchives.org/OAI/2.0/oai_dc/',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'marc': 'http://www.loc.gov/MARC21/slim',
}

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def clean_xml_str(text_str):
    if not text_str:
        return ""
    bad_chars = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]')
    text_str = bad_chars.sub('', text_str)
    text_str = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|#)', '&amp;', text_str)
    return text_str


def make_request(url, max_retries=3, delay=1):
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/xml, application/xml'
            })
            with urllib.request.urlopen(req, timeout=30, context=CTX) as response:
                content = response.read().decode('utf-8', errors='replace')
                return clean_xml_str(content)
        except Exception as e:
            if attempt == max_retries - 1:
                return None
            time.sleep(delay * (attempt + 1))
    return None


def get_all_sets(base_url):
    url = f"{base_url}?verb=ListSets"
    content = make_request(url)
    if not content:
        return []
    try:
        tree = ET.fromstring(content)
        sets = []
        for s in tree.findall('.//oai:set', NAMESPACES):
            spec_el = s.find('oai:setSpec', NAMESPACES)
            name_el = s.find('oai:setName', NAMESPACES)
            if spec_el is not None and spec_el.text:
                sets.append({
                    'spec': spec_el.text.strip(),
                    'name': name_el.text.strip() if name_el is not None and name_el.text else spec_el.text.strip()
                })
        return sets
    except Exception as e:
        print(f"Error parsing ListSets: {e}", file=sys.stderr)
        return []


def count_set_records(base_url, set_spec):
    """Hitung jumlah identifier/artikel dalam 1 set."""
    url = f"{base_url}?verb=ListIdentifiers&metadataPrefix=oai_dc&set={urllib.parse.quote(set_spec)}"
    count = 0
    while url:
        content = make_request(url)
        if not content:
            break
        try:
            tree = ET.fromstring(content)
            # Check error (e.g. noRecordsMatch)
            err = tree.find('.//oai:error', NAMESPACES)
            if err is not None:
                break
            headers = tree.findall('.//oai:header', NAMESPACES)
            active_headers = [h for h in headers if h.get('status') != 'deleted']
            count += len(active_headers)

            token_el = tree.find('.//oai:resumptionToken', NAMESPACES)
            if token_el is not None and token_el.text and token_el.text.strip():
                token = token_el.text.strip()
                url = f"{base_url}?verb=ListIdentifiers&resumptionToken={urllib.parse.quote(token)}"
            else:
                url = None
        except Exception:
            break
    return count


def harvest_set_records(base_url, set_spec, set_name):
    """Harvest semua artikel dalam 1 set dengan metadata lengkap (termasuk abstrak)."""
    url = f"{base_url}?verb=ListRecords&metadataPrefix=oai_dc&set={urllib.parse.quote(set_spec)}"
    records = []
    
    while url:
        content = make_request(url)
        if not content:
            break
        try:
            tree = ET.fromstring(content)
            err = tree.find('.//oai:error', NAMESPACES)
            if err is not None:
                break

            for rec in tree.findall('.//oai:record', NAMESPACES):
                header = rec.find('oai:header', NAMESPACES)
                if header is None or header.get('status') == 'deleted':
                    continue

                ident_el = header.find('oai:identifier', NAMESPACES)
                date_el = header.find('oai:datestamp', NAMESPACES)
                oai_id = ident_el.text.strip() if ident_el is not None and ident_el.text else ""
                datestamp = date_el.text.strip() if date_el is not None and date_el.text else ""

                metadata = rec.find('.//oai_dc:dc', NAMESPACES)
                if metadata is None:
                    continue

                # Title
                titles = [t.text.strip() for t in metadata.findall('dc:title', NAMESPACES) if t.text]
                title = titles[0] if titles else "Untitled"

                # Authors / Creators
                creators = [c.text.strip() for c in metadata.findall('dc:creator', NAMESPACES) if c.text]
                author = "; ".join(creators) if creators else ""

                # Subjects
                subjects = [s.text.strip() for s in metadata.findall('dc:subject', NAMESPACES) if s.text]

                # Abstract / Description
                descriptions = [d.text.strip() for d in metadata.findall('dc:description', NAMESPACES) if d.text]
                # Filter out short metadata notes, keep real abstracts
                abstract = ""
                for desc in descriptions:
                    if len(desc) > len(abstract):
                        abstract = desc

                # Date / Year
                dates = [d.text.strip() for d in metadata.findall('dc:date', NAMESPACES) if d.text]
                year = None
                date_str = dates[0] if dates else datestamp
                if date_str:
                    match = re.search(r'\b(19\d\d|20\d\d)\b', date_str)
                    if match:
                        year = int(match.group(1))

                # Identifiers / URLs / DOIs
                ident_list = [i.text.strip() for i in metadata.findall('dc:identifier', NAMESPACES) if i.text]
                url_article = ""
                doi = ""
                for val in ident_list:
                    if val.startswith('http://') or val.startswith('https://'):
                        if 'doi.org' in val:
                            doi = val
                        elif not url_article:
                            url_article = val
                    elif val.startswith('10.'):
                        doi = f"https://doi.org/{val}"

                if not url_article and doi:
                    url_article = doi

                # Publisher / Source Journal
                sources = [s.text.strip() for s in metadata.findall('dc:source', NAMESPACES) if s.text]
                publisher = sources[0] if sources else set_name

                # Types
                types = [t.text.strip() for t in metadata.findall('dc:type', NAMESPACES) if t.text]

                rec_obj = {
                    'id': oai_id or f"ojs_{set_spec}_{len(records)+1}",
                    'title': title,
                    'author': author,
                    'authors': creators,
                    'year': year,
                    'date': date_str,
                    'subjects': subjects,
                    'abstract': abstract,
                    'url': url_article,
                    'doi': doi,
                    'journal': set_name,
                    'publisher': publisher,
                    'source': 'UMS (Journal)',
                    'type': 'JR',
                    'material_type': 'Journal Article',
                    'set_spec': set_spec
                }
                records.append(rec_obj)

            token_el = tree.find('.//oai:resumptionToken', NAMESPACES)
            if token_el is not None and token_el.text and token_el.text.strip():
                token = token_el.text.strip()
                url = f"{base_url}?verb=ListRecords&resumptionToken={urllib.parse.quote(token)}"
            else:
                url = None
        except Exception as e:
            print(f"Error harvesting set {set_spec}: {e}", file=sys.stderr)
            break

    return records


def run_audit():
    print("=" * 70)
    print("  🔍 AUDIT JURNAL ILMIAH UMS (OJS SERVER 1 & SERVER 2)")
    print("=" * 70)

    total_all_journals = 0
    total_all_articles = 0

    for srv in OJS_SERVERS:
        print(f"\n📡 Menghubungkan ke {srv['name']} ({srv['base_url']})...")
        sets = get_all_sets(srv['base_url'])
        # Filter top-level sets (jurnal utama)
        primary_sets = [s for s in sets if ':' not in s['spec']]
        print(f"   Ditemukan {len(sets)} total set ({len(primary_sets)} jurnal utama)\n")

        srv_articles = 0
        for i, s in enumerate(primary_sets, 1):
            count = count_set_records(srv['base_url'], s['spec'])
            srv_articles += count
            status_icon = '✅' if count > 0 else '⚠️ (0 record)'
            print(f"   [{i:02d}/{len(primary_sets):02d}] {s['spec']:<15} {s['name'][:35]:<35} : {count:>4} artikel {status_icon}")

        print(f"\n   📊 Subtotal {srv['name']}: {len(primary_sets)} jurnal | {srv_articles} artikel")
        total_all_journals += len(primary_sets)
        total_all_articles += srv_articles

    print("\n" + "=" * 70)
    print(f"  🏆 TOTAL KESELURUHAN: {total_all_journals} Jurnal Utama | {total_all_articles} Artikel Real")
    print("=" * 70)


def run_harvest(only_sets=None):
    start_time = datetime.now()
    print("=" * 70)
    print(f"  📚 MEMANEN SELURUH JURNAL ILMIAH UMS (OJS 1 & 2)")
    print(f"  Waktu Mulai: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    all_harvested_records = []
    seen_ids = set()

    for srv in OJS_SERVERS:
        print(f"\n📡 Memanen dari {srv['name']}...")
        sets = get_all_sets(srv['base_url'])
        primary_sets = [s for s in sets if ':' not in s['spec']]
        if only_sets:
            primary_sets = [s for s in primary_sets if s['spec'] in only_sets]

        for i, s in enumerate(primary_sets, 1):
            print(f"   [{i:02d}/{len(primary_sets):02d}] Harvesting '{s['spec']}' ({s['name'][:30]})...", end="", flush=True)
            recs = harvest_set_records(srv['base_url'], s['spec'], s['name'])
            new_added = 0
            for r in recs:
                dedup_key = (r['title'].lower(), r['year']) if r['title'] else r['id']
                if dedup_key not in seen_ids:
                    seen_ids.add(dedup_key)
                    all_harvested_records.append(r)
                    new_added += 1
            print(f" → {len(recs)} diunduh ({new_added} baru)", flush=True)

    timestamp = start_time.strftime('%Y%m%d_%H%M%S')
    out_file = os.path.join(OUTPUT_DIR, f"biblio_ojs_complete_{timestamp}.json")

    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(all_harvested_records, f, ensure_ascii=False, indent=2)

    with_abstract = sum(1 for r in all_harvested_records if r.get('abstract'))
    duration = (datetime.now() - start_time).total_seconds()

    print("\n" + "=" * 70)
    print(f"  ✅ HARVEST JURNAL SELESAI ({duration:.1f} detik)")
    print(f"  📄 Total Artikel Terharvest : {len(all_harvested_records)}")
    print(f"  📝 Memiliki Abstrak Lengkap : {with_abstract} ({with_abstract*100/len(all_harvested_records) if all_harvested_records else 0:.1f}%)")
    print(f"  💾 File Output             : {out_file}")
    print("=" * 70)

    # Trigger auto rebuild
    print("\n🔄 Menjalankan rebuild data otomatis...")
    import subprocess
    cmd = [sys.executable, os.path.join(PROJECT_ROOT, 'scripts', 'rebuild.py'), '--all']
    subprocess.run(cmd)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Audit & Harvest Jurnal Ilmiah OJS UMS')
    parser.add_argument('--audit', action='store_true', help='Jalankan audit jumlah artikel per jurnal')
    parser.add_argument('--harvest', action='store_true', help='Jalankan harvest semua set jurnal lengkap')
    parser.add_argument('--only', nargs='+', help='Spesifikasikan setSpec jurnal tertentu')

    args = parser.parse_args()

    if args.audit:
        run_audit()
    elif args.harvest or args.only:
        run_harvest(only_sets=args.only)
    else:
        # Default run audit
        run_audit()
