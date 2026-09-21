#!/usr/bin/env python3
"""
Backup Manager — UMS Library OneSearch
Mencadangkan dan memulihkan dataset katalog (data/books.json, stats, metadata prodi, dsb.)
sebelum proses re-harvest atau rebuild dijalankan.

Format cadangan: Arsip ZIP terkompresi dengan manifest metadata.
Lokasi cadangan: backups/
Retensi: Menyimpan N cadangan terakhir secara otomatis (default: 5).
"""

import os
import sys
import json
import zipfile
import argparse
from datetime import datetime

# Resolve paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
BACKUPS_DIR = os.path.join(PROJECT_ROOT, 'backups')

# Files to back up if present in data/
BACKUP_TARGET_FILES = [
    'books.json',
    'books.json.gz',
    'stats.json',
    'subjects.json',
    'subjects.json.gz',
    'prodi_index.json',
    'prodi_index.json.gz',
    'prodi_rules.json',
    'prodi_meta.json',
    'institutions.json',
    'ddc_tree.json',
    'ddc_tree.json.gz',
    'ddc_master.json',
    'last_harvest.txt',
    'international_config.json'
]


def ensure_backups_dir():
    os.makedirs(BACKUPS_DIR, exist_ok=True)
    return BACKUPS_DIR


def get_record_count():
    """Mendapatkan perkiraan jumlah record saat ini dari books.json atau stats.json."""
    books_file = os.path.join(DATA_DIR, 'books.json')
    stats_file = os.path.join(DATA_DIR, 'stats.json')

    if os.path.exists(stats_file):
        try:
            with open(stats_file, 'r', encoding='utf-8') as f:
                s = json.load(f)
                if 'total_books' in s:
                    return int(s['total_books'])
        except Exception:
            pass

    if os.path.exists(books_file):
        try:
            with open(books_file, 'r', encoding='utf-8') as f:
                books = json.load(f)
                if isinstance(books, list):
                    return len(books)
        except Exception:
            pass

    return 0


def create_backup(reason="pre_harvest", max_backups=5, created_by="System"):
    """
    Membuat arsip ZIP cadangan dari file penting di data/.
    
    Args:
        reason (str): Alasan pencadangan (misal: 'pre_harvest_incremental', 'pre_harvest_full', 'manual')
        max_backups (int): Jumlah maksimum arsip yang dipertahankan (retensi otomatis).
        created_by (str): Pengguna/komponen pemicu ('System', 'Admin UI', 'CLI').
    
    Returns:
        tuple (bool, dict): Status sukses dan metadata backup.
    """
    ensure_backups_dir()
    now = datetime.now()
    timestamp_str = now.strftime('%Y%m%d_%H%M%S')
    clean_reason = "".join(c if c.isalnum() or c in ('-', '_') else '_' for c in reason)
    zip_filename = f"backup_{timestamp_str}_{clean_reason}.zip"
    zip_filepath = os.path.join(BACKUPS_DIR, zip_filename)

    record_count = get_record_count()
    included_files = []
    total_uncompressed_bytes = 0

    try:
        with zipfile.ZipFile(zip_filepath, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            for fname in BACKUP_TARGET_FILES:
                src_path = os.path.join(DATA_DIR, fname)
                if os.path.isfile(src_path):
                    fsize = os.path.getsize(src_path)
                    zf.write(src_path, arcname=os.path.join('data', fname))
                    included_files.append({
                        "name": fname,
                        "size_bytes": fsize,
                        "size_mb": round(fsize / (1024 * 1024), 2)
                    })
                    total_uncompressed_bytes += fsize

            # Buat manifest metadata di dalam zip
            manifest = {
                "version": "1.0",
                "timestamp": now.isoformat(),
                "created_by": created_by,
                "reason": reason,
                "total_records": record_count,
                "file_count": len(included_files),
                "total_uncompressed_bytes": total_uncompressed_bytes,
                "files": included_files
            }
            zf.writestr('manifest.json', json.dumps(manifest, indent=2, ensure_ascii=False))

        compressed_size = os.path.getsize(zip_filepath)
        compressed_mb = round(compressed_size / (1024 * 1024), 2)

        info = {
            "filename": zip_filename,
            "filepath": zip_filepath,
            "size_bytes": compressed_size,
            "size_mb": compressed_mb,
            "records": record_count,
            "timestamp": now.isoformat(),
            "reason": reason,
            "created_by": created_by,
            "file_count": len(included_files)
        }

        print(f"[Backup] Cadangan dibuat: {zip_filename} ({compressed_mb} MB, {record_count:,} rekord, {len(included_files)} file)")

        # Jalankan rotasi otomatis agar disk tidak penuh
        prune_backups(keep=max_backups)

        return True, info

    except Exception as e:
        print(f"[Backup] Gagal membuat cadangan: {e}", file=sys.stderr)
        if os.path.exists(zip_filepath):
            try:
                os.remove(zip_filepath)
            except Exception:
                pass
        return False, {"error": str(e)}


def prune_backups(keep=5):
    """Menghapus cadangan lama jika melebihi batas retensi."""
    if not os.path.exists(BACKUPS_DIR) or keep <= 0:
        return

    try:
        entries = []
        for fname in os.listdir(BACKUPS_DIR):
            if fname.startswith('backup_') and fname.endswith('.zip'):
                fpath = os.path.join(BACKUPS_DIR, fname)
                if os.path.isfile(fpath):
                    entries.append((os.path.getmtime(fpath), fpath, fname))

        # Urutkan dari yang terbaru ke terlama
        entries.sort(key=lambda x: x[0], reverse=True)

        # Hapus yang melebihi batas keep
        if len(entries) > keep:
            to_delete = entries[keep:]
            for _, fpath, fname in to_delete:
                try:
                    os.remove(fpath)
                    print(f"[Backup] Rotasi cadangan lama dihapus: {fname}")
                except Exception as e:
                    print(f"[Backup] Gagal menghapus cadangan usang {fname}: {e}", file=sys.stderr)

    except Exception as e:
        print(f"[Backup] Error saat prune cadangan: {e}", file=sys.stderr)


def list_backups():
    """Mendapatkan daftar seluruh arsip cadangan beserta manifestnya."""
    ensure_backups_dir()
    backups = []

    try:
        files = [f for f in os.listdir(BACKUPS_DIR) if f.startswith('backup_') and f.endswith('.zip')]
        for fname in files:
            fpath = os.path.join(BACKUPS_DIR, fname)
            fstat = os.stat(fpath)
            fsize = fstat.st_size
            mtime = datetime.fromtimestamp(fstat.st_mtime).isoformat()

            # Baca manifest dari dalam zip jika ada
            manifest = {}
            try:
                with zipfile.ZipFile(fpath, 'r') as zf:
                    if 'manifest.json' in zf.namelist():
                        manifest = json.loads(zf.read('manifest.json').decode('utf-8'))
            except Exception:
                pass

            backups.append({
                "filename": fname,
                "size_bytes": fsize,
                "size_mb": round(fsize / (1024 * 1024), 2),
                "modified": mtime,
                "timestamp": manifest.get("timestamp", mtime),
                "reason": manifest.get("reason", "Manual/Legacy"),
                "created_by": manifest.get("created_by", "System"),
                "records": manifest.get("total_records", 0),
                "file_count": manifest.get("file_count", 0)
            })

        # Urutkan dari yang paling baru
        backups.sort(key=lambda x: x["timestamp"], reverse=True)

    except Exception as e:
        print(f"[Backup] Gagal membaca daftar cadangan: {e}", file=sys.stderr)

    return backups


def restore_backup(filename_or_path):
    """
    Memulihkan file dari arsip ZIP cadangan ke data/.
    
    Args:
        filename_or_path (str): Nama file cadangan (misal: 'backup_20260921_081018.zip') atau path lengkap.
    
    Returns:
        tuple (bool, dict): Status sukses dan info pemulihan.
    """
    if os.path.isabs(filename_or_path):
        zip_path = filename_or_path
    else:
        # Prevent path traversal
        clean_name = os.path.basename(filename_or_path)
        zip_path = os.path.join(BACKUPS_DIR, clean_name)

    if not os.path.exists(zip_path):
        return False, {"error": f"File cadangan tidak ditemukan: {zip_path}"}

    try:
        restored_files = []
        with zipfile.ZipFile(zip_path, 'r') as zf:
            namelist = zf.namelist()
            for member in namelist:
                # Lewati manifest atau file di luar struktur yang diizinkan
                if member == 'manifest.json' or member.startswith('__MACOSX'):
                    continue

                # Normalisasi path target ke DATA_DIR
                if member.startswith('data/'):
                    target_rel = member[5:]
                else:
                    target_rel = member

                # Jangan izinkan path keluar folder
                if '..' in target_rel or os.path.isabs(target_rel):
                    continue

                dest_path = os.path.join(DATA_DIR, target_rel)
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)

                with zf.open(member) as src, open(dest_path, 'wb') as dst:
                    dst.write(src.read())

                restored_files.append(target_rel)

        print(f"[Backup] Berhasil memulihkan {len(restored_files)} file dari {os.path.basename(zip_path)}")
        return True, {
            "filename": os.path.basename(zip_path),
            "restored_files": restored_files,
            "count": len(restored_files),
            "restored_at": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"[Backup] Gagal memulihkan cadangan: {e}", file=sys.stderr)
        return False, {"error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="Kelola Auto-Backup Dataset UMS OneSearch")
    parser.add_argument('--create', action='store_true', help="Buat cadangan dataset sekarang")
    parser.add_argument('--reason', default="manual_cli", help="Alasan pencadangan")
    parser.add_argument('--retention', type=int, default=5, help="Jumlah retensi arsip cadangan (default: 5)")
    parser.add_argument('--list', action='store_true', help="Tampilkan daftar arsip cadangan")
    parser.add_argument('--restore', metavar="FILENAME", help="Pulihkan dataset dari file cadangan")

    args = parser.parse_args()

    if args.create:
        ok, res = create_backup(reason=args.reason, max_backups=args.retention, created_by="CLI")
        if not ok:
            sys.exit(1)
    elif args.list:
        backups = list_backups()
        print(f"\n{'='*75}")
        print(f"  DAFTAR CADANGAN DATASET ({len(backups)} File)")
        print(f"{'='*75}")
        if not backups:
            print("  Belum ada file cadangan yang tersimpan di backups/.")
        else:
            print(f"  {'NAMA FILE':<42} {'UKURAN':<10} {'REKORD':<10} {'ALASAN'}")
            print(f"  {'-'*71}")
            for b in backups:
                print(f"  {b['filename']:<42} {str(b['size_mb'])+' MB':<10} {str(b['records']):<10} {b['reason']}")
        print(f"{'='*75}\n")
    elif args.restore:
        ok, res = restore_backup(args.restore)
        if not ok:
            sys.exit(1)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
