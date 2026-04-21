import os

app_file = 'd:/Code/harvest-koha/js/app.js'

with open(app_file, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Revert Init
orig_init = """        try {
            const t = new Date().getTime();

            txt.textContent = this.t('loading_ddc');
            bar.style.width = '20%';
            
            // Mengambil DDC Tree statis
            try { this.ddcTree = await (await fetch('data/ddc_tree.json?t=' + t)).json(); } catch(e){}
            bar.style.width = '65%';

            try { this.stats = await (await fetch('data/stats.json?t=' + t)).json(); } catch(e){}
            bar.style.width = '75%';

            // Load prodi index (graceful fallback jika belum ada)
            try {
                this.prodiIndex = await (await fetch('data/prodi_index.json?t=' + t)).json();
            } catch (e) {
                this.prodiIndex = {};
            }

            txt.textContent = "Menghubungkan ke API Pencarian...";
            // Dummy untuk compatibility dengan hardcode JS sisa
            this.books = [];"""
new_init = """        try {
            txt.textContent = this.t('loading_books');
            bar.style.width = '20%';
            const t = new Date().getTime();
            this.books = await (await fetch('data/books.json?t=' + t)).json();
            bar.style.width = '50%';

            txt.textContent = this.t('loading_ddc');
            this.ddcTree = await (await fetch('data/ddc_tree.json?t=' + t)).json();
            bar.style.width = '65%';

            this.stats = await (await fetch('data/stats.json?t=' + t)).json();
            bar.style.width = '75%';

            // Load prodi index (graceful fallback jika belum ada)
            try {
                this.prodiIndex = await (await fetch('data/prodi_index.json?t=' + t)).json();
            } catch (e) {
                this.prodiIndex = {};
            }

            txt.textContent = this.t('building_index');"""
code = code.replace(orig_init, new_init)

# 2. Revert renderBookmarks
orig_rb = """    async renderBookmarks(buildToolbar = true) {
        const wrap = document.getElementById('bookmarks-wrap');
        const grid = document.getElementById('bookmarks-grid');
        if (!grid) return;

        let savedBooks = [];
        const idsToFetch = [...this.bookmarks].filter(id => !this.searchEngine.idMap.has(id));
        
        // Fetch any bookmarks not currently in memory cache
        if (idsToFetch.length > 0) {
            try {
                const res = await fetch(`/api/search?ids=${encodeURIComponent(idsToFetch.join(','))}`);
                const fetched = await res.json();
                fetched.forEach(b => this.searchEngine.idMap.set(b.id, b));
            } catch(e) {}
        }

        savedBooks = [...this.bookmarks].map(id => this.searchEngine.idMap.get(id)).filter(Boolean);"""
new_rb = """    renderBookmarks(buildToolbar = true) {
        const wrap = document.getElementById('bookmarks-wrap');
        const grid = document.getElementById('bookmarks-grid');
        if (!grid) return;

        let savedBooks = [...this.bookmarks].map(id => this.searchEngine.getById(id)).filter(Boolean);"""
code = code.replace(orig_rb, new_rb)

# 3. Revert browseSource
orig_bs = """    async browseSource(src) {
        if (this._activeSource === src) {
            this._activeSource = null;
            this.renderInstitutionPicker();
            this.showHome();
            return;
        }

        this._activeSource = src;
        this.renderInstitutionPicker();

        document.getElementById('results-grid').innerHTML = '<div style="padding: 3rem; text-align: center; grid-column:1/-1;">Menarik data institusi...</div>';
        const res = await fetch(`/api/search?q=&filter_src=${encodeURIComponent(src)}&limit=1000`);
        const results = await res.json();
        
        results.forEach(b => this.searchEngine.idMap.set(b.id, b));

        this.baseResults = results;"""
new_bs = """    browseSource(src) {
        // Toggle: klik lagi chip yang aktif → reset ke beranda
        if (this._activeSource === src) {
            this._activeSource = null;
            this.renderInstitutionPicker();
            this.showHome();
            return;
        }

        this._activeSource = src;
        this.renderInstitutionPicker();

        const results = this.books.filter(b => b.src === src);
        this.baseResults = results;"""
code = code.replace(orig_bs, new_bs)

# 4. Revert showSuggest
orig_ss = """    async showSuggest(q) {
        let sug = [];
        try {
            const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
            const items = await res.json();
            sug = items.map(b => ({ type: 'title', text: b.t, subtext: b.a, book: b }));
        } catch(e) {}
        
        const box = document.getElementById('suggest-box');"""
new_ss = """    showSuggest(q) {
        const sug = this.searchEngine.suggest(q);
        const box = document.getElementById('suggest-box');"""
code = code.replace(orig_ss, new_ss)

# 5. Revert doSearch
orig_ds = """    async doSearch(q) {
        if (!q) return;

        // Simpan ke riwayat pencarian
        const lowerQ = q.toLowerCase();
        this.searchHistory = this.searchHistory.filter(h => h.toLowerCase() !== lowerQ);
        this.searchHistory.unshift(q);
        if (this.searchHistory.length > 20) this.searchHistory.pop();
        localStorage.setItem('bf-search-history', JSON.stringify(this.searchHistory));

        const field = (document.getElementById('search-field-sel') || {}).value || 'all';
        
        document.getElementById('results-grid').innerHTML = '<div style="padding: 3rem; text-align: center; grid-column:1/-1;">Sedang mencari di dokumen backend...</div>';
        document.getElementById('results-wrap').style.display = 'block';

        let results = [];
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&field=${field}&limit=1000`);
            results = await res.json();
            // Cache in memory untuk book modal detail popup
            results.forEach(b => this.searchEngine.idMap.set(b.id, b));
        } catch(e) {
            console.error("API Search failed", e);
        }

        const fieldLabels = {"""
new_ds = """    doSearch(q) {
        if (!q) return;

        // Simpan ke riwayat pencarian
        const lowerQ = q.toLowerCase();
        this.searchHistory = this.searchHistory.filter(h => h.toLowerCase() !== lowerQ);
        this.searchHistory.unshift(q);
        if (this.searchHistory.length > 20) this.searchHistory.pop();
        localStorage.setItem('bf-search-history', JSON.stringify(this.searchHistory));

        const field = (document.getElementById('search-field-sel') || {}).value || 'all';
        let results;

        if (field === 'all') {
            results = this.searchEngine.search(q, 500).map(r => r.book);
        } else {
            // Field-specific search
            const ql = q.toLowerCase();
            results = this.books.filter(b => {
                switch (field) {
                    case 'title':
                        return b.t && b.t.toLowerCase().includes(ql);
                    case 'author':
                        return b.a && b.a.toLowerCase().includes(ql);
                    case 'subject':
                        return b.sub && b.sub.some(s => s.toLowerCase().includes(ql));
                    case 'ddc':
                        return b.ddc && b.ddc.startsWith(q);
                    case 'isbn':
                        return b.isbn && b.isbn.replace(/[-\s]/g, '').includes(q.replace(/[-\s]/g, ''));
                    default:
                        return false;
                }
            });
            // Sort alphabetically for field-specific searches
            results.sort((a, b) => (a.t || '').localeCompare(b.t || ''));
        }

        const fieldLabels = {"""
code = code.replace(orig_ds, new_ds)

# 6. Revert browseBooks
orig_bb = """    async browseBooks(prefix) {
        const content = document.getElementById('browse-content');
        const booksEl = document.getElementById('browse-books');
        const crumbs = document.getElementById('crumbs');
        const ck = prefix[0], cls = this.ddcTree[ck];
        let bc = `<a href="#" onclick="app.showBrowse();return false">DDC</a><span class="sep">›</span>
                   <a href="#" onclick="app.showBrowse('${ck}');return false">${ck}00</a>`;
        if (prefix.length >= 3) {
            const dc = prefix.substring(0, 2) + '0', div = cls?.divisions[dc];
            if (div && dc !== prefix) bc += `<span class="sep">›</span><a href="#" onclick="app.showBrowse('${dc}');return false">${dc}</a>`;
            bc += `<span class="sep">›</span><span class="cur">${prefix}</span>`;
        }
        crumbs.innerHTML = bc;
        
        content.style.display = 'none'; booksEl.style.display = 'grid';
        booksEl.innerHTML = '<div style="padding: 3rem; text-align: center; grid-column:1/-1;">Menarik koleksi...</div>';
        
        const res = await fetch(`/api/search?q=&filter_ddc=${encodeURIComponent(prefix)}&limit=2000`);
        let results = await res.json();
        
        this.ddcBooks = results;
        this.ddcBooks.forEach(b => this.searchEngine.idMap.set(b.id, b));
        this.ddcBooks.sort((a, b) => (a.ddc || '').localeCompare(b.ddc || '') || (a.t || '').localeCompare(b.t || ''));
        this.ddcPage = 0;"""
new_bb = """    browseBooks(prefix) {
        const content = document.getElementById('browse-content');
        const booksEl = document.getElementById('browse-books');
        const crumbs = document.getElementById('crumbs');
        const ck = prefix[0], cls = this.ddcTree[ck];
        let bc = `<a href="#" onclick="app.showBrowse();return false">DDC</a><span class="sep">›</span>
                   <a href="#" onclick="app.showBrowse('${ck}');return false">${ck}00</a>`;
        if (prefix.length >= 3) {
            const dc = prefix.substring(0, 2) + '0', div = cls?.divisions[dc];
            if (div && dc !== prefix) bc += `<span class="sep">›</span><a href="#" onclick="app.showBrowse('${dc}');return false">${dc}</a>`;
            bc += `<span class="sep">›</span><span class="cur">${prefix}</span>`;
        }
        crumbs.innerHTML = bc;
        this.ddcBooks = this.books.filter(b => b.ddc && b.ddc.startsWith(prefix));
        this.ddcBooks.sort((a, b) => (a.ddc || '').localeCompare(b.ddc || '') || (a.t || '').localeCompare(b.t || ''));
        this.ddcPage = 0;
        content.style.display = 'none'; booksEl.style.display = 'grid';"""
code = code.replace(orig_bb, new_bb)

# 7. Revert showBookDetail and _openModalInternal
orig_sbd = """    async showBookDetail(id) {
        // Deep Linking Push State
        const urlParams = new URLSearchParams(window.location.search);
        let idStr = id.toString();
        if (urlParams.get('id') !== idStr) {
            window.history.pushState({ modal: 'open', id: id }, '', '?id=' + encodeURIComponent(id));
        }
        await this._openModalInternal(id);
    },
    async _openModalInternal(id) {
        let book = this.searchEngine.getById(id);
        if (!book) {
            try {
                book = await (await fetch(`/api/book/${encodeURIComponent(id)}`)).json();
            } catch(e) { return; }
        }
        if (!book || book.error) return;
        
        const recs = this.recommender.recommend(book);"""
new_sbd = """    showBookDetail(id) {
        // Deep Linking Push State
        const urlParams = new URLSearchParams(window.location.search);
        let idStr = id.toString();
        if (urlParams.get('id') !== idStr) {
            window.history.pushState({ modal: 'open', id: id }, '', '?id=' + encodeURIComponent(id));
        }
        this._openModalInternal(id);
    },
    _openModalInternal(id) {
        const book = this.searchEngine.getById(id);
        if (!book) return;
        const recs = this.recommender.recommend(book);"""
code = code.replace(orig_sbd, new_sbd)

# 8. Revert browseFormat
orig_bf = """    async browseFormat(f) {
        this.showPage('home');
        document.getElementById('search-input').value = '';
        document.getElementById('search-clear').style.display = 'none';
        
        document.getElementById('results-grid').innerHTML = '<div style="padding: 3rem; text-align: center; grid-column:1/-1;">Menarik format...</div>';
        document.getElementById('results-wrap').style.display = 'block';

        const res = await fetch(`/api/search?q=&filter_type=${encodeURIComponent(f)}&limit=1000`);
        let results = await res.json();
        
        this.baseResults = results;
        this.baseResults.forEach(b => this.searchEngine.idMap.set(b.id, b));"""
new_bf = """    browseFormat(f) {
        this.showPage('home');
        document.getElementById('search-input').value = '';
        document.getElementById('search-clear').style.display = 'none';
        this.baseResults = this.books.filter(b => b.type === f);"""
code = code.replace(orig_bf, new_bf)

# 9. Revert showProdiBooks
orig_spb = """    async showProdiBooks(kode) {
        const info = this.prodiIndex[kode];
        if (!info) return;

        const booksPanel = document.getElementById('prodi-books-panel');
        const grid = document.getElementById('prodi-grid');
        const fakFilter = document.getElementById('prodi-fak-filter');
        const title = document.getElementById('prodi-books-title');
        const booksGrid = document.getElementById('prodi-books-grid');

        title.textContent = `${info.label} — ${this.fmt(info.count)} ${this.t('prodi_books_count')}`;
        grid.style.display = 'none';
        fakFilter.style.display = 'none';
        booksPanel.style.display = 'block';
        booksGrid.innerHTML = '<div style="padding: 3rem; text-align: center; grid-column:1/-1;">Menarik koleksi program studi...</div>';

        // Ambil buku dari IDs di prodiIndex ke SQLite backend
        let results = [];
        const idArray = info.ids || [];
        if (idArray.length > 0) {
            try {
                // Jangan kirim > 1000 IDs sekaligus ke URI query biar tidak 414 URI Too Long
                const chunked = idArray.slice(0, 1000); 
                const res = await fetch(`/api/search?ids=${encodeURIComponent(chunked.join(','))}&limit=1000`);
                results = await res.json();
            } catch(e) { console.error("Gagal load prodi", e); }
        }

        this.prodiBooks = results;
        this.prodiBooks.forEach(b => this.searchEngine.idMap.set(b.id, b));
        this.prodiBooks.sort((a, b) => (a.ddc || '').localeCompare(b.ddc || '') || (a.t || '').localeCompare(b.t || ''));
        this.prodiPage = 0;"""
new_spb = """    showProdiBooks(kode) {
        const info = this.prodiIndex[kode];
        if (!info) return;

        const booksPanel = document.getElementById('prodi-books-panel');
        const grid = document.getElementById('prodi-grid');
        const fakFilter = document.getElementById('prodi-fak-filter');
        const title = document.getElementById('prodi-books-title');

        // Ambil buku dari IDs di prodiIndex
        const ids = new Set(info.ids || []);
        if (ids.size > 0) {
            this.prodiBooks = this.books.filter(b => ids.has(b.id));
        } else {
            // Fallback: filter dari field prodi pada buku (jika ada)
            this.prodiBooks = this.books.filter(b => b.prodi && b.prodi.includes(kode));
        }
        this.prodiBooks.sort((a, b) => (a.ddc || '').localeCompare(b.ddc || '') || (a.t || '').localeCompare(b.t || ''));
        this.prodiPage = 0;

        title.textContent = `${info.label} — ${this.fmt(this.prodiBooks.length)} ${this.t('prodi_books_count')}`;
        grid.style.display = 'none';
        fakFilter.style.display = 'none';
        booksPanel.style.display = 'block';"""
code = code.replace(orig_spb, new_spb)

with open(app_file, 'w', encoding='utf-8') as f:
    f.write(code)
print("Reverted app.js")
