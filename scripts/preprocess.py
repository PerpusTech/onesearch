#!/usr/bin/env python3
"""
Preprocessing script: Convert OAI-PMH harvest data into optimized
format for UMS Library OneSearch web app. Handles Koha, EPrints, SLiMS, etc.

Usage:
    python preprocess.py [--input INPUT_JSON] [--output OUTPUT_DIR]
"""

import json
import os
import re
import sys
import argparse
import hashlib
from collections import Counter, defaultdict
from datetime import datetime

# Resolve project root (parent of scripts/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'scripts'))

from ddc_sections import DDC_SECTIONS
from prodi_rules import PRODI_RULES, PRODI_META, get_prodi_for_ddc


# DDC Main Classes (Bahasa Indonesia)
DDC_CLASSES = {
    '0': {'label': 'Komputer, Informasi & Referensi Umum', 'label_en': 'Computer Science, Information & General Works', 'icon': '💻'},
    '1': {'label': 'Filsafat & Psikologi', 'label_en': 'Philosophy & Psychology', 'icon': '🧠'},
    '2': {'label': 'Agama', 'label_en': 'Religion', 'icon': '🕌'},
    '3': {'label': 'Ilmu Sosial', 'label_en': 'Social Sciences', 'icon': '👥'},
    '4': {'label': 'Bahasa', 'label_en': 'Language', 'icon': '🗣️'},
    '5': {'label': 'Sains & Matematika', 'label_en': 'Science & Mathematics', 'icon': '🔬'},
    '6': {'label': 'Teknologi', 'label_en': 'Technology', 'icon': '⚙️'},
    '7': {'label': 'Kesenian & Rekreasi', 'label_en': 'Arts & Recreation', 'icon': '🎨'},
    '8': {'label': 'Sastra', 'label_en': 'Literature', 'icon': '📖'},
    '9': {'label': 'Sejarah & Geografi', 'label_en': 'History & Geography', 'icon': '🌍'},
}

# DDC Divisions - uses comprehensive DDC_SECTIONS from ddc_sections.py
# This alias ensures backward compatibility with any code referencing DDC_DIVISIONS
DDC_DIVISIONS = DDC_SECTIONS

# Library of Congress → DDC rough mapping
# LC uses letter codes, DDC uses numbers. This is an approximate mapping.
LC_TO_DDC = {
    # General
    'A': '000',    # General Works
    'AC': '080',   # Collections
    'AE': '030',   # Encyclopedias
    'AG': '030',
    'AI': '010',
    'AM': '060',   # Museums
    'AN': '070',   # Newspapers
    'AP': '050',   # Periodicals
    'AS': '060',
    'AY': '030',
    'AZ': '001',

    # Philosophy, Psychology, Religion
    'B': '100',    # Philosophy, Psychology, Religion
    'BC': '160',   # Logic
    'BD': '110',   # Speculative Philosophy
    'BF': '150',   # Psychology
    'BJ': '170',   # Ethics
    'BL': '200',   # Religion
    'BM': '296',
    'BP': '297',   # Islam
    'BQ': '294',   # Buddhism
    'BR': '270',   # Christianity
    'BS': '220',   # Bible
    'BT': '230',   # Doctrinal Theology
    'BV': '260',
    'BX': '280',

    # History / Auxiliary Sciences
    'C': '900',
    'CB': '909',
    'CC': '930',
    'CD': '020',
    'CE': '529',
    'CJ': '737',
    'CN': '930',
    'CR': '929',
    'CS': '929',
    'CT': '920',   # Biography

    # World History
    'D': '940',
    'DA': '942',
    'DB': '943',
    'DC': '944',
    'DD': '943',
    'DE': '930',
    'DF': '938',
    'DG': '945',
    'DH': '949',
    'DJ': '949',
    'DK': '947',
    'DL': '948',
    'DP': '946',
    'DQ': '949',
    'DR': '949',
    'DS': '950',
    'DT': '960',
    'DU': '990',
    'DX': '909',

    # Americas
    'E': '970',
    'F': '970',

    # Geography, Anthropology
    'G': '910',
    'GA': '912',
    'GB': '551',   # Physical Geography
    'GC': '551',   # Oceanography
    'GE': '333',   # Environmental Sciences
    'GF': '304',   # Human Ecology
    'GN': '572',   # Anthropology
    'GR': '398',   # Folklore
    'GT': '390',   # Manners & Customs
    'GV': '790',   # Recreation

    # Social Sciences
    'H': '300',
    'HA': '310',   # Statistics
    'HB': '330',   # Economic Theory
    'HC': '330',
    'HD': '331',   # Industries, Land use, Labor
    'HE': '380',   # Transportation
    'HF': '380',   # Commerce
    'HG': '332',   # Finance
    'HJ': '336',   # Public Finance
    'HM': '301',   # Sociology
    'HN': '361',
    'HQ': '306',   # Family, Marriage
    'HS': '366',   # Societies
    'HT': '307',   # Communities
    'HV': '361',   # Social Pathology
    'HX': '335',   # Socialism

    # Political Science
    'J': '320',
    'JA': '320',
    'JC': '320',
    'JF': '351',
    'JK': '320',
    'JL': '320',
    'JN': '320',
    'JQ': '320',
    'JS': '352',
    'JV': '325',   # Colonization, Migration
    'JX': '341',
    'JZ': '327',

    # Law
    'K': '340',
    'KD': '340',
    'KF': '340',

    # Education
    'L': '370',
    'LA': '370',
    'LB': '371',
    'LC': '370',
    'LD': '378',
    'LE': '378',
    'LF': '378',
    'LG': '378',
    'LJ': '378',
    'LT': '370',

    # Music
    'M': '780',
    'ML': '780',
    'MT': '780',

    # Fine Arts
    'N': '700',
    'NA': '720',   # Architecture
    'NB': '730',   # Sculpture
    'NC': '741',   # Drawing
    'ND': '750',   # Painting
    'NE': '760',   # Print Media
    'NK': '745',   # Decorative Arts
    'NX': '700',

    # Language & Literature
    'P': '400',
    'PA': '470',   # Greek, Latin
    'PB': '491',   # Celtic
    'PC': '440',   # Romanic
    'PD': '439',   # Germanic
    'PE': '420',   # English
    'PF': '430',   # German
    'PG': '491',   # Slavic
    'PH': '494',   # Uralic
    'PJ': '492',   # Semitic
    'PK': '491',   # Indo-Iranian
    'PL': '495',   # East Asian
    'PM': '497',   # American
    'PN': '800',   # Literature General
    'PQ': '840',   # French, Italian, Spanish Lit
    'PR': '820',   # English Literature
    'PS': '810',   # American Literature
    'PT': '830',   # German Literature
    'PZ': '808',   # Fiction

    # Science
    'Q': '500',
    'QA': '510',   # Mathematics
    'QB': '520',   # Astronomy
    'QC': '530',   # Physics
    'QD': '540',   # Chemistry
    'QE': '550',   # Geology
    'QH': '570',   # Natural History, Biology
    'QK': '580',   # Botany
    'QL': '590',   # Zoology
    'QM': '611',   # Human Anatomy
    'QP': '612',   # Physiology
    'QR': '616',   # Microbiology

    # Medicine
    'R': '610',
    'RA': '614',
    'RB': '616',
    'RC': '616',
    'RD': '617',
    'RE': '617',
    'RF': '617',
    'RG': '618',
    'RJ': '618',
    'RK': '617',
    'RL': '616',
    'RM': '615',
    'RS': '615',
    'RT': '610',
    'RV': '615',
    'RX': '615',
    'RZ': '615',

    # Agriculture
    'S': '630',
    'SB': '635',
    'SD': '634',
    'SF': '636',
    'SH': '639',
    'SK': '639',

    # Technology
    'T': '600',
    'TA': '620',   # Engineering
    'TC': '627',
    'TD': '628',   # Environmental
    'TE': '625',
    'TF': '625',
    'TG': '624',
    'TH': '690',   # Building Construction
    'TJ': '621',   # Mechanical Engineering
    'TK': '621',   # Electrical Engineering
    'TL': '629',   # Motor Vehicles, Aeronautics
    'TN': '622',   # Mining
    'TP': '660',   # Chemical Technology
    'TR': '770',   # Photography
    'TS': '670',   # Manufactures
    'TT': '680',   # Handicrafts
    'TX': '640',   # Home Economics

    # Military Science
    'U': '355',
    'UA': '355',
    'UB': '355',
    'UC': '355',
    'UD': '355',
    'UE': '355',
    'UF': '355',
    'UG': '358',
    'UH': '355',

    # Naval Science
    'V': '359',
    'VA': '359',
    'VB': '359',
    'VC': '359',
    'VD': '359',
    'VE': '359',
    'VF': '359',
    'VG': '359',
    'VK': '623',
    'VM': '623',

    # Library Science
    'Z': '020',
    'ZA': '025',
}


def lc_subject_to_ddc(subject):
    """Convert Library of Congress subject classification to approximate DDC.
    
    Examples:
        'G Geography (General)' → '910'
        'BF Religion and Philosophy' → '150'
        'HD28 Management' → '658'
    """
    if not subject:
        return ''
    
    # Extract the LC class letters from the subject
    m = re.match(r'^([A-Z]{1,3})\d*\s', subject)
    if not m:
        m = re.match(r'^([A-Z]{1,3})$', subject.strip())
    if not m:
        return ''
    
    lc_code = m.group(1)
    
    # Try most specific match first (2-3 letters), then fall back
    if lc_code in LC_TO_DDC:
        return LC_TO_DDC[lc_code]
    if len(lc_code) >= 2 and lc_code[:2] in LC_TO_DDC:
        return LC_TO_DDC[lc_code[:2]]
    if lc_code[0] in LC_TO_DDC:
        return LC_TO_DDC[lc_code[0]]
    
    return ''


# Special subject keywords → DDC mapping (for records without DDC or LC)
KEYWORD_TO_DDC = {
    'management': '658', 'manajemen': '658',
    'accounting': '657', 'akuntansi': '657',
    'finance': '332', 'keuangan': '332',
    'marketing': '658.8', 'pemasaran': '658.8',
    'economics': '330', 'ekonomi': '330',
    'education': '370', 'pendidikan': '370',
    'law': '340', 'hukum': '340',
    'psychology': '150', 'psikologi': '150',
    'sociology': '301', 'sosiologi': '301',
    'geography': '910', 'geografi': '910',
    'mathematics': '510', 'matematika': '510',
    'physics': '530', 'fisika': '530',
    'chemistry': '540', 'kimia': '540',
    'biology': '570', 'biologi': '570',
    'medicine': '610', 'kedokteran': '610',
    'nursing': '610', 'keperawatan': '610',
    'pharmacy': '615', 'farmasi': '615',
    'engineering': '620', 'teknik': '620',
    'computer': '004', 'komputer': '004',
    'information': '020', 'informasi': '020',
    'agriculture': '630', 'pertanian': '630',
    'architecture': '720', 'arsitektur': '720',
    'islam': '297',
    'quran': '297',
    'hadith': '297',
    'religion': '200', 'agama': '200',
    'history': '900', 'sejarah': '900',
    'literature': '800', 'sastra': '800',
    'language': '400', 'bahasa': '400',
    'art': '700', 'seni': '700',
    'music': '780', 'musik': '780',
    'sport': '796', 'olahraga': '796',
    'communication': '302', 'komunikasi': '302',
    'journalism': '070', 'jurnalistik': '070',
    'politics': '320', 'politik': '320',
    'library': '020', 'perpustakaan': '020',
    'philosophy': '100', 'filsafat': '100',
    'statistics': '310', 'statistik': '310',
}


def normalize_ddc(ddc_str):
    """Normalize DDC number to standard format."""
    if not ddc_str:
        return ''
    ddc_str = str(ddc_str).strip()

    # Remove common prefixes
    ddc_str = re.sub(r'^(DDC|ddc|Dewey)\s*:?\s*', '', ddc_str)
    ddc_str = ddc_str.strip('[]() ')

    # Try to find DDC pattern
    m = re.match(r'(\d{1,3}(?:\.\d+)?)', ddc_str)
    if not m:
        return ''

    number = m.group(1)
    parts = number.split('.')
    main = parts[0].zfill(3)  # Pad to 3 digits

    if len(parts) > 1 and parts[1]:
        return f"{main}.{parts[1]}"
    return main


def extract_record_id(oai_identifier, record=None):
    """Extract a unique ID from OAI identifier. Works for any source.
    
    Examples:
        'oai:repo:123' → unique string, or integer if it's the main Koha.
    """
    if not oai_identifier:
        # Generate hash-based ID from title as fallback
        title = record.get('title', '') if record else ''
        if title:
            return 'h-' + hashlib.md5(title.encode()).hexdigest()[:8]
        return None
    
    ident = str(oai_identifier)
    parts = ident.split(':')
    
    if len(parts) >= 3:
        repo = parts[1] if len(parts) > 1 else ''
        local_id = parts[-1]
        
        # Koha utama (UMS): oai:UMS:123 → integer (dibutuhkan app.js untuk link OPAC)
        if repo.upper() == 'UMS' and local_id.isdigit():
            return int(local_id)
        
        # Untuk selain Koha pusat, kita harus memastikan ID-nya unik melintasi semua institusi.
        # Kita gunakan prefix repo dan tambahkan hash pendek dari identifier asli:
        short_hash = hashlib.md5(ident.encode()).hexdigest()[:6]
        safe_repo = re.sub(r'[^a-zA-Z0-9]', '', repo)[:8]
        
        if 'eprint' in repo.lower():
            num = re.search(r'\d+', local_id)
            return f"ep-{safe_repo}-{num.group() if num else local_id}-{short_hash}"
        
        if 'slims' in local_id.lower():
            num = re.search(r'\d+', local_id)
            return f"sl-{safe_repo}-{num.group() if num else local_id}-{short_hash}"
        
        # Default fallback misal OJS: oai:ojs2.journals2.ums.ac.id:article/264
        prefix = safe_repo.lower() if safe_repo else 'oa'
        # hilangkan karakter aneh dari local_id
        safe_local = re.sub(r'[^a-zA-Z0-9]', '', local_id)
        return f"{prefix}-{safe_local}-{short_hash}"
    
    # Format lama Koha (UMS:123 tanpa oai:)
    if len(parts) == 2 and parts[0].upper() == 'UMS' and parts[1].isdigit():
        return int(parts[1])
    
    return f"oa-{hashlib.md5(ident.encode()).hexdigest()[:8]}"


def extract_year(date_str):
    """Extract year from date string."""
    if not date_str:
        return ''
    m = re.search(r'(19|20)\d{2}', str(date_str))
    return m.group(0) if m else ''


def get_ddc_section(ddc):
    if not ddc or len(ddc) < 3:
        return ddc
    return ddc[:3]


def get_ddc_division(ddc):
    if not ddc or len(ddc) < 2:
        return ''
    return ddc[:2] + '0'


def get_ddc_class(ddc):
    if not ddc:
        return ''
    return ddc[0]


def get_ddc_label(ddc):
    if not ddc:
        return ''
    section = ddc[:3] if len(ddc) >= 3 else ddc
    if section in DDC_DIVISIONS:
        return DDC_DIVISIONS[section]
    division = ddc[:2] + '0' if len(ddc) >= 2 else ''
    if division in DDC_DIVISIONS:
        return DDC_DIVISIONS[division]
    cls = ddc[0] if ddc else ''
    if cls in DDC_CLASSES:
        return DDC_CLASSES[cls]['label']
    return ''


def safe_str(value):
    if value is None:
        return ''
    if isinstance(value, list):
        return ' ; '.join(str(v) for v in value if v)
    return str(value).strip()


def infer_ddc_from_subjects(subjects):
    """Try to infer DDC from subject keywords."""
    for sub in subjects:
        sub_lower = sub.lower()
        
        # Check for LC classification in subject
        lc_ddc = lc_subject_to_ddc(sub)
        if lc_ddc:
            return lc_ddc
        
        # Check keyword mapping
        for keyword, ddc in KEYWORD_TO_DDC.items():
            if keyword in sub_lower:
                return ddc
    
    return ''


def process_record(record, source='UMS'):
    """Process a single harvest record into compact format.
    Works for MARC, Dublin Core, or any normalized record."""
    
    rec_id = extract_record_id(record.get('oai_identifier', ''), record)
    if rec_id is None:
        return None
    
    # Get DDC — try multiple sources
    ddc_raw = record.get('call_number_ddc', '')
    if isinstance(ddc_raw, list):
        ddc_raw = ddc_raw[0] if ddc_raw else ''
    ddc = normalize_ddc(ddc_raw)
    
    # Handle subjects
    subject = record.get('subject', [])
    if isinstance(subject, str):
        subject = [subject]
    subject = [s.strip() for s in subject if s and str(s).strip() and str(s).strip().upper() != 'ARRAY']
    
    # If no DDC found, try to infer from subjects (LC or keywords)
    # Skip inference if it is a THESIS as per user request
    if not ddc and subject and str(record.get('item_type', '')).upper() != 'THESIS':
        ddc = infer_ddc_from_subjects(subject)
    
    # Clean up LC-style subjects to be more readable
    clean_subjects = []
    for s in subject:
        # Remove LC prefix like "G Geography (General)" → "Geography (General)"
        cleaned = re.sub(r'^[A-Z]{1,3}\d*\s+', '', s)
        if cleaned:
            clean_subjects.append(cleaned)
        else:
            clean_subjects.append(s)
    
    # Handle authors
    author_main = safe_str(record.get('author_main', ''))
    # Clean author name: remove trailing comma/period
    author_main = re.sub(r'[,./\s]+$', '', author_main).strip()
    
    authors_added = record.get('author_added', [])
    if isinstance(authors_added, str):
        authors_added = [authors_added]
    
    year = extract_year(safe_str(record.get('date_publication', '')))
    
    title = safe_str(record.get('title', ''))
    subtitle = safe_str(record.get('subtitle', ''))
    if subtitle:
        subtitle = re.sub(r'^[:/]\s*', '', subtitle).strip()
        if subtitle:
            title = f"{title}: {subtitle}"
    
    # Clean title
    title = re.sub(r'[\r\n\t]+', ' ', title)
    title = re.sub(r'\s{2,}', ' ', title).strip()
    if not title:
        return None
    
    # Determine source from record tag or argument
    src = record.get('_source', source)
    
    book = {
        'id': rec_id,
        't': title,
        'a': author_main,
        'ddc': ddc,
        'sub': clean_subjects,
        'pub': safe_str(record.get('publisher', '')),
        'yr': year,
        'isbn': safe_str(record.get('isbn', '')),
        'type': safe_str(record.get('item_type', '')),
        'src': src,
    }
    
    if authors_added:
        book['aa'] = [re.sub(r'[,./\s]+$', '', safe_str(a)).strip() for a in authors_added if safe_str(a)]
    
    edition = safe_str(record.get('edition', ''))
    if edition:
        book['ed'] = edition
    
    physical = safe_str(record.get('physical_extent', ''))
    if physical:
        book['phys'] = physical
    
    # Store URL if from DC source
    url = record.get('_dc_url', '')
    if url:
        book['url'] = url
    
    # Store short description if available
    desc = record.get('_dc_description', '')
    if desc:
        book['desc'] = desc[:200]
    
    return book


def build_ddc_tree(books):
    """Build DDC hierarchy tree with counts."""
    tree = {}
    
    for book in books:
        ddc = book.get('ddc', '')
        if not ddc or len(ddc) < 1:
            continue
        
        cls = ddc[0]
        if cls not in DDC_CLASSES:
            continue
        
        if cls not in tree:
            tree[cls] = {
                'label': DDC_CLASSES[cls]['label'],
                'label_en': DDC_CLASSES[cls]['label_en'],
                'icon': DDC_CLASSES[cls]['icon'],
                'count': 0,
                'divisions': {},
            }
        tree[cls]['count'] += 1
        
        if len(ddc) >= 2:
            div_code = ddc[:2] + '0'
            div_label = DDC_DIVISIONS.get(div_code, f'Divisi {div_code}')
            
            if div_code not in tree[cls]['divisions']:
                tree[cls]['divisions'][div_code] = {
                    'label': div_label,
                    'count': 0,
                    'sections': {},
                }
            tree[cls]['divisions'][div_code]['count'] += 1
            
            if len(ddc) >= 3:
                sec_code = ddc[:3]
                sec_label = DDC_DIVISIONS.get(sec_code, f'DDC {sec_code}')
                
                if sec_code not in tree[cls]['divisions'][div_code]['sections']:
                    tree[cls]['divisions'][div_code]['sections'][sec_code] = {
                        'label': sec_label,
                        'count': 0,
                    }
                tree[cls]['divisions'][div_code]['sections'][sec_code]['count'] += 1
    
    return tree


def build_subject_index(books):
    """Build inverted index of subjects to book IDs."""
    index = defaultdict(list)
    for book in books:
        for sub in book.get('sub', []):
            normalized = sub.upper().strip()
            if normalized:
                index[normalized].append(book['id'])
    
    return {k: v for k, v in sorted(index.items(), key=lambda x: -len(x[1]))}


def build_prodi_index(books):
    """Build prodi index: kode prodi → {label, fakultas, count, ids}."""
    index = {}
    for kode, meta in PRODI_META.items():
        index[kode] = {
            'label': meta['label'],
            'label_short': meta['label'].split('(')[0].strip(),
            'fakultas': meta['fakultas'],
            'fakultas_label': meta['fakultas_label'],
            'count': 0,
            'ids': [],
        }
    
    for book in books:
        ddc = book.get('ddc', '')
        prodi_list = get_prodi_for_ddc(ddc)
        book['prodi'] = prodi_list  # inject field ke buku
        for kode in prodi_list:
            if kode in index:
                index[kode]['count'] += 1
                index[kode]['ids'].append(book['id'])
    
    # Urutkan ids tiap prodi by ddc
    for kode in index:
        index[kode]['ids'] = list(dict.fromkeys(index[kode]['ids']))  # deduplicate
    
    # Hapus prodi yang kosong dari index (opsional, kita tetap keep supaya UI lengkap)
    return index


def main():
    parser = argparse.ArgumentParser(description='Preprocess bibliographic data for UMS Library OneSearch web app')
    parser.add_argument('--input', default='output/biblio_20260407_125138.json',
                        help='Input JSON file from harvest')
    parser.add_argument('--output', default='data',
                        help='Output directory')
    parser.add_argument('--source', default='UMS',
                        help='Source library name')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("  Preprocessing Bibliographic Data")
    print(f"  Input: {args.input}")
    print(f"  Output: {args.output}")
    print("=" * 60)
    
    # Load data
    print(f"\n1. Loading data...")
    with open(args.input, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)
    print(f"   Loaded {len(raw_data)} records")
    
    # Process records
    print(f"\n2. Processing records...")
    books = []
    skipped = 0
    no_ddc = 0
    lc_converted = 0
    kw_inferred = 0
    
    seen_ids = set()
    for record in raw_data:
        book = process_record(record, source=args.source)
        if book is None:
            skipped += 1
            continue
        if book['id'] in seen_ids:
            skipped += 1
            continue
        seen_ids.add(book['id'])
        
        if not book['ddc']:
            no_ddc += 1
        books.append(book)
    
    print(f"   Processed: {len(books)} books")
    print(f"   Skipped: {skipped} (no ID/title or duplicate)")
    print(f"   Without DDC: {no_ddc}")
    
    # Source breakdown
    source_counts = Counter(b.get('src', '?') for b in books)
    if len(source_counts) > 1:
        print(f"\n   Sources:")
        for src, cnt in source_counts.most_common():
            print(f"     {src}: {cnt}")
    
    # Type breakdown
    type_counts = Counter(b.get('type', '?') for b in books)
    print(f"\n   Types:")
    for tp, cnt in type_counts.most_common(10):
        print(f"     {tp}: {cnt}")
    
    # Sort by DDC
    books.sort(key=lambda b: (b.get('ddc', ''), b.get('t', '')))
    
    # Build DDC tree
    print(f"\n3. Building DDC tree...")
    ddc_tree = build_ddc_tree(books)
    for cls in sorted(ddc_tree.keys()):
        info = ddc_tree[cls]
        print(f"   {cls}00 {info['icon']} {info['label']}: {info['count']} books, {len(info['divisions'])} divisions")
    
    # Build Prodi index
    print(f"\n3b. Building Prodi index...")
    prodi_index = build_prodi_index(books)  # juga inject field 'prodi' ke setiap buku
    prodi_with_books = sum(1 for v in prodi_index.values() if v['count'] > 0)
    print(f"   Prodi dengan koleksi: {prodi_with_books}/{len(prodi_index)}")
    for kode, info in sorted(prodi_index.items(), key=lambda x: -x[1]['count'])[:10]:
        print(f"   {info['fakultas']:6} {kode:15} {info['label'][:35]:35} : {info['count']} buku")
    
    # Build subject index
    print(f"\n4. Building subject index...")
    subject_index = build_subject_index(books)
    print(f"   Unique subjects: {len(subject_index)}")
    print(f"   Top 10:")
    for sub, ids in list(subject_index.items())[:10]:
        print(f"     {sub}: {len(ids)} books")
    
    # Statistics
    stats = {
        'total_books': len(books),
        'with_ddc': len(books) - no_ddc,
        'with_subject': sum(1 for b in books if b.get('sub')),
        'sources': dict(source_counts),
        'unique_subjects': len(subject_index),
        'last_updated': datetime.now().strftime('%Y-%m-%dT%H:%M:%S'),
        'ddc_distribution': {cls: info['count'] for cls, info in ddc_tree.items()},
        'type_distribution': dict(type_counts.most_common()),
        'year_range': {
            'min': min((b['yr'] for b in books if b.get('yr')), default=''),
            'max': max((b['yr'] for b in books if b.get('yr')), default=''),
        },
        'prodi_count': len([v for v in prodi_index.values() if v['count'] > 0]),
    }
    
    # Save output
    print(f"\n5. Saving output...")
    os.makedirs(args.output, exist_ok=True)
    
    books_file = os.path.join(args.output, 'books.json')
    with open(books_file, 'w', encoding='utf-8') as f:
        json.dump(books, f, ensure_ascii=False, separators=(',', ':'))
    size_mb = os.path.getsize(books_file) / (1024 * 1024)
    print(f"   books.json: {size_mb:.1f} MB ({len(books)} books)")
    
    tree_file = os.path.join(args.output, 'ddc_tree.json')
    with open(tree_file, 'w', encoding='utf-8') as f:
        json.dump(ddc_tree, f, ensure_ascii=False, indent=2)
    print(f"   ddc_tree.json: saved")
    
    subj_file = os.path.join(args.output, 'subjects.json')
    with open(subj_file, 'w', encoding='utf-8') as f:
        json.dump(subject_index, f, ensure_ascii=False, separators=(',', ':'))
    size_mb = os.path.getsize(subj_file) / (1024 * 1024)
    print(f"   subjects.json: {size_mb:.1f} MB ({len(subject_index)} subjects)")
    
    # Save prodi index (tanpa field ids agar ringkas di stats, ids tetap ada)
    prodi_file = os.path.join(args.output, 'prodi_index.json')
    with open(prodi_file, 'w', encoding='utf-8') as f:
        json.dump(prodi_index, f, ensure_ascii=False, separators=(',', ':'))
    size_kb = os.path.getsize(prodi_file) / 1024
    print(f"   prodi_index.json: {size_kb:.1f} KB ({len(prodi_index)} prodi)")
    
    # Save prodi meta (label, icon, dll — tanpa ids besar)
    prodi_meta_out = {kode: {k: v for k, v in info.items() if k != 'ids'}
                      for kode, info in prodi_index.items()}
    prodi_meta_file = os.path.join(args.output, 'prodi_meta.json')
    with open(prodi_meta_file, 'w', encoding='utf-8') as f:
        json.dump(prodi_meta_out, f, ensure_ascii=False, indent=2)
    print(f"   prodi_meta.json: saved")
    
    stats_file = os.path.join(args.output, 'stats.json')
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"   stats.json: saved")
    
    harvest_file = os.path.join(args.output, 'last_harvest.txt')
    with open(harvest_file, 'w') as f:
        f.write(datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ'))
    
    print(f"\n✅ Preprocessing complete!")
    print(f"   Total books: {len(books)}")
    print(f"   Output: {os.path.abspath(args.output)}")


if __name__ == '__main__':
    main()
