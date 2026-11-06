import os
import sys
import sqlite3
import hashlib

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
DB_PATH = os.path.join(DATA_DIR, 'federated_cache.db')

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
conn.execute("""
    CREATE TABLE IF NOT EXISTS article_cache (
        id TEXT PRIMARY KEY,
        doi TEXT,
        title TEXT NOT NULL,
        authors TEXT,
        publication_name TEXT,
        year INTEGER,
        content_type TEXT,
        source TEXT,
        abstract TEXT,
        url TEXT,
        pdf_url TEXT,
        is_subscribed INTEGER DEFAULT 0,
        subscribed_url TEXT,
        view_count INTEGER DEFAULT 1,
        first_saved TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
conn.execute("CREATE INDEX IF NOT EXISTS idx_art_doi ON article_cache(doi)")
conn.execute("CREATE INDEX IF NOT EXISTS idx_art_view ON article_cache(view_count DESC)")
conn.execute("CREATE INDEX IF NOT EXISTS idx_art_last_access ON article_cache(last_accessed DESC)")
conn.execute("CREATE INDEX IF NOT EXISTS idx_art_source ON article_cache(source)")
conn.commit()

# Test insert
sample = {
    "id": "10.1007/s11277-020-07890-1",
    "doi": "10.1007/s11277-020-07890-1",
    "title": "Machine Learning and Deep Learning Techniques for Wireless Communications",
    "authors": "Ahmad, S.; Khan, M.",
    "publication_name": "Wireless Personal Communications",
    "year": 2021,
    "content_type": "Article",
    "source": "Springer",
    "abstract": "This survey presents comprehensive deep learning methodologies.",
    "url": "https://link.springer.com/article/10.1007/s11277-020-07890-1",
    "pdf_url": "",
    "is_subscribed": 0,
    "subscribed_url": ""
}

cur = conn.cursor()
cur.execute("SELECT id, view_count FROM article_cache WHERE id = ?", (sample["id"],))
row = cur.fetchone()
if row:
    cur.execute("UPDATE article_cache SET view_count = view_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE id = ?", (sample["id"],))
else:
    cur.execute("""
        INSERT INTO article_cache (
            id, doi, title, authors, publication_name, year, content_type,
            source, abstract, url, pdf_url, is_subscribed, subscribed_url,
            view_count, first_saved, last_accessed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """, (
        sample["id"], sample["doi"], sample["title"], sample["authors"],
        sample["publication_name"], sample["year"], sample["content_type"],
        sample["source"], sample["abstract"], sample["url"], sample["pdf_url"],
        sample["is_subscribed"], sample["subscribed_url"]
    ))
conn.commit()

cur.execute("SELECT * FROM article_cache")
rows = [dict(r) for r in cur.fetchall()]
print(f"Total articles in SQLite cache: {len(rows)}")
print("Sample row:", rows[0])
conn.close()

