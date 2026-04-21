#!/usr/bin/env python3
"""
Lightweight Zero-Dependency API Server for UMS OneSearch
Uses built-in http.server and sqlite3.
"""
import json
import sqlite3
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "data", "books.db")

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    return conn

class ApiHandler(SimpleHTTPRequestHandler):
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        # Serve API routes
        if self.path.startswith('/api/'):
            parsed_path = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed_path.query)
            
            try:
                if parsed_path.path == '/api/search':
                    self.handle_search(query_params)
                elif parsed_path.path == '/api/suggest':
                    self.handle_suggest(query_params)
                elif parsed_path.path.startswith('/api/book/'):
                    self.handle_book(parsed_path.path.split('/')[-1])
                elif parsed_path.path == '/api/ddc_tree':
                    # Serve directly from json for now
                    self.serve_static_json('data/ddc_tree.json')
                elif parsed_path.path == '/api/stats':
                    self.serve_static_json('data/stats.json')
                else:
                    self.send_error(404, "API Endpoint not found")
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return
            
        # Serve Static Files
        super().do_GET()

    def serve_static_json(self, filepath):
        try:
            with open(os.path.join(PROJECT_ROOT, filepath), 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(404, "File not found")

    def handle_search(self, params):
        q = params.get('q', [''])[0]
        field = params.get('field', ['all'])[0]
        limit = int(params.get('limit', ['1000'])[0])
        
        filter_src = params.get('filter_src', [''])[0]
        filter_type = params.get('filter_type', [''])[0]
        filter_ddc = params.get('filter_ddc', [''])[0]
        ids = params.get('ids', [''])[0]
        
        conn = get_db()
        cur = conn.cursor()
        
        # If specific IDs are requested (for Bookmarks)
        if ids:
            id_list = ids.split(',')
            placeholders = ','.join('?' for _ in id_list)
            cur.execute(f"SELECT data FROM books WHERE id IN ({placeholders}) LIMIT ?", (*id_list, limit))
            rows = cur.fetchall()
            results = [json.loads(row['data']) for row in rows]
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(results).encode('utf-8'))
            conn.close()
            return
            
        q = q.replace('"', '').replace("'", "")
        
        # Build base queries
        where_clauses = []
        sql_params = []
        
        # Exact filters using the JSON data or FTS column
        if filter_src:
            where_clauses.append("source = ?")
            sql_params.append(filter_src)
        if filter_type:
            where_clauses.append("type = ?")
            sql_params.append(filter_type)
        if filter_ddc:
            where_clauses.append("ddc LIKE ?")
            sql_params.append(f"{filter_ddc}%")
            
        if not q:
            # No query, just filters or all
            where_sql = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            try:
                cur.execute(f"SELECT data FROM books_fts {where_sql} LIMIT ?", (*sql_params, limit))
                rows = cur.fetchall()
            except sqlite3.Error:
                rows = []
        else:
            fts_query = ' AND '.join(f'"{term}"*' for term in q.split() if term)
            
            if field != 'all':
                if field == 'title': fts_query = f"title: {fts_query}"
                elif field == 'author': fts_query = f"author: {fts_query}"
                elif field == 'subject': fts_query = f"subjects: {fts_query}"
            
            where_clauses.insert(0, "books_fts MATCH ?")
            sql_params.insert(0, fts_query)
            
            where_sql = "WHERE " + " AND ".join(where_clauses)
            sql_params.append(limit)
            try:
                cur.execute(f"""
                    SELECT data 
                    FROM books_fts 
                    {where_sql}
                    ORDER BY rank 
                    LIMIT ?
                """, tuple(sql_params))
                rows = cur.fetchall()
            except sqlite3.Error as e:
                rows = []

        # JSON extraction
        results = [json.loads(row['data']) for row in rows]
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(results).encode('utf-8'))
        conn.close()

    def handle_suggest(self, params):
        q = params.get('q', [''])[0].replace('"', '').replace("'", "")
        if not q:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps([]).encode('utf-8'))
            return
            
        conn = get_db()
        cur = conn.cursor()
        fts_query = f'"{q}"*'
        
        try:
            # simple prefix suggest
            cur.execute("""
                SELECT books.data 
                FROM books_fts 
                JOIN books ON books_fts.rowid = books.rowid
                WHERE books_fts MATCH ? 
                ORDER BY rank 
                LIMIT 15
            """, (fts_query,))
            rows = cur.fetchall()
            results = [json.loads(row['data']) for row in rows]
        except sqlite3.Error:
            results = []
            
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(results).encode('utf-8'))
        conn.close()

    def handle_book(self, book_id):
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT data FROM books WHERE id = ?", (book_id,))
        row = cur.fetchone()
        conn.close()
        
        if row:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(row['data'].encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Book not found"}).encode('utf-8'))

if __name__ == '__main__':
    os.chdir(PROJECT_ROOT)
    server_address = ('', 8088)
    httpd = HTTPServer(server_address, ApiHandler)
    print(f"Serving API and static files on http://localhost:8088")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
