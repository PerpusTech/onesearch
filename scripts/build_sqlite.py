#!/usr/bin/env python3
import json
import sqlite3
import os
import argparse

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(PROJECT_ROOT)

def create_db(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # Drop existing tables
    cur.execute("DROP TABLE IF EXISTS books")
    cur.execute("DROP TABLE IF EXISTS books_fts")
    
    # Create main table
    cur.execute("""
        CREATE TABLE books (
            id TEXT PRIMARY KEY,
            data JSON
        )
    """)
    
    # Create FTS5 table
    # tokenize='porter unicode61' enables basic stemming and unicode support
    cur.execute("""
        CREATE VIRTUAL TABLE books_fts USING fts5(
            title,
            author,
            subjects,
            ddc,
            publisher,
            year,
            type,
            source,
            content='',
            tokenize='porter unicode61'
        )
    """)
    
    conn.commit()
    return conn

def import_data(conn, books_file='data/books.json'):
    if not os.path.exists(books_file):
        print(f"Error: {books_file} not found.")
        return
        
    print(f"Loading {books_file}...")
    with open(books_file, 'r', encoding='utf-8') as f:
        books = json.load(f)
        
    cur = conn.cursor()
    print(f"Importing {len(books)} records into SQLite...")
    
    for b in books:
        # Prepare FTS fields
        title = b.get('t', '') or ''
        author = b.get('a', '') or ''
        
        # Combine subjects into string
        subs = b.get('sub', [])
        if isinstance(subs, list):
            subjects = ' '.join([str(s) for s in subs])
        else:
            subjects = str(subs)
            
        ddc = b.get('ddc', '') or ''
        pub = b.get('pub', '') or ''
        yr = b.get('yr', '') or ''
        btype = b.get('type', '') or ''
        src = b.get('src', '') or ''
        
        # Insert raw JSON in main table
        cur.execute("INSERT INTO books (id, data) VALUES (?, ?)", (str(b['id']), json.dumps(b, ensure_ascii=False)))
        rowid = cur.lastrowid
        
        # Insert FTS index
        cur.execute("""
            INSERT INTO books_fts (rowid, title, author, subjects, ddc, publisher, year, type, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (rowid, title, author, subjects, ddc, pub, yr, btype, src))
        
    conn.commit()
    print("Database built successfully!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build SQLite FTS5 database from books.json")
    parser.add_argument("--json", default="data/books.json", help="Path to books.json")
    parser.add_argument("--db", default="data/books.db", help="Path to output sqlite db")
    args = parser.parse_args()
    
    os.makedirs(os.path.dirname(args.db), exist_ok=True)
    conn = create_db(args.db)
    import_data(conn, args.json)
    conn.close()
