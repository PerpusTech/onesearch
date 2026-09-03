#!/usr/bin/env python3
"""
Merge & Preprocess: Menggabungkan beberapa file harvest dan memproses ulang
data untuk web app UMS Library OneSearch.

Usage:
    # Proses 1 file saja (UMS)
    python scripts/rebuild.py output/biblio_20260407_125138.json

    # Gabung beberapa file dari sumber berbeda  
    python scripts/rebuild.py output/biblio_ums.json output/biblio_mitra_sma.json

    # Otomatis proses semua file JSON di folder output
    python scripts/rebuild.py --all
"""

import json
import os
import sys
import glob
import argparse
import subprocess
import re

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Resolve project root (parent of scripts/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'scripts'))


def detect_source_from_file(filepath):
    """Detect source from harvest JSON file.
    
    Supports:
    - New format (wrapper): {"_meta": {"source": "UMMAD", ...}, "records": [...]}
    - Old format (plain array): [{...}, {...}, ...]  → fallback to oai_identifier
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # New format: wrapper with _meta
        if isinstance(data, dict) and '_meta' in data:
            return data['_meta'].get('source', None)
        
        # Old format: plain array → try oai_identifier
        if isinstance(data, list) and data:
            for record in data[:5]:
                oai_id = record.get('oai_identifier', '')
                if not oai_id:
                    continue
                parts = oai_id.split(':')
                if len(parts) >= 3:
                    host = parts[1]  # e.g., 'perpus.ummad.ac.id' or 'UMS'
                    # Simple hostname → use directly
                    if host.isalpha():
                        return host.upper()
                    # Domain: extract institution from hostname
                    host_parts = host.split('.')
                    if len(host_parts) >= 3 and host_parts[-2] in ('ac', 'or', 'go'):
                        # perpus.ummad.ac.id → ummad
                        inst = host_parts[-3] if len(host_parts) >= 4 else host_parts[0]
                        if inst in ('perpus', 'lib', 'eprints', 'repo', 'www', 'opac'):
                            inst = host_parts[-3] if len(host_parts) >= 4 else inst
                        return inst.upper()
                    else:
                        # Shared platform: lib-smabasasolo.edutrend.id → SMABASASOLO
                        sub = host_parts[0]
                        sub = re.sub(r'^(lib-|perpus-|repo-)', '', sub)
                        return sub.upper()
                elif len(parts) == 2:
                    # Old Koha format: 'UMS:1' (no oai: prefix)
                    name = parts[0]
                    if name.isalpha():
                        return name.upper()
                break
    except Exception as e:
        print(f"  ⚠️  Gagal auto-detect sumber dari {filepath}: {e}")
    return None


def load_harvest_file(filepath):
    """Load harvest JSON file, supporting both old and new formats.
    Returns (records_list, source_name_or_None).
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # New format: wrapper
    if isinstance(data, dict) and '_meta' in data:
        source = data['_meta'].get('source', None)
        records = data.get('records', [])
        return records, source
    
    # Old format: plain array
    if isinstance(data, list):
        return data, None
    
    return [], None


def main():
    parser = argparse.ArgumentParser(
        description='Gabungkan file harvest dan rebuild data UMS Library OneSearch',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Contoh penggunaan:
  python rebuild.py output/biblio_20260407_125138.json
  python rebuild.py file1.json file2.json --sources UMS "SMA Mitra" 
  python rebuild.py --all
        """
    )
    parser.add_argument('files', nargs='*', help='File JSON hasil harvest')
    parser.add_argument('--all', action='store_true',
                        help='Proses semua file JSON di folder output/')
    parser.add_argument('--sources', nargs='*',
                        help='Nama sumber perpustakaan (urutan sama dengan file). '
                             'Jika tidak diberikan, otomatis dideteksi dari konten file.')
    parser.add_argument('--output', default='data',
                        help='Folder output (default: data)')

    args = parser.parse_args()

    # Determine input files
    if args.all:
        files = sorted(glob.glob('output/biblio_*.json'))
        if not files:
            print("❌ Tidak ada file JSON di folder output/")
            return
    elif args.files:
        files = args.files
    else:
        # Default: use the latest file in output/
        candidates = sorted(glob.glob('output/biblio_*.json'))
        if candidates:
            files = [candidates[-1]]  # latest
            print(f"ℹ️  Tidak ada file yang di-specify, menggunakan file terbaru: {files[0]}")
        else:
            parser.print_help()
            return

    # Verify all files exist
    for f in files:
        if not os.path.exists(f):
            print(f"❌ File tidak ditemukan: {f}")
            return

    print("=" * 60)
    print("  UMS Library OneSearch — Rebuild Data")
    print("=" * 60)

    # Step 1: Load and merge all JSON files
    all_records = []
    sources_used = []
    for i, filepath in enumerate(files):
        records, file_source = load_harvest_file(filepath)
        
        # Priority: CLI --sources > file _meta > auto-detect > fallback
        if args.sources and i < len(args.sources):
            src = args.sources[i]
        elif file_source:
            src = file_source
        else:
            detected = detect_source_from_file(filepath)
            if detected:
                src = detected
            else:
                src = 'UNKNOWN'
        
        sources_used.append(src)
        print(f"\n📂 Loading: {filepath} (sumber: {src})")
        
        # Tag each record with source
        for record in records:
            record['_source'] = src
        
        print(f"   → {len(records)} record")
        all_records.extend(records)

    print(f"\n📊 Total record dari semua sumber: {len(all_records)}")

    # Step 2: Save merged file
    merged_file = os.path.join(args.output, '_merged_input.json')
    os.makedirs(args.output, exist_ok=True)
    with open(merged_file, 'w', encoding='utf-8') as f:
        json.dump(all_records, f, ensure_ascii=False)
    print(f"   Merged file: {merged_file}")

    # Step 3: Run preprocess.py
    print(f"\n🔄 Menjalankan preprocessing...")
    
    # Determine source name (if single, use it; if multi, use 'MULTI')
    unique_sources = list(set(sources_used))
    source_name = unique_sources[0] if len(unique_sources) == 1 else ','.join(unique_sources)
    
    cmd = [
        sys.executable, os.path.join(PROJECT_ROOT, 'scripts', 'preprocess.py'),
        '--input', merged_file,
        '--output', args.output,
        '--source', source_name,
    ]
    
    result = subprocess.run(cmd, capture_output=False)
    
    # Clean up merged temp file
    if os.path.exists(merged_file):
        os.remove(merged_file)
    
    if result.returncode == 0:
        print(f"\n✅ Rebuild selesai! Data di: {os.path.abspath(args.output)}/")
        print(f"   Refresh browser (http://localhost:8088) untuk melihat perubahan.")
    else:
        print(f"\n❌ Preprocessing gagal (exit code: {result.returncode})")


if __name__ == '__main__':
    main()
