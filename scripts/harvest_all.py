#!/usr/bin/env python3
"""
Batch Harvest — Harvest semua institusi sekaligus.

Usage:
    python harvest_all.py              # Harvest semua institusi
    python harvest_all.py --list       # Lihat daftar institusi
    python harvest_all.py --only UMS UMY  # Harvest institusi tertentu saja
    python harvest_all.py --rebuild    # Harvest semua lalu rebuild data
    python harvest_all.py --rebuild-only  # Rebuild saja tanpa harvest
    python harvest_all.py --from 2026-04-01  # Harvest inkremental (semua institusi)

Cara menambah institusi baru:
    Tambahkan entry baru di list INSTITUTIONS di bawah ini.
"""

import subprocess
import sys
import os
import time
import argparse
from datetime import datetime

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Resolve project root (parent of scripts/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(PROJECT_ROOT)
SCRIPTS_DIR = os.path.join(PROJECT_ROOT, 'scripts')


# ╔══════════════════════════════════════════════════════════════╗
# ║  DAFTAR INSTITUSI — Edit di sini untuk menambah/menghapus   ║
# ╠══════════════════════════════════════════════════════════════╣
# ║  Setiap entry:                                              ║
# ║    url    : URL endpoint OAI-PMH                            ║
# ║    source : Nama institusi (opsional, auto-detect jika None)║
# ║    format : Format metadata (opsional, default 'auto')      ║
# ║    set    : OAI set spec (opsional, default None)           ║
# ║    active : True/False — skip jika False                    ║
# ╚══════════════════════════════════════════════════════════════╝

INSTITUTIONS = [
    # ── Koha ──────────────────────────────────────────────────
    {
        'id': 'UMS',
        'url': 'http://172.16.10.43/cgi-bin/koha/oai.pl',
        'source': 'UMS',
        'active': True,
    },

    # ── EPrints ───────────────────────────────────────────────
    {
        'id': 'UMS-EPRINTS',
        'url': 'https://eprints.ums.ac.id/cgi/oai2',
        'source': 'UMS (eprints)',
        'active': True,
    },

    # ── OJS: Jurnal Ilmiah UMS (Server 1) ─────────────────────
    {
        'id': 'UMS-JOURNALS',
        'url': 'https://journals.ums.ac.id/index.php/index/oai',
        'source': 'UMS (Journal)',
        'active': True,
    },

    # ── OJS: Jurnal Ilmiah UMS (Server 2) ─────────────────────
    {
        'id': 'UMS-JOURNALS2',
        'url': 'https://journals2.ums.ac.id/index.php/index/oai',
        'source': 'UMS (Journal)',
        'active': True,
    },

    # ── SLiMS: Universitas Muhammadiyah Madiun ─────────────────────
    {
        'id': 'UMMAD',
        'url': 'https://perpus.ummad.ac.id/oai2.php',
        'source': 'UMMAD',
        'active': True,
    },

    # ── SLiMS: SMA Muhammadiyah PK Solo ───────────────────────
    {
        'id': 'SMAMUHPKSOLO',
        'url': 'https://lib-smamuhpksolo.edutrend.id/oai2.php',
        'source': 'SMAMUHPKSOLO',
        'active': True,
    },

    # ── SLiMS: SMA Basa Solo ──────────────────────────────────
    {
        'id': 'SMABASASOLO',
        'url': 'https://lib-smabasasolo.edutrend.id/oai2.php',
        'source': 'SMABASASOLO',
        'active': True,
    },

    # ── AISKA University ──────────────────────────────────────
    {
        'id': 'AISKA',
        'url': 'https://perpus.aiska-university.ac.id/oai2.php',
        'source': 'AISKA-UNIVERSITY',
        'active': True,
    },

    # ── UMS Journals ──────────────────────────────────────────
    # {
    #     'id': 'UMS-JOURNALS',
    #     'url': 'https://journals.ums.ac.id/index.php/index/oai',
    #     'source': 'UMS',
    #     'active': True,
    # },
    # {
    #     'id': 'UMS-JOURNALS-2',
    #     'url': 'https://journals2.ums.ac.id/index.php/index/oai',
    #     'source': 'UMS',
    #     'active': True,
    # },

    # ┌─────────────────────────────────────────────────────────┐
    # │ Tambah institusi baru di sini! Contoh:                  │
    # │                                                         │
    # │  {                                                      │
    # │      'id': 'UNISRI',                                    │
    # │      'url': 'https://lib.unisri.ac.id/oai2.php',        │
    # │      'source': 'UNISRI',                                │
    # │      'active': True,                                    │
    # │  },                                                     │
    # └─────────────────────────────────────────────────────────┘
]


def print_banner():
    print("=" * 62)
    print("  📚 Batch Harvest — UMS Library OneSearch")
    print(f"  ⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 62)


def list_institutions():
    """Tampilkan daftar institusi yang terdaftar."""
    print_banner()
    print(f"\n  {'ID':<20} {'STATUS':<10} {'SOURCE':<20} URL")
    print("  " + "─" * 80)
    for inst in INSTITUTIONS:
        status = "✅ Aktif" if inst.get('active', True) else "⏸️  Skip"
        src = inst.get('source', '(auto)')
        print(f"  {inst['id']:<20} {status:<10} {src:<20} {inst['url']}")
    print(f"\n  Total: {len(INSTITUTIONS)} institusi "
          f"({sum(1 for i in INSTITUTIONS if i.get('active', True))} aktif)")


def harvest_institution(inst, from_date=None):
    """Harvest satu institusi menggunakan harvest_oai.py."""
    inst_id = inst['id']
    url = inst['url']
    source = inst.get('source')
    fmt = inst.get('format', 'auto')
    set_spec = inst.get('set')

    print(f"\n{'━' * 62}")
    print(f"  🏛️  Harvesting: {inst_id}")
    print(f"  📡 URL: {url}")
    if source:
        print(f"  🏷️  Source: {source}")
    print(f"{'━' * 62}")

    cmd = [sys.executable, os.path.join(SCRIPTS_DIR, 'harvest_oai.py'), '--url', url]

    if source:
        cmd += ['--source', source]
    if fmt and fmt != 'auto':
        cmd += ['--format', fmt]
    if set_spec:
        cmd += ['--set', set_spec]
    if from_date:
        cmd += ['--from', from_date]

    start = time.time()
    result = subprocess.run(cmd)
    elapsed = time.time() - start

    status = '✅' if result.returncode == 0 else '❌'
    print(f"\n  {status} {inst_id} — selesai dalam {elapsed:.0f}s "
          f"(exit code: {result.returncode})")

    return result.returncode == 0


def run_rebuild():
    """Jalankan rebuild.py --all."""
    print(f"\n{'━' * 62}")
    print(f"  🔄 Rebuilding data...")
    print(f"{'━' * 62}")

    cmd = [sys.executable, os.path.join(SCRIPTS_DIR, 'rebuild.py'), '--all']
    result = subprocess.run(cmd)

    if result.returncode == 0:
        print(f"\n  ✅ Rebuild selesai!")
    else:
        print(f"\n  ❌ Rebuild gagal (exit code: {result.returncode})")
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(
        description='Batch harvest semua institusi OAI-PMH',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Contoh:
  python harvest_all.py                    # Harvest semua
  python harvest_all.py --list             # Lihat daftar institusi
  python harvest_all.py --only UMS UMY     # Harvest UMS dan UMY saja
  python harvest_all.py --rebuild          # Harvest semua + rebuild
  python harvest_all.py --rebuild-only     # Rebuild saja
  python harvest_all.py --from 2026-04-01  # Harvest inkremental
        """
    )

    parser.add_argument('--list', action='store_true',
                        help='Tampilkan daftar institusi')
    parser.add_argument('--only', nargs='+', metavar='ID',
                        help='Harvest institusi tertentu saja (by ID)')
    parser.add_argument('--exclude', nargs='+', metavar='ID',
                        help='Skip institusi tertentu')
    parser.add_argument('--from', dest='from_date',
                        help='Harvest inkremental dari tanggal (YYYY-MM-DD)')
    parser.add_argument('--rebuild', action='store_true',
                        help='Jalankan rebuild setelah harvest')
    parser.add_argument('--rebuild-only', action='store_true',
                        help='Rebuild saja tanpa harvest')

    args = parser.parse_args()

    # List mode
    if args.list:
        list_institutions()
        return

    # Rebuild only
    if args.rebuild_only:
        print_banner()
        run_rebuild()
        return

    print_banner()

    # Filter institutions
    targets = []
    for inst in INSTITUTIONS:
        if not inst.get('active', True):
            continue
        if args.only and inst['id'] not in args.only:
            continue
        if args.exclude and inst['id'] in args.exclude:
            continue
        targets.append(inst)

    if not targets:
        print("\n  ⚠️  Tidak ada institusi yang cocok dengan filter.")
        print("  Gunakan --list untuk melihat daftar ID yang tersedia.")
        return

    print(f"\n  📋 Akan harvest {len(targets)} institusi:")
    for inst in targets:
        print(f"     • {inst['id']} ({inst['url']})")

    # Harvest each
    results = {}
    total_start = time.time()

    for i, inst in enumerate(targets, 1):
        print(f"\n  [{i}/{len(targets)}]", end="")
        ok = harvest_institution(inst, from_date=args.from_date)
        results[inst['id']] = ok

    total_elapsed = time.time() - total_start

    # Summary
    print(f"\n\n{'═' * 62}")
    print(f"  📊 RINGKASAN HARVEST")
    print(f"{'═' * 62}")
    success = sum(1 for v in results.values() if v)
    failed = sum(1 for v in results.values() if not v)

    for inst_id, ok in results.items():
        icon = '✅' if ok else '❌'
        print(f"  {icon} {inst_id}")

    print(f"\n  Total: {success} berhasil, {failed} gagal")
    print(f"  Waktu: {total_elapsed:.0f}s ({total_elapsed/60:.1f} menit)")

    # Auto rebuild
    if args.rebuild and success > 0:
        run_rebuild()
    elif success > 0 and not args.rebuild:
        print(f"\n  💡 Jalankan 'python harvest_all.py --rebuild-only' "
              f"untuk rebuild data.")


if __name__ == '__main__':
    main()
