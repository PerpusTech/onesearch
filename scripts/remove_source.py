"""Hapus semua record dari sumber tertentu di books.json dan update stats.json"""
import json, sys, os

SOURCES_TO_REMOVE = sys.argv[1:] if len(sys.argv) > 1 else ["SMABASASOLO"]
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

print(f"🗑️  Menghapus semua record dari sumber: {', '.join(SOURCES_TO_REMOVE)}")

# ── books.json ──
books_path = os.path.join(DATA_DIR, 'books.json')
with open(books_path, 'r', encoding='utf-8') as f:
    books = json.load(f)

before = len(books)
books = [b for b in books if b.get('src') not in SOURCES_TO_REMOVE]
after = len(books)
removed = before - after

with open(books_path, 'w', encoding='utf-8') as f:
    json.dump(books, f, ensure_ascii=False)

print(f"   books.json: {before} → {after} ({removed} dihapus)")

# ── stats.json ──
stats_path = os.path.join(DATA_DIR, 'stats.json')
with open(stats_path, 'r', encoding='utf-8') as f:
    stats = json.load(f)

for source in SOURCES_TO_REMOVE:
    if source in stats.get('sources', {}):
        del stats['sources'][source]

stats['total_books'] = stats['total_books'] - removed
with open(stats_path, 'w', encoding='utf-8') as f:
    json.dump(stats, f, ensure_ascii=False, indent=2)

print("✅ Selesai!")

