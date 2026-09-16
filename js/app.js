/**
 * UMS Library OneSearch — Main Application (Redesigned)
 */
const app = {
    books: [],
    ddcTree: {},
    stats: {},
    prodiIndex: {},    // loaded from data/prodi_index.json
    searchEngine: new SearchEngine(),
    recommender: null,
    currentPage: 'home',
    browseMode: 'ddc', // 'ddc' | 'prodi'
    baseResults: [],
    currentResults: [],
    searchHistory: [],
    activeFilters: { access: new Set(), src: new Set(), type: new Set(), author: new Set(), year: new Set(), subject: new Set(), ddcClass: new Set() },
    resultsPage: 0,
    perPage: 24,
    ddcPage: 0,
    ddcBooks: [],
    ddcLevel: null,
    prodiBooks: [],
    prodiPage: 0,
    activeFakultas: null,
    debounce: null,
    lang: localStorage.getItem('bf-lang') || 'id',
    intlConfig: null,
    _ejournalsList: [],
    _ebooksList: [],

    translations: {
        id: {
            loading_books: "Memuat koleksi perpustakaan...",
            loading_ddc: "Memuat klasifikasi DDC...",
            building_index: "Membangun indeks pencarian...",
            home: "Beranda",
            explore: "Jelajahi",
            stats: "Statistik",
            hero_title1: "UMSLibrary OneSearch",
            hero_title2: "Lintas Institusi",
            hero_subtitle: "Pencarian satu pintu seluruh koleksi perpustakaan, repositori, dan literatur ilmiah.",
            search_placeholder: "Cari judul, pengarang, subjek (sejarah) ...",
            btn_search: "Cari",
            adv_search: "Pencarian Lanjut",
            results_found: "Koleksi Ditemukan",
            results_time: "pencarian rampung dalam",
            filter: "Filter",
            clear: "Hapus",
            sort_relevance: "Relevansi",
            sort_az: "Judul A-Z",
            sort_newest: "Terbaru",
            sort_oldest: "Terlama",
            sort_ddc: "DDC",
            format: "Format",
            year: "Tahun",
            author: "Pengarang",
            topic: "Topik",
            similar: "Serupa",
            same_author: "Pengarang Sama",
            related_topics: "Topik Terkait",
            recommendation: "Rekomendasi",
            load_more: "Muat Lebih Banyak",
            src_koha: "Perpustakaan Utama (Koha)",
            src_eprints: "Repositori Institusi (EPrints)",
            src_institusi: "Sumber",
            type_bks: "Buku Tercetak",
            type_thesis: "Skripsi / Tesis / Disertasi",
            type_jr: "Artikel Jurnal",
            type_conf: "Prosiding / Konferensi",
            type_rpt: "Laporan Riset",
            explore_ddc: "Jelajahi Koleksi Berdasarkan DDC",
            all_ddc: "Semua Kelas DDC",
            back: "Kembali",
            qr_source: "QR Sumber",
            popular_topics: "Topik Populer",
            collection_format: "Format Koleksi",
            search_options: "Opsi Pencarian",
            search_history: "Riwayat Pencarian",
            printed_book: "Buku Cetak",
            ebook: "E-Book (Digital)",
            journal: "Jurnal",
            computer_file: "File Komputer",
            thesis_short: "Skripsi / Tesis",
            reference: "Rujukan / Referensi",
            browse_collection: "Jelajahi Koleksi",
            browse_subtitle: "Telusuri berdasarkan klasifikasi Dewey Decimal",
            stats_collection: "Statistik Koleksi",
            stats_subtitle: "Ringkasan data perpustakaan",
            footer_tagline: "UMS Library OneSearch — Pencarian Satu Pintu",
            footer_data: "Data dari",
            footer_updated: "Diperbarui",
            publisher: "Penerbit",
            type_label: "Tipe",
            edition: "Edisi",
            physical: "Fisik",
            source: "Sumber",
            classification: "Klasifikasi",
            description: "Deskripsi",
            view_at: "Lihat di",
            cite_qr: "Kutip & QR URL",
            auto_cite: "Kutipan Otomatis",
            total_books: "Total Buku",
            with_ddc: "Dengan DDC",
            subjects: "Subjek",
            libraries: "Perpustakaan",
            oldest: "Tertua",
            newest_stat: "Terbaru",
            ddc_distribution: "Distribusi per Kelas DDC",
            type_distribution: "Distribusi per Jenis",
            books_unit: "buku",
            categories: "kategori",
            sug_title: "Judul",
            sug_author: "Penulis",
            sug_subject: "Subjek",
            no_history: "Belum ada riwayat pencarian.",
            search_history_title: "Riwayat Pencarian",
            clear_all: "Hapus Semua",
            adv_book_title: "Judul Buku",
            adv_title_ph: "Cari dalam judul...",
            adv_author_ph: "Cari nama penulis...",
            adv_pub_label: "Penerbit",
            adv_pub_ph: "Nama instansi/penerbit...",
            adv_year_label: "Tahun Terbit",
            adv_year_ph: "Contoh: 2021",
            adv_topic_ph: "Kata kunci topik...",
            adv_cancel: "Batal",
            adv_intro: "Isi satu atau beberapa kriteria di bawah ini untuk mencari secara presisi.",
            anon: "Anonim",
            unknown_pub: "Penerbit Tidak Diketahui",
            no_year: "t.t.",
            ddc_0: "Komputer", ddc_1: "Filsafat", ddc_2: "Agama", ddc_3: "Sosial",
            ddc_4: "Bahasa", ddc_5: "Sains", ddc_6: "Teknologi", ddc_7: "Kesenian",
            ddc_8: "Sastra", ddc_9: "Sejarah",
            filter_access: "Akses Koleksi (Show Only)",
            acc_ft: "Teks Penuh Daring (Full Text Online)",
            acc_pr: "Jurnal Ber-Peer Review",
            acc_oa: "Akses Terbuka (Open Access)",
            acc_lib: "Tersedia di Perpustakaan",
            type_Article: "Artikel (Articles)",
            type_Review: "Ulasan (Reviews)",
            type_Book: "Buku (Books)",
            "type_Book Chapter": "Bab Buku (Book Chapters)",
            type_BKS: "Buku Bhs. Indonesia", type_BKSA: "Buku Bhs. Asing",
            type_EB: "E-Book", type_JR: "Jurnal Nasional", type_JRA: "Jurnal Internasional",
            type_JRT: "Jurnal Nasional Terakreditasi",
            type_CF: "CD/DVD ROM Bhs. Indonesia", type_CFA: "CD/DVD ROM Bhs. Asing",
            type_PR: "Prosiding", type_DIG: "Arsip Digital Bhs. Indonesia",
            type_DIGA: "Arsip Digital Bhs. Asing",
            type_AV: "Audio Video Bhs. Indonesia", type_AVA: "Audio/Video Bhs. Asing",
            type_MJI: "Majalah Ilmiah", type_MJP: "Majalah Populer",
            type_MJIP: "Majalah Ilmiah Populer", type_KL: "Kliping",
            type_RS: "Laporan Penelitian",
            type_BKSC: "Buku Cadangan", type_BKSCA: "Buku Cadangan",
            type_MJA: "Majalah Bahasa Asing",
            type_THESIS: "Skripsi/Thesis", type_CONF: "Konferensi",
            type_RPT: "Laporan", type_EPR: "Prosiding Elektronik",
            rs_same_class: "klasifikasi sama",
            rs_same_ddc: "klasifikasi sama",
            rs_same_div: "divisi sama",
            rs_similar_type: "Sejenis",
            rs_related_rel: "Rilis Terkait",
            rs_subject: "Subjek",
            pt_management: "Manajemen",
            pt_education: "Pendidikan",
            pt_law: "Hukum",
            pt_psychology: "Psikologi",
            pt_accounting: "Akuntansi",
            pt_math: "Matematika",
            nav_bookmarks: "Koleksi Saya",
            bookmarks_desc: "Daftar literatur yang Anda simpan di perangkat ini",
            btn_bookmark: "Simpan",
            btn_bookmarked: "Tersimpan",
            no_bookmarks: "Belum ada literatur yang disimpan. Mulai jelajahi dan klik ikon bintang untuk menyimpan koleksi Anda di sini.",
            scopus_live_prompt: "Pencarian Scopus terhubung secara langsung (waktu nyata). Silakan ketik kata kunci Anda di kotak pencarian.",
            copied_link: "Tautan berhasil disalin!",
            btn_share: "Bagikan",
            eyebrow_text: "UPT Perpustakaan dan Layanan Digital UMS",
            prodi_all_fak: "Semua Prodi",
            prodi_books_count: "koleksi relevan",
            prodi_no_books: "Belum ada koleksi terindeks untuk program studi ini.",
            browse_tab_ddc: "Klasifikasi DDC",
            browse_tab_prodi: "Per Program Studi",
            browse_prodi_sel: "Pilih Program Studi / Fakultas",
            bm_sort_az: "A–Z",
            bm_sort_year: "Terbaru",
            bm_sort_ddc: "DDC",
            bm_export_csv: "CSV",
            bm_export_bib: "BibTeX",
            bm_clear_all: "Hapus Semua",
            bm_sort_label: "Urutkan:",
            sf_all: "Semua",
            sf_title: "Judul",
            sf_author: "Pengarang",
            sf_subject: "Subjek",
            sf_ddc: "No. Panggil",
            sf_isbn: "ISBN",
            no_results: "Tidak ada hasil.",
        },
        en: {
            loading_books: "Loading library collection...",
            loading_ddc: "Loading DDC classification...",
            building_index: "Building search index...",
            home: "Home",
            explore: "Explore",
            stats: "Statistics",
            hero_title1: "UMS Library OneSearch",
            hero_title2: "OneSearch",
            hero_subtitle: "One-stop search for library collections, institutional repositories, and academic literature.",
            search_placeholder: "Search title, author, subject (history) ...",
            btn_search: "Search",
            adv_search: "Advanced Search",
            results_found: "Collections Found",
            results_time: "search completed in",
            filter: "Filters",
            clear: "Clear",
            sort_relevance: "Relevance",
            sort_az: "Title A-Z",
            sort_newest: "Newest",
            sort_oldest: "Oldest",
            sort_ddc: "DDC",
            format: "Format",
            year: "Year",
            author: "Author",
            topic: "Topic",
            similar: "Similar Items",
            same_author: "Same Author",
            related_topics: "Related Topics",
            recommendation: "Recommendations",
            load_more: "Load More",
            src_koha: "Main Library (Koha)",
            src_eprints: "Institutional Repository (EPrints)",
            src_institusi: "Source",
            type_bks: "Printed Book",
            type_thesis: "Undergrad / Thesis / Dissertation",
            type_jr: "Journal Article",
            type_conf: "Proceedings / Conference",
            type_rpt: "Research Report",
            explore_ddc: "Explore Collections by DDC",
            all_ddc: "All DDC Classes",
            back: "Back",
            qr_source: "QR Source",
            popular_topics: "Popular Topics",
            collection_format: "Collection Formats",
            search_options: "Search Options",
            search_history: "Search History",
            printed_book: "Printed Books",
            ebook: "E-Book (Digital)",
            journal: "Journals",
            computer_file: "Computer Files",
            thesis_short: "Thesis / Dissertation",
            reference: "Reference",
            browse_collection: "Browse Collection",
            browse_subtitle: "Browse by Dewey Decimal Classification",
            stats_collection: "Collection Statistics",
            stats_subtitle: "Library data summary",
            footer_tagline: "UMS Library OneSearch — One-Stop Academic Search",
            footer_data: "Data from",
            footer_updated: "Updated",
            publisher: "Publisher",
            type_label: "Type",
            edition: "Edition",
            physical: "Physical",
            source: "Source",
            classification: "Classification",
            description: "Description",
            view_at: "View at",
            cite_qr: "Cite & URL QR",
            auto_cite: "Auto Citation",
            total_books: "Total Books",
            with_ddc: "With DDC",
            subjects: "Subjects",
            libraries: "Libraries",
            oldest: "Oldest",
            newest_stat: "Newest",
            ddc_distribution: "Distribution by DDC Class",
            type_distribution: "Distribution by Type",
            books_unit: "books",
            categories: "categories",
            sug_title: "Title",
            sug_author: "Author",
            sug_subject: "Subject",
            no_history: "No search history yet.",
            search_history_title: "Search History",
            clear_all: "Clear All",
            adv_book_title: "Book Title",
            adv_title_ph: "Search in title...",
            adv_author_ph: "Search author...",
            adv_pub_label: "Publisher",
            adv_pub_ph: "Publisher name...",
            adv_year_label: "Year Published",
            adv_year_ph: "e.g. 2021",
            adv_topic_ph: "Topic keywords...",
            adv_cancel: "Cancel",
            adv_intro: "Fill in one or more criteria below for precise searching.",
            anon: "Anonymous",
            unknown_pub: "Unknown Publisher",
            no_year: "n.d.",
            ddc_0: "Computer", ddc_1: "Philosophy", ddc_2: "Religion", ddc_3: "Social",
            ddc_4: "Language", ddc_5: "Science", ddc_6: "Technology", ddc_7: "Arts",
            ddc_8: "Literature", ddc_9: "History",
            filter_access: "Show Only",
            acc_ft: "Full Text Online",
            acc_pr: "Peer-reviewed Journals",
            acc_oa: "Open Access",
            acc_lib: "Available in the Library",
            type_Article: "Articles",
            type_Review: "Reviews",
            type_Book: "Books",
            "type_Book Chapter": "Book Chapters",
            type_BKS: "Printed Book (ID)", type_BKSA: "Printed Book (Foreign)",
            type_EB: "E-Book", type_JR: "National Journal", type_JRA: "International Journal",
            type_JRT: "Accredited National Journal",
            type_CF: "CD/DVD ROM (ID)", type_CFA: "CD/DVD ROM (Foreign)",
            type_PR: "Proceedings", type_DIG: "Digital Archive (ID)",
            type_DIGA: "Digital Archive (Foreign)",
            type_AV: "Audio Video (ID)", type_AVA: "Audio/Video (Foreign)",
            type_MJI: "Scientific Magazine", type_MJP: "Popular Magazine",
            type_MJIP: "Popular Scientific Magazine", type_KL: "Clipping",
            type_RS: "Research Report",
            type_BKSC: "Reserve Book", type_BKSCA: "Reserve Book",
            type_MJA: "Foreign Magazine",
            type_THESIS: "Thesis/Dissertation", type_CONF: "Conference",
            type_RPT: "Report", type_EPR: "Electronic Proceedings",
            rs_same_class: "same classification",
            rs_same_ddc: "same classification",
            rs_same_div: "same division",
            rs_similar_type: "Similar Format",
            rs_related_rel: "Related Release",
            rs_subject: "Subject",
            pt_management: "Management",
            pt_education: "Education",
            pt_law: "Law",
            pt_psychology: "Psychology",
            pt_accounting: "Accounting",
            pt_math: "Mathematics",
            nav_bookmarks: "My Collection",
            bookmarks_desc: "List of literature you saved on this device",
            btn_bookmark: "Bookmark",
            btn_bookmarked: "Saved",
            no_bookmarks: "No literature saved yet. Start browsing and click the star icon to save your collection here.",
            scopus_live_prompt: "Scopus search is connected live. Please type your keywords in the search box above.",
            copied_link: "Link copied to clipboard!",
            btn_share: "Share",
            eyebrow_text: "UMS Library and Digital Services",
            prodi_all_fak: "All Faculties",
            prodi_books_count: "relevant items",
            prodi_no_books: "No indexed collections for this study program yet.",
            browse_tab_ddc: "DDC Classification",
            browse_tab_prodi: "By Study Program",
            browse_prodi_sel: "Select Study Program / Faculty",
            bm_sort_az: "A–Z",
            bm_sort_year: "Newest",
            bm_sort_ddc: "DDC",
            bm_export_csv: "CSV",
            bm_export_bib: "BibTeX",
            bm_clear_all: "Clear All",
            bm_sort_label: "Sort:",
            sf_all: "All Fields",
            sf_title: "Title",
            sf_author: "Author",
            sf_subject: "Subject",
            sf_ddc: "Call Number",
            sf_isbn: "ISBN",
            no_results: "No results.",
        }
    },

    t(key) {
        return this.translations[this.lang][key] || key;
    },

    theme: 'light',

    initTheme() {
        const saved = localStorage.getItem('bf_theme') || localStorage.getItem('bf-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        this.setTheme(saved);
    },

    toggleTheme() {
        const cur = document.documentElement.getAttribute('data-theme') || this.theme || 'light';
        const next = (cur === 'dark') ? 'light' : 'dark';
        this.setTheme(next);
    },

    setTheme(t) {
        this.theme = t;
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('bf_theme', t);
        localStorage.setItem('bf-theme', t);
        const btn = document.getElementById('theme-toggle-fab') || document.getElementById('theme-toggle');
        if (btn) {
            btn.setAttribute('aria-label', t === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap');
            btn.title = t === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap';
        }
    },

    toggleLang() {
        this.lang = this.lang === 'id' ? 'en' : 'id';
        this.lang = this.lang.toLowerCase();
        localStorage.setItem('bf-lang', this.lang);
        this.translateDOM();

        // Re-render currently viewed dynamic contents
        if (this.currentPage === 'results') this.renderResults();
        if (this.currentPage === 'ddc') this.renderDDC();
        if (this.currentPage === 'stats') this.renderStats();

        const btn = document.getElementById('lang-toggle');
        if (btn) btn.innerHTML = `<span>${this.lang.toUpperCase()}</span>`;
    },

    translateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (this.translations[this.lang][key]) {
                if (el.tagName === 'INPUT' && el.type === 'text') {
                    el.placeholder = this.t(key);
                } else if (el.tagName === 'OPTION') {
                    el.textContent = this.t(key);
                } else {
                    el.innerHTML = this.t(key);
                }
            }
        });
    },

    OPAC: 'https://opac-lib.ums.ac.id/cgi-bin/koha/opac-detail.pl?biblionumber=',

    // Build link to source
    sourceLink(book) {
        if (book.url) return book.url;
        if (typeof book.id === 'number') return this.OPAC + book.id;
        return '';
    },

    COLORS: {
        '0': '#4e8cff', '1': '#a78bfa', '2': '#2dd4a0', '3': '#4e8cff', '4': '#ff6b35',
        '5': '#2dd4bf', '6': '#fb7185', '7': '#fbbf24', '8': '#f472b6', '9': '#818cf8',
    },

    // ──── SIBI API Fetch ────
    async fetchSibiBooks() {
        const base_uri = 'https://api.buku.cloudapp.web.id';
        const endpoints = {
            'Kurikulum Merdeka': '/api/catalogue/getPenggerakTextBooks?limit=3000&order_by=updated_at',
            'Teks K-13': '/api/catalogue/getTextBooks?limit=3000&order_by=updated_at',
            'Non-Teks (Buku Model)': '/api/catalogue/getNonTextBooks?limit=3000&order_by=updated_at&tag=Buku%20Model',
            'Buku STEM': '/api/catalogue/getBooksByTag?limit=3000&Tag=STEM'
        };
        try {
            const fetchPromises = Object.entries(endpoints).map(([category, ep]) =>
                fetch(base_uri + ep).then(r => r.json()).then(res => ({ category, res })).catch(() => ({ category, res: { results: [] } }))
            );
            const resultsArray = await Promise.all(fetchPromises);
            let sibiBooks = [];
            const seenIds = new Set();

            resultsArray.forEach(({ category, res }) => {
                if (res && res.results) {
                    res.results.forEach(item => {
                        if (seenIds.has(item.id)) return;
                        seenIds.add(item.id);

                        let formatKoleksi = 'bks';
                        if (item.type === 'audio') formatKoleksi = 'audio';
                        if (item.type === 'interactive') formatKoleksi = 'interactive';

                        sibiBooks.push({
                            id: 'sibi-' + item.id,
                            t: item.title || '',
                            a: item.writer || '',
                            yr: item.published_year ? item.published_year.split('-')[0] : '',
                            pub: item.publisher || 'Pusat Perbukuan',
                            isbn: item.isbn || '',
                            type: formatKoleksi,
                            src: 'SIBI (Buku Kemdikbud)',
                            url: item.attachment || '',
                            sub: [category, ...(item.subject ? item.subject.split(',') : [])].map(s => s.trim()).filter(Boolean)
                        });
                    });
                }
            });
            return sibiBooks;
        } catch (e) {
            console.error("Failed to fetch SIBI:", e);
            return [];
        }
    },

    // ──── IndexedDB Cache Store ────
    idb: {
        dbName: 'ums_onesearch_v1',
        storeName: 'catalog_store',
        open() {
            return new Promise((resolve) => {
                if (!window.indexedDB) return resolve(null);
                const req = indexedDB.open(this.dbName, 1);
                req.onupgradeneeded = () => {
                    if (!req.result.objectStoreNames.contains(this.storeName)) {
                        req.result.createObjectStore(this.storeName);
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
        },
        async get(key) {
            try {
                const db = await this.open();
                if (!db) return null;
                return new Promise((resolve) => {
                    const tx = db.transaction(this.storeName, 'readonly');
                    const req = tx.objectStore(this.storeName).get(key);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => resolve(null);
                });
            } catch (e) { return null; }
        },
        async set(key, val) {
            try {
                const db = await this.open();
                if (!db) return false;
                return new Promise((resolve) => {
                    const tx = db.transaction(this.storeName, 'readwrite');
                    tx.objectStore(this.storeName).put(val, key);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                });
            } catch (e) { return false; }
        }
    },

    // ──── Init ────
    async init() {
        const bar = document.getElementById('ld-bar');
        const txt = document.getElementById('ld-text');
        try {
            bar.style.width = '15%';
            const t = new Date().getTime();

            // 1. Muat metadata ringkas (Stats, DDC, Prodi, SIBI) secara paralel
            txt.textContent = this.t('loading_ddc');
            const [localStats, ddcData, prodiData, sibiBooks] = await Promise.all([
                fetch('data/stats.json?t=' + t).then(r => r.json()).catch(() => ({})),
                fetch('data/ddc_tree.json?t=' + t).then(r => r.json()).catch(() => ({})),
                fetch('data/prodi_index.json?t=' + t).then(r => r.json()).catch(() => ({})),
                this.fetchSibiBooks().catch(() => [])
            ]);

            this.stats = localStats || {};
            this.ddcTree = ddcData || {};
            this.prodiIndex = prodiData || {};
            bar.style.width = '35%';

            // 2. Cek apakah katalog lokal di IndexedDB masih up-to-date
            const currentVersion = this.stats.last_updated || 'v101';
            const cachedVersion = localStorage.getItem('bf_books_version');
            let localBooks = null;

            if (cachedVersion === currentVersion) {
                txt.textContent = 'Memuat katalog dari penyimpanan lokal...';
                localBooks = await this.idb.get('books_catalog');
            }

            // 3. Jika belum di-cache atau versi data berubah setelah panen, unduh dan simpan ke IndexedDB
            if (!localBooks || !Array.isArray(localBooks) || localBooks.length === 0) {
                txt.textContent = this.t('loading_books');
                localBooks = await (await fetch('data/books.json?t=' + t)).json();
                this.idb.set('books_catalog', localBooks);
                localStorage.setItem('bf_books_version', currentVersion);
            }

            this.books = localBooks.concat(sibiBooks || []);
            bar.style.width = '75%';

            // Load international configuration (toggles & active sources)
            try {
                this.intlConfig = await (await fetch('/api/international/config')).json();
            } catch (e) {
                this.intlConfig = { enabled: true, sources: {} };
            }

            // Pre-load subscribed journals & ebooks data for unified search & highlighting
            this.getSubscribedJournalsList();
            this.getSubscribedEBooksList();

            txt.textContent = this.t('building_index');
            this.searchEngine.build(this.books);
            this.recommender = new Recommender(this.searchEngine);
            bar.style.width = '95%';

            this.initTheme();
            this.translateDOM();
            const langBtn = document.getElementById('lang-toggle');
            if (langBtn) langBtn.textContent = this.lang.toUpperCase();
            this.searchHistory = JSON.parse(localStorage.getItem('bf-search-history') || '[]');
            this.bookmarks = new Set(JSON.parse(localStorage.getItem('bf-bookmarks') || '[]'));
            this.bookmarksData = JSON.parse(localStorage.getItem('bf-bookmarks-data') || '{}');
            this.renderShelves();
            this.renderInstitutionPicker();
            this.listen();
            this._updateBmBadge();
            bar.style.width = '100%';

            const lastUpdateEl = document.getElementById('last-update');
            if (lastUpdateEl) {
                lastUpdateEl.textContent = this.stats.last_updated ? new Date(this.stats.last_updated).toLocaleDateString('id-ID') : '-';
            }
            const heroTotalEl = document.getElementById('hero-total');
            if (heroTotalEl) heroTotalEl.textContent = this.fmt(this.stats.total_books || this.books.length);
            const footerYearEl = document.getElementById('footer-year');
            if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();

            setTimeout(() => {
                document.getElementById('ld-screen').classList.add('hidden');

                // Deep Linking: Auto-search query parameters 
                const queryParams = new URLSearchParams(window.location.search);
                const queryId = queryParams.get('id');
                const querySearch = queryParams.get('q');
                const queryField = queryParams.get('field');
                const querySrc = queryParams.get('src');
                const querySubMode = queryParams.get('submode');
                const queryPage = queryParams.get('page');

                if (queryPage === 'ejournals' || querySrc === 'ejournals') {
                    this.showEJournalDirectory();
                    if (querySearch) {
                        setTimeout(() => {
                            const jrnInp = document.getElementById('ejrn-search-input');
                            if (jrnInp) {
                                jrnInp.value = querySearch;
                                this.filterEJournalDirectory();
                            }
                        }, 200);
                    }
                    return;
                }

                if (queryPage === 'ebooks' || querySrc === 'ebooks') {
                    this.showEBookDirectory();
                    if (querySearch) {
                        setTimeout(() => {
                            const ebkInp = document.getElementById('ebk-search-input');
                            if (ebkInp) {
                                ebkInp.value = querySearch;
                                this.filterEBookDirectory();
                            }
                        }, 200);
                    }
                    return;
                }

                if (querySubMode) {
                    this._fedSubscriptionMode = querySubMode;
                }

                if (querySrc && querySrc !== 'local') {
                    this._activeFedSource = querySrc;
                    this.renderFederatedSourcesGrid();
                }

                if (queryId) {
                    // Try to parse as integer if possible, else use string
                    const idToLookup = isNaN(Number(queryId)) ? queryId : Number(queryId);
                    if (this.searchEngine.getById(idToLookup)) {
                        this.showBookDetail(idToLookup);
                    }
                } else if (querySearch) {
                    // Coming from external search widget
                    document.getElementById('search-input').value = querySearch;
                    document.getElementById('search-clear').style.display = 'block';
                    if (queryField && document.getElementById('search-field-sel')) {
                        document.getElementById('search-field-sel').value = queryField;
                    }
                    this.showPage('home');
                    this.doSearch(querySearch);
                } else if (querySrc && querySrc !== 'local') {
                    this.selectFedSource(querySrc);
                }
            }, 350);
        } catch (e) {
            txt.textContent = 'Error: ' + e.message;
            console.error(e);
        }
    },

    // ──── Events ────
    listen() {
        const inp = document.getElementById('search-input');
        const kbdHint = document.getElementById('search-kbd-hint');

        // Detect Mac vs Windows/Linux for keyboard hint
        if (kbdHint) {
            const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
            kbdHint.innerHTML = isMac ? '<span class="kbd-mod">⌘</span> K' : '<span class="kbd-mod">Ctrl</span> K';
        }

        const updateKbdVisibility = () => {
            if (kbdHint) {
                const hasVal = inp && inp.value.trim().length > 0;
                kbdHint.style.display = hasVal ? 'none' : 'inline-flex';
            }
        };

        inp.addEventListener('input', e => {
            clearTimeout(this.debounce);
            const q = e.target.value.trim();
            document.getElementById('search-clear').style.display = q ? 'block' : 'none';
            updateKbdVisibility();
            this.debounce = setTimeout(() => q.length >= 2 ? this.showSuggest(q) : this.hideSuggest(), 200);
        });
        inp.addEventListener('focus', updateKbdVisibility);
        inp.addEventListener('blur', updateKbdVisibility);

        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') { this.hideSuggest(); this.doSearch(inp.value.trim()); }
            if (e.key === 'Escape') this.hideSuggest();
        });

        // Global keyboard shortcut (Ctrl+K, Cmd+K, or '/')
        document.addEventListener('keydown', e => {
            const isK = (e.key === 'k' || e.key === 'K');
            const isCtrlOrCmdK = (e.ctrlKey || e.metaKey) && isK;
            const isSlash = e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

            if (isCtrlOrCmdK || isSlash) {
                e.preventDefault();
                if (this.currentPage !== 'home') {
                    this.showHome();
                }
                if (inp) {
                    inp.focus();
                    inp.select();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                updateKbdVisibility();
            }

            if (e.key === 'Escape') this.closeBookDetail();
        });

        window.addEventListener('popstate', e => {
            if (e.state && e.state.modal === 'open' && e.state.id) {
                this._openModalInternal(e.state.id);
            } else {
                this._closeModalInternal();
            }
        });

        // Scroll-to-top button visibility
        const scrollTopBtn = document.getElementById('scroll-top-btn');
        if (scrollTopBtn) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 400) {
                    scrollTopBtn.classList.add('visible');
                } else {
                    scrollTopBtn.classList.remove('visible');
                }
            }, { passive: true });
        }

        // Close mobile menu, suggestion box, and dropdowns on outside click
        document.addEventListener('click', e => {
            const mobMenu = document.getElementById('mob-menu');
            const mobBtn = document.querySelector('.mob-btn');
            if (mobMenu && mobMenu.classList.contains('open')) {
                if (!mobMenu.contains(e.target) && !mobBtn.contains(e.target)) {
                    mobMenu.classList.remove('open');
                }
            }

            // Close bookmark export menu on outside click
            const expMenu = document.getElementById('bm-export-menu');
            const expWrap = document.querySelector('.bm-export-dropdown-wrap');
            if (expMenu && expMenu.style.display === 'block') {
                if (!expWrap || !expWrap.contains(e.target)) {
                    expMenu.style.display = 'none';
                }
            }

            // Close search suggestion box on outside click
            const searchWrap = document.getElementById('search-wrap');
            if (searchWrap && !searchWrap.contains(e.target)) {
                this.hideSuggest();
            }
        });
    },

    // ──── Navigation ────
    showPage(p) {
        document.querySelectorAll('.page').forEach(el => el.classList.remove('on'));
        document.getElementById('page-' + p).classList.add('on');
        document.querySelectorAll('.nav-mid a').forEach(a => a.classList.remove('on'));
        const link = document.querySelector(`.nav-mid a[data-page="${p}"]`);
        if (link) link.classList.add('on');

        // Sync active state in mobile menu
        document.querySelectorAll('.mob-menu a').forEach(a => a.classList.remove('on'));
        const mobLink = document.querySelector(`.mob-menu a[data-page="${p}"]`);
        if (mobLink) mobLink.classList.add('on');

        this.currentPage = p;
        window.scrollTo(0, 0);
    },
    showHome() {
        this.showPage('home');
        this._activeFedSource = null;
        this.renderFederatedSourcesGrid();
        if (document.getElementById('results-wrap')) document.getElementById('results-wrap').style.display = 'none';
        if (document.getElementById('fed-results-wrap')) document.getElementById('fed-results-wrap').style.display = 'none';
    },
    showBrowse(level) {
        this.showPage('browse');
        this.ddcLevel = level || null;
        if (this.browseMode !== 'ddc') {
            this.browseMode = 'ddc';
            this._applyBrowseMode();
        }
        this.renderBrowse();
    },
    showProdi() {
        // Buka Jelajahi dalam mode Per Prodi
        this.showPage('browse');
        this.activeFakultas = null;
        this.browseMode = 'prodi';
        this._applyBrowseMode();
        this.renderProdi();
    },
    setBrowseMode(mode) {
        this.switchBrowseMode(mode);
    },
    switchBrowseMode(mode) {
        this.browseMode = mode;
        this._applyBrowseMode();
        if (mode === 'ddc') {
            this.ddcLevel = null;
            this.renderBrowse();
        } else {
            this.activeFakultas = null;
            this.renderProdi();
        }
    },
    _applyBrowseMode() {
        const ddcArea = document.getElementById('browse-ddc-wrap') || document.getElementById('browse-ddc-area');
        const prodiArea = document.getElementById('browse-prodi-wrap') || document.getElementById('browse-prodi-area');
        const tabDdc = document.getElementById('tab-browse-ddc') || document.getElementById('bmt-ddc');
        const tabProdi = document.getElementById('tab-browse-prodi') || document.getElementById('bmt-prodi');
        const isDdc = this.browseMode !== 'prodi';
        if (ddcArea) ddcArea.style.display = isDdc ? 'block' : 'none';
        if (prodiArea) prodiArea.style.display = isDdc ? 'none' : 'block';
        if (tabDdc) {
            tabDdc.className = isDdc ? 'btn btn-brand' : 'btn btn-ghost';
            tabDdc.classList.toggle('active', isDdc);
        }
        if (tabProdi) {
            tabProdi.className = !isDdc ? 'btn btn-brand' : 'btn btn-ghost';
            tabProdi.classList.toggle('active', !isDdc);
        }
    },
    showBookmarks() {
        this.showPage('bookmarks');
        this.renderBookmarks();
    },
    showStats() { this.showPage('stats'); this.renderStats(); },

    // ──── Public E-Journal Directory (Langganan Resmi UMS) ────
    async getSubscribedJournalsList() {
        if (this._ejournalsList && this._ejournalsList.length > 0) {
            this.populateEJournalFilters(this._ejournalsList);
            return this._ejournalsList;
        }
        try {
            const res = await fetch('/api/international/journals');
            if (res.ok) {
                const data = await res.json();
                this._ejournalsList = Array.isArray(data) ? data : (data.items || []);
                this.populateEJournalFilters(this._ejournalsList);
                return this._ejournalsList;
            }
        } catch (e) {
            console.error('Error fetching subscribed journals:', e);
        }
        return [];
    },

    async showEJournalDirectory() {
        this.showPage('ejournals');
        const grid = document.getElementById('ejrn-grid');
        const loading = document.getElementById('ejrn-loading');

        if (this._ejournalsList && this._ejournalsList.length > 0) {
            this.populateEJournalFilters(this._ejournalsList);
            this.filterEJournalDirectory();
            return;
        }

        if (loading) loading.style.display = 'block';
        if (grid) grid.innerHTML = '';

        try {
            await this.getSubscribedJournalsList();
            this.populateEJournalFilters(this._ejournalsList);
            this.filterEJournalDirectory();
        } catch (e) {
            console.error('Error fetching subscribed journals:', e);
            if (grid) {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--ink-3);">Gagal memuat katalog jurnal. Silakan coba sesaat lagi.</div>';
            }
        } finally {
            if (loading) loading.style.display = 'none';
        }
    },

    populateEJournalFilters(list) {
        const pubSel = document.getElementById('ejrn-filter-publisher');
        if (!pubSel) return;
        const curVal = pubSel.value || 'all';
        const safeList = Array.isArray(list) ? list : (list && Array.isArray(list.items) ? list.items : []);

        // Extract unique publisher names cleanly
        const pubMap = new Map();
        safeList.forEach(it => {
            const p = (it.publisher || '').trim();
            if (p && !pubMap.has(p.toLowerCase())) {
                pubMap.set(p.toLowerCase(), p);
            }
        });
        const publishers = Array.from(pubMap.values()).sort((a, b) => a.localeCompare(b));

        let html = '<option value="all">Semua Penerbit</option>';
        publishers.forEach(p => {
            const isSel = (curVal.toLowerCase() === p.toLowerCase()) ? ' selected' : '';
            html += `<option value="${this.esc(p)}"${isSel}>${this.esc(p)}</option>`;
        });
        pubSel.innerHTML = html;
    },

    filterEJournalDirectory() {
        const q = (document.getElementById('ejrn-search-input')?.value || '').toLowerCase().trim();
        const pubFilter = (document.getElementById('ejrn-filter-publisher')?.value || 'all').toLowerCase().trim();
        const accessFilter = (document.getElementById('ejrn-filter-access')?.value || 'all').toLowerCase().trim();

        const safeList = Array.isArray(this._ejournalsList) ? this._ejournalsList : [];
        const filtered = safeList.filter(it => {
            const itPub = (it.publisher || '').toLowerCase().trim();
            const matchPub = pubFilter === 'all' || itPub === pubFilter;

            const itAccess = (it.accessType || it.access || '').toLowerCase().trim();
            const matchAccess = accessFilter === 'all' ||
                (accessFilter === 'kampus' && (itAccess.includes('kampus') || itAccess.includes('eduroam') || !itAccess || it.notes?.toLowerCase().includes('kampus'))) ||
                (accessFilter === 'ezproxy' && (itAccess.includes('ezproxy') || itAccess.includes('sso') || it.url?.toLowerCase().includes('ezproxy'))) ||
                (accessFilter === 'open' && (itAccess.includes('open') || it.openAccess));

            const searchStr = `${it.title || ''} ${it.publisher || ''} ${it.issn || ''} ${it.eissn || ''} ${it.subject || ''} ${it.faculty || ''} ${it.notes || ''}`.toLowerCase();
            const matchQ = !q || searchStr.includes(q);
            return matchPub && matchAccess && matchQ;
        });

        this.renderEJournalDirectory(filtered);
    },

    starSvg(isBm) {
        if (isBm) {
            return `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        }
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    },

    renderEJournalDirectory(list) {
        const grid = document.getElementById('ejrn-grid');
        if (!grid) return;

        const safeList = Array.isArray(list) ? list : (list && Array.isArray(list.items) ? list.items : []);

        if (!safeList || safeList.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:3rem 1.5rem; color:var(--ink-3); background:var(--bg-2); border:1px solid var(--border); border-radius:var(--r-md);">
                    <p style="font-size:1.05rem; font-weight:600; color:var(--ink); margin-bottom:0.35rem;">Tidak Ada Jurnal yang Sesuai</p>
                    <p style="font-size:0.85rem;">Coba sesuaikan kata kunci pencarian atau filter penerbit.</p>
                </div>`;
            return;
        }

        grid.innerHTML = safeList.map(it => {
            const issns = [it.issn, it.eissn].filter(Boolean).join(' / ') || '-';
            const accessBadge = it.accessType === 'ezproxy' ?
                '<span class="chip" style="background:rgba(217, 119, 6, 0.12); color:#b45309; font-weight:600;">EZProxy SSO</span>' :
                (it.accessType === 'open' ?
                    '<span class="chip" style="background:rgba(16, 185, 129, 0.12); color:#059669; font-weight:600;">Open Access</span>' :
                    '<span class="chip" style="background:rgba(59, 130, 246, 0.12); color:#2563eb; font-weight:600;">IP Kampus</span>');

            const directUrl = it.url || '#';

            return `
            <div class="ejournal-card">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.5rem;">
                        <span class="fed-badge-subscribed" style="font-size:0.68rem;"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Langganan UMS</span>
                        ${accessBadge}
                    </div>
                    <h3 style="font-size:1.05rem; font-weight:700; color:var(--ink); margin-bottom:0.4rem; line-height:1.35;">
                        ${this.esc(it.title)}
                    </h3>
                    <div style="font-size:0.82rem; font-weight:600; color:var(--brand-text); margin-bottom:0.5rem;">
                        ${this.esc(it.publisher || 'Penerbit Internasional')}
                    </div>
                    <div style="font-size:0.75rem; color:var(--ink-3); margin-bottom:0.6rem; font-family:var(--font-mono);">
                        ISSN: ${this.esc(issns)}
                    </div>
                    ${it.subject ? `
                    <div style="font-size:0.78rem; color:var(--ink-2); margin-bottom:0.75rem;">
                        <strong>Subjek:</strong> ${this.esc(it.subject)} ${it.faculty ? `(Fak: ${this.esc(it.faculty)})` : ''}
                    </div>` : ''}
                    ${it.notes ? `
                    <div style="font-size:0.74rem; color:var(--ink-3); margin-bottom:0.75rem; display:flex; align-items:flex-start; gap:0.35rem;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>${this.esc(it.notes)}</span>
                    </div>` : ''}
                </div>
                <div style="margin-top:1rem; border-top:1px solid var(--border); padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                    <a href="${this.esc(directUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-brand" style="font-size:0.78rem; padding:0.4rem 0.85rem; width:100%; justify-content:center;">
                        Buka Portal Jurnal ↗
                    </a>
                </div>
            </div>`;
        }).join('');
    },

    // ──── Public E-Book Directory (Buku Elektronik Resmi UMS) ────
    async getSubscribedEBooksList() {
        if (this._ebooksList && this._ebooksList.length > 0) {
            this.populateEBookFilters(this._ebooksList);
            return this._ebooksList;
        }
        try {
            const res = await fetch('/api/international/ebooks');
            if (res.ok) {
                const data = await res.json();
                this._ebooksList = Array.isArray(data) ? data : (data.items || []);
                this.populateEBookFilters(this._ebooksList);
                return this._ebooksList;
            }
        } catch (e) {
            console.error('Error fetching subscribed ebooks:', e);
        }
        return [];
    },

    async showEBookDirectory() {
        this.showPage('ebooks');
        const grid = document.getElementById('ebk-grid');
        const loading = document.getElementById('ebk-loading');

        if (this._ebooksList && this._ebooksList.length > 0) {
            this.populateEBookFilters(this._ebooksList);
            this.filterEBookDirectory();
            return;
        }

        if (loading) loading.style.display = 'block';
        if (grid) grid.innerHTML = '';

        try {
            await this.getSubscribedEBooksList();
            this.populateEBookFilters(this._ebooksList);
            this.filterEBookDirectory();
        } catch (e) {
            console.error('Error fetching subscribed ebooks:', e);
            if (grid) {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--ink-3);">Gagal memuat katalog e-book. Silakan coba sesaat lagi.</div>';
            }
        } finally {
            if (loading) loading.style.display = 'none';
        }
    },

    populateEBookFilters(list) {
        const pubSel = document.getElementById('ebk-filter-publisher');
        const subSel = document.getElementById('ebk-filter-subject');
        if (!pubSel || !subSel) return;

        const curPub = pubSel.value || 'all';
        const curSub = subSel.value || 'all';
        const safeList = Array.isArray(list) ? list : (list && Array.isArray(list.items) ? list.items : []);

        const pubMap = new Map();
        const subMap = new Map();

        safeList.forEach(it => {
            const p = (it.publisher || '').trim();
            if (p && !pubMap.has(p.toLowerCase())) {
                pubMap.set(p.toLowerCase(), p);
            }
            const s = (it.subject || '').trim();
            if (s && !subMap.has(s.toLowerCase())) {
                subMap.set(s.toLowerCase(), s);
            }
        });

        const publishers = Array.from(pubMap.values()).sort((a, b) => a.localeCompare(b));
        const subjects = Array.from(subMap.values()).sort((a, b) => a.localeCompare(b));

        let pubHtml = '<option value="all">Semua Penerbit</option>';
        publishers.forEach(p => {
            const isSel = (curPub.toLowerCase() === p.toLowerCase()) ? ' selected' : '';
            pubHtml += `<option value="${this.esc(p)}"${isSel}>${this.esc(p)}</option>`;
        });
        pubSel.innerHTML = pubHtml;

        let subHtml = '<option value="all">Semua Subjek</option>';
        subjects.forEach(s => {
            const isSel = (curSub.toLowerCase() === s.toLowerCase()) ? ' selected' : '';
            subHtml += `<option value="${this.esc(s)}"${isSel}>${this.esc(s)}</option>`;
        });
        subSel.innerHTML = subHtml;
    },

    filterEBookDirectory() {
        const q = (document.getElementById('ebk-search-input')?.value || '').toLowerCase().trim();
        const pubFilter = (document.getElementById('ebk-filter-publisher')?.value || 'all').toLowerCase().trim();
        const subFilter = (document.getElementById('ebk-filter-subject')?.value || 'all').toLowerCase().trim();
        const accessFilter = (document.getElementById('ebk-filter-access')?.value || 'all').toLowerCase().trim();

        const safeList = Array.isArray(this._ebooksList) ? this._ebooksList : [];
        const filtered = safeList.filter(it => {
            const itPub = (it.publisher || '').toLowerCase().trim();
            const matchPub = pubFilter === 'all' || itPub === pubFilter;

            const itSub = (it.subject || '').toLowerCase().trim();
            const matchSub = subFilter === 'all' || itSub === subFilter;

            const itAccess = (it.access_type || it.accessType || '').toLowerCase().trim();
            const matchAccess = accessFilter === 'all' ||
                (accessFilter === 'kampus' && (itAccess.includes('kampus') || itAccess.includes('eduroam') || !itAccess || (it.notes && it.notes.toLowerCase().includes('kampus')))) ||
                (accessFilter === 'ezproxy' && (itAccess.includes('ezproxy') || itAccess.includes('sso') || (it.url && it.url.toLowerCase().includes('ezproxy')))) ||
                (accessFilter === 'open' && (itAccess.includes('open') || it.openAccess));

            const searchStr = `${it.title || ''} ${it.author || ''} ${it.publisher || ''} ${it.isbn || ''} ${it.subject || ''} ${it.year || ''} ${it.notes || ''}`.toLowerCase();
            const matchQ = !q || searchStr.includes(q);
            return matchPub && matchSub && matchAccess && matchQ;
        });

        this.renderEBookDirectory(filtered);
    },

    renderEBookDirectory(list) {
        const grid = document.getElementById('ebk-grid');
        if (!grid) return;

        const safeList = Array.isArray(list) ? list : (list && Array.isArray(list.items) ? list.items : []);

        if (!safeList || safeList.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:3rem 1.5rem; color:var(--ink-3); background:var(--bg-2); border:1px solid var(--border); border-radius:var(--r-md);">
                    <p style="font-size:1.05rem; font-weight:600; color:var(--ink); margin-bottom:0.35rem;">Tidak Ada E-Book yang Sesuai</p>
                    <p style="font-size:0.85rem;">Coba sesuaikan kata kunci pencarian atau filter penerbit dan subjek.</p>
                </div>`;
            return;
        }

        grid.innerHTML = safeList.map(it => {
            const accessType = it.access_type || it.accessType || 'kampus';
            const accessBadge = accessType === 'ezproxy' ?
                '<span class="chip" style="background:rgba(217, 119, 6, 0.12); color:#b45309; font-weight:600;">EZProxy SSO</span>' :
                (accessType === 'open' ?
                    '<span class="chip" style="background:rgba(16, 185, 129, 0.12); color:#059669; font-weight:600;">Open Access</span>' :
                    '<span class="chip" style="background:rgba(59, 130, 246, 0.12); color:#2563eb; font-weight:600;">IP Kampus</span>');

            const hasPdf = Boolean(it.pdf_filename || (it.pdf_url && it.pdf_url.trim().length > 5));
            const pdfReadUrl = it.pdf_filename ? `/api/ebooks/${encodeURIComponent(it.id)}/pdf` : (it.pdf_url || '');
            const pdfDownloadUrl = `/api/ebooks/${encodeURIComponent(it.id)}/pdf/download`;
            const allowDownload = it.allow_download !== false;
            const directUrl = it.url || '#';
            const yearStr = it.year ? String(it.year) : '';
            const isbnStr = it.isbn || '-';
            const authorStr = it.author || 'Penulis Tidak Disebutkan';

            let coverImgHtml = '';
            if (it.cover_url) {
                coverImgHtml = `<img src="${this.esc(it.cover_url)}" alt="Cover ${this.esc(it.title)}" class="ebk-cover-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" loading="lazy">
                <div class="ebk-cover-fallback" style="display:none;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    <span>E-Book</span>
                </div>`;
            } else {
                coverImgHtml = `
                <div class="ebk-cover-fallback">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    <span>E-Book</span>
                </div>`;
            }

            return `
            <div class="ebk-card">
                <div class="ebk-card-main">
                    <div class="ebk-cover-box">
                        ${coverImgHtml}
                    </div>
                    <div class="ebk-info-box">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.4rem; margin-bottom:0.4rem; flex-wrap:wrap;">
                            <div style="display:inline-flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
                                <span class="fed-badge-subscribed" style="font-size:0.68rem;">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                    E-Book Langganan
                                </span>
                                ${hasPdf ? `<span class="chip" style="background:rgba(16, 185, 129, 0.12); color:#059669; font-weight:600; font-size:0.68rem; padding:1px 6px;">📄 PDF ${this.esc(it.pdf_size || '')}</span>` : ''}
                            </div>
                            ${accessBadge}
                        </div>
                        <h3 class="ebk-title" title="${this.esc(it.title)}">
                            ${this.esc(it.title)}
                        </h3>
                        <div class="ebk-author">
                            ${this.esc(authorStr)}
                        </div>
                        <div class="ebk-pub">
                            <span>${this.esc(it.publisher || 'Penerbit Internasional')}</span>
                            ${yearStr ? `<span>• ${yearStr}</span>` : ''}
                        </div>
                        <div class="ebk-meta-row">
                            <span>ISBN: <code>${this.esc(isbnStr)}</code></span>
                            ${it.subject ? `<span class="ebk-subject-chip">${this.esc(it.subject)}</span>` : ''}
                        </div>
                        ${it.notes ? `
                        <div class="ebk-notes">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            <span>${this.esc(it.notes)}</span>
                        </div>` : ''}
                    </div>
                </div>
                <div class="ebk-card-footer" style="flex-wrap:wrap; gap:0.4rem;">
                    <button type="button" class="btn btn-ghost ebk-btn-detail" onclick="app.showEBookDetail(${this.idAttr(it.id)})">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>Detail & Sitasi</span>
                    </button>
                    ${hasPdf ? `
                    <button type="button" class="btn btn-emerald ebk-btn-read-pdf" onclick="app.openEBookPdfViewer(${this.idAttr(it.id)})" title="Baca E-Book langsung di OneSearch">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        <span>Baca PDF</span>
                    </button>
                    ${allowDownload ? `
                    <a href="${this.esc(pdfDownloadUrl)}" class="btn btn-ghost" style="padding:0.35rem 0.6rem; font-size:0.75rem;" title="Unduh File PDF (${it.pdf_size || 'E-Book'})" download>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>Unduh</span>
                    </a>
                    ` : ''}
                    ` : ''}
                    ${it.url && it.url !== '#' && it.url !== pdfReadUrl ? `
                    <a href="${this.esc(directUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-brand ebk-btn-read" title="Buka di platform penerbit">
                        <span>Platform ↗</span>
                    </a>
                    ` : (!hasPdf ? `
                    <a href="${this.esc(directUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-brand ebk-btn-read">
                        <span>Buka E-Book ↗</span>
                    </a>
                    ` : '')}
                </div>
            </div>`;
        }).join('');
    },

    showEBookDetail(rawId) {
        const item = (this._ebooksList || []).find(b => String(b.id) === String(rawId));
        if (!item) {
            this.showAlert('Data e-book tidak ditemukan.');
            return;
        }

        const hasPdf = Boolean(item.pdf_filename || (item.pdf_url && item.pdf_url.trim().length > 5));
        const pdfReadUrl = item.pdf_filename ? `/api/ebooks/${encodeURIComponent(item.id)}/pdf` : (item.pdf_url || '');
        const pdfDownloadUrl = `/api/ebooks/${encodeURIComponent(item.id)}/pdf/download`;
        const allowDownload = item.allow_download !== false;
        const directUrl = item.url || '#';
        const yearStr = item.year ? String(item.year) : '';
        const authorStr = item.author || 'Penulis Tidak Disebutkan';
        const pubStr = item.publisher || 'Penerbit Internasional';
        const isbnStr = item.isbn || '-';
        const accessType = item.access_type || item.accessType || 'kampus';

        // Format APA 7th Edition Citation
        const apaCitation = `${authorStr} (${yearStr || 'n.d.'}). ${item.title}. ${pubStr}.${item.url ? ' ' + item.url : ''}`;

        let coverImgHtml = '';
        if (item.cover_url) {
            coverImgHtml = `<img src="${this.esc(item.cover_url)}" alt="Cover ${this.esc(item.title)}" style="max-width:140px; border-radius:6px; border:1px solid var(--border); box-shadow:0 4px 12px rgba(0,0,0,0.15); object-fit:cover;" onerror="this.style.display='none'">`;
        }

        const modalBody = document.getElementById('modal-body');
        if (!modalBody) return;

        modalBody.innerHTML = `
        <div class="detail">
            <div class="detail-head" style="display:flex; gap:1.25rem; align-items:flex-start;">
                ${coverImgHtml}
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem; flex-wrap:wrap;">
                        <span class="fed-badge-subscribed">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            E-Book Langganan Resmi UMS
                        </span>
                        <span class="chip" style="background:var(--bg-3); font-weight:600;">${this.esc(accessType.toUpperCase())}</span>
                        ${hasPdf ? `<span class="chip" style="background:rgba(16, 185, 129, 0.12); color:#059669; font-weight:600;">📄 PDF ${this.esc(item.pdf_size || 'Tersedia')}</span>` : ''}
                    </div>
                    <h2 class="detail-title" style="margin-top:0.25rem;">${this.esc(item.title)}</h2>
                    <p class="detail-author" style="margin-top:0.25rem;">${this.esc(authorStr)}</p>
                </div>
            </div>

            <div class="detail-grid" style="margin-top:1.25rem;">
                <div><div class="d-label">Penerbit</div><div class="d-val">${this.esc(pubStr)}</div></div>
                ${yearStr ? `<div><div class="d-label">Tahun Terbit</div><div class="d-val">${yearStr}</div></div>` : ''}
                <div><div class="d-label">ISBN</div><div class="d-val">${this.esc(isbnStr)}</div></div>
                <div><div class="d-label">Format / Tipe</div><div class="d-val">Buku Elektronik (E-Book) ${hasPdf ? `<span class="chip" style="background:rgba(16, 185, 129, 0.12); color:#059669; font-weight:600; margin-left:4px;">📄 PDF ${this.esc(item.pdf_size || '')}</span>` : ''}</div></div>
                ${item.subject ? `<div><div class="d-label">Subjek / Bidang Ilmu</div><div class="d-val">${this.esc(item.subject)}</div></div>` : ''}
                <div><div class="d-label">Akses Kampus</div><div class="d-val">${this.esc(accessType === 'ezproxy' ? 'EZProxy SSO (Luar Jaringan Kampus)' : (accessType === 'open' ? 'Open Access' : 'IP Kampus / Eduroam UMS'))}</div></div>
            </div>

            ${item.notes ? `
            <div style="margin-top:1.25rem; padding:0.85rem 1rem; background:var(--bg-2); border-left:3px solid var(--brand); border-radius:var(--r-sm);">
                <div style="font-size:0.78rem; font-weight:700; color:var(--ink); margin-bottom:0.2rem;">Petunjuk Akses / Catatan:</div>
                <div style="font-size:0.82rem; color:var(--ink-2); line-height:1.45;">${this.esc(item.notes)}</div>
            </div>` : ''}

            <!-- Sitasi APA Section -->
            <div style="margin-top:1.25rem; padding:1rem; background:var(--bg-2); border:1px solid var(--border); border-radius:var(--r-md);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
                    <span style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--ink-2);">Sitasi Format APA (7th Edition)</span>
                    <button type="button" class="btn btn-ghost" style="padding:0.25rem 0.65rem; font-size:0.75rem;" onclick="app.copyEBookCitation(${this.idAttr(item.id)})">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>Salin Sitasi</span>
                    </button>
                </div>
                <div id="ebk-citation-text-${this.esc(String(item.id))}" style="font-size:0.82rem; color:var(--ink); font-style:italic; line-height:1.45; background:var(--bg-1); padding:0.6rem 0.8rem; border-radius:var(--r-sm); border:1px solid var(--border);">
                    ${this.esc(apaCitation)}
                </div>
            </div>

            <!-- Action Buttons -->
            <div style="margin-top:1.5rem; display:flex; justify-content:flex-end; gap:0.6rem; flex-wrap:wrap; align-items:center;">
                <button type="button" class="btn btn-ghost" onclick="app.closeBookDetail()">Tutup</button>
                ${hasPdf ? `
                <button type="button" class="btn btn-emerald" onclick="app.closeBookDetail(); app.openEBookPdfViewer(${this.idAttr(item.id)});" style="display:inline-flex; align-items:center; gap:0.4rem; padding:0.55rem 1.15rem; font-weight:600;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    <span>Baca E-Book (PDF)</span>
                </button>
                ${allowDownload ? `
                <a href="${this.esc(pdfDownloadUrl)}" class="btn btn-ghost" style="display:inline-flex; align-items:center; gap:0.35rem; padding:0.55rem 0.9rem; font-weight:600; border:1px solid var(--border);" download>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Unduh PDF ${item.pdf_size ? `(${this.esc(item.pdf_size)})` : ''}</span>
                </a>
                ` : ''}
                ` : ''}
                ${item.url && item.url !== '#' && item.url !== pdfReadUrl ? `
                <a href="${this.esc(directUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-brand" style="display:inline-flex; align-items:center; gap:0.4rem; padding:0.55rem 1.15rem;">
                    <span>Platform Penerbit ↗</span>
                </a>
                ` : (!hasPdf ? `
                <a href="${this.esc(directUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-brand" style="display:inline-flex; align-items:center; gap:0.4rem; padding:0.55rem 1.15rem;">
                    <span>Buka E-Book di Platform Resmi ↗</span>
                </a>
                ` : '')}
            </div>
        </div>`;

        document.getElementById('modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    openEBookPdfViewer(rawId) {
        const item = (this._ebooksList || []).find(b => String(b.id) === String(rawId));
        if (!item) {
            this.showAlert('Data e-book tidak ditemukan.');
            return;
        }
        const pdfUrl = item.pdf_filename ? `/api/ebooks/${encodeURIComponent(item.id)}/pdf` : (item.pdf_url || item.url || '');
        const title = item.title ? `[E-Book] ${item.title}` : 'Pratinjau Dokumen PDF';
        const fallbackUrl = item.url || pdfUrl;
        this.openPdfViewer(pdfUrl, title, fallbackUrl);
    },

    copyEBookCitation(rawId) {
        const item = (this._ebooksList || []).find(b => String(b.id) === String(rawId));
        if (!item) return;

        const yearStr = item.year ? String(item.year) : '';
        const authorStr = item.author || 'Penulis Tidak Disebutkan';
        const pubStr = item.publisher || 'Penerbit Internasional';
        const apaCitation = `${authorStr} (${yearStr || 'n.d.'}). ${item.title}. ${pubStr}.${item.url ? ' ' + item.url : ''}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(apaCitation).then(() => {
                this.showAlert('Sitasi APA disalin ke clipboard!');
            }).catch(() => {
                prompt('Salin sitasi APA:', apaCitation);
            });
        } else {
            prompt('Salin sitasi APA:', apaCitation);
        }
    },
    toggleMobileMenu(forceClose) {
        const m = document.getElementById('mob-menu');
        if (!m) return;
        if (forceClose === true) {
            m.classList.remove('open');
        } else {
            m.classList.toggle('open');
        }
    },

    // ──── Bookmarks & Reference Management Logic ────
    _bmSort: 'az', // current sort mode for bookmarks page
    bookmarksData: {}, // stores metadata for remote/federated items: { [id]: item }

    toggleBookmark(id, itemData = null) {
        const idStr = String(id);
        const isBm = this.bookmarks.has(id) || this.bookmarks.has(idStr);
        const actualId = this.bookmarks.has(id) ? id : (this.bookmarks.has(idStr) ? idStr : id);

        if (isBm) {
            this.bookmarks.delete(actualId);
            delete this.bookmarksData[actualId];
            this.toast(this.lang === 'id' ? 'Dihapus dari Koleksi Saya' : 'Removed from collection');
        } else {
            this.bookmarks.add(id);
            if (!itemData) {
                itemData = this.searchEngine.getById(id)
                    || (this.baseResults && this.baseResults.find(b => b.id == id))
                    || (this.currentResults && this.currentResults.find(b => b.id == id))
                    || (this._fedRawItems && this._fedRawItems.find(it => String(it.id) === idStr));
            }
            if (itemData) {
                this.bookmarksData[id] = itemData;
            }
            this.toast(this.lang === 'id' ? 'Disimpan ke Koleksi Saya' : 'Saved to collection');
        }
        localStorage.setItem('bf-bookmarks', JSON.stringify([...this.bookmarks]));
        localStorage.setItem('bf-bookmarks-data', JSON.stringify(this.bookmarksData));

        // Update button in currently open modal if any
        const btn = document.getElementById('btn-toggle-bookmark');
        if (btn) {
            const hasBm = this.bookmarks.has(id) || this.bookmarks.has(idStr);
            btn.innerHTML = hasBm ? this.t('btn_bookmarked') : this.t('btn_bookmark');
            btn.className = 'btn btn-ghost' + (hasBm ? ' txt-brand' : '');
            if (hasBm) btn.style.color = 'var(--brand)';
            else btn.style.color = '';
        }

        const artBtn = document.getElementById('btn-art-bm');
        if (artBtn) {
            const hasBm = this.bookmarks.has(id) || this.bookmarks.has(idStr);
            artBtn.innerHTML = `${this.starSvg(hasBm)} <span>${hasBm ? 'Tersimpan di Koleksi' : 'Simpan ke Koleksi'}</span>`;
            artBtn.style.color = hasBm ? 'var(--brand)' : '';
        }

        // Update star button on local cards
        const cardBtn = document.getElementById('bm-star-' + id);
        if (cardBtn) {
            const hasBm = this.bookmarks.has(id) || this.bookmarks.has(idStr);
            cardBtn.innerHTML = this.starSvg(hasBm);
            cardBtn.style.color = hasBm ? 'var(--brand)' : 'var(--ink-3)';
        }

        // Update star button on federated cards
        const fedCardBtns = document.querySelectorAll(`[data-fed-bm="${CSS.escape(idStr)}"]`);
        fedCardBtns.forEach(b => {
            const hasBm = this.bookmarks.has(id) || this.bookmarks.has(idStr);
            b.classList.toggle('active', hasBm);
            b.innerHTML = this.starSvg(hasBm);
            b.title = hasBm ? (this.lang === 'id' ? 'Tersimpan di Koleksi Saya' : 'Saved in collection') : (this.lang === 'id' ? 'Simpan ke Koleksi Saya' : 'Save to collection');
        });

        // Update badge count on nav
        this._updateBmBadge();

        // If we're on the bookmarks page, re-render it to reflect changes instantly
        if (this.currentPage === 'bookmarks') {
            this.renderBookmarks();
        }
    },

    toggleBookmarkFromFed(id, el) {
        let itemData = null;
        if (this._fedRawItems) {
            itemData = this._fedRawItems.find(it => String(it.id) === String(id));
        }
        if (!itemData && this.bookmarksData) {
            itemData = this.bookmarksData[id];
        }
        this.toggleBookmark(id, itemData);
    },

    _updateBmBadge() {
        const count = this.bookmarks ? this.bookmarks.size : 0;
        const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
        const show = count > 0;
        ['bm-badge', 'bm-badge-mob'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = text;
            el.style.display = show ? 'inline-flex' : 'none';
        });
    },

    _bmSort: 'saved',
    _bmTypeFilter: 'all',

    setBmSort(mode) {
        this._bmSort = mode || 'saved';
        const sel = document.getElementById('bm-sort-sel');
        if (sel && sel.value !== this._bmSort) {
            sel.value = this._bmSort;
        }
        this.renderBookmarks();
    },

    setBmTypeFilter(type, btnEl) {
        this._bmTypeFilter = type || 'all';
        const tabs = document.querySelectorAll('#bm-filter-tabs .bm-filter-chip');
        tabs.forEach(t => {
            if (t.getAttribute('data-filter') === this._bmTypeFilter) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
        this.renderBookmarks();
    },

    toggleBmExportMenu(e) {
        if (e) e.stopPropagation();
        const menu = document.getElementById('bm-export-menu');
        if (menu) {
            const isShown = menu.style.display === 'block';
            menu.style.display = isShown ? 'none' : 'block';
        }
    },

    closeBmExportMenu() {
        const menu = document.getElementById('bm-export-menu');
        if (menu) menu.style.display = 'none';
    },

    clearAllBookmarks() {
        if (!confirm(this.lang === 'id' ? 'Hapus semua koleksi yang tersimpan?' : 'Clear all saved collections?')) return;
        this.bookmarks.clear();
        this.bookmarksData = {};
        localStorage.removeItem('bf-bookmarks');
        localStorage.removeItem('bf-bookmarks-data');
        this._updateBmBadge();
        this.renderBookmarks();
        this.toast(this.lang === 'id' ? 'Seluruh koleksi tersimpan telah dibersihkan.' : 'All bookmarks cleared.');
    },

    // ──── DOI Sanitizer & Helpers ────
    getCleanDoi(rawDoi) {
        if (!rawDoi || typeof rawDoi !== 'string') return '';
        const trimmed = rawDoi.trim();
        const m = trimmed.match(/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/i);
        if (m) {
            return m[1].replace(/[,.;]+$/, '');
        }
        return '';
    },
    getDoiUrl(rawDoi) {
        const clean = this.getCleanDoi(rawDoi);
        return clean ? `https://doi.org/${clean}` : '';
    },

    // ──── Citation & Reference Manager Generators (.RIS & .BIB) ────
    generateRIS(item) {
        if (!item) return '';
        const title = item.t || item.title || 'Untitled';
        const rawAuthors = item.a || item.authors || '';
        let authors = [];
        if (rawAuthors.includes(';')) {
            authors = rawAuthors.split(';').map(s => s.trim()).filter(Boolean);
        } else if (rawAuthors.includes(' and ')) {
            authors = rawAuthors.split(' and ').map(s => s.trim()).filter(Boolean);
        } else if (rawAuthors.trim()) {
            authors = [rawAuthors.trim()];
        }
        const yr = item.yr || item.year || '';
        const pub = item.pub || item.publicationName || '';
        const cleanDoi = this.getCleanDoi(item.doi);
        const url = item.url || (cleanDoi ? `https://doi.org/${cleanDoi}` : '');
        const desc = item.desc || item.abstract || '';
        const isBook = item.type === 'book' || (!item.contentType && item.ddc);
        const isThesis = (item.type || '').includes('thesis') || (item.src || '').includes('eprints');
        const isArticle = Boolean(item.contentType) || (!isBook && !isThesis);

        let ty = 'JOUR';
        if (isBook) ty = 'BOOK';
        else if (isThesis) ty = 'THES';
        else if (isArticle) ty = 'JOUR';

        const lines = [
            `TY  - ${ty}`,
            `TI  - ${title}`
        ];
        if (authors.length > 0) {
            authors.forEach(auth => lines.push(`AU  - ${auth}`));
        } else {
            lines.push(`AU  - ${rawAuthors || 'Anonim'}`);
        }
        if (yr) lines.push(`PY  - ${yr}`);
        if (pub) {
            if (ty === 'JOUR') lines.push(`JO  - ${pub}`);
            lines.push(`PB  - ${pub}`);
        }
        if (cleanDoi) lines.push(`DO  - ${cleanDoi}`);
        if (url) lines.push(`UR  - ${url}`);
        if (desc) lines.push(`AB  - ${desc.replace(/[\r\n]+/g, ' ')}`);
        lines.push('ER  - ');
        return lines.join('\r\n');
    },

    generateBibTeX(item) {
        if (!item) return '';
        const title = (item.t || item.title || 'Untitled').replace(/[{}]/g, '');
        const rawAuthors = (item.a || item.authors || 'Anonim').replace(/[{}]/g, '');
        const yr = item.yr || item.year || '2024';
        const pub = (item.pub || item.publicationName || 'Universitas Muhammadiyah Surakarta').replace(/[{}]/g, '');
        const cleanDoi = this.getCleanDoi(item.doi);
        const url = item.url || (cleanDoi ? `https://doi.org/${cleanDoi}` : '');
        const isBook = item.type === 'book' || (!item.contentType && item.ddc);
        const isThesis = (item.type || '').includes('thesis') || (item.src || '').includes('eprints');

        const firstAuthor = rawAuthors.split(/[;,]/)[0].trim().replace(/[^a-zA-Z]/g, '').toLowerCase() || 'ref';
        const firstWord = title.split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'item';
        const citeKey = `${firstAuthor}${yr}${firstWord}`;

        if (isBook) {
            return `@book{${citeKey},\n  title = {${title}},\n  author = {${rawAuthors}},\n  year = {${yr}},\n  publisher = {${pub}},\n  url = {${url}}\n}`;
        } else if (isThesis) {
            return `@thesis{${citeKey},\n  title = {${title}},\n  author = {${rawAuthors}},\n  year = {${yr}},\n  school = {${pub || 'Universitas Muhammadiyah Surakarta'}},\n  url = {${url}}\n}`;
        } else {
            return `@article{${citeKey},\n  title = {${title}},\n  author = {${rawAuthors}},\n  journal = {${pub}},\n  year = {${yr}},\n  doi = {${cleanDoi}},\n  url = {${url}}\n}`;
        }
    },

    downloadCitation(item, format) {
        if (!item) return;
        let content = '', filename = '', mime = '';
        const rawTitle = item.t || item.title || 'citation';
        const titleSlug = rawTitle.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        if (format === 'ris') {
            content = this.generateRIS(item);
            filename = `${titleSlug}.ris`;
            mime = 'application/x-research-info-systems;charset=utf-8;';
        } else {
            content = this.generateBibTeX(item);
            filename = `${titleSlug}.bib`;
            mime = 'application/x-bibtex;charset=utf-8;';
        }
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.toast(`File .${format.toUpperCase()} berhasil diunduh!`);
    },

    exportBookmarks(format) {
        const savedItems = [...this.bookmarks].map(id => {
            return this.searchEngine.getById(id)
                || (this.bookmarksData && this.bookmarksData[id])
                || (this.baseResults && this.baseResults.find(b => b.id == id));
        }).filter(Boolean);

        if (!savedItems.length) {
            this.toast(this.lang === 'id' ? 'Belum ada koleksi yang disimpan.' : 'No saved collections to export.');
            return;
        }

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let content, filename, mime;
        if (format === 'csv') {
            const header = 'Judul,Pengarang,Tahun,Penerbit / Jurnal,DDC / Subjek,Tipe,Sumber,DOI / URL';
            const rows = savedItems.map(b => [
                `"${(b.t || b.title || '').replace(/"/g, '""')}"`,
                `"${(b.a || b.authors || '').replace(/"/g, '""')}"`,
                b.yr || b.year || '',
                `"${(b.pub || b.publicationName || '').replace(/"/g, '""')}"`,
                b.ddc || b.contentType || '',
                b.type || b.contentType || 'Literature',
                `"${(b.src || b.source || '').replace(/"/g, '""')}"`,
                `"${(b.doi || b.url || '').replace(/"/g, '""')}"`
            ].join(','));
            content = [header, ...rows].join('\n');
            filename = `koleksi_ums_${dateStr}.csv`;
            mime = 'text/csv;charset=utf-8;';
        } else if (format === 'ris') {
            content = savedItems.map(item => this.generateRIS(item)).join('\r\n\r\n');
            filename = `koleksi_ums_${dateStr}.ris`;
            mime = 'application/x-research-info-systems;charset=utf-8;';
        } else {
            // BibTeX
            content = savedItems.map(item => this.generateBibTeX(item)).join('\n\n');
            filename = `koleksi_ums_${dateStr}.bib`;
            mime = 'application/x-bibtex;charset=utf-8;';
        }
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        this.toast(`Koleksi (${savedItems.length} item) diekspor ke .${format.toUpperCase()}!`);
    },

    renderBookmarks() {
        const grid = document.getElementById('bookmarks-grid');
        if (!grid) return;

        let allSavedItems = [...this.bookmarks].map(id => {
            return this.searchEngine.getById(id)
                || (this.bookmarksData && this.bookmarksData[id])
                || (this.baseResults && this.baseResults.find(b => b.id == id));
        }).filter(Boolean);

        const totalSaved = allSavedItems.length;
        const countText = document.getElementById('bm-count-text');
        if (countText) {
            countText.textContent = `${totalSaved} item tersimpan`;
        }

        const panel = document.getElementById('bm-panel');

        if (totalSaved === 0) {
            if (panel) panel.style.display = 'none';
            grid.style.display = 'block';
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon-wrap">
                        ${this.getEmptyStateSvg('bookmarks')}
                    </div>
                    <div class="empty-state-title">Belum Ada Koleksi Disimpan</div>
                    <div class="empty-state-desc">Simpan buku perpustakaan, skripsi & tesis, atau artikel jurnal internasional dengan menekan tombol bintang pada kartu literatur untuk menyimpannya di sini.</div>
                    <div class="empty-state-actions">
                        <button type="button" class="btn btn-brand" onclick="app.showBrowse()">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                            Jelajahi Koleksi
                        </button>
                        <button type="button" class="btn btn-ghost" onclick="app.showHome()">Kembali ke Beranda</button>
                    </div>
                </div>
            `;
            return;
        }

        if (panel) panel.style.display = 'block';

        // Filter by type
        let filteredItems = allSavedItems;
        const typeFilter = this._bmTypeFilter || 'all';
        if (typeFilter !== 'all') {
            filteredItems = filteredItems.filter(item => {
                const isBook = item.type === 'book' || (!item.contentType && item.ddc && !(item.url || '').includes('eprints'));
                const isThesis = (item.type || '').includes('thesis') || (item.src || '').includes('eprints') || (item.url || '').includes('eprints');
                const isArticle = Boolean(item.contentType) || (!isBook && !isThesis);

                if (typeFilter === 'book') return isBook;
                if (typeFilter === 'thesis') return isThesis;
                if (typeFilter === 'article') return isArticle;
                return true;
            });
        }

        // Sort
        const sortMode = this._bmSort || 'saved';
        if (sortMode === 'az') {
            filteredItems.sort((a, b) => (a.t || a.title || '').localeCompare(b.t || b.title || ''));
        } else if (sortMode === 'year') {
            filteredItems.sort((a, b) => String(b.yr || b.year || '').localeCompare(String(a.yr || a.year || '')));
        } else if (sortMode === 'ddc') {
            filteredItems.sort((a, b) => (a.ddc || a.contentType || '').localeCompare(b.ddc || b.contentType || '') || (a.t || a.title || '').localeCompare(b.t || b.title || ''));
        }

        if (filteredItems.length > 0) {
            grid.style.display = 'grid';
            grid.innerHTML = filteredItems.map(b => {
                if (b.t && !b.contentType) {
                    return this.bookCard(b);
                }
                return this.fedBookmarkCard(b);
            }).join('');
        } else {
            grid.style.display = 'block';
            grid.innerHTML = `
                <div class="empty-state" style="padding:3rem 1rem;">
                    <div class="empty-state-title" style="font-size:1.05rem;">Tidak Ada Koleksi dalam Kategori Ini</div>
                    <div class="empty-state-desc">Anda memiliki koleksi tersimpan di kategori lain. Pilih tab kategori "Semua" di atas untuk melihat seluruh daftar.</div>
                    <div class="empty-state-actions" style="margin-top:1rem;">
                        <button type="button" class="btn btn-brand" onclick="app.setBmTypeFilter('all')">Lihat Semua Koleksi</button>
                    </div>
                </div>
            `;
        }
    },

    _articlesMap: {},

    registerArticle(it) {
        if (!it) return null;
        if (!this._articlesMap) this._articlesMap = {};
        const key = String(it.id || it.doi || it.url || '');
        if (key) {
            this._articlesMap[key] = it;
        }
        return it;
    },

    getArticle(id) {
        if (!id) return null;
        const key = String(id);
        if (this._articlesMap && this._articlesMap[key]) return this._articlesMap[key];
        if (this._fedRawItems) {
            const found = this._fedRawItems.find(it => String(it.id) === key || String(it.doi) === key || String(it.url) === key);
            if (found) { this.registerArticle(found); return found; }
        }
        if (this.bookmarksData && this.bookmarksData[key]) {
            this.registerArticle(this.bookmarksData[key]);
            return this.bookmarksData[key];
        }
        if (this.searchEngine) {
            const found = this.searchEngine.getById(id);
            if (found) { this.registerArticle(found); return found; }
        }
        if (this.baseResults) {
            const found = this.baseResults.find(b => String(b.id) === key);
            if (found) { this.registerArticle(found); return found; }
        }
        return null;
    },

    downloadCitationById(id, format) {
        const item = this.getArticle(id);
        if (item) {
            this.downloadCitation(item, format);
        } else {
            this.toast('Gagal memuat metadata sitasi artikel.');
        }
    },

    shareArticleById(id) {
        const item = this.getArticle(id);
        if (item) {
            this.shareArticle(item);
        }
    },

    copyArticleCitation(id) {
        const it = this.getArticle(id);
        if (!it) return;
        const title = it.title || it.t || 'Untitled';
        const authors = it.authors || it.a || 'Unknown';
        const yr = it.year || it.yr || '';
        const pub = it.publicationName || it.pub || '';
        this.copyCitation(title, authors, yr, pub);
    },

    copyArticleAbstract(id) {
        const it = this.getArticle(id);
        if (!it || !it.abstract) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(it.abstract).then(() => {
                this.showAlert('Abstrak artikel disalin ke clipboard!');
            }).catch(() => {
                this.showAlert('Gagal menyalin abstrak.');
            });
        } else {
            prompt('Salin abstrak artikel:', it.abstract);
        }
    },

    toggleArticleCitePanel(id) {
        const el = document.getElementById('art-cite-panel');
        if (!el) return;
        const isHidden = (el.style.display === 'none');
        el.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            const it = this.getArticle(id);
            const linkUrl = (it ? (it.url || it.doi) : '') || window.location.href;
            this.renderQR(linkUrl, 'qr-art-' + String(id).replace(/[^a-zA-Z0-9]/g, '_'));
        }
    },

    // ──── SVG Logos & Badges Helper ────
    getSourceLogoSvg(sourceName, size = 14) {
        if (!sourceName) return '';
        const s = String(sourceName).toLowerCase();

        if (s.includes('springer')) {
            // Springer Nature Knight Icon
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><path d="M19 22H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1zM18 16H6c0-3.5 1.8-5.5 2.8-7.2C7.9 7.6 7.2 6.5 7 5c0-.6.4-1 1-1h2.5c1.4 0 2.5 1.1 2.5 2.5 0 .5-.2 1-.5 1.4.9.4 1.7 1 2.3 1.8 1.4 1.8 2.2 3.6 2.2 5.3 0 .6.4 1 1 1z"/></svg>`;
        }
        if (s.includes('scopus')) {
            // Elsevier Scopus Radial Ring Logo Icon
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><circle cx="12" cy="12" r="9.5"/><path d="M8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`;
        }
        if (s.includes('openalex') || s.includes('alex')) {
            // OpenAlex Constellation Graph Logo Icon
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><circle cx="6" cy="6" r="3" fill="currentColor"/><circle cx="18" cy="6" r="3" fill="currentColor"/><circle cx="12" cy="18" r="3" fill="currentColor"/><line x1="8.5" y1="7.5" x2="15.5" y2="7.5"/><line x1="7.5" y1="8.5" x2="10.5" y2="15.5"/><line x1="16.5" y1="8.5" x2="13.5" y2="15.5"/></svg>`;
        }
        if (s.includes('semantic') || s.includes('scholar')) {
            // Semantic Scholar S2 Crest Logo Icon
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5a3.5 3.5 0 0 1-3.5-3.5 1 1 0 0 1 2 0 1.5 1.5 0 0 0 3 0c0-1-1.5-1.5-2.5-2S9 9.5 9 8a3.5 3.5 0 0 1 7 0 1 1 0 0 1-2 0 1.5 1.5 0 0 0-3 0c0 1 1.5 1.5 2.5 2s3 1.5 3 3a3.5 3.5 0 0 1-3.5 3.5z"/></svg>`;
        }
        if (s.includes('lens')) {
            // The Lens Aperture / Focus Icon
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="19.07" y1="4.93" x2="14.83" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="9.17" y1="14.83" x2="4.93" y2="19.07"/></svg>`;
        }
        if (s.includes('crossref')) {
            // Crossref Interlocking Node Cross Icon
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><path d="M11 2h2v7h7v2h-7v7h-2v-7H4V9h7V2z"/><circle cx="5" cy="5" r="2.2"/><circle cx="19" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/></svg>`;
        }
        if (s.includes('emerald')) {
            // Emerald Insight Diamond Gem Icon
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M6 3h12l4 6-10 12L2 9l4-6z"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="12" y1="21" x2="8" y2="9"/><line x1="12" y1="21" x2="16" y2="9"/><line x1="6" y1="3" x2="8" y2="9"/><line x1="18" y1="3" x2="16" y2="9"/></svg>`;
        }
        if (s.includes('koha') || s.includes('buku') || s.includes('katalog')) {
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
        }
        if (s.includes('etd') || s.includes('skripsi') || s.includes('tesis')) {
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
        }
        if (s.includes('jurnal') || s.includes('journal')) {
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
        }
        if (s.includes('sibi')) {
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`;
        }
        if (s.includes('global') || s.includes('all')) {
            return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
        }
        // Default academic icon
        return `<svg class="fed-src-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    },

    getSourceBadgeHtml(sourceName, extraClass = '') {
        const src = sourceName || 'Global Journal';
        const s = src.toLowerCase();
        let cls = 'fed-badge-type';
        if (s.includes('scopus')) cls = 'badge-scopus';
        else if (s.includes('semantic')) cls = 'badge-semanticscholar';
        else if (s.includes('lens')) cls = 'badge-lens';
        else if (s.includes('openalex')) cls = 'badge-openalex';
        else if (s.includes('crossref')) cls = 'badge-crossref';
        else if (s.includes('springer')) cls = 'badge-springer';
        else if (s.includes('emerald')) cls = 'badge-emerald';

        return `<span class="fed-card-source-badge ${cls} ${extraClass}">
            ${this.getSourceLogoSvg(src, 13)}
            <span>${this.esc(src)}</span>
        </span>`;
    },

    getOaBadgeHtml(isOa, customStyle = '') {
        if (isOa) {
            return `<span class="fed-badge-oa" style="${customStyle}" title="Artikel Open Access - Bebas diakses terbuka">
                <svg class="fed-oa-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:3px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                <span>Open Access</span>
            </span>`;
        }
        return `<span class="fed-badge-sub" style="${customStyle}" title="Subscription / Akses institusi via DOI">
            <svg class="fed-sub-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:3px"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Subscription / DOI</span>
        </span>`;
    },

    openPdfViewerById(id) {
        const it = this.getArticle(id);
        if (!it) return;
        const pdfUrl = it.pdfUrl || it.pdf_url || '';
        const title = it.title || it.t || 'Pratinjau Dokumen PDF';
        const linkUrl = it.url || it.doi || '';
        this.openPdfViewer(pdfUrl, title, linkUrl);
    },

    fedBookmarkCard(it) {
        this.registerArticle(it);
        const rawId = String(it.id || it.doi || it.url);
        const title = it.title || it.t || 'Untitled';
        const authors = it.authors || it.a || 'Unknown';
        const pub = it.publicationName || it.pub || 'International Journal';
        const yr = it.year || it.yr || '';
        const src = it.source || it.publicationType || 'Global Journal';
        const isOa = it.openAccess || it.isOpenAccess || it.is_oa || it.openaccess;
        const validDoi = this.getCleanDoi(it.doi);
        const linkUrl = it.url || (validDoi ? `https://doi.org/${validDoi}` : '#');
        const pdfUrl = it.pdfUrl || it.pdf_url || '';
        const hasDirectPdf = Boolean(pdfUrl && pdfUrl.trim().length > 5 && pdfUrl !== linkUrl);
        const isSubscribed = Boolean(it.isSubscribed);
        const subscribedUrl = it.subscribedUrl || '';

        return `
        <div class="fed-item fed-bm-card" style="margin-bottom:1rem; border-left:4px solid ${isSubscribed ? '#d97706' : 'var(--brand)'}; position:relative;">
            <div class="fed-item-header-row">
                <div class="fed-item-num-title">
                    <a href="#" onclick="app.showArticleDetail(${this.idAttr(rawId)}); return false;" class="fed-title-link" title="Klik untuk membuka modal detail artikel">${this.esc(title)}</a>
                </div>
                <div class="fed-item-badges">
                    ${isSubscribed ? `<span class="fed-badge-subscribed" title="Jurnal ini dilanggan secara resmi oleh Perpustakaan UMS"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Langganan UMS</span>` : ''}
                    ${this.getSourceBadgeHtml(src)}
                    ${this.getOaBadgeHtml(isOa)}
                    ${yr ? `<span class="fed-badge-year">${this.esc(String(yr))}</span>` : ''}
                    <button class="fed-star-btn active" data-fed-bm="${this.esc(rawId)}" onclick="app.toggleBookmark(${this.idAttr(rawId)})" title="Hapus dari Koleksi Saya" style="margin-left:0.5rem">${this.starSvg(true)}</button>
                </div>
            </div>
            <ul class="fed-meta-list" style="margin-bottom:0.75rem">
                <li><span class="fed-meta-label">Creator :</span> ${this.esc(authors)}</li>
                <li><span class="fed-meta-label">Publication :</span> ${this.esc(pub)}</li>
                ${validDoi ? `<li><span class="fed-meta-label">DOI :</span> ${this.esc(validDoi)}</li>` : ''}
            </ul>
            <div class="fed-actions-row">
                <button type="button" class="btn btn-ghost" onclick="app.showArticleDetail(${this.idAttr(rawId)})" style="font-size:0.75rem; padding:0.32rem 0.75rem; font-weight:600; display:inline-flex; align-items:center; gap:0.35rem;" title="Buka modal detail artikel">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>Detail Lengkap</span>
                </button>
                ${isSubscribed && subscribedUrl ? `
                <a href="${this.esc(subscribedUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-subscribed-campus" title="Akses langsung melalui portal langganan institusi UMS">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 10v4"></path><path d="M15 10v4"></path></svg>
                    <span>Akses Kampus UMS ↗</span>
                </a>` : ''}
                <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-brand" style="font-size:0.75rem; padding:0.32rem 0.75rem">
                    Buka Dokumen ↗
                </a>
                ${hasDirectPdf ? `
                <button type="button" class="btn btn-emerald" onclick="app.openPdfViewerById(${this.idAttr(rawId)})" style="font-size:0.75rem; padding:0.32rem 0.75rem; display:inline-flex; align-items:center; gap:0.35rem;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    <span>Baca / Unduh PDF</span>
                </button>` : ''}
                <button type="button" class="btn btn-ghost" onclick="app.downloadCitationById(${this.idAttr(rawId)}, 'ris')" style="font-size:0.75rem; padding:0.32rem 0.75rem; display:inline-flex; align-items:center; gap:0.35rem;" title="Unduh file .RIS untuk Mendeley/Zotero">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>.RIS</span>
                </button>
                <button type="button" class="btn btn-ghost" onclick="app.downloadCitationById(${this.idAttr(rawId)}, 'bib')" style="font-size:0.75rem; padding:0.32rem 0.75rem; display:inline-flex; align-items:center; gap:0.35rem;" title="Unduh file .BIB untuk LaTeX/Overleaf">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>BibTeX</span>
                </button>
                <button type="button" class="btn btn-ghost" onclick="app.copyArticleCitation(${this.idAttr(rawId)})" style="font-size:0.75rem; padding:0.32rem 0.75rem">
                    Salin Sitasi
                </button>
            </div>
        </div>`;
    },

    // ──── Modal Detail untuk Artikel Internasional ────
    showArticleDetail(articleId, articleData = null) {
        let article = articleData || this.getArticle(articleId);
        if (!article) {
            console.error('Article not found for id:', articleId);
            return;
        }
        this.registerArticle(article);

        const rawId = String(article.id || articleId);
        const title = article.title || article.t || 'Untitled';
        const authors = article.authors || article.a || 'Unknown Author';
        const pub = article.publicationName || article.pub || '-';
        const yr = article.year || article.yr || '';
        const date = article.date || yr;
        const type = article.contentType || 'Article';
        const src = article.source || 'International Journal';
        const isOa = article.openAccess || article.isOpenAccess || article.is_oa || article.openaccess;
        const isSubscribed = Boolean(article.isSubscribed);
        const subscribedUrl = article.subscribedUrl || '';

        const validDoi = this.getCleanDoi(article.doi);
        const doiUrl = validDoi ? `https://doi.org/${validDoi}` : '';
        let linkUrl = (article.url || doiUrl || '#').trim();
        if (linkUrl.startsWith('https://openalex.org/https://openalex.org/')) {
            linkUrl = linkUrl.replace('https://openalex.org/https://openalex.org/', 'https://openalex.org/');
        } else if (linkUrl.startsWith('https://openalex.org/http://') || linkUrl.startsWith('https://openalex.org/https://')) {
            linkUrl = linkUrl.replace('https://openalex.org/', '');
        } else if (linkUrl.startsWith('https://doi.org/https://doi.org/')) {
            linkUrl = linkUrl.replace('https://doi.org/https://doi.org/', 'https://doi.org/');
        } else if (linkUrl.startsWith('https://doi.org/http://') || linkUrl.startsWith('https://doi.org/https://')) {
            linkUrl = linkUrl.replace('https://doi.org/', '');
        }
        const pdfUrl = article.pdfUrl || article.pdf_url || '';
        const hasDirectPdf = Boolean(pdfUrl && pdfUrl.trim().length > 5 && pdfUrl !== linkUrl);
        const citations = article.citationCount || article.cited_by_count || 0;
        const isBm = this.bookmarks && (this.bookmarks.has(rawId) || this.bookmarks.has(String(article.id)));
        const bookmarkLbl = `${this.starSvg(isBm)} <span>${isBm ? 'Tersimpan di Koleksi' : 'Simpan ke Koleksi'}</span>`;
        const bookmarkStyle = isBm ? 'color:var(--brand); font-weight:600;' : '';

        // Abstract formatting
        const abstractText = article.abstract || 'Abstrak tidak disertakan dalam metadata ringkas publikasi ini.';
        const hasRealAbstract = Boolean(article.abstract && article.abstract.trim().length > 10);

        document.getElementById('modal-body').innerHTML = `
        <div class="detail fed-detail">
            <div class="detail-head" style="min-height: auto; padding-bottom: 1rem;">
                <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; margin-bottom:0.75rem;">
                    ${isSubscribed ? `<span class="fed-badge-subscribed" style="font-size:0.75rem; padding:0.25rem 0.65rem;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Langganan Resmi UMS</span>` : ''}
                    ${this.getSourceBadgeHtml(src)}
                    ${this.getOaBadgeHtml(isOa, 'font-size:0.75rem; padding:0.25rem 0.65rem;')}
                    <span class="fed-badge-type" style="font-size:0.75rem; padding:0.25rem 0.65rem;">${this.esc(type)}</span>
                    ${date ? `<span class="fed-badge-year" style="font-size:0.75rem; padding:0.25rem 0.65rem;">${this.esc(String(date))}</span>` : ''}
                    ${citations > 0 ? `<span style="background:var(--bg-3); color:var(--ink-1); font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:999px; font-weight:600; border:1px solid var(--border); display:inline-flex; align-items:center; gap:0.35rem;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path></svg> ${this.fmt(citations)} Sitasi Global</span>` : ''}
                </div>
                <h2 class="detail-title" style="font-size:1.35rem; line-height:1.45; margin-bottom:0.5rem;">${this.esc(title)}</h2>
                <p class="detail-author" style="font-size:0.95rem; color:var(--ink-2);">${this.esc(authors)}</p>
            </div>

            <div class="detail-grid" style="margin-top:1rem; margin-bottom:1.25rem;">
                <div><div class="d-label">Jurnal / Publikasi</div><div class="d-val">${this.esc(pub)}</div></div>
                <div><div class="d-label">Tahun Terbit</div><div class="d-val">${this.esc(String(yr || '-'))}</div></div>
                <div><div class="d-label">Tipe Konten</div><div class="d-val">${this.esc(type)}</div></div>
                <div><div class="d-label">Basis Data Indeks</div><div class="d-val">${this.esc(src)}</div></div>
                ${validDoi ? `<div><div class="d-label">Digital Object Identifier (DOI)</div><div class="d-val"><a href="https://doi.org/${this.esc(validDoi)}" target="_blank" rel="noopener noreferrer" style="color:var(--brand); word-break:break-all;">https://doi.org/${this.esc(validDoi)}</a></div></div>` : ''}
                <div><div class="d-label">Aksesibilitas Dokumen</div><div class="d-val">${isSubscribed ? 'Dilanggan Resmi UMS (Full Text)' : (isOa ? 'Open Access (Bebas Unduh)' : 'Subscription / Akses Institusi')}</div></div>
                ${citations > 0 ? `<div><div class="d-label">Metrik Sitasi Global</div><div class="d-val"><strong>${this.fmt(citations)}</strong> kali disitasi oleh karya ilmiah lain</div></div>` : ''}
            </div>

            <!-- Full Abstract Box -->
            <div class="detail-abstract-box" style="margin-bottom:1.5rem;">
                <div class="detail-abstract-header">
                    <span class="detail-abstract-title">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Abstrak Lengkap
                    </span>
                    ${hasRealAbstract ? `<button type="button" class="detail-abstract-copy" onclick="app.copyArticleAbstract(${this.idAttr(rawId)})">Salin Abstrak</button>` : ''}
                </div>
                <div class="detail-abstract-body" style="font-size:0.92rem; line-height:1.7; color:var(--ink-1);">
                    ${hasRealAbstract ? this.esc(article.abstract) : `<em style="color:var(--ink-3);">${this.esc(abstractText)}</em>`}
                </div>
            </div>

            <!-- Action Buttons Row -->
            <div class="detail-actions" style="margin-bottom:1.5rem; flex-wrap:wrap; gap:0.65rem;">
                ${isSubscribed && subscribedUrl ? `
                <a href="${this.esc(subscribedUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-subscribed-campus" style="font-size:0.8rem; padding:0.45rem 1rem;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 10v4"></path><path d="M15 10v4"></path></svg>
                    <span>Akses Kampus UMS ↗</span>
                </a>` : ''}
                <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-brand">
                    ${validDoi ? 'Buka Dokumen Asli / DOI ↗' : 'Buka Dokumen Asli ↗'}
                </a>
                ${hasDirectPdf ? `
                <button type="button" class="btn btn-emerald" onclick="app.openPdfViewerById(${this.idAttr(rawId)})" style="display:inline-flex; align-items:center; gap:0.35rem;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    <span>Baca / Unduh PDF</span>
                </button>` : ''}
                <button id="btn-art-bm" class="btn btn-ghost" style="${bookmarkStyle}; display:inline-flex; align-items:center; gap:0.35rem;" onclick="app.toggleBookmark(${this.idAttr(rawId)})">
                    ${bookmarkLbl}
                </button>
                <button type="button" class="btn btn-ghost" onclick="app.shareArticleById(${this.idAttr(rawId)})">
                    Bagikan
                </button>
                <button type="button" class="btn btn-ghost" onclick="app.toggleArticleCitePanel(${this.idAttr(rawId)})">
                    Kutipan & QR Code
                </button>
            </div>

            <!-- Cite & QR Code Panel -->
            <div id="art-cite-panel" class="action-panel" style="display:block; margin-top:1rem; padding:1.25rem; background:var(--bg-2); border-radius:var(--r-md); border:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1.5rem; flex-wrap:wrap">
                    <div style="flex:1; min-width:260px">
                        <h3 style="font-size:1rem; margin-bottom:.85rem; font-weight:700">Format Sitasi Otomatis</h3>
                        ${this.renderCiteGroups({a: authors, t: title, yr, pub, doi: validDoi, url: linkUrl})}
                        <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                            <button type="button" class="btn btn-ghost" onclick="app.downloadCitationById(${this.idAttr(rawId)}, 'ris')" style="font-size:0.8rem; padding:0.35rem 0.8rem; display:inline-flex; align-items:center; gap:0.35rem;" title="Unduh file .RIS untuk Mendeley, Zotero, EndNote">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                <span>Unduh .RIS (Mendeley/Zotero)</span>
                            </button>
                            <button type="button" class="btn btn-ghost" onclick="app.downloadCitationById(${this.idAttr(rawId)}, 'bib')" style="font-size:0.8rem; padding:0.35rem 0.8rem; display:inline-flex; align-items:center; gap:0.35rem;" title="Unduh file .BIB untuk LaTeX/Overleaf">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                <span>Unduh .BIB (LaTeX)</span>
                            </button>
                            <button type="button" class="btn btn-ghost" onclick="app.copyArticleCitation(${this.idAttr(rawId)})" style="font-size:0.8rem; padding:0.35rem 0.8rem">
                                Salin Sitasi
                            </button>
                        </div>
                    </div>
                                Salin Sitasi
                            </button>
                        </div>
                    </div>
                    <div style="text-align:center; flex-shrink:0">
                        <h3 style="font-size:1rem; margin-bottom:.85rem; font-weight:700">QR Code Dokumen</h3>
                        <div id="qr-art-${this.esc(rawId).replace(/[^a-zA-Z0-9]/g, '_')}" style="padding:10px; background:#fff; border-radius:8px; display:inline-block; border:1px solid var(--border)">
                            <!-- QR image renders here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        // Render QR Code dynamically
        this.renderQR(linkUrl, 'qr-art-' + rawId.replace(/[^a-zA-Z0-9]/g, '_'));

        document.getElementById('modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    async shareArticle(article) {
        if (!article) return;
        const title = article.title || article.t || 'Artikel Ilmiah';
        const authors = article.authors || article.a || '';
        const url = (article.url || article.doi || window.location.href).trim();
        const shareText = `Artikel Ilmiah: "${title}" ${authors ? 'oleh ' + authors : ''}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: shareText,
                    url: url
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            this.showAlert('Tautan artikel disalin ke clipboard!');
        } catch (e) {
            prompt('Salin tautan artikel ini:', url);
        }
    },

    // ──── Quick PDF Viewer Modal & Direct Access ────
    openPdfViewer(pdfUrl, title, fallbackUrl) {
        const targetUrl = (pdfUrl || fallbackUrl || '').trim();
        if (!targetUrl) return;

        const modal = document.getElementById('pdf-modal');
        const titleEl = document.getElementById('pdf-modal-title');
        const frameEl = document.getElementById('pdf-modal-frame');
        const directBtn = document.getElementById('pdf-modal-direct-btn');

        if (titleEl) titleEl.textContent = title || 'Pratinjau Dokumen PDF';
        if (directBtn) {
            directBtn.onclick = () => window.open(targetUrl, '_blank');
        }
        if (frameEl) {
            // Local endpoints on the same origin (like /api/ebooks/...) are served directly with permissive headers
            if (targetUrl.startsWith('/') || targetUrl.startsWith(window.location.origin)) {
                frameEl.src = targetUrl;
            } else {
                // Stream external PDF through backend proxy to eliminate X-Frame-Options blocking
                frameEl.src = '/api/pdf_proxy?url=' + encodeURIComponent(targetUrl);
            }
        }
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },

    closePdfViewer() {
        const modal = document.getElementById('pdf-modal');
        const frameEl = document.getElementById('pdf-modal-frame');
        if (frameEl) frameEl.src = 'about:blank';
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    },

    // ──── Home: DDC Shelves ────
    renderShelves() {
        const el = document.getElementById('ddc-shelves');
        if (!el) return;
        const max = Math.max(...Object.values(this.ddcTree).map(c => c.count));

        el.innerHTML = Object.entries(this.ddcTree)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cls, info]) => {
                const c = this.COLORS[cls];
                const pct = Math.round((info.count / max) * 100);
                return `
                <div class="shelf" style="--shelf-color:${c}" onclick="app.showBrowse('${cls}')">
                    <div class="shelf-head">
                        <span class="shelf-code" style="background:${c}18;color:${c}">${cls}00</span>
                    </div>
                    <div class="shelf-name">${this.ddcLbl(info)}</div>
                    <div class="shelf-count">${this.fmt(info.count)} ${this.t('books_unit')}</div>
                    <div class="shelf-bar"><div class="shelf-bar-fill" style="width:${pct}%;background:${c}"></div></div>
                </div>`;
            }).join('');
    },

    // ──── Federated Discovery / Multi-Source Tabs ────
    _activeFedSource: null,
    _fedCurrentPage: 1,
    _fedCurrentQuery: '',
    _fedCurrentTotal: 0,
    _fedTotalPages: 0,
    _fedSourcesRow1: [
        { id: 'koha', name: 'Katalog Buku', subtitle: 'Koha UMS & Mitra SLiMS', type: 'local_koha', label: 'Katalog Buku' },
        { id: 'etd', name: 'Repository Eprints', subtitle: 'https://eprints.ums.ac.id', type: 'local_etd', label: 'Skripsi & ETD UMS' },
        { id: 'journal', name: 'Artikel Jurnal UMS', subtitle: 'https://journals.ums.ac.id', type: 'local_journal', label: 'Jurnal Ilmiah UMS' },
        { id: 'sibi', name: 'Buku Digital (SIBI)', subtitle: 'Katalog SIBI Kemdikbud', type: 'sibi_api', label: 'Buku Digital SIBI' },
        { id: 'all_global', name: 'Seluruh Jurnal Global', subtitle: 'Agregasi Multi-Database', type: 'remote', remoteKey: 'all_global', domain: 'Scopus, Springer, Emerald, S2, Lens, Crossref, OA' },
    ],
    _fedSourcesRow2: [
        { id: 'scopus', name: 'Scopus', subtitle: 'https://www.scopus.com', type: 'remote', remoteKey: 'scopus', domain: 'https://www.scopus.com' },
        { id: 'springer', name: 'Springer', subtitle: 'https://link.springer.com', type: 'remote', remoteKey: 'springer', domain: 'https://link.springer.com' },
        { id: 'emerald', name: 'Emerald Insight', subtitle: 'https://www.emerald.com', type: 'remote', remoteKey: 'emerald', domain: 'https://www.emerald.com' },
        { id: 'openalex', name: 'OpenAlex Global OA', subtitle: 'https://openalex.org', type: 'remote', remoteKey: 'openalex', domain: 'https://openalex.org' },
        { id: 'semanticscholar', name: 'Semantic Scholar', subtitle: 'https://www.semanticscholar.org', type: 'remote', remoteKey: 'semanticscholar', domain: 'https://www.semanticscholar.org' },
        { id: 'lens', name: 'The Lens', subtitle: 'https://www.lens.org', type: 'remote', remoteKey: 'lens', domain: 'https://www.lens.org' },
        { id: 'crossref', name: 'Crossref', subtitle: 'https://www.crossref.org', type: 'remote', remoteKey: 'crossref', domain: 'https://www.crossref.org' },
    ],

    get _allFedSources() {
        const isMasterEnabled = !this.intlConfig || this.intlConfig.enabled !== false;
        const sourcesConfig = (this.intlConfig && this.intlConfig.sources) || {};

        const row1 = isMasterEnabled ? this._fedSourcesRow1 : this._fedSourcesRow1.filter(s => s.id !== 'all_global');
        const row2 = isMasterEnabled ? this._fedSourcesRow2.filter(s => sourcesConfig[s.id] !== false) : [];
        return [...row1, ...row2];
    },

    renderFederatedSourcesGrid() {
        const container = document.getElementById('fed-source-container');
        if (!container) return;

        const isMasterEnabled = !this.intlConfig || this.intlConfig.enabled !== false;
        const sourcesConfig = (this.intlConfig && this.intlConfig.sources) || {};

        const renderBtn = s => {
            const isActive = this._activeFedSource === s.id;
            return `<button type="button" class="fed-btn${isActive ? ' active' : ''}" onclick="app.selectFedSource('${s.id}')">
                <span class="fed-btn-title" style="display:inline-flex; align-items:center; gap:0.4rem;">
                    ${this.getSourceLogoSvg(s.name || s.id, 16)}
                    <span>${this.esc(s.name)}</span>
                </span>
                <span class="fed-btn-url">${this.esc(s.subtitle)}</span>
            </button>`;
        };

        const row1List = isMasterEnabled ? this._fedSourcesRow1 : this._fedSourcesRow1.filter(s => s.id !== 'all_global');
        const row2List = isMasterEnabled ? this._fedSourcesRow2.filter(s => sourcesConfig[s.id] !== false) : [];

        container.innerHTML = `
            <div class="fed-row-1">
                ${row1List.map(renderBtn).join('')}
            </div>
            ${row2List.length > 0 ? `
            <div class="fed-row-2">
                ${row2List.map(renderBtn).join('')}
            </div>` : ''}
        `;
    },

    selectFedSource(sourceId) {
        // Toggle off if clicking the active source again
        if (this._activeFedSource === sourceId) {
            this._activeFedSource = null;
            this.renderFederatedSourcesGrid();
            this.showHome();
            return;
        }

        this._activeFedSource = sourceId;
        this.renderFederatedSourcesGrid();

        const srcObj = this._allFedSources.find(s => s.id === sourceId);
        if (!srcObj) return;

        const inp = (document.getElementById('search-input') || {}).value || '';
        const q = inp.trim();

        // 1. External Remote APIs (Springer, Emerald, OpenAlex, Crossref, Scopus)
        if (srcObj.type === 'remote') {
            if (q) {
                this.fetchFederatedDiscovery(srcObj, q, 1);
            } else {
                // Focus search box and prompt user
                const searchInp = document.getElementById('search-input');
                if (searchInp) {
                    searchInp.focus();
                    searchInp.placeholder = `Cari di ${srcObj.name} (${srcObj.subtitle})...`;
                }
                const fedWrap = document.getElementById('fed-results-wrap');
                const locWrap = document.getElementById('results-wrap');
                if (locWrap) locWrap.style.display = 'none';
                if (fedWrap) {
                    fedWrap.style.display = 'block';
                    document.getElementById('fed-header').innerHTML = `
                        <div class="fed-header-title">
                            <span>${this.esc(srcObj.name)}</span>
                            <span class="fed-header-url">${this.esc(srcObj.domain || '')}</span>
                        </div>
                        <div class="fed-header-count">Pencarian Langsung (${this.esc(srcObj.name)})</div>
                    `;
                    document.getElementById('fed-items-list').innerHTML = `
                        <div style="text-align:center; padding:3rem 1.5rem; color:var(--ink-2);">
                            <p style="font-size:1.05rem; font-weight:600; margin-bottom:0.5rem">Silakan ketik kata kunci pada kotak pencarian di atas, lalu klik <strong>Cari</strong>.</p>
                            <p style="font-size:0.85rem; color:var(--ink-3);">Sistem akan mencari jutaan koleksi literatur secara langsung dari <strong>${this.esc(srcObj.name)}</strong> (${this.esc(srcObj.domain || '')}).</p>
                        </div>
                    `;
                    document.getElementById('fed-pagination-top').innerHTML = '';
                    document.getElementById('fed-pagination-bottom').innerHTML = '';
                    fedWrap.scrollIntoView({ behavior: 'smooth' });
                }
            }
            return;
        }

        // 2. Local UMS Collections & SIBI (Metode Sebelumnya: Katalog + Filter Facets + Book Grid)
        document.getElementById('fed-results-wrap').style.display = 'none';

        if (q) {
            // User has a search term typed in
            this.doSearch(q);
            return;
        }

        // Filter local collection by selected category
        let results = [];
        let titleLabel = srcObj.name;

        if (srcObj.type === 'local_koha') {
            results = this.books.filter(b => {
                const s = (b.src || '').toLowerCase();
                const u = (b.url || '').toLowerCase();
                const t = (b.type || '').toUpperCase();
                const id = String(b.id || '').toLowerCase();
                const isJournal = s.includes('journal') || u.includes('journal') || id.startsWith('ojs') || t === 'JR' || t === 'ARTICLE';
                const isEtd = s.includes('etd') || s.includes('eprints') || u.includes('eprints') || t === 'THESIS';
                const isSibi = s.includes('sibi') || u.includes('sibi');
                return !isJournal && !isEtd && !isSibi;
            });
            titleLabel = 'Katalog Buku (Koha UMS & Mitra)';
        } else if (srcObj.type === 'local_etd') {
            results = this.books.filter(b => {
                const s = (b.src || '').toLowerCase();
                const u = (b.url || '').toLowerCase();
                const t = (b.type || '').toUpperCase();
                return b.src === 'UMS (ETD)' || s.includes('eprints') || u.includes('eprints') || t === 'THESIS';
            });
            titleLabel = 'Skripsi, Tesis & Disertasi (EPrints UMS)';
        } else if (srcObj.type === 'local_journal') {
            results = this.books.filter(b => {
                const s = (b.src || '').toLowerCase();
                const u = (b.url || '').toLowerCase();
                const t = (b.type || '').toUpperCase();
                const id = String(b.id || '').toLowerCase();
                return b.src === 'UMS (Journal)' || s.includes('journal') || u.includes('journal') || id.startsWith('ojs') || t === 'JR' || t === 'ARTICLE';
            });
            titleLabel = 'Artikel Jurnal UMS (journals.ums.ac.id)';
        } else if (srcObj.type === 'sibi_api') {
            results = this.books.filter(b => b.src && b.src.includes('SIBI'));
            titleLabel = 'Buku Digital (SIBI Kemdikbud)';
        }

        this.baseResults = results;
        this.activeFilters = { access: new Set(), src: new Set(), type: new Set(), author: new Set(), year: new Set(), subject: new Set(), ddcClass: new Set() };
        this.resultsPage = 0;
        document.getElementById('results-title').textContent =
            `${titleLabel} — ${this.fmt(results.length)} ${this.t('results_found').toLowerCase()}`;
        this.renderFacets();
        this.applyFiltersAndRender();
        document.getElementById('results-wrap').style.display = 'block';
        document.getElementById('results-wrap').scrollIntoView({ behavior: 'smooth' });
    },

    // ──── Federated International Journal Discovery & Filtering ────
    _fedRawItems: [],
    _fedCurrentSrcObj: null,
    _fedSubscriptionMode: 'all', // 'all' | 'subscribed' | 'international'
    _fedMatchedJournals: [],
    _fedFilters: {
        openAccessOnly: false,
        contentType: 'all',
        yearRange: 'all',
        sort: 'default',
        sources: new Set()
    },

    findMatchingSubscribedJournals(query) {
        if (!query || !query.trim()) return [];
        const qTrim = query.toLowerCase().trim();
        const qTokens = qTrim.split(/\s+/).filter(t => t.length > 1);
        const journals = Array.isArray(this._ejournalsList) ? this._ejournalsList : [];

        return journals.filter(j => {
            if (j.active === false) return false;
            const title = (j.title || '').toLowerCase();
            const publisher = (j.publisher || '').toLowerCase();
            const subject = (j.subject || '').toLowerCase();
            const faculty = (j.faculty || '').toLowerCase();
            const issn = (j.issn || '').toLowerCase();
            const eissn = (j.eissn || '').toLowerCase();
            const fullText = `${title} ${publisher} ${subject} ${faculty} ${issn} ${eissn}`;

            if (fullText.includes(qTrim)) return true;
            if (qTokens.length > 0 && qTokens.every(tok => fullText.includes(tok))) return true;
            return false;
        });
    },

    findMatchingSubscribedEBooks(query) {
        if (!query || !query.trim()) return [];
        const qTrim = query.toLowerCase().trim();
        const qTokens = qTrim.split(/\s+/).filter(t => t.length > 1);
        const ebooks = Array.isArray(this._ebooksList) ? this._ebooksList : [];

        return ebooks.filter(b => {
            if (b.active === false) return false;
            const title = (b.title || '').toLowerCase();
            const author = (b.author || '').toLowerCase();
            const publisher = (b.publisher || '').toLowerCase();
            const subject = (b.subject || '').toLowerCase();
            const isbn = (b.isbn || '').toLowerCase().replace(/[^0-9x]/gi, '');
            const qNormIsbn = qTrim.replace(/[^0-9x]/gi, '');
            const year = String(b.year || '');
            const fullText = `${title} ${author} ${publisher} ${subject} ${year}`;

            if (qNormIsbn.length >= 8 && isbn.includes(qNormIsbn)) return true;
            if (fullText.includes(qTrim)) return true;
            if (qTokens.length > 0 && qTokens.every(tok => fullText.includes(tok))) return true;
            return false;
        });
    },

    setFedSubscriptionMode(mode) {
        this._fedSubscriptionMode = mode;
        this.renderFedSubscriptionModesBar(this._fedCurrentSrcObj);
        this.renderFedSubscribedHighlight();
        this.applyFedFiltersAndRender(this._fedCurrentPage);
    },

    renderFedSubscriptionModesBar(srcObj) {
        const modesEl = document.getElementById('fed-subscription-modes');
        if (!modesEl) return;

        const rawItems = this._fedRawItems || [];
        const matchedJrn = this._fedMatchedJournals || [];
        const matchedEbk = this._fedMatchedEBooks || [];
        const subArticles = rawItems.filter(it => Boolean(it.isSubscribed)).length;
        const subCount = subArticles + matchedJrn.length + matchedEbk.length;
        const totalCount = rawItems.length;
        const curMode = this._fedSubscriptionMode || 'all';

        modesEl.style.display = 'flex';
        modesEl.innerHTML = `
            <button type="button" class="fed-mode-pill ${curMode === 'all' ? 'active' : ''}" onclick="app.setFedSubscriptionMode('all')" title="Tampilkan seluruh artikel dan jurnal langganan">
                <span>Semua Jurnal</span>
                <span class="fed-mode-count">${totalCount}</span>
            </button>
            <button type="button" class="fed-mode-pill mode-subscribed ${curMode === 'subscribed' ? 'active' : ''}" onclick="app.setFedSubscriptionMode('subscribed')" title="Tampilkan hanya jurnal dan artikel yang dilanggan resmi oleh UMS">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>Langganan Resmi UMS</span>
                <span class="fed-mode-count">${subCount}</span>
            </button>
            <button type="button" class="fed-mode-pill ${curMode === 'international' ? 'active' : ''}" onclick="app.setFedSubscriptionMode('international')" title="Tampilkan artikel pangkalan data internasional">
                <span>Jurnal Internasional Global</span>
                <span class="fed-mode-count">${totalCount}</span>
            </button>
        `;
    },

    renderFedSubscribedHighlight() {
        const el = document.getElementById('fed-subscribed-highlight');
        if (!el) return;

        const hasJournals = this._fedSubscriptionMode !== 'international' && this._fedMatchedJournals && this._fedMatchedJournals.length > 0;
        const hasEBooks = this._fedSubscriptionMode !== 'international' && this._fedMatchedEBooks && this._fedMatchedEBooks.length > 0;

        if (!hasJournals && !hasEBooks) {
            el.style.display = 'none';
            el.innerHTML = '';
            return;
        }

        el.style.display = 'flex';
        let html = '';

        if (hasJournals) {
            html += this._fedMatchedJournals.map(j => {
                const issns = [j.issn, j.eissn].filter(Boolean).join(' / ') || '-';
                const accessBadge = j.accessType === 'ezproxy' ?
                    '<span class="chip" style="background:rgba(217, 119, 6, 0.12); color:#b45309; font-weight:600;">EZProxy SSO</span>' :
                    (j.accessType === 'open' ?
                        '<span class="chip" style="background:rgba(16, 185, 129, 0.12); color:#059669; font-weight:600;">Open Access</span>' :
                        '<span class="chip" style="background:rgba(59, 130, 246, 0.12); color:#2563eb; font-weight:600;">IP Kampus</span>');

                return `
                <div class="fed-journal-highlight-card">
                    <div class="fed-jrn-highlight-top">
                        <span class="fed-jrn-highlight-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            Jurnal Langganan Resmi UMS
                        </span>
                        <div>${accessBadge}</div>
                    </div>
                    <div>
                        <h3 class="fed-jrn-highlight-title">${this.esc(j.title)}</h3>
                        <div class="fed-jrn-highlight-meta">
                            <span>Penerbit: <strong>${this.esc(j.publisher || 'Internasional')}</strong></span>
                            <span>•</span>
                            <span>ISSN: <code>${this.esc(issns)}</code></span>
                            ${j.subject ? `<span>•</span><span>Subjek: ${this.esc(j.subject)} ${j.faculty ? `(Fak: ${this.esc(j.faculty)})` : ''}</span>` : ''}
                        </div>
                        ${j.notes ? `<div style="font-size:0.75rem; color:var(--ink-3); margin-top:0.35rem;">Catatan: ${this.esc(j.notes)}</div>` : ''}
                    </div>
                    <div class="fed-jrn-highlight-actions">
                        <span style="font-size:0.78rem; color:var(--ink-2);">Tersedia akses teks lengkap untuk sivitas akademika Universitas Muhammadiyah Surakarta</span>
                        <a href="${this.esc(j.url || '#')}" target="_blank" rel="noopener noreferrer" class="fed-btn-campus-access">
                            <span>Buka Laman Jurnal (Akses Kampus / SSO) ↗</span>
                        </a>
                    </div>
                </div>`;
            }).join('');
        }

        if (hasEBooks) {
            html += this._fedMatchedEBooks.map(b => {
                const accessType = b.access_type || b.accessType || 'kampus';
                const accessBadge = accessType === 'ezproxy' ?
                    '<span class="chip" style="background:rgba(217, 119, 6, 0.12); color:#b45309; font-weight:600;">EZProxy SSO</span>' :
                    (accessType === 'open' ?
                        '<span class="chip" style="background:rgba(16, 185, 129, 0.12); color:#059669; font-weight:600;">Open Access</span>' :
                        '<span class="chip" style="background:rgba(59, 130, 246, 0.12); color:#2563eb; font-weight:600;">IP Kampus</span>');

                return `
                <div class="fed-journal-highlight-card" style="border-color:rgba(37, 99, 235, 0.45);">
                    <div class="fed-jrn-highlight-top">
                        <span class="fed-jrn-highlight-badge" style="background:#2563eb;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            E-Book Langganan Resmi UMS Terkait
                        </span>
                        <div>${accessBadge}</div>
                    </div>
                    <div>
                        <h3 class="fed-jrn-highlight-title">${this.esc(b.title)}</h3>
                        <div class="fed-jrn-highlight-meta">
                            <span>Penulis: <strong>${this.esc(b.author || 'Penulis')}</strong></span>
                            <span>•</span>
                            <span>Penerbit: <strong>${this.esc(b.publisher || 'Internasional')}</strong></span>
                            ${b.year ? `<span>•</span><span>Tahun: ${b.year}</span>` : ''}
                            ${b.isbn ? `<span>•</span><span>ISBN: <code>${this.esc(b.isbn)}</code></span>` : ''}
                        </div>
                        ${b.notes ? `<div style="font-size:0.75rem; color:var(--ink-3); margin-top:0.35rem;">Catatan: ${this.esc(b.notes)}</div>` : ''}
                    </div>
                    <div class="fed-jrn-highlight-actions">
                        <button type="button" class="btn btn-ghost" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="app.showEBookDetail(${this.idAttr(b.id)})">
                            <span>Detail & Sitasi</span>
                        </button>
                        <a href="${this.esc(b.url || '#')}" target="_blank" rel="noopener noreferrer" class="fed-btn-campus-access">
                            <span>Buka E-Book di Platform Resmi ↗</span>
                        </a>
                    </div>
                </div>`;
            }).join('');
        }

        el.innerHTML = html;
    },

    async fetchFederatedDiscovery(srcObj, query, page = 1) {
        if (!query || !query.trim()) return;
        query = query.trim();
        this._fedCurrentQuery = query;
        this._fedCurrentPage = page;
        this._fedCurrentSrcObj = srcObj;

        // Ensure subscribed journals and ebooks are loaded for matching
        await this.getSubscribedJournalsList();
        await this.getSubscribedEBooksList();
        this._fedMatchedJournals = this.findMatchingSubscribedJournals(query);
        this._fedMatchedEBooks = this.findMatchingSubscribedEBooks(query);

        // Fetch smart academic topic concepts
        this.fetchAndRenderSmartTopics(query);

        const fedWrap = document.getElementById('fed-results-wrap');
        const locWrap = document.getElementById('results-wrap');
        const headerEl = document.getElementById('fed-header');
        const listEl = document.getElementById('fed-items-list');
        const filterBarEl = document.getElementById('fed-filter-bar');
        const pagTop = document.getElementById('fed-pagination-top');
        const pagBottom = document.getElementById('fed-pagination-bottom');

        if (locWrap) locWrap.style.display = 'none';
        if (fedWrap) {
            fedWrap.style.display = 'block';
            fedWrap.scrollIntoView({ behavior: 'smooth' });
        }

        // Loading state
        headerEl.innerHTML = `
            <div class="fed-header-title">
                <span>${this.esc(srcObj.name)}</span>
                <span class="fed-header-url">${this.esc(srcObj.domain || '')}</span>
            </div>
            <div class="fed-header-count">Memuat data pencarian "${this.esc(query)}"...</div>
        `;
        if (filterBarEl) filterBarEl.style.display = 'none';
        listEl.innerHTML = `<div style="text-align:center; padding:3rem 1rem; color:var(--ink-3);">
            <div class="ld-spinner" style="margin:0 auto 1rem; width:28px; height:28px;"></div>
            <p>Menghubungkan ke basis data ${this.esc(srcObj.name)}...</p>
        </div>`;
        pagTop.innerHTML = '';
        pagBottom.innerHTML = '';

        const url = `/api/federated?source=${encodeURIComponent(srcObj.remoteKey)}&q=${encodeURIComponent(query)}&page=${page}&rows=15`;
        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    headerEl.innerHTML = `
                        <div class="fed-header-title">
                            <span>${this.esc(srcObj.name)}</span>
                            <span class="fed-header-url">${this.esc(srcObj.domain || '')}</span>
                        </div>
                        <div class="fed-header-count" style="color:var(--rose)">Gagal memuat data dari ${this.esc(srcObj.name)}: ${this.esc(data.error)}</div>
                    `;
                    listEl.innerHTML = `<div style="text-align:center; padding:2rem 1rem; color:var(--ink-3);">
                        <p>${data.note || 'Layanan sedang tidak dapat diakses atau membutuhkan koneksi institusi.'}</p>
                    </div>`;
                    if (filterBarEl) filterBarEl.style.display = 'none';
                    return;
                }

                const total = data.total || 0;
                const items = data.items || [];
                const totalPages = data.totalPages || (Math.ceil(total / 15) || 1);
                this._fedCurrentTotal = total;
                this._fedTotalPages = totalPages;
                this._fedRawItems = items;

                // Render Header
                headerEl.innerHTML = `
                    <div class="fed-header-title">
                        <span>${this.esc(srcObj.name)}</span>
                        <span class="fed-header-url">${this.esc(srcObj.domain || data.sourceUrl || '')}</span>
                    </div>
                    <div class="fed-header-count">Hasil Pencarian : ${this.fmt(total)} record</div>
                `;

                // Render 3-Mode Segmented Tabs & Matched Subscribed Journal Highlight Card
                this.renderFedSubscriptionModesBar(srcObj);
                this.renderFedSubscribedHighlight();

                // Render Items
                if (items.length === 0 && (!this._fedMatchedJournals || this._fedMatchedJournals.length === 0)) {
                    listEl.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon-wrap">
                                ${this.getEmptyStateSvg('search')}
                            </div>
                            <div class="empty-state-title">Artikel Tidak Ditemukan</div>
                            <div class="empty-state-desc">Tidak ada artikel ilmiah yang ditemukan di <strong>${this.esc(srcObj.name)}</strong> untuk kata kunci <strong>"${this.esc(query)}"</strong>.</div>
                            <div class="empty-state-actions">
                                <button type="button" class="btn btn-brand" onclick="document.getElementById('search-input').focus(); document.getElementById('search-input').select();">Coba Kata Kunci Lain</button>
                                <button type="button" class="btn btn-ghost" onclick="app.showHome()">Kembali ke Beranda</button>
                            </div>
                        </div>
                    `;
                    if (filterBarEl) filterBarEl.style.display = 'none';
                    return;
                }

                // Render Filter Bar & Filtered Items
                this.renderFedFilterBar(srcObj, page);
                this.applyFedFiltersAndRender(page);

                // Render Pagination
                const pagHtml = this.renderFedPaginationHtml(page, totalPages, srcObj);
                pagTop.innerHTML = pagHtml;
                pagBottom.innerHTML = pagHtml;
            })
            .catch(err => {
                headerEl.innerHTML = `<div class="fed-header-count" style="color:var(--rose)">Terjadi kesalahan koneksi: ${this.esc(err.message)}</div>`;
                listEl.innerHTML = `<div style="text-align:center; padding:2rem 1rem; color:var(--ink-3);"><p>Silakan coba kembali.</p></div>`;
                if (filterBarEl) filterBarEl.style.display = 'none';
            });
    },

    renderFedFilterBar(srcObj, page) {
        const filterBarEl = document.getElementById('fed-filter-bar');
        if (!filterBarEl) return;

        // Extract available content types & database sources dynamically
        const typesSet = new Set();
        const yearsSet = new Set();
        const sourcesCount = {};
        let oaCount = 0;

        (this._fedRawItems || []).forEach(it => {
            if (it.contentType) typesSet.add(it.contentType);
            if (it.year && it.year > 1900) yearsSet.add(it.year);
            if (it.openAccess || it.isOpenAccess || it.is_oa || it.openaccess) oaCount++;
            const s = it.source || 'Lainnya';
            sourcesCount[s] = (sourcesCount[s] || 0) + 1;
        });

        const typesList = Array.from(typesSet).sort();
        const yearsList = Array.from(yearsSet).sort((a, b) => b - a);

        const isOaActive = this._fedFilters.openAccessOnly;
        const curType = this._fedFilters.contentType;
        const curYear = this._fedFilters.yearRange;
        const curSort = this._fedFilters.sort;
        const hasActiveSourceFilters = this._fedFilters.sources && this._fedFilters.sources.size > 0;
        const hasActiveFilters = isOaActive || curType !== 'all' || curYear !== 'all' || curSort !== 'default' || hasActiveSourceFilters;

        // Source database filter for multi-database aggregated view
        let sourcesFilterHtml = '';
        if (srcObj && srcObj.id === 'all_global') {
            const activeSources = this._fedFilters.sources || new Set();
            const isAllSelected = activeSources.size === 0;
            sourcesFilterHtml = `
                <div class="fed-source-filter-group">
                    <span class="fed-filter-sublabel">Database Asal:</span>
                    <button type="button" class="fed-src-chip ${isAllSelected ? 'active' : ''}" onclick="app.setAllFedSources()" style="display:inline-flex; align-items:center; gap:0.35rem;">
                        ${this.getSourceLogoSvg('global', 13)}
                        <span>Semua Basis Data</span>
                    </button>
                    ${Object.entries(sourcesCount).map(([srcName, cnt]) => {
                const isSelected = activeSources.has(srcName);
                let badgeClass = 'fed-badge-type';
                if (srcName.toLowerCase().includes('scopus')) badgeClass = 'badge-scopus';
                else if (srcName.toLowerCase().includes('semantic')) badgeClass = 'badge-semanticscholar';
                else if (srcName.toLowerCase().includes('lens')) badgeClass = 'badge-lens';
                else if (srcName.toLowerCase().includes('openalex')) badgeClass = 'badge-openalex';
                else if (srcName.toLowerCase().includes('crossref')) badgeClass = 'badge-crossref';
                else if (srcName.toLowerCase().includes('springer')) badgeClass = 'badge-springer';
                else if (srcName.toLowerCase().includes('emerald')) badgeClass = 'badge-emerald';
                return `<button type="button" class="fed-src-chip ${isSelected ? 'active' : ''} ${badgeClass}" onclick="app.toggleFedSourceFilter(${this.idAttr(srcName)})" style="display:inline-flex; align-items:center; gap:0.35rem;">
                            ${this.getSourceLogoSvg(srcName, 13)}
                            <span>${this.esc(srcName)}</span>
                            <span class="fed-oa-badge" style="margin-left:4px; font-size:0.65rem">${cnt}</span>
                        </button>`;
            }).join('')}
                </div>
            `;
        }

        filterBarEl.style.display = 'block';
        filterBarEl.innerHTML = `
            <div class="fed-filter-inner">
                <div class="fed-filter-left">
                    <span class="fed-filter-label">Filter Hasil:</span>

                    <!-- Open Access Toggle Button -->
                    <button type="button" class="fed-filter-oa-btn ${isOaActive ? 'active' : ''}" onclick="app.toggleFedOpenAccess()" title="Tampilkan hanya artikel Open Access">
                        <span>Open Access Only</span>
                        ${oaCount > 0 ? `<span class="fed-oa-badge">${oaCount}</span>` : ''}
                    </button>

                    <!-- Content Type Dropdown -->
                    <div class="fed-filter-select-wrap">
                        <label for="fed-sel-type" class="fed-filter-sublabel">Tipe:</label>
                        <select id="fed-sel-type" class="fed-filter-select" onchange="app.setFedContentType(this.value)">
                            <option value="all" ${curType === 'all' ? 'selected' : ''}>Semua Tipe</option>
                            ${typesList.map(t => `<option value="${this.esc(t)}" ${curType === t ? 'selected' : ''}>${this.esc(t)}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Publication Year Dropdown -->
                    <div class="fed-filter-select-wrap">
                        <label for="fed-sel-year" class="fed-filter-sublabel">Tahun:</label>
                        <select id="fed-sel-year" class="fed-filter-select" onchange="app.setFedYearRange(this.value)">
                            <option value="all" ${curYear === 'all' ? 'selected' : ''}>Semua Tahun</option>
                            <option value="last3" ${curYear === 'last3' ? 'selected' : ''}>3 Tahun Terakhir (2023-2026)</option>
                            <option value="last5" ${curYear === 'last5' ? 'selected' : ''}>5 Tahun Terakhir (2021-2026)</option>
                            <option value="last10" ${curYear === 'last10' ? 'selected' : ''}>10 Tahun Terakhir (2016-2026)</option>
                            ${yearsList.map(y => `<option value="${y}" ${curYear === String(y) ? 'selected' : ''}>Tahun ${y}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="fed-filter-right">
                    <!-- Sort Dropdown -->
                    <div class="fed-filter-select-wrap">
                        <label for="fed-sel-sort" class="fed-filter-sublabel">Urutkan:</label>
                        <select id="fed-sel-sort" class="fed-filter-select" onchange="app.setFedSort(this.value)">
                            <option value="default" ${curSort === 'default' ? 'selected' : ''}>Relevansi / Default</option>
                            <option value="year-desc" ${curSort === 'year-desc' ? 'selected' : ''}>Tahun Terbaru</option>
                            <option value="year-asc" ${curSort === 'year-asc' ? 'selected' : ''}>Tahun Terlama</option>
                            <option value="title" ${curSort === 'title' ? 'selected' : ''}>Judul A-Z</option>
                        </select>
                    </div>

                    <!-- Reset Filters Button -->
                    ${hasActiveFilters ? `
                        <button type="button" class="fed-filter-reset-btn" onclick="app.resetFedFilters()" title="Reset semua filter">
                            ✕ Reset Filter
                        </button>
                    ` : ''}
                </div>
                ${sourcesFilterHtml}
            </div>
            <div id="fed-filter-status" class="fed-filter-status-bar"></div>
        `;
    },

    toggleFedOpenAccess() {
        this._fedFilters.openAccessOnly = !this._fedFilters.openAccessOnly;
        this.renderFedFilterBar(this._fedCurrentSrcObj, this._fedCurrentPage);
        this.applyFedFiltersAndRender(this._fedCurrentPage);
    },

    setFedContentType(val) {
        this._fedFilters.contentType = val;
        this.renderFedFilterBar(this._fedCurrentSrcObj, this._fedCurrentPage);
        this.applyFedFiltersAndRender(this._fedCurrentPage);
    },

    setFedYearRange(val) {
        this._fedFilters.yearRange = val;
        this.renderFedFilterBar(this._fedCurrentSrcObj, this._fedCurrentPage);
        this.applyFedFiltersAndRender(this._fedCurrentPage);
    },

    setFedSort(val) {
        this._fedFilters.sort = val;
        this.renderFedFilterBar(this._fedCurrentSrcObj, this._fedCurrentPage);
        this.applyFedFiltersAndRender(this._fedCurrentPage);
    },

    toggleFedSourceFilter(srcName) {
        if (!this._fedFilters.sources) this._fedFilters.sources = new Set();
        if (this._fedFilters.sources.has(srcName)) {
            this._fedFilters.sources.delete(srcName);
        } else {
            this._fedFilters.sources.add(srcName);
        }
        this.renderFedFilterBar(this._fedCurrentSrcObj, this._fedCurrentPage);
        this.applyFedFiltersAndRender(this._fedCurrentPage);
    },

    setAllFedSources() {
        if (this._fedFilters.sources) this._fedFilters.sources.clear();
        this.renderFedFilterBar(this._fedCurrentSrcObj, this._fedCurrentPage);
        this.applyFedFiltersAndRender(this._fedCurrentPage);
    },

    resetFedFilters() {
        this._fedFilters = {
            openAccessOnly: false,
            contentType: 'all',
            yearRange: 'all',
            sort: 'default',
            sources: new Set()
        };
        this.renderFedFilterBar(this._fedCurrentSrcObj, this._fedCurrentPage);
        this.applyFedFiltersAndRender(this._fedCurrentPage);
    },

    applyFedFiltersAndRender(page = 1) {
        const listEl = document.getElementById('fed-items-list');
        const statusEl = document.getElementById('fed-filter-status');
        if (!listEl) return;

        let filtered = [...(this._fedRawItems || [])];
        const totalRaw = filtered.length;

        // 0. Subscription Mode Filter: [all | subscribed | international]
        if (this._fedSubscriptionMode === 'subscribed') {
            filtered = filtered.filter(it => Boolean(it.isSubscribed));
        }

        // 0b. Filter Source Databases (if specific sources chosen on all_global)
        if (this._fedFilters.sources && this._fedFilters.sources.size > 0) {
            filtered = filtered.filter(it => this._fedFilters.sources.has(it.source));
        }

        // 1. Filter Open Access
        if (this._fedFilters.openAccessOnly) {
            filtered = filtered.filter(it => it.openAccess || it.isOpenAccess || it.is_oa || it.openaccess);
        }

        // 2. Filter Content Type
        if (this._fedFilters.contentType !== 'all') {
            filtered = filtered.filter(it => (it.contentType || 'Article') === this._fedFilters.contentType);
        }

        // 3. Filter Year Range
        if (this._fedFilters.yearRange !== 'all') {
            const yrChoice = this._fedFilters.yearRange;
            if (yrChoice === 'last3') {
                filtered = filtered.filter(it => it.year && it.year >= 2023);
            } else if (yrChoice === 'last5') {
                filtered = filtered.filter(it => it.year && it.year >= 2021);
            } else if (yrChoice === 'last10') {
                filtered = filtered.filter(it => it.year && it.year >= 2016);
            } else {
                const targetYr = parseInt(yrChoice, 10);
                if (targetYr) {
                    filtered = filtered.filter(it => it.year === targetYr);
                }
            }
        }

        // 4. Sort
        if (this._fedFilters.sort === 'year-desc') {
            filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
        } else if (this._fedFilters.sort === 'year-asc') {
            filtered.sort((a, b) => (a.year || 0) - (b.year || 0));
        } else if (this._fedFilters.sort === 'title') {
            filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        }

        // Update Filter Status Info
        if (statusEl) {
            const hasActiveSourceFilters = this._fedFilters.sources && this._fedFilters.sources.size > 0;
            const hasActiveFilters = this._fedSubscriptionMode !== 'all' || this._fedFilters.openAccessOnly || this._fedFilters.contentType !== 'all' || this._fedFilters.yearRange !== 'all' || this._fedFilters.sort !== 'default' || hasActiveSourceFilters;
            if (hasActiveFilters) {
                statusEl.innerHTML = `<span>Menampilkan <strong>${filtered.length}</strong> dari <strong>${totalRaw}</strong> artikel pada halaman ini</span>`;
                statusEl.style.display = 'block';
            } else {
                statusEl.style.display = 'none';
            }
        }

        // Empty state when filtered out
        if (filtered.length === 0) {
            if (this._fedSubscriptionMode === 'subscribed' && this._fedMatchedJournals && this._fedMatchedJournals.length > 0) {
                listEl.innerHTML = `
                    <div class="empty-state" style="padding:1.5rem; background:var(--bg-2); border:1px solid var(--border); border-radius:var(--r-md); margin-top:0.5rem;">
                        <div class="empty-state-title" style="font-size:0.95rem;">Jurnal Langganan Resmi Ditampilkan di Atas</div>
                        <div class="empty-state-desc">Penerbit atau judul jurnal langganan resmi UMS yang cocok dengan kata kunci Anda telah ditampilkan pada kartu sorotan di atas. Belum ada artikel individual pada halaman saat ini yang cocok dengan kriteria filter tambahan.</div>
                        <div class="empty-state-actions" style="margin-top:0.85rem;">
                            <button type="button" class="btn btn-brand" onclick="app.setFedSubscriptionMode('all')">Tampilkan Semua Jurnal & Artikel Global</button>
                        </div>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon-wrap">
                        ${this.getEmptyStateSvg('filter')}
                    </div>
                    <div class="empty-state-title">Tidak Ada Artikel yang Cocok</div>
                    <div class="empty-state-desc">Tidak ada artikel pada halaman ini yang sesuai dengan filter yang dipilih. Coba hilangkan centang Open Access, ubah pilihan tipe/tahun, atau beralih ke tab <strong>Semua Jurnal</strong>.</div>
                    <div class="empty-state-actions">
                        <button type="button" class="btn btn-brand" onclick="app.resetFedFilters(); app.setFedSubscriptionMode('all');">✕ Reset Filter</button>
                    </div>
                </div>
            `;
            return;
        }

        const srcObj = this._fedCurrentSrcObj || { name: 'International Source' };
        const startNum = (page - 1) * 15 + 1;

        listEl.innerHTML = filtered.map((it, idx) => {
            this.registerArticle(it);
            const itemNum = startNum + idx;
            const q = this._fedCurrentQuery || '';
            const rawId = String(it.id || it.doi || it.url);
            const safeTitle = this.hl(it.title || 'Untitled', q);
            const safeAuthors = this.hl(it.authors || 'Unknown', q);
            const safePub = this.esc(it.publicationName || '-');
            const safeType = this.esc(it.contentType || 'Article');
            const safePubType = this.esc(it.publicationType || srcObj.name);
            const safeDate = it.date ? this.esc(it.date) : (it.year ? this.esc(String(it.year)) : '');
            const validDoi = this.getCleanDoi(it.doi);
            const doiUrl = validDoi ? `https://doi.org/${validDoi}` : '';
            let linkUrl = (it.url || doiUrl || '#').trim();
            if (linkUrl.startsWith('https://openalex.org/https://openalex.org/')) {
                linkUrl = linkUrl.replace('https://openalex.org/https://openalex.org/', 'https://openalex.org/');
            } else if (linkUrl.startsWith('https://openalex.org/http://') || linkUrl.startsWith('https://openalex.org/https://')) {
                linkUrl = linkUrl.replace('https://openalex.org/', '');
            } else if (linkUrl.startsWith('https://doi.org/https://doi.org/')) {
                linkUrl = linkUrl.replace('https://doi.org/https://doi.org/', 'https://doi.org/');
            } else if (linkUrl.startsWith('https://doi.org/http://') || linkUrl.startsWith('https://doi.org/https://')) {
                linkUrl = linkUrl.replace('https://doi.org/', '');
            }
            const abstractText = it.abstract ? this.hl(it.abstract, q) : '';
            const isOa = it.openAccess || it.isOpenAccess || it.is_oa || it.openaccess;
            const pdfUrl = it.pdfUrl || it.pdf_url || '';
            const hasDirectPdf = Boolean(pdfUrl && pdfUrl.trim().length > 5 && pdfUrl !== linkUrl);
            const isBm = this.bookmarks && (this.bookmarks.has(rawId) || this.bookmarks.has(String(it.id)));
            const itemSource = it.source || (srcObj ? srcObj.name : '');
            const isSubscribed = Boolean(it.isSubscribed);
            const subscribedUrl = it.subscribedUrl || '';

            return `
            <div class="fed-item${isSubscribed ? ' fed-item-subscribed' : ''}">
                <div class="fed-item-header-row">
                    <div class="fed-item-num-title">
                        <span class="fed-item-idx">${itemNum}.</span>
                        <a href="#" onclick="app.showArticleDetail(${this.idAttr(rawId)}); return false;" class="fed-title-link" title="Klik untuk membuka modal detail artikel, abstrak, dan sitasi">${safeTitle}</a>
                    </div>
                    <div class="fed-item-badges">
                        ${isSubscribed ? `<span class="fed-badge-subscribed" title="Jurnal ini dilanggan secara resmi oleh Perpustakaan UMS"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Langganan UMS</span>` : ''}
                        ${itemSource ? this.getSourceBadgeHtml(itemSource) : ''}
                        ${this.getOaBadgeHtml(isOa)}
                        <span class="fed-badge-type">${safeType}</span>
                        ${safeDate ? `<span class="fed-badge-year">${safeDate}</span>` : ''}
                        <button id="fed-bm-star-${this.esc(rawId)}" class="fed-star-btn ${isBm ? 'active' : ''}" data-fed-bm="${this.esc(rawId)}" onclick="event.stopPropagation(); app.toggleBookmark(${this.idAttr(rawId)})" title="${isBm ? 'Hapus dari Koleksi' : 'Simpan ke Koleksi'}">${this.starSvg(isBm)}</button>
                    </div>
                </div>
                <ul class="fed-meta-list">
                    <li><span class="fed-meta-label">Creator :</span> ${safeAuthors}</li>
                    <li><span class="fed-meta-label">Content Type :</span> ${safeType}</li>
                    <li><span class="fed-meta-label">Publication Name :</span> ${safePub}</li>
                    <li><span class="fed-meta-label">Publication Type :</span> ${safePubType}${safeDate ? ` | ${safeDate}` : ''}</li>
                </ul>
                ${abstractText ? `
                    <div class="fed-item-abstract">
                        <span class="fed-meta-label">Abstract:</span> ${abstractText}
                    </div>` : ''}
                <div class="fed-actions-row">
                    <button type="button" class="btn btn-ghost" onclick="app.showArticleDetail(${this.idAttr(rawId)})" style="font-size:0.75rem; padding:0.32rem 0.75rem; font-weight:600; display:inline-flex; align-items:center; gap:0.35rem;" title="Buka modal detail artikel">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        <span>Detail & Sitasi</span>
                    </button>
                    ${isSubscribed && subscribedUrl ? `
                    <a href="${this.esc(subscribedUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-subscribed-campus" title="Akses langsung melalui portal langganan institusi UMS">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 10v4"></path><path d="M15 10v4"></path></svg>
                        <span>Akses Kampus UMS ↗</span>
                    </a>` : ''}
                    <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-brand" style="font-size:0.75rem; padding:0.32rem 0.75rem">
                        ${validDoi ? 'Buka Dokumen / DOI ↗' : 'Buka Dokumen ↗'}
                    </a>
                    ${hasDirectPdf ? `
                    <button type="button" class="btn btn-emerald" onclick="app.openPdfViewerById(${this.idAttr(rawId)})" style="font-size:0.75rem; padding:0.32rem 0.75rem; display:inline-flex; align-items:center; gap:0.35rem;" title="Baca atau unduh PDF langsung">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                        <span>Baca / Unduh PDF</span>
                    </button>` : ''}
                    <button type="button" class="btn btn-ghost" onclick="app.downloadCitationById(${this.idAttr(rawId)}, 'ris')" style="font-size:0.75rem; padding:0.32rem 0.75rem; display:inline-flex; align-items:center; gap:0.35rem;" title="Unduh file .RIS untuk Mendeley/Zotero">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>.RIS</span>
                    </button>
                    <button type="button" class="btn btn-ghost" onclick="app.downloadCitationById(${this.idAttr(rawId)}, 'bib')" style="font-size:0.75rem; padding:0.32rem 0.75rem; display:inline-flex; align-items:center; gap:0.35rem;" title="Unduh file .BIB untuk LaTeX/Overleaf">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span>BibTeX</span>
                    </button>
                    <button type="button" class="btn btn-ghost" onclick="app.copyArticleCitation(${this.idAttr(rawId)})" style="font-size:0.75rem; padding:0.32rem 0.75rem">
                        Salin Sitasi
                    </button>
                </div>
            </div>`;
        }).join('');
    },

    renderFedPaginationHtml(curPage, totalPages, srcObj) {
        if (totalPages <= 1) return '';
        let html = '';

        // First & Prev
        html += `<button class="fed-pg-btn" ${curPage <= 1 ? 'disabled' : ''} onclick="app.fetchFederatedDiscovery(app._allFedSources.find(s=>s.id==='${srcObj.id}'), app._fedCurrentQuery, 1)">First</button>`;
        html += `<button class="fed-pg-btn" ${curPage <= 1 ? 'disabled' : ''} onclick="app.fetchFederatedDiscovery(app._allFedSources.find(s=>s.id==='${srcObj.id}'), app._fedCurrentQuery, ${curPage - 1})">Previous</button>`;

        // Page Numbers (sliding window around curPage)
        const maxButtons = 10;
        let start = Math.max(1, curPage - 4);
        let end = Math.min(totalPages, start + maxButtons - 1);
        if (end - start < maxButtons - 1) {
            start = Math.max(1, end - maxButtons + 1);
        }

        for (let p = start; p <= end; p++) {
            const isCur = p === curPage;
            html += `<button class="fed-pg-btn${isCur ? ' active' : ''}" onclick="app.fetchFederatedDiscovery(app._allFedSources.find(s=>s.id==='${srcObj.id}'), app._fedCurrentQuery, ${p})">${p}</button>`;
        }

        // Next & Last
        html += `<button class="fed-pg-btn" ${curPage >= totalPages ? 'disabled' : ''} onclick="app.fetchFederatedDiscovery(app._allFedSources.find(s=>s.id==='${srcObj.id}'), app._fedCurrentQuery, ${curPage + 1})">Next</button>`;
        html += `<button class="fed-pg-btn" ${curPage >= totalPages ? 'disabled' : ''} onclick="app.fetchFederatedDiscovery(app._allFedSources.find(s=>s.id==='${srcObj.id}'), app._fedCurrentQuery, ${totalPages})">Last</button>`;

        return html;
    },

    toast(msg) {
        let t = document.getElementById('app-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'app-toast';
            t.style.cssText = 'position:fixed; bottom:2rem; left:50%; transform:translateX(-50%); background:#18181b; color:#fff; padding:0.6rem 1.2rem; border-radius:30px; font-size:0.85rem; font-weight:600; z-index:99999; box-shadow:0 10px 25px rgba(0,0,0,0.3); border:1px solid #27272a; transition:all 0.3s ease; opacity:0; pointer-events:none;';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.opacity = '1';
        t.style.transform = 'translateX(-50%) translateY(0)';
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(-50%) translateY(10px)';
        }, 2200);
    },

    copyCitation(title, authors, year, publication) {
        const yr = year ? ` (${year}).` : '.';
        const pub = publication ? ` ${publication}.` : '';
        const citation = `${authors || 'Anonim'}${yr} ${title}.${pub}`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(citation).then(() => {
                this.toast('Sitasi berhasil disalin!');
            }).catch(() => {
                alert('Sitasi:\n' + citation);
            });
        } else {
            alert('Sitasi:\n' + citation);
        }
    },

    // ──── Institution Picker (Legacy / Compact) ────
    _activeSource: null,

    renderInstitutionPicker() {
        this.renderFederatedSourcesGrid();
    },

    browseSource(src) {
        const results = this.books.filter(b => b.src === src);
        this.baseResults = results;
        this.activeFilters = { access: new Set(), src: new Set([src]), type: new Set(), author: new Set(), year: new Set(), subject: new Set(), ddcClass: new Set() };
        this.resultsPage = 0;
        document.getElementById('search-input').value = '';
        document.getElementById('results-title').textContent =
            `${src} — ${this.fmt(results.length)} ${this.t('results_found').toLowerCase()}`;
        this.renderFacets();
        this.applyFiltersAndRender();
        document.getElementById('results-wrap').style.display = 'block';
        document.getElementById('results-wrap').scrollIntoView({ behavior: 'smooth' });
    },

    // ──── Search ────
    showSuggest(q) {
        const sug = this.searchEngine.suggest(q);
        const box = document.getElementById('suggest-box');
        if (!sug.length && (!q || q.trim().length < 2)) { this.hideSuggest(); return; }
        const inp = document.getElementById('search-input').value;
        let html = sug.map(s => {
            const type = s.type === 'title' ? this.t('sug_title') : s.type === 'author' ? this.t('sug_author') : this.t('sug_subject');
            const cls = s.type === 'title' ? 'is-title' : s.type === 'author' ? 'is-author' : 'is-subject';
            const sub = s.subtext ? `<small> — ${this.esc(s.subtext)}</small>` : '';
            return `<div class="sug-item" onclick="app.pickSuggest(${s.book ? `'book',${this.idAttr(s.book.id)}` : `'q',${this.idAttr(s.text)}`})">
                <span class="sug-badge ${cls}">${type}</span>
                <span class="sug-text">${this.hl(s.text, inp)}${sub}</span>
            </div>`;
        }).join('');

        if (q && q.trim().length >= 2) {
            html += `
            <div class="sug-item" style="background:var(--bg-2); border-top:1px solid var(--border); margin-top:3px;" onclick="app.searchGlobalFromSuggest(${this.idAttr(q)})">
                <span class="sug-badge" style="background:rgba(37,99,235,0.12); color:var(--brand); font-weight:700">Global OA</span>
                <span class="sug-text">Cari <strong>"${this.esc(q)}"</strong> di Scopus, Crossref & OpenAlex →</span>
            </div>`;
        }

        box.innerHTML = html;
        box.classList.add('open');
    },
    hideSuggest() {
        clearTimeout(this.debounce);
        const box = document.getElementById('suggest-box');
        if (box) box.classList.remove('open');
    },
    searchGlobalFromSuggest(q) {
        this.hideSuggest();
        this.selectFedSource('openalex');
        this.fetchFederatedDiscovery(this._allFedSources.find(s => s.id === 'openalex'), q, 1);
    },
    pickSuggest(type, val) {
        this.hideSuggest();
        if (type === 'book') this.showBookDetail(val);
        else { document.getElementById('search-input').value = val; this.doSearch(val); }
    },
    clearSearch() {
        document.getElementById('search-input').value = '';
        document.getElementById('search-clear').style.display = 'none';
        const kbdHint = document.getElementById('search-kbd-hint');
        if (kbdHint) kbdHint.style.display = 'inline-flex';
        if (document.getElementById('results-wrap')) document.getElementById('results-wrap').style.display = 'none';
        if (document.getElementById('fed-results-wrap')) document.getElementById('fed-results-wrap').style.display = 'none';
        const autoInsights = document.getElementById('fed-auto-insights');
        if (autoInsights) autoInsights.style.display = 'none';
        const smartTopics = document.getElementById('smart-topics-wrap');
        if (smartTopics) { smartTopics.style.display = 'none'; smartTopics.innerHTML = ''; }
        this.hideSuggest();
        this._currentSearchQuery = '';

        // Clear query parameters from URL
        try {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('q');
            currentUrl.searchParams.delete('field');
            currentUrl.searchParams.delete('src');
            currentUrl.searchParams.delete('id');
            window.history.replaceState({}, '', currentUrl.pathname);
        } catch (e) { }
    },
    quickSearch(keyword) {
        if (!keyword) return;
        const inp = document.getElementById('search-input');
        if (inp) inp.value = keyword;
        const clearBtn = document.getElementById('search-clear');
        if (clearBtn) clearBtn.style.display = 'block';
        const kbdHint = document.getElementById('search-kbd-hint');
        if (kbdHint) kbdHint.style.display = 'none';
        this.doSearch(keyword);
    },
    doSearch(q) {
        this.hideSuggest();
        if (!q) return;

        this._currentSearchQuery = q;
        const field = (document.getElementById('search-field-sel') || {}).value || 'all';

        // Fetch smart academic topics
        this.fetchAndRenderSmartTopics(q);

        // Update URL query parameters for Deep Link Sharing
        try {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('q', q);
            if (field && field !== 'all') currentUrl.searchParams.set('field', field);
            else currentUrl.searchParams.delete('field');
            if (this._activeFedSource && this._activeFedSource !== 'local') currentUrl.searchParams.set('src', this._activeFedSource);
            else currentUrl.searchParams.delete('src');
            currentUrl.searchParams.delete('id');
            window.history.replaceState({ q, field, src: this._activeFedSource }, '', currentUrl.toString());
        } catch (e) { }

        // Check if currently selected tab is an external database (Springer, Emerald, OpenAlex, Crossref, Scopus)
        const srcObj = (this._allFedSources || []).find(s => s.id === this._activeFedSource);
        if (srcObj && srcObj.type === 'remote') {
            this.fetchFederatedDiscovery(srcObj, q, 1);
            return;
        }

        // Hide external results when searching local catalog
        const fedWrap = document.getElementById('fed-results-wrap');
        if (fedWrap) fedWrap.style.display = 'none';

        // Simpan ke riwayat pencarian
        const lowerQ = q.toLowerCase();
        this.searchHistory = this.searchHistory.filter(h => h.toLowerCase() !== lowerQ);
        this.searchHistory.unshift(q);
        if (this.searchHistory.length > 20) this.searchHistory.pop();
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

        const fieldLabels = {
            all: this.t('sf_all'), title: this.t('sf_title'), author: this.t('sf_author'),
            subject: this.t('sf_subject'), ddc: this.t('sf_ddc'), isbn: this.t('sf_isbn')
        };
        const fieldLabel = field !== 'all' ? ` [${fieldLabels[field]}]` : '';

        this.baseResults = results;
        this.activeFilters = { access: new Set(), src: new Set(), type: new Set(), author: new Set(), year: new Set(), subject: new Set(), ddcClass: new Set() };
        this.resultsPage = 0;
        document.getElementById('results-title').textContent = `"${q}"${fieldLabel} — ${results.length} ${this.t('results_found').toLowerCase()}`;

        // Show result wrapper & scroll immediately, then show skeleton
        document.getElementById('results-wrap').style.display = 'block';
        document.getElementById('results-wrap').scrollIntoView({ behavior: 'smooth' });
        this.showSkeleton(Math.min(results.length || 12, 12));

        // Small RAF delay lets browser paint skeleton before heavy DOM work
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.renderFacets();
                this.applyFiltersAndRender();
            });
        });

        // Trigger Automated Smart Multi-Source Discovery in parallel
        this.fetchAutoFederatedInsights(q, results.length);
    },

    fetchAutoFederatedInsights(q, localCount = 0) {
        const container = document.getElementById('fed-auto-insights');
        if (!container) return;

        container.style.display = 'block';
        container.innerHTML = `
            <div class="fed-insights-header">
                <div class="fed-insights-title-group">
                    <h3>Literatur Ilmiah Internasional Terkait "${this.esc(q)}"</h3>
                    <p>Mencari live ke basis data Scopus, Crossref, OpenAlex Global OA, Springer & Emerald...</p>
                </div>
            </div>
            <div class="fed-insights-pills">
                <span class="fed-insight-pill">Memuat estimasi Scopus...</span>
                <span class="fed-insight-pill">Memuat OpenAlex...</span>
                <span class="fed-insight-pill">Memuat Crossref...</span>
            </div>
            <div class="fed-insights-grid" style="opacity:0.6">
                <div class="fed-insight-card" style="min-height:140px; display:flex; align-items:center; justify-content:center; color:var(--ink-3)">
                    <div class="ld-spinner" style="width:20px; height:20px; margin-right:8px"></div> Menghubungkan ke basis data internasional...
                </div>
            </div>
        `;

        const queryTerm = encodeURIComponent(q);
        const reqScopus = fetch(`/api/federated?source=scopus&q=${queryTerm}&rows=3`).then(r => r.json()).catch(() => null);
        const reqSemantic = fetch(`/api/federated?source=semanticscholar&q=${queryTerm}&rows=3`).then(r => r.json()).catch(() => null);
        const reqLens = fetch(`/api/federated?source=lens&q=${queryTerm}&rows=3`).then(r => r.json()).catch(() => null);
        const reqOpenAlex = fetch(`/api/federated?source=openalex&q=${queryTerm}&rows=3`).then(r => r.json()).catch(() => null);
        const reqCrossref = fetch(`/api/federated?source=crossref&q=${queryTerm}&rows=3`).then(r => r.json()).catch(() => null);
        const reqSpringer = fetch(`/api/federated?source=springer&q=${queryTerm}&rows=3`).then(r => r.json()).catch(() => null);

        Promise.allSettled([reqScopus, reqSemantic, reqLens, reqOpenAlex, reqCrossref, reqSpringer]).then(results => {
            // Check if current search input still matches query
            const curInp = (document.getElementById('search-input') || {}).value || '';
            if (curInp.trim().toLowerCase() !== q.toLowerCase()) return;

            const scopusData = (results[0].status === 'fulfilled' && results[0].value) ? results[0].value : {};
            const semanticData = (results[1].status === 'fulfilled' && results[1].value) ? results[1].value : {};
            const lensData = (results[2].status === 'fulfilled' && results[2].value) ? results[2].value : {};
            const openalexData = (results[3].status === 'fulfilled' && results[3].value) ? results[3].value : {};
            const crossrefData = (results[4].status === 'fulfilled' && results[4].value) ? results[4].value : {};
            const springerData = (results[5].status === 'fulfilled' && results[5].value) ? results[5].value : {};

            const scopusTotal = scopusData.total || 0;
            const semanticTotal = semanticData.total || 0;
            const lensTotal = lensData.total || 0;
            const openalexTotal = openalexData.total || 0;
            const crossrefTotal = crossrefData.total || 0;
            const springerTotal = springerData.total || 0;

            const totalGlobal = scopusTotal + semanticTotal + lensTotal + openalexTotal + crossrefTotal + springerTotal;
            if (totalGlobal === 0) {
                if (localCount === 0) {
                    container.innerHTML = `
                        <div style="text-align:center; padding:1.5rem; color:var(--ink-3)">
                            <p>Tidak ditemukan artikel eksternal untuk kata kunci "<strong>${this.esc(q)}</strong>". Coba gunakan istilah pencarian yang lebih umum.</p>
                        </div>
                    `;
                } else {
                    container.style.display = 'none';
                }
                return;
            }

            // Check matching subscribed journals and ebooks for this query
            const matchedSubJournals = this.findMatchingSubscribedJournals(q);
            const matchedSubEBooks = this.findMatchingSubscribedEBooks(q);
            let matchedJournalsBannerHtml = '';
            if (matchedSubJournals && matchedSubJournals.length > 0) {
                const j = matchedSubJournals[0];
                const issns = [j.issn, j.eissn].filter(Boolean).join(' / ') || '-';
                matchedJournalsBannerHtml += `
                    <div class="fed-journal-highlight-card" style="margin-bottom:1rem; border-color:rgba(217, 119, 6, 0.4);">
                        <div class="fed-jrn-highlight-top">
                            <span class="fed-jrn-highlight-badge">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                Jurnal Langganan Resmi UMS Terkait
                            </span>
                            <span class="chip" style="background:rgba(217, 119, 6, 0.12); color:#b45309; font-weight:600;">Akses Sivitas UMS</span>
                        </div>
                        <h4 class="fed-jrn-highlight-title" style="font-size:0.98rem; margin:0.35rem 0;">${this.esc(j.title)}</h4>
                        <div class="fed-jrn-highlight-meta">
                            <span>Penerbit: <strong>${this.esc(j.publisher || 'Internasional')}</strong></span>
                            <span>•</span>
                            <span>ISSN: <code>${this.esc(issns)}</code></span>
                            ${j.subject ? `<span>•</span><span>Subjek: ${this.esc(j.subject)}</span>` : ''}
                        </div>
                        <div class="fed-jrn-highlight-actions" style="margin-top:0.6rem;">
                            <a href="${this.esc(j.url || '#')}" target="_blank" rel="noopener noreferrer" class="fed-btn-campus-access">
                                <span>Buka Laman Jurnal (Akses Kampus / SSO) ↗</span>
                            </a>
                        </div>
                    </div>
                `;
            }

            if (matchedSubEBooks && matchedSubEBooks.length > 0) {
                const b = matchedSubEBooks[0];
                matchedJournalsBannerHtml += `
                    <div class="fed-journal-highlight-card" style="margin-bottom:1rem; border-color:rgba(37, 99, 235, 0.45);">
                        <div class="fed-jrn-highlight-top">
                            <span class="fed-jrn-highlight-badge" style="background:#2563eb;">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                E-Book Langganan Resmi UMS Terkait
                            </span>
                            <span class="chip" style="background:rgba(37, 99, 235, 0.12); color:#2563eb; font-weight:600;">Akses Sivitas UMS</span>
                        </div>
                        <h4 class="fed-jrn-highlight-title" style="font-size:0.98rem; margin:0.35rem 0;">${this.esc(b.title)}</h4>
                        <div class="fed-jrn-highlight-meta">
                            <span>Penulis: <strong>${this.esc(b.author || 'Penulis')}</strong></span>
                            <span>•</span>
                            <span>Penerbit: <strong>${this.esc(b.publisher || 'Internasional')}</strong></span>
                            ${b.year ? `<span>•</span><span>Tahun: ${b.year}</span>` : ''}
                            ${b.isbn ? `<span>•</span><span>ISBN: <code>${this.esc(b.isbn)}</code></span>` : ''}
                        </div>
                        <div class="fed-jrn-highlight-actions" style="margin-top:0.6rem;">
                            <button type="button" class="btn btn-ghost" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="app.showEBookDetail(${this.idAttr(b.id)})">
                                <span>Detail & Sitasi</span>
                            </button>
                            <a href="${this.esc(b.url || '#')}" target="_blank" rel="noopener noreferrer" class="fed-btn-campus-access">
                                <span>Buka E-Book di Platform Resmi ↗</span>
                            </a>
                        </div>
                    </div>
                `;
            }

            // Combine top items from each source
            const featuredItems = [];
            if (scopusData.items) featuredItems.push(...scopusData.items.slice(0, 2).map(i => ({ ...i, badgeCls: 'badge-scopus', srcName: 'Scopus' })));
            if (semanticData.items) featuredItems.push(...semanticData.items.slice(0, 2).map(i => ({ ...i, badgeCls: 'badge-semanticscholar', srcName: 'Semantic Scholar' })));
            if (lensData.items) featuredItems.push(...lensData.items.slice(0, 1).map(i => ({ ...i, badgeCls: 'badge-lens', srcName: 'The Lens' })));
            if (openalexData.items) featuredItems.push(...openalexData.items.slice(0, 1).map(i => ({ ...i, badgeCls: 'badge-openalex', srcName: 'OpenAlex OA' })));
            if (crossrefData.items) featuredItems.push(...crossrefData.items.slice(0, 1).map(i => ({ ...i, badgeCls: 'badge-crossref', srcName: 'Crossref' })));
            if (springerData.items) featuredItems.push(...springerData.items.slice(0, 1).map(i => ({ ...i, badgeCls: 'badge-springer', srcName: 'Springer' })));

            let zeroBannerHtml = '';
            if (localCount === 0) {
                zeroBannerHtml = `
                    <div class="zero-local-alert">
                        <div>Koleksi lokal belum tersedia untuk kata kunci ini. Berikut <strong>${this.fmt(totalGlobal)}+ artikel ilmiah internasional</strong> yang kami temukan secara langsung:</div>
                    </div>
                `;
            }

            const pillsHtml = `
                <div class="fed-insights-pills">
                    ${semanticTotal > 0 ? `<button type="button" class="fed-insight-pill" onclick="app.selectFedSource('semanticscholar')" style="display:inline-flex; align-items:center; gap:0.35rem;">${this.getSourceLogoSvg('semanticscholar', 13)} <span>Semantic Scholar (${this.fmt(semanticTotal)} artikel)</span></button>` : ''}
                    ${lensTotal > 0 ? `<button type="button" class="fed-insight-pill" onclick="app.selectFedSource('lens')" style="display:inline-flex; align-items:center; gap:0.35rem;">${this.getSourceLogoSvg('lens', 13)} <span>The Lens (${this.fmt(lensTotal)} artikel)</span></button>` : ''}
                    ${scopusTotal > 0 ? `<button type="button" class="fed-insight-pill" onclick="app.selectFedSource('scopus')" style="display:inline-flex; align-items:center; gap:0.35rem;">${this.getSourceLogoSvg('scopus', 13)} <span>Scopus (${this.fmt(scopusTotal)} artikel)</span></button>` : ''}
                    ${openalexTotal > 0 ? `<button type="button" class="fed-insight-pill" onclick="app.selectFedSource('openalex')" style="display:inline-flex; align-items:center; gap:0.35rem;">${this.getSourceLogoSvg('openalex', 13)} <span>OpenAlex (${this.fmt(openalexTotal)} artikel)</span></button>` : ''}
                    ${crossrefTotal > 0 ? `<button type="button" class="fed-insight-pill" onclick="app.selectFedSource('crossref')" style="display:inline-flex; align-items:center; gap:0.35rem;">${this.getSourceLogoSvg('crossref', 13)} <span>Crossref (${this.fmt(crossrefTotal)} artikel)</span></button>` : ''}
                    ${springerTotal > 0 ? `<button type="button" class="fed-insight-pill" onclick="app.selectFedSource('springer')" style="display:inline-flex; align-items:center; gap:0.35rem;">${this.getSourceLogoSvg('springer', 13)} <span>Springer (${this.fmt(springerTotal)} artikel)</span></button>` : ''}
                    <button type="button" class="fed-insight-pill" style="border-color:var(--brand); color:var(--brand); font-weight:700; display:inline-flex; align-items:center; gap:0.35rem;" onclick="app.selectFedSource('all_global')">${this.getSourceLogoSvg('global', 13)} <span>Lihat Seluruh Hasil Global →</span></button>
                </div>
            `;

            const cardsHtml = featuredItems.slice(0, 4).map(it => {
                this.registerArticle(it);
                const rawId = String(it.id || it.doi || it.url);
                const authors = it.authors || it.author || it.publicationName || '';
                const yearStr = it.year ? `(${it.year})` : '';
                const journalStr = it.publicationName || it.journal || '';
                const validDoi = this.getCleanDoi(it.doi);
                const doiUrl = validDoi ? `https://doi.org/${validDoi}` : (it.url || '#');
                const doiBtnLabel = validDoi ? 'Buka DOI ↗' : 'Buka Dokumen ↗';
                const abstractStr = it.abstract ? it.abstract.substring(0, 220) + (it.abstract.length > 220 ? '...' : '') : '';
                const isSubscribed = Boolean(it.isSubscribed);
                const subUrl = it.subscribedUrl || '';

                return `
                    <div class="fed-insight-card${isSubscribed ? ' fed-insight-card-subscribed' : ''}">
                        <div class="fed-card-top">
                            <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap; margin-bottom:0.35rem;">
                                ${this.getSourceBadgeHtml(it.srcName)}
                                ${isSubscribed ? `<span class="fed-badge-subscribed" style="font-size:0.65rem; padding:1px 6px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Langganan UMS</span>` : ''}
                            </div>
                            <div class="fed-card-title">
                                <a href="#" onclick="app.showArticleDetail(${this.idAttr(rawId)}); return false;" class="fed-title-link" title="Klik untuk membuka modal detail artikel">${this.esc(it.title)}</a>
                            </div>
                            <div class="fed-card-meta">
                                ${authors ? `<span>${this.esc(authors.substring(0, 75))}${authors.length > 75 ? '...' : ''}</span>` : ''}
                                ${journalStr ? `<div><em>${this.esc(journalStr)}</em> ${yearStr}</div>` : ''}
                            </div>
                            ${abstractStr ? `<div class="fed-card-snippet">${this.esc(abstractStr)}</div>` : ''}
                        </div>
                        <div class="fed-card-footer">
                            <button type="button" class="btn btn-ghost" style="padding:2px 8px; font-size:.75rem; font-weight:600" onclick="app.showArticleDetail(${this.idAttr(rawId)})">📋 Detail & Sitasi</button>
                            ${isSubscribed && subUrl ? `<a href="${this.esc(subUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-subscribed-campus" style="padding:2px 8px; font-size:.72rem;">Akses Kampus UMS ↗</a>` : ''}
                            <a href="${doiUrl}" target="_blank" rel="noopener noreferrer" class="fed-card-doi-link">${doiBtnLabel}</a>
                            <button type="button" class="btn btn-ghost" style="padding:2px 8px; font-size:.72rem" onclick="app.shareArticleById(${this.idAttr(rawId)})">Share</button>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                ${zeroBannerHtml}
                ${matchedJournalsBannerHtml}
                <div class="fed-insights-header">
                    <div class="fed-insights-title-group">
                        <h3>Literatur Ilmiah Internasional Terkait "${this.esc(q)}"</h3>
                        <p>Ditemukan <strong>${this.fmt(totalGlobal)}+ artikel</strong> di database terindeks global:</p>
                    </div>
                </div>
                ${pillsHtml}
                <div class="fed-insights-grid">
                    ${cardsHtml}
                </div>
            `;
        });
    },
    // ──── Empty State SVG Illustrations ────
    getEmptyStateSvg(type) {
        if (type === 'search') {
            return `
            <svg class="empty-state-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="60" r="50" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" stroke-opacity="0.3"/>
                <path d="M35 75C35 68.3726 40.3726 63 47 63H73C79.6274 63 85 68.3726 85 75V78H35V75Z" fill="var(--bg-3)" stroke="currentColor" stroke-width="2"/>
                <rect x="38" y="42" width="44" height="26" rx="4" fill="var(--bg-2)" stroke="currentColor" stroke-width="2"/>
                <line x1="46" y1="50" x2="66" y2="50" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-opacity="0.6"/>
                <line x1="46" y1="56" x2="74" y2="56" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                <circle cx="68" cy="46" r="18" fill="var(--bg-1)" stroke="var(--brand)" stroke-width="2.5"/>
                <circle cx="68" cy="46" r="11" fill="none" stroke="var(--brand)" stroke-width="1.5" stroke-dasharray="2 2"/>
                <line x1="81" y1="59" x2="94" y2="72" stroke="var(--brand)" stroke-width="3.5" stroke-linecap="round"/>
                <circle cx="34" cy="40" r="2" fill="var(--brand)"/>
                <circle cx="88" cy="30" r="3" fill="var(--amber)"/>
                <circle cx="28" cy="66" r="2.5" fill="var(--teal)"/>
            </svg>`;
        } else if (type === 'filter') {
            return `
            <svg class="empty-state-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="60" r="50" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" stroke-opacity="0.3"/>
                <path d="M34 38H86L68 60V82L52 74V60L34 38Z" fill="var(--bg-2)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                <line x1="42" y1="46" x2="78" y2="46" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                <circle cx="78" cy="74" r="14" fill="var(--bg-1)" stroke="var(--rose)" stroke-width="2.5"/>
                <line x1="72" y1="68" x2="84" y2="80" stroke="var(--rose)" stroke-width="2.5" stroke-linecap="round"/>
                <line x1="84" y1="68" x2="72" y2="80" stroke="var(--rose)" stroke-width="2.5" stroke-linecap="round"/>
            </svg>`;
        } else if (type === 'bookmarks') {
            return `
            <svg class="empty-state-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="60" r="50" fill="currentColor" fill-opacity="0.06" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" stroke-opacity="0.3"/>
                <rect x="36" y="32" width="48" height="60" rx="6" fill="var(--bg-2)" stroke="currentColor" stroke-width="2"/>
                <path d="M52 32V62L62 54L72 62V32H52Z" fill="var(--amber)" fill-opacity="0.2" stroke="var(--amber)" stroke-width="2" stroke-linejoin="round"/>
                <polygon points="62,40 64,45 69,45 65,48 67,53 62,50 57,53 59,48 55,45 60,45" fill="var(--amber)"/>
                <line x1="44" y1="74" x2="76" y2="74" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4"/>
                <line x1="44" y1="80" x2="68" y2="80" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-opacity="0.3"/>
                <circle cx="90" cy="42" r="2.5" fill="var(--brand)"/>
                <circle cx="30" cy="54" r="2" fill="var(--purple)"/>
            </svg>`;
        }
        return '';
    },

    // ──── Skeleton Loading ────
    _skeletonCard() {
        return `<div class="sk-card">
            <div class="sk-line sk-title"></div>
            <div class="sk-line sk-title-2"></div>
            <div class="sk-line sk-author"></div>
            <div class="sk-chip-row">
                <div class="sk-line sk-chip"></div>
                <div class="sk-line sk-chip"></div>
                <div class="sk-line sk-chip"></div>
            </div>
        </div>`;
    },

    showSkeleton(count = 12) {
        const grid = document.getElementById('results-grid');
        if (!grid) return;
        grid.innerHTML = Array(count).fill(this._skeletonCard()).join('');
    },

    renderResults() {
        const grid = document.getElementById('results-grid');
        const moreWrap = document.getElementById('more-wrap');
        if (!grid) return;

        if (this.currentResults.length === 0) {
            if (moreWrap) moreWrap.style.display = 'none';
            if (this.baseResults && this.baseResults.length > 0) {
                // Filter returned 0 results
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1;">
                        <div class="empty-state">
                            <div class="empty-state-icon-wrap">
                                ${this.getEmptyStateSvg('filter')}
                            </div>
                            <div class="empty-state-title">Tidak Ada Hasil yang Cocok</div>
                            <div class="empty-state-desc">Kombinasi filter yang Anda pilih tidak menghasilkan koleksi apapun dari ${this.fmt(this.baseResults.length)} hasil awal.</div>
                            <div class="empty-state-actions">
                                <button type="button" class="btn btn-brand" onclick="app.clearFilters()">✕ Hapus Semua Filter</button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Search returned 0 results
                const curQuery = (document.getElementById('search-input') || {}).value || '';
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1;">
                        <div class="empty-state">
                            <div class="empty-state-icon-wrap">
                                ${this.getEmptyStateSvg('search')}
                            </div>
                            <div class="empty-state-title">Koleksi Belum Ditemukan</div>
                            <div class="empty-state-desc">Tidak ditemukan buku atau dokumen di katalog lokal perpustakaan untuk kata kunci <strong>"${this.esc(curQuery)}"</strong>.</div>
                            <div class="empty-state-actions">
                                <button type="button" class="btn btn-brand" onclick="app.selectFedSource('openalex')">Cari di Basis Data Internasional →</button>
                                <button type="button" class="btn btn-ghost" onclick="document.getElementById('search-input').focus(); document.getElementById('search-input').select();">Ubah Kata Kunci</button>
                            </div>
                            <div class="empty-state-tips">
                                <strong>Tips Pencarian:</strong>
                                <ul>
                                    <li>Periksa kembali ejaan kata kunci pencarian Anda.</li>
                                    <li>Gunakan kata yang lebih umum atau sinonim (misal: <em>"pemasaran"</em> daripada kalimat panjang).</li>
                                    <li>Cari dalam istilah bahasa Inggris untuk menjangkau artikel jurnal internasional.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
            }
            return;
        }

        const end = (this.resultsPage + 1) * this.perPage;
        const show = this.currentResults.slice(0, end);
        grid.innerHTML = show.map(b => this.bookCard(b)).join('');
        if (moreWrap) moreWrap.style.display = end < this.currentResults.length ? 'block' : 'none';
    },
    loadMore() { this.resultsPage++; this.renderResults(); },
    changeSort(val) {
        const sel = document.getElementById('sort-sel');
        const s = val || (sel ? sel.value : 'relevance');
        if (sel && val && sel.value !== val) {
            sel.value = val;
        }

        if (s === 'title') {
            this.currentResults.sort((a, b) => (a.t || '').localeCompare(b.t || ''));
        } else if (s === 'year-desc') {
            this.currentResults.sort((a, b) => {
                const yA = parseInt(a.yr, 10) || 0;
                const yB = parseInt(b.yr, 10) || 0;
                if (yB !== yA) return yB - yA;
                return (a.t || '').localeCompare(b.t || '');
            });
        } else if (s === 'year-asc') {
            this.currentResults.sort((a, b) => {
                const yA = parseInt(a.yr, 10) || 9999;
                const yB = parseInt(b.yr, 10) || 9999;
                if (yA !== yB) return yA - yB;
                return (a.t || '').localeCompare(b.t || '');
            });
        } else if (s === 'ddc') {
            this.currentResults.sort((a, b) => (a.ddc || '').localeCompare(b.ddc || ''));
        } else if (s === 'relevance') {
            if (this.baseResults && this.baseResults.length) {
                const hasScore = this.baseResults.some(b => typeof b._score === 'number');
                if (hasScore) {
                    this.currentResults.sort((a, b) => (b._score || 0) - (a._score || 0));
                } else {
                    const orderMap = new Map(this.baseResults.map((b, idx) => [b.id, idx]));
                    this.currentResults.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
                }
            }
        }
        this.resultsPage = 0;
        this.renderResults();
    },
    sortResults() {
        this.changeSort();
    },

    // ──── Facets / Filters ────
    renderFacets() {
        const accessCounts = { 'acc_ft': 0, 'acc_pr': 0, 'acc_oa': 0, 'acc_lib': 0 };
        const srcCounts = {}; const typeCounts = {}; const authorCounts = {}; const yearCounts = {};
        const subjectCounts = {}; const ddcClassCounts = {};
        const dNames = { '0': this.t('ddc_0'), '1': this.t('ddc_1'), '2': this.t('ddc_2'), '3': this.t('ddc_3'), '4': this.t('ddc_4'), '5': this.t('ddc_5'), '6': this.t('ddc_6'), '7': this.t('ddc_7'), '8': this.t('ddc_8'), '9': this.t('ddc_9') };

        for (const b of this.baseResults) {
            // -- Access logic --
            let isFt = false, isPr = false, isOa = false, isLib = false;
            if (b.src === 'Scopus') {
                if (b.openaccess) { isOa = true; isFt = true; }
                if (b.type === 'Article' || b.type === 'Review') isPr = true;
            } else {
                // Local repositories
                if (b.src && b.src.includes('Koha')) isLib = true;
                if ((b.src && b.src.includes('SIBI')) || (b.src && b.src.includes('EPrints')) || b.url) isFt = true;
                if (b.src && b.src.includes('EPrints') && b.type === 'jr') isPr = true;
            }
            if (isFt) accessCounts['acc_ft']++;
            if (isPr) accessCounts['acc_pr']++;
            if (isOa) accessCounts['acc_oa']++;
            if (isLib) accessCounts['acc_lib']++;

            if (b.src) srcCounts[b.src] = (srcCounts[b.src] || 0) + 1;
            if (b.type) typeCounts[b.type] = (typeCounts[b.type] || 0) + 1;
            if (b.a) authorCounts[b.a] = (authorCounts[b.a] || 0) + 1;
            if (b.yr) yearCounts[b.yr] = (yearCounts[b.yr] || 0) + 1;
            if (b.sub) {
                for (const s of b.sub) {
                    if (s && s.trim()) subjectCounts[s.trim()] = (subjectCounts[s.trim()] || 0) + 1;
                }
            }
            if (b.ddc && b.ddc.length >= 1) {
                const cls = b.ddc[0];
                const label = `${cls}00 ${dNames[cls] || ''}`;
                ddcClassCounts[label] = (ddcClassCounts[label] || 0) + 1;
            }
        }

        // Hapus filter access jika 0
        for (const k of Object.keys(accessCounts)) { if (accessCounts[k] === 0) delete accessCounts[k]; }

        let html = '';

        html += this.buildFacetGroup(this.t('src_institusi') || 'Institusi', 'src', srcCounts, false, 'institution');
        html += this.buildFacetGroup(this.t('format') || 'Format', 'type', typeCounts, false, 'format');
        html += this.buildFacetGroup(this.t('subjects') || 'Subjek', 'subject', subjectCounts, false, 'subject');
        html += this.buildFacetGroup(`DDC ${this.t('classification') || 'Klasifikasi'}`, 'ddcClass', ddcClassCounts, false, 'ddc');
        html += this.buildFacetGroup(this.t('year') || 'Tahun', 'year', yearCounts, true, 'year');
        html += this.buildFacetGroup(this.t('author') || 'Pengarang', 'author', authorCounts, false, 'author');

        document.getElementById('facet-container').innerHTML = html;
        const acCount = this.activeFilters.access.size + this.activeFilters.src.size + this.activeFilters.type.size + this.activeFilters.author.size + this.activeFilters.year.size + this.activeFilters.subject.size + this.activeFilters.ddcClass.size;
        document.getElementById('btn-clear-filters').style.display = acCount > 0 ? 'inline-flex' : 'none';
        const hasFacets = [srcCounts, typeCounts, authorCounts, yearCounts, subjectCounts, ddcClassCounts].some(c => Object.keys(c).length > 0);
        document.getElementById('results-sidebar').style.display = hasFacets ? 'block' : 'none';
    },
    _facetExpanded: {},
    toggleFacetExpand(category) {
        this._facetExpanded[category] = !this._facetExpanded[category];
        this.renderFacets();
    },
    buildFacetGroup(title, category, counts, sortByKey = false, icon = '') {
        let entries = Object.entries(counts);
        if (sortByKey) {
            entries.sort((a, b) => b[0] - a[0]); // Numeric descending for years
        } else {
            entries.sort((a, b) => b[1] - a[1]); // Value count descending
        }
        if (entries.length === 0) return '';
        const FACET_LIMIT = 5;
        const isExpanded = this._facetExpanded[category];
        const showEntries = isExpanded ? entries : entries.slice(0, FACET_LIMIT);
        const hasMore = entries.length > FACET_LIMIT;
        const icons = { institution: '', format: '', subject: '', ddc: '', year: '', author: '' };
        const iconEmoji = icons[icon] || '';
        let listHTML = '';
        for (const [val, cnt] of showEntries) {
            const isAc = this.activeFilters[category].has(val);
            const displayVal = category === 'type' ? this.typeName(val) : (category === 'access' ? this.t(val) || val : val);
            listHTML += `
            <div class="facet-item ${isAc ? 'active' : ''}" onclick="app.toggleFilter('${category}', ${this.idAttr(val)})"
                title="${this.esc(displayVal)}">
                <div class="facet-left">
                    <input type="checkbox" ${isAc ? 'checked' : ''} tabindex="-1">
                    <span>${this.esc(displayVal)}</span>
                </div>
                <span class="facet-count">${this.fmt(cnt)}</span>
            </div>`;
        }
        const moreBtn = hasMore ? `<div class="facet-more" onclick="app.toggleFacetExpand('${category}')">${isExpanded ? (this.lang === 'id' ? '▲ Lebih sedikit' : '▲ Show less') : (this.lang === 'id' ? `▼ ${entries.length - FACET_LIMIT} lainnya` : `▼ ${entries.length - FACET_LIMIT} more`)}</div>` : '';
        const activeCount = this.activeFilters[category].size;
        const badge = activeCount > 0 ? `<span class="facet-active-badge">${activeCount}</span>` : '';
        return `<div class="facet-group">
            <div class="facet-title">${iconEmoji ? `<span class="facet-icon">${iconEmoji}</span>` : ''}${title}${badge}</div>
            <div class="facet-list">${listHTML}${moreBtn}</div>
        </div>`;
    },
    toggleFilter(cat, val) {
        if (this.activeFilters[cat].has(val)) this.activeFilters[cat].delete(val);
        else this.activeFilters[cat].add(val);
        this.resultsPage = 0;
        this.applyFiltersAndRender();
        this.renderFacets(); // Re-render to update checkboxes
    },
    clearFilters() {
        this.activeFilters = { access: new Set(), src: new Set(), type: new Set(), author: new Set(), year: new Set(), subject: new Set(), ddcClass: new Set() };
        this.resultsPage = 0;
        this.applyFiltersAndRender();
        this.renderFacets();
    },
    applyFiltersAndRender() {
        const dNames = { '0': this.t('ddc_0'), '1': this.t('ddc_1'), '2': this.t('ddc_2'), '3': this.t('ddc_3'), '4': this.t('ddc_4'), '5': this.t('ddc_5'), '6': this.t('ddc_6'), '7': this.t('ddc_7'), '8': this.t('ddc_8'), '9': this.t('ddc_9') };
        this.currentResults = this.baseResults.filter(b => {
            // -- Access logic --
            let passAccess = true;
            if (this.activeFilters.access.size > 0) {
                let isFt = false, isPr = false, isOa = false, isLib = false;
                if (b.src === 'Scopus') {
                    if (b.openaccess) { isOa = true; isFt = true; }
                    if (b.type === 'Article' || b.type === 'Review') isPr = true;
                } else {
                    if (b.src && b.src.includes('Koha')) isLib = true;
                    if ((b.src && b.src.includes('SIBI')) || (b.src && b.src.includes('EPrints')) || b.url) isFt = true;
                    if (b.src && b.src.includes('EPrints') && b.type === 'jr') isPr = true;
                }

                // OR logic inside 'access' category: if it matches ANY selected access filter
                passAccess = false;
                if (this.activeFilters.access.has('acc_ft') && isFt) passAccess = true;
                if (this.activeFilters.access.has('acc_pr') && isPr) passAccess = true;
                if (this.activeFilters.access.has('acc_oa') && isOa) passAccess = true;
                if (this.activeFilters.access.has('acc_lib') && isLib) passAccess = true;
            }

            const passSrc = this.activeFilters.src.size === 0 || this.activeFilters.src.has(b.src);
            const passType = this.activeFilters.type.size === 0 || this.activeFilters.type.has(b.type);
            const passAuthor = this.activeFilters.author.size === 0 || this.activeFilters.author.has(b.a);
            const passYear = this.activeFilters.year.size === 0 || this.activeFilters.year.has(b.yr);
            const passSubject = this.activeFilters.subject.size === 0 || (b.sub && b.sub.some(s => this.activeFilters.subject.has(s.trim())));
            const passDdc = this.activeFilters.ddcClass.size === 0 || (b.ddc && b.ddc.length >= 1 && this.activeFilters.ddcClass.has(`${b.ddc[0]}00 ${dNames[b.ddc[0]] || ''}`));
            return passAccess && passSrc && passType && passAuthor && passYear && passSubject && passDdc;
        });

        const titleEl = document.getElementById('results-title');
        const queryText = titleEl.textContent.split(' — ')[0];
        titleEl.textContent = `${queryText} — ${this.fmt(this.currentResults.length)} ${this.t('results_found').toLowerCase()}`;

        const sel = document.getElementById('sort-sel');
        if (sel && sel.value && sel.value !== 'relevance') {
            this.changeSort(sel.value);
        } else {
            this.renderResults();
        }
    },

    // ──── Browse ────
    renderBrowse() {
        const content = document.getElementById('browse-content');
        const books = document.getElementById('browse-books');
        const crumbs = document.getElementById('crumbs');
        const lvl = this.ddcLevel;
        books.style.display = 'none'; content.style.display = 'grid';
        document.getElementById('browse-more').style.display = 'none';

        if (!lvl) {
            crumbs.innerHTML = `<span class="cur">${this.t('all_ddc')}</span>`;
            content.innerHTML = Object.entries(this.ddcTree).sort(([a], [b]) => a.localeCompare(b))
                .map(([cls, info]) => `
                <div class="browse-row" onclick="app.showBrowse('${cls}')">
                    <div class="browse-code" style="color:${this.COLORS[cls]}">${cls}00</div>
                    <div class="browse-info">
                        <div class="browse-label">${this.ddcLbl(info)}</div>
                        <div class="browse-cnt">${this.fmt(info.count)} ${this.t('results_found').toLowerCase()}</div>
                    </div>
                    <span class="browse-arrow">→</span>
                </div>`).join('');
        } else if (lvl.length === 1) {
            const cls = this.ddcTree[lvl]; if (!cls) return;
            crumbs.innerHTML = `<a href="#" onclick="app.showBrowse();return false">DDC</a><span class="sep">›</span>
                <span class="cur">${lvl}00 — ${this.ddcLbl(cls)}</span>`;
            content.innerHTML = Object.entries(cls.divisions).sort(([a], [b]) => a.localeCompare(b))
                .map(([code, div]) => `
                <div class="browse-row" onclick="app.showBrowse('${code}')">
                    <div class="browse-code" style="color:${this.COLORS[lvl]}">${code}</div>
                    <div class="browse-info">
                        <div class="browse-label">${div.label}</div>
                        <div class="browse-cnt">${this.fmt(div.count)} ${this.t('results_found').toLowerCase()} · ${Object.keys(div.sections).length} ${this.t('categories')}</div>
                    </div>
                    <span class="browse-arrow">→</span>
                </div>`).join('');
        } else if (lvl.length === 3 && lvl.endsWith('0') && lvl[1] !== lvl[2]) {
            const ck = lvl[0], cls = this.ddcTree[ck], div = cls?.divisions[lvl];
            if (!div) { this.browseBooks(lvl); return; }
            crumbs.innerHTML = `<a href="#" onclick="app.showBrowse();return false">DDC</a><span class="sep">›</span>
                <a href="#" onclick="app.showBrowse('${ck}');return false">${ck}00</a><span class="sep">›</span>
                <span class="cur">${lvl} — ${this.ddcLbl(div)}</span>`;
            const secs = Object.entries(div.sections).sort(([a], [b]) => a.localeCompare(b));
            if (secs.length) {
                content.innerHTML = secs.map(([code, sec]) => `
                <div class="browse-row" onclick="app.browseBooks('${code}')">
                    <div class="browse-code" style="color:${this.COLORS[ck]}">${code}</div>
                    <div class="browse-info">
                        <div class="browse-label">${sec.label}</div>
                        <div class="browse-cnt">${this.fmt(sec.count)} ${this.t('books_unit')}</div>
                    </div>
                    <span class="browse-arrow">→</span>
                </div>`).join('');
            } else this.browseBooks(lvl);
        } else this.browseBooks(lvl);
    },

    browseBooks(prefix) {
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
        content.style.display = 'none'; booksEl.style.display = 'grid';
        const show = this.ddcBooks.slice(0, this.perPage);
        booksEl.innerHTML = `<div style="grid-column:1/-1;color:var(--ink-2);font-size:.82rem;margin-bottom:.25rem">
            ${this.fmt(this.ddcBooks.length)} ${this.t('results_found').toLowerCase()}</div>` + show.map(b => this.bookCard(b)).join('');
        document.getElementById('browse-more').style.display = this.perPage < this.ddcBooks.length ? 'block' : 'none';
    },
    loadMoreDDC() {
        this.ddcPage++;
        const booksEl = document.getElementById('browse-books');
        const end = (this.ddcPage + 1) * this.perPage;
        const show = this.ddcBooks.slice(0, end);
        booksEl.innerHTML = `<div style="grid-column:1/-1;color:var(--ink-2);font-size:.82rem;margin-bottom:.25rem">
            ${this.fmt(this.ddcBooks.length)} ${this.t('results_found').toLowerCase()}</div>` + show.map(b => this.bookCard(b)).join('');
        document.getElementById('browse-more').style.display = end < this.ddcBooks.length ? 'block' : 'none';
    },

    // ──── Book Detail ────
    showBookDetail(id) {
        // Deep Linking Push State
        const urlParams = new URLSearchParams(window.location.search);
        let idStr = id.toString();
        if (urlParams.get('id') !== idStr) {
            window.history.pushState({ modal: 'open', id: id }, '', '?id=' + encodeURIComponent(id));
        }
        this._openModalInternal(id);
    },
    _openModalInternal(id) {
        try {
            let book = this.searchEngine.getById(id);
            if (!book && this.baseResults) {
                book = this.baseResults.find(b => b.id == id);
            }
            if (!book && this.currentResults) {
                book = this.currentResults.find(b => b.id == id);
            }
            if (!book) {
                console.error('Book not found for id:', id, 'baseResults count:', this.baseResults?.length, 'currentResults count:', this.currentResults?.length);
                // Fallback: open URL directly if we have it in the card
                const card = document.querySelector(`[data-bid="${CSS.escape(String(id))}"]`);
                if (card && card.dataset.url) {
                    window.open(card.dataset.url, '_blank');
                }
                return;
            }
            const recs = this.recommender.recommend(book);
            const ddcLabel = this.ddcLabel(book.ddc);
            const subs = (book.sub || []).map(s =>
                `<span class="chip chip-sub" onclick="app.closeBookDetail();app.searchSubject('${this.esc(s)}')">${this.esc(s)}</span>`
            ).join('');
            const recH = this.recHTML(recs);

            const isBookmarked = this.bookmarks.has(id);
            const bookmarkLbl = isBookmarked ? this.t('btn_bookmarked') : this.t('btn_bookmark');
            const bookmarkStyle = isBookmarked ? 'color:var(--brand);' : '';

            // Dynamic Cover Fetch via OpenLibrary atau URL gambar SIBI
            let coverHtml = '';
            if (book.img) {
                coverHtml = `<img src="${book.img}" onerror="this.style.display='none'" alt="Book Cover" style="float:right; max-width:120px; border-radius:6px; border:1px solid var(--border); box-shadow:0 4px 12px rgba(0,0,0,0.15); margin-left:1.5rem; margin-bottom:1rem; object-fit:cover;">`;
            } else if (book.isbn) {
                const cleanIsbn = book.isbn.split(' ')[0].replace(/[^0-9X]/gi, '');
                if (cleanIsbn) {
                    // Gunakan default=false agar me-return 404 jika tidak ketemu, lalu disembunyikan via onerror
                    coverHtml = `<img src="https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg?default=false" onerror="this.style.display='none'" alt="Book Cover" style="float:right; max-width:120px; border-radius:6px; border:1px solid var(--border); box-shadow:0 4px 12px rgba(0,0,0,0.15); margin-left:1.5rem; margin-bottom:1rem; object-fit:cover;">`;
                }
            }

            document.getElementById('modal-body').innerHTML = `
        <div class="detail">
            <div class="detail-head" style="min-height: 140px;">
                ${coverHtml}
                ${book.ddc ? `<div class="detail-ddc">DDC ${book.ddc}${ddcLabel ? ' — ' + ddcLabel : ''}</div>` : ''}
                <h2 class="detail-title">${this.esc(book.t)}</h2>
                ${book.a ? `<p class="detail-author">${this.esc(book.a)}</p>` : ''}
            </div>
            <div class="detail-grid">
                ${book.pub ? `<div><div class="d-label">${this.t('publisher')}</div><div class="d-val">${this.esc(book.pub)}</div></div>` : ''}
                ${book.yr ? `<div><div class="d-label">${this.t('year')}</div><div class="d-val">${book.yr}</div></div>` : ''}
                ${book.isbn ? `<div><div class="d-label">ISBN</div><div class="d-val">${this.esc(book.isbn)}</div></div>` : ''}
                ${book.type ? `<div><div class="d-label">${this.t('type_label')}</div><div class="d-val">${this.typeName(book.type)}</div></div>` : ''}
                ${book.ed ? `<div><div class="d-label">${this.t('edition')}</div><div class="d-val">${this.esc(book.ed)}</div></div>` : ''}
                ${book.phys ? `<div><div class="d-label">${this.t('physical')}</div><div class="d-val">${this.esc(book.phys)}</div></div>` : ''}
                ${book.src ? `<div><div class="d-label">${this.t('source')}</div><div class="d-val">${book.src}</div></div>` : ''}
                ${book.ddc ? `<div><div class="d-label">${this.t('classification')}</div><div class="d-val">DDC ${book.ddc}</div></div>` : ''}
            </div>
            ${subs ? `<div class="detail-subs">${subs}</div>` : ''}
            <div class="detail-actions">
                ${this.sourceLink(book) ? `<a href="${this.sourceLink(book)}" target="_blank" class="btn btn-brand">${this.t('view_at')} ${book.src || 'OPAC'}</a>` : ''}
                ${book.ddc ? `<button class="btn btn-ghost" onclick="app.closeBookDetail();app.browseBooks('${book.ddc.substring(0, 3)}')">DDC ${book.ddc.substring(0, 3)}</button>` : ''}
                <button class="btn btn-ghost" onclick="document.getElementById('action-panel-${book.id}').style.display = document.getElementById('action-panel-${book.id}').style.display === 'none' ? 'block' : 'none'; app.renderQR('${this.sourceLink(book) || window.location.href}', 'qr-${book.id}')">Cite & QR</button>
                <button id="btn-toggle-bookmark" class="btn btn-ghost" style="${bookmarkStyle}" onclick="app.toggleBookmark(${this.idAttr(book.id)})">${bookmarkLbl}</button>
                <button class="btn btn-ghost" onclick="app.shareBook(${this.idAttr(book.id)})">${this.t('btn_share')}</button>
            </div>
            
            <div id="action-panel-${book.id}" class="action-panel" style="display:none; margin-top:1rem; padding:1.25rem; background:var(--bg-2); border-radius:var(--r-md); border:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1.5rem; flex-wrap:wrap">
                    <div style="flex:1; min-width:260px">
                        <h3 style="font-size:1rem; margin-bottom:.85rem; font-weight:700">${this.t('auto_cite')}</h3>
                        ${this.renderCiteGroups(book)}
                        <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                            <button type="button" class="btn btn-ghost" onclick="app.downloadCitation(app.searchEngine.getById('${book.id}') || ${JSON.stringify(book).replace(/"/g, '&quot;')}, 'ris')" style="font-size:0.8rem; padding:0.35rem 0.8rem" title="Unduh file .RIS untuk Mendeley, Zotero, EndNote">
                                📥 Unduh .RIS (Mendeley/Zotero)
                            </button>
                            <button type="button" class="btn btn-ghost" onclick="app.downloadCitation(app.searchEngine.getById('${book.id}') || ${JSON.stringify(book).replace(/"/g, '&quot;')}, 'bib')" style="font-size:0.8rem; padding:0.35rem 0.8rem" title="Unduh file .BIB untuk LaTeX/Overleaf">
                                📥 Unduh .BIB (LaTeX)
                            </button>
                        </div>
                    </div>
                    ${this.sourceLink(book) ? `
                    <div style="text-align:center; flex-shrink:0">
                        <h3 style="font-size:1rem; margin-bottom:.85rem; font-weight:700">QR Source</h3>
                        <div id="qr-${book.id}" style="padding:10px; background:#fff; border-radius:8px; display:inline-block; border:1px solid var(--border)">
                            <!-- QR goes here -->
                        </div>
                    </div>` : ''}
                </div>
            </div>
            
            ${book.desc ? `
            <div class="detail-abstract-box">
                <div class="detail-abstract-header">
                    <span class="detail-abstract-title"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> ${this.t('description') || 'Abstrak / Ringkasan'}</span>
                    <button type="button" class="detail-abstract-copy" onclick="app.copyBookDesc(${this.idAttr(book.id)})">Salin Abstrak</button>
                </div>
                <div class="detail-abstract-body">${this.esc(book.desc)}</div>
            </div>` : ''}
            ${recH}
        </div>`;
            document.getElementById('modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } catch (err) {
            console.error('Modal render error:', err);
            // Fallback: open source URL
            const card = document.querySelector(`[data-bid="${CSS.escape(String(id))}"]`);
            if (card && card.dataset.url) {
                window.open(card.dataset.url, '_blank');
            }
        }
    },
    copyBookDesc(id) {
        let book = this.searchEngine.getById(id)
            || (this.baseResults && this.baseResults.find(b => b.id == id))
            || (this.currentResults && this.currentResults.find(b => b.id == id));
        if (!book || !book.desc) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(book.desc).then(() => {
                this.showAlert('Abstrak disalin ke clipboard!');
            }).catch(() => {
                this.showAlert('Gagal menyalin abstrak.');
            });
        } else {
            prompt('Salin abstrak:', book.desc);
        }
    },
    closeBookDetail() {
        if (new URLSearchParams(window.location.search).get('id')) {
            window.history.pushState({ modal: 'closed' }, '', window.location.pathname);
        }
        this._closeModalInternal();
    },
    _closeModalInternal() {
        document.getElementById('modal').style.display = 'none';
        document.body.style.overflow = '';
    },
    closeModal(e) { if (e.target === e.currentTarget) this.closeBookDetail(); },

    async shareBook(id) {
        let book = this.searchEngine.getById(id)
            || (this.baseResults && this.baseResults.find(b => b.id == id))
            || (this.currentResults && this.currentResults.find(b => b.id == id));

        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('id', id);
        const shareUrl = url.toString();
        const title = book ? `${book.t} — UMS OneSearch` : 'UMS Library OneSearch';
        const text = book ? `Koleksi: "${book.t}" ${book.a ? 'oleh ' + book.a : ''}` : 'Katalog UMS Library OneSearch';

        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: text,
                    url: shareUrl
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
            }
        }

        // Clipboard Fallback
        try {
            await navigator.clipboard.writeText(shareUrl);
            this.showAlert(this.t('copied_link'));
        } catch (e) {
            prompt('Salin tautan ini:', shareUrl);
        }
    },

    // Custom non-blocking modal/toast
    showAlert(msg) {
        let el = document.getElementById('bf-alert');
        if (!el) {
            el = document.createElement('div');
            el.id = 'bf-alert';
            el.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:var(--ink); color:var(--bg-0); padding:12px 24px; border-radius:30px; z-index:99999; font-weight:500; font-size:0.9rem; box-shadow:var(--shadow-lg); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity:0; pointer-events:none; margin-top:-10px; display:flex; align-items:center; gap:8px';
            document.body.appendChild(el);
        }
        el.innerHTML = `<span>Check</span> ${msg}`;

        // Force reflow
        void el.offsetWidth;

        el.style.opacity = '1';
        el.style.marginTop = '0px';

        clearTimeout(this._alertTimer);
        this._alertTimer = setTimeout(() => {
            el.style.opacity = '0';
            el.style.marginTop = '-10px';
        }, 3000);
    },

    searchSubject(s) {
        document.getElementById('search-input').value = s;
        this.showPage('home'); this.doSearch(s);
    },
    browseFormat(f) {
        this.showPage('home');
        document.getElementById('search-input').value = '';
        document.getElementById('search-clear').style.display = 'none';
        this.baseResults = this.books.filter(b => b.type === f);
        this.baseResults.sort((a, b) => (a.t || '').localeCompare(b.t || ''));
        this.activeFilters = { access: new Set(), src: new Set(), type: new Set(), author: new Set(), year: new Set(), subject: new Set(), ddcClass: new Set() };
        this.resultsPage = 0;
        document.getElementById('results-title').textContent = `${this.t('format')}: ${this.typeName(f)} — ${this.fmt(this.baseResults.length)} ${this.t('results_found').toLowerCase()}`;
        this.renderFacets();
        this.applyFiltersAndRender();
        document.getElementById('results-wrap').style.display = 'block';
        document.getElementById('results-wrap').scrollIntoView({ behavior: 'smooth' });
    },

    // ──── Search Options ────
    showSearchHistory() {
        let listHTML = this.searchHistory.length
            ? this.searchHistory.map(h => `
                <div class="hist-item" onclick="app.closeBookDetail(); document.getElementById('search-input').value='${this.esc(h)}'; app.doSearch('${this.esc(h)}')">
                    <span>History ${this.esc(h)}</span>
                </div>`).join('')
            : `<div style="color:var(--ink-3);font-size:.9rem">${this.t('no_history')}</div>`;

        document.getElementById('modal-body').innerHTML = `
        <div class="detail">
            <div class="detail-head" style="display:flex;justify-content:space-between;align-items:center;border-bottom:none">
                <h2 class="detail-title">${this.t('search_history_title')}</h2>
                ${this.searchHistory.length ? `<button class="btn-clear-filters" onclick="app.clearSearchHistory()">${this.t('clear_all')}</button>` : ''}
            </div>
            <div class="hist-list">${listHTML}</div>
        </div>`;
        document.getElementById('modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },
    clearSearchHistory() {
        this.searchHistory = [];
        localStorage.removeItem('bf-search-history');
        this.showSearchHistory();
    },

    showAdvancedSearch() {
        document.getElementById('modal-body').innerHTML = `
        <div class="detail">
            <h2 class="detail-title" style="margin-bottom:1rem">${this.t('adv_search')}</h2>
            <p style="font-size:.85rem;color:var(--ink-2);margin-bottom:1.5rem">${this.t('adv_intro')}</p>
            
            <form id="adv-search-form" onsubmit="event.preventDefault(); app.doAdvancedSearch()">
                <div class="adv-grid">
                    <div class="adv-group">
                        <label>${this.t('adv_book_title')}</label>
                        <input type="text" id="adv-title" placeholder="${this.t('adv_title_ph')}">
                    </div>
                    <div class="adv-group">
                        <label>${this.t('author')}</label>
                        <input type="text" id="adv-author" placeholder="${this.t('adv_author_ph')}">
                    </div>
                    <div class="adv-group">
                        <label>${this.t('adv_pub_label')}</label>
                        <input type="text" id="adv-pub" placeholder="${this.t('adv_pub_ph')}">
                    </div>
                    <div class="adv-group">
                        <label>${this.t('adv_year_label')}</label>
                        <input type="number" id="adv-year" placeholder="${this.t('adv_year_ph')}">
                    </div>
                    <div class="adv-group" style="grid-column:1/-1">
                        <label>${this.t('topic')}</label>
                        <input type="text" id="adv-sub" placeholder="${this.t('adv_topic_ph')}">
                    </div>
                </div>
                <div style="margin-top:2rem;display:flex;justify-content:flex-end;gap:1rem">
                    <button type="button" class="btn btn-ghost" onclick="app.closeBookDetail()">${this.t('adv_cancel')}</button>
                    <button type="submit" class="btn btn-brand">${this.t('btn_search')}</button>
                </div>
            </form>
        </div>`;
        document.getElementById('modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },
    doAdvancedSearch() {
        const p = {
            title: document.getElementById('adv-title').value.trim().toLowerCase(),
            author: document.getElementById('adv-author').value.trim().toLowerCase(),
            pub: document.getElementById('adv-pub').value.trim().toLowerCase(),
            year: document.getElementById('adv-year').value.trim(),
            sub: document.getElementById('adv-sub').value.trim().toLowerCase()
        };

        let valid = false;
        for (let k in p) if (p[k]) valid = true;
        if (!valid) return;

        this.closeBookDetail();

        let res = this.books;
        if (p.title) res = res.filter(b => b.t && b.t.toLowerCase().includes(p.title));
        if (p.author) res = res.filter(b => b.a && b.a.toLowerCase().includes(p.author));
        if (p.pub) res = res.filter(b => b.pub && b.pub.toLowerCase().includes(p.pub));
        if (p.year) res = res.filter(b => b.yr == p.year);
        if (p.sub) res = res.filter(b => b.sub && b.sub.some(s => s.toLowerCase().includes(p.sub)));

        this.showPage('home');
        document.getElementById('search-input').value = this.t('adv_search');
        document.getElementById('search-clear').style.display = 'block';

        this.baseResults = res;
        this.baseResults.sort((a, b) => (a.t || '').localeCompare(b.t || ''));
        this.activeFilters = { access: new Set(), src: new Set(), type: new Set(), author: new Set(), year: new Set(), subject: new Set(), ddcClass: new Set() };
        this.resultsPage = 0;
        document.getElementById('results-title').textContent = `${this.t('adv_search')} — ${this.fmt(this.baseResults.length)} ${this.t('results_found').toLowerCase()}`;

        this.renderFacets();
        this.applyFiltersAndRender();
        document.getElementById('results-wrap').style.display = 'block';
        document.getElementById('results-wrap').scrollIntoView({ behavior: 'smooth' });
    },

    // ──── Recommendations ────
    recHTML(recs) {
        const { similar, sameAuthor, relatedTopics } = recs;
        if (!similar.length && !sameAuthor.length && !relatedTopics.length) return '';
        let tabs = '', panels = '';
        if (similar.length) {
            tabs += `<button class="rec-tab active" onclick="app.recTab(event,'rec-sim')">${this.t('similar')}</button>`;
            panels += `<div class="rec-panel" id="rec-sim">${this.recList(similar)}</div>`;
        }
        if (sameAuthor.length) {
            tabs += `<button class="rec-tab${!similar.length ? ' active' : ''}" onclick="app.recTab(event,'rec-auth')">${this.t('same_author')}</button>`;
            panels += `<div class="rec-panel" id="rec-auth" style="${similar.length ? 'display:none' : ''}">${this.recList(sameAuthor)}</div>`;
        }
        if (relatedTopics.length) {
            tabs += `<button class="rec-tab${!similar.length && !sameAuthor.length ? ' active' : ''}" onclick="app.recTab(event,'rec-rel')">${this.t('related_topics')}</button>`;
            panels += `<div class="rec-panel" id="rec-rel" style="${similar.length || sameAuthor.length ? 'display:none' : ''}">${this.recList(relatedTopics)}</div>`;
        }
        return `<div class="recs"><h3>Recommendation</h3><div class="rec-tabs">${tabs}</div>${panels}</div>`;
    },
    recList(items) {
        return `<div class="rec-list">${items.map(i => `
            <div class="rec-row" onclick="app.showBookDetail(${this.idAttr(i.book.id)})">
                <span class="chip chip-ddc">${i.book.ddc || '?'}</span>
                <span class="rec-row-title">${this.esc(i.book.t)}</span>
                <span class="rec-row-meta">${i.reason || ''}</span>
            </div>`).join('')}</div>`;
    },
    recTab(e, id) {
        e.target.closest('.rec-tabs').querySelectorAll('.rec-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        e.target.closest('.recs').querySelectorAll('.rec-panel').forEach(p => p.style.display = 'none');
        document.getElementById(id).style.display = 'block';
    },

    // ──── Stats ────
    renderStats() {
        const cards = document.getElementById('stats-cards');
        const charts = document.getElementById('stats-charts');

        cards.innerHTML = [
            [this.fmt(this.stats.total_books), this.t('total_books')],
            [this.fmt(this.stats.with_ddc), this.t('with_ddc')],
            [this.fmt(this.stats.unique_subjects), this.t('subjects')],
            [typeof this.stats.sources === 'object' && !Array.isArray(this.stats.sources) ? Object.keys(this.stats.sources).length : (this.stats.sources?.length || 1), this.t('libraries')],
            [this.stats.year_range?.min || '-', this.t('oldest')],
            [this.stats.year_range?.max || '-', this.t('newest_stat')],
        ].map(([v, l]) => `<div class="st-card"><div class="st-num">${v}</div><div class="st-lbl">${l}</div></div>`).join('');

        const dd = this.stats.ddc_distribution || {};
        const td = this.stats.type_distribution || {};
        const maxD = Math.max(...Object.values(dd));
        const maxT = Math.max(...Object.values(td));
        const dNames = { '0': this.t('ddc_0'), '1': this.t('ddc_1'), '2': this.t('ddc_2'), '3': this.t('ddc_3'), '4': this.t('ddc_4'), '5': this.t('ddc_5'), '6': this.t('ddc_6'), '7': this.t('ddc_7'), '8': this.t('ddc_8'), '9': this.t('ddc_9') };

        charts.innerHTML = `
        <div class="chart-box"><h3>${this.t('ddc_distribution')}</h3>
            ${Object.entries(dd).sort(([a], [b]) => a.localeCompare(b)).map(([c, n]) => {
            const p = Math.round((n / maxD) * 100);
            return `<div class="bar-row"><span class="bar-label">${c}00 ${dNames[c] || ''}</span>
                    <div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${this.COLORS[c]}"></div></div>
                    <span class="bar-val">${this.fmt(n)}</span></div>`;
        }).join('')}
        </div>
        <div class="chart-box"><h3>${this.t('type_distribution')}</h3>
            ${Object.entries(td).sort(([, a], [, b]) => b - a).slice(0, 10).map(([t, n]) => {
            const p = Math.round((n / maxT) * 100);
            return `<div class="bar-row"><span class="bar-label">${this.typeName(t)}</span>
                    <div class="bar-track"><div class="bar-fill" style="width:${p}%;background:var(--brand)"></div></div>
                    <span class="bar-val">${this.fmt(n)}</span></div>`;
        }).join('')}
        </div>`;
    },

    // ──── Per Prodi ────
    FAK_COLORS: {
        'FAI': '#2dd4a0',  // hijau
        'FEB': '#4e8cff',  // biru
        'FF': '#a78bfa',  // ungu
        'FG': '#34d399',  // emerald
        'FHIP': '#fb7185',  // merah
        'FIK': '#f59e0b',  // amber
        'FK': '#ef4444',  // red
        'FKG': '#f472b6',  // pink
        'FKI': '#38bdf8',  // cyan
        'FKIP': '#fbbf24',  // yellow
    },

    showProdi() {
        this.showPage('prodi');
        this.activeFakultas = null;
        this.renderProdi();
    },

    renderProdi() {
        const fakFilter = document.getElementById('prodi-fak-filter');
        const grid = document.getElementById('prodi-grid');
        const booksPanel = document.getElementById('prodi-books-panel');
        if (!grid) return;
        booksPanel.style.display = 'none';
        grid.style.display = 'grid';
        fakFilter.style.display = 'flex';

        // Kumpulkan daftar fakultas unik
        const fakSet = new Set();
        for (const info of Object.values(this.prodiIndex)) {
            if (info.fakultas) fakSet.add(info.fakultas);
        }
        const fakList = ['ALL', ...Array.from(fakSet).sort()];

        // Render filter pills
        fakFilter.innerHTML = fakList.map(fak => {
            const isActive = (fak === 'ALL' && !this.activeFakultas) || this.activeFakultas === fak;
            const label = fak === 'ALL' ? this.t('prodi_all_fak') : fak;
            return `<span class="prodi-fak-chip${isActive ? ' active' : ''}" onclick="app.filterProdi('${fak}')">${label}</span>`;
        }).join('');

        // Filter prodi by fakultas
        let entries = Object.entries(this.prodiIndex);
        if (this.activeFakultas) {
            entries = entries.filter(([, v]) => v.fakultas === this.activeFakultas);
        }
        // Sort by count desc
        entries.sort(([, a], [, b]) => b.count - a.count);

        grid.innerHTML = entries.map(([kode, info]) => {
            const c = this.FAK_COLORS[info.fakultas] || '#818cf8';
            const pctMax = Math.max(...Object.values(this.prodiIndex).map(v => v.count)) || 1;
            const pct = Math.round((info.count / pctMax) * 100);
            return `
            <div class="prodi-card" style="--prodi-color:${c}" onclick="app.showProdiBooks('${kode}')">
                <div class="prodi-fak-badge" style="background:${c}18;color:${c}">${info.fakultas}</div>
                <div class="prodi-name">${this.esc(info.label_short || info.label)}</div>
                <div class="prodi-count">${this.fmt(info.count)} ${this.t('prodi_books_count')}</div>
                <div class="prodi-bar"><div class="prodi-bar-fill" style="width:${pct}%;background:${c}"></div></div>
            </div>`;
        }).join('');
    },

    filterProdi(fak) {
        this.activeFakultas = (fak === 'ALL') ? null : fak;
        this.renderProdi();
    },

    showProdiBooks(kode) {
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
        booksPanel.style.display = 'block';

        this._renderProdiBooks();
    },

    _renderProdiBooks() {
        const booksGrid = document.getElementById('prodi-books-grid');
        const moreBtn = document.getElementById('prodi-books-more');
        const end = (this.prodiPage + 1) * this.perPage;
        const show = this.prodiBooks.slice(0, end);

        if (show.length === 0) {
            booksGrid.innerHTML = `
                <div style="grid-column:1/-1;">
                    <div class="empty-state">
                        <div class="empty-state-icon-wrap">
                            ${this.getEmptyStateSvg('search')}
                        </div>
                        <div class="empty-state-title">Belum Ada Koleksi untuk Prodi Ini</div>
                        <div class="empty-state-desc">Koleksi buku atau tugas akhir untuk program studi ini belum tersedia di basis data.</div>
                        <div class="empty-state-actions">
                            <button type="button" class="btn btn-brand" onclick="app.closeProdiBooks()">Pilih Program Studi Lain</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            booksGrid.innerHTML = `<div style="grid-column:1/-1;color:var(--ink-2);font-size:.82rem;margin-bottom:.25rem">
                ${this.fmt(this.prodiBooks.length)} ${this.t('prodi_books_count')}</div>` +
                show.map(b => this.bookCard(b)).join('');
        }
        moreBtn.style.display = end < this.prodiBooks.length ? 'block' : 'none';
        window.scrollTo(0, 0);
    },

    loadMoreProdiBooks() {
        this.prodiPage++;
        this._renderProdiBooks();
    },

    closeProdiBooks() {
        document.getElementById('prodi-books-panel').style.display = 'none';
        document.getElementById('prodi-grid').style.display = 'grid';
        document.getElementById('prodi-fak-filter').style.display = 'flex';
        window.scrollTo(0, 0);
    },

    // ──── Book Card ────
    bookCard(b) {
        const c = this.COLORS[b.ddc?.[0]] || '#ff6b35';
        const isBm = this.bookmarks && this.bookmarks.has(b.id);
        const safeId = String(b.id).replace(/"/g, '&quot;');
        const safeUrl = (b.url || '').replace(/"/g, '&quot;');
        const q = this._currentSearchQuery || '';
        const titleHl = this.hl(b.t, q);
        const authorHl = b.a ? this.hl(b.a, q) : '';
        return `<div class="bk-card" style="--shelf-color:${c}" data-bid="${safeId}" data-url="${safeUrl}" onclick="app._cardClick(this)">
            <button id="bm-star-${safeId}" class="bk-star ${isBm ? 'active' : ''}" onclick="event.stopPropagation();app._bookmarkFromCard(this)" data-bid="${safeId}" title="${isBm ? this.t('btn_bookmarked') : this.t('btn_bookmark')}" style="color:${isBm ? 'var(--brand)' : 'var(--ink-3)'}">${this.starSvg(isBm)}</button>
            ${b.img ? `<div class="bk-cover" style="background-image:url('${b.img}')"></div>` : ''}
            <div class="bk-title">${titleHl}</div>
            ${authorHl ? `<div class="bk-author">${authorHl}</div>` : ''}
            <div class="bk-meta">
                ${b.ddc ? `<span class="chip chip-ddc" style="background:${c}14;color:${c}">DDC ${b.ddc}</span>` : ''}
                ${b.yr ? `<span class="chip chip-year">${b.yr}</span>` : ''}
                ${b.type ? `<span class="chip chip-type">${this.typeName(b.type)}</span>` : ''}
                ${b.src ? `<span class="chip chip-sub">${b.src}</span>` : ''}
            </div>
        </div>`;
    },
    _cardClick(el) {
        const id = el.dataset.bid;
        // Try numeric coercion first (for Koha integer IDs)
        const numId = Number(id);
        const finalId = isNaN(numId) || String(numId) !== id ? id : numId;

        // Try modal first — data should be in baseResults after search
        const book = this.searchEngine.getById(finalId)
            || (this.baseResults && this.baseResults.find(b => b.id == finalId))
            || (this.currentResults && this.currentResults.find(b => b.id == finalId));

        if (book) {
            this.showBookDetail(finalId);
        } else {
            // Fallback: if Scopus data not in memory (e.g. deep link), open URL directly
            const url = el.dataset.url;
            if (url) { window.open(url, '_blank'); }
        }
    },
    _bookmarkFromCard(el) {
        const id = el.dataset.bid;
        const numId = Number(id);
        this.toggleBookmark(isNaN(numId) || String(numId) !== id ? id : numId);
    },
    // Generate safe ID for onclick (always encode as data attribute index instead of raw string)
    idAttr(id) {
        if (typeof id === 'string') {
            // Escape single quotes and backslashes to prevent JS injection in onclick
            return `'${id.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
        }
        return id;
    },

    // ──── Helpers ────
    fmt(n) { return new Intl.NumberFormat('id-ID').format(n); },
    esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; },
    hl(text, q) {
        if (!text) return '';
        const escapedText = this.esc(text);
        const queryTerm = (q || this._currentSearchQuery || '').trim();
        if (!queryTerm) return escapedText;

        // Extract exact phrases from quotes
        const exactPhrases = [];
        const phraseRegex = /"([^"]+)"|'([^']+)'/g;
        let pMatch;
        while ((pMatch = phraseRegex.exec(queryTerm)) !== null) {
            const p = (pMatch[1] || pMatch[2] || '').trim();
            if (p.length >= 2) exactPhrases.push(p);
        }

        const remainingQuery = queryTerm.replace(/"[^"]+"|'[^']+'/g, ' ').replace(/\b(AND|OR|NOT)\b/gi, ' ').trim();
        const words = remainingQuery.split(/\s+/).filter(t => t.length > 1);

        const allTerms = [...exactPhrases, ...words].map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        if (allTerms.length === 0) return escapedText;

        // Sort terms by length descending so longer phrases match first
        allTerms.sort((a, b) => b.length - a.length);
        const pattern = `(${allTerms.join('|')})`;
        const regex = new RegExp(pattern, 'gi');
        return escapedText.replace(regex, '<mark class="kw-highlight">$1</mark>');
    },

    async fetchAndRenderSmartTopics(query) {
        const wrap = document.getElementById('smart-topics-wrap');
        if (!wrap) return;
        if (!query || query.trim().length < 2) {
            wrap.style.display = 'none';
            wrap.innerHTML = '';
            return;
        }

        try {
            const resp = await fetch(`/api/topics?q=${encodeURIComponent(query.trim())}`);
            if (!resp.ok) {
                wrap.style.display = 'none';
                return;
            }
            const data = await resp.json();
            const topics = data.topics || [];
            if (topics.length === 0) {
                wrap.style.display = 'none';
                wrap.innerHTML = '';
                return;
            }

            wrap.style.display = 'flex';
            wrap.innerHTML = `
                <div class="smart-topics-bar">
                    <span class="smart-topics-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        Topik Terkait:
                    </span>
                    <div class="smart-topics-list">
                        ${topics.map(t => `
                            <button type="button" class="smart-topic-chip" onclick="app.searchTopic(${this.idAttr(t.name)})" title="${t.worksCount ? `${this.fmt(t.worksCount)} publikasi global` : ''}">
                                <span>${this.esc(t.name)}</span>
                                ${t.worksCount ? `<small>${this.fmt(t.worksCount)}</small>` : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (e) {
            wrap.style.display = 'none';
        }
    },
    searchTopic(name) {
        if (!name) return;
        const inp = document.getElementById('search-input');
        if (inp) inp.value = name;
        this.doSearch(name);
    },
    ddcLabel(ddc) {
        if (!ddc) return '';
        const t = this.ddcTree[ddc[0]]; if (!t) return '';
        if (ddc.length >= 3) {
            const dc = ddc.substring(0, 2) + '0', div = t.divisions[dc];
            if (div) { const sec = div.sections[ddc.substring(0, 3)]; return sec ? sec.label : div.label; }
        }
        return t.label;
    },
    typeName(c) {
        const key = 'type_' + c;
        const translated = this.t(key);
        return translated !== key ? translated : c;
    },
    ddcLbl(node) {
        if (!node) return '';
        return (this.lang === 'en' && node.label_en) ? node.label_en : node.label;
    },

    // ──── Kutipan & QR ────
    cleanAuth(a) { return a ? a.replace(/[0-9\-., ]+$/, '').trim() : this.t('anon'); },
    getCitations(item) {
        if (!item) return { apa: '', mla: '', chicago: '' };
        const a = this.cleanAuth(item.a || item.authors);
        const t = item.t || item.title || 'Untitled';
        const y = item.yr || item.year || '';
        const p = item.pub || item.publicationName || '';
        const doi = this.getCleanDoi ? this.getCleanDoi(item.doi) : '';
        const url = item.url || (doi ? `https://doi.org/${doi}` : '');
        const pubClean = p && p !== '-' ? p : '';
        return {
            apa: `${a}. (${y || this.t('no_year')}). ${t}. ${pubClean ? pubClean + '.' : (this.t('unknown_pub') ? this.t('unknown_pub') + '.' : '')} ${doi ? 'https://doi.org/' + doi : url}`.trim(),
            mla: `${a}. "${t}." ${pubClean ? pubClean + ', ' : ''}${y ? y + '.' : ''} ${url}`.trim(),
            chicago: `${a}. "${t}." ${pubClean || 'Pub.'} (${y || this.t('no_year')}). ${url}`.trim()
        };
    },
    renderCiteGroups(item) {
        const c = this.getCitations(item);
        return `
            <div class="cite-group"><div class="cite-label">APA 7th</div><div class="cite-text">${this.esc(c.apa)}</div></div>
            <div class="cite-group"><div class="cite-label">MLA 9th</div><div class="cite-text">${this.esc(c.mla)}</div></div>
            <div class="cite-group"><div class="cite-label">Chicago</div><div class="cite-text">${this.esc(c.chicago)}</div></div>
        `;
    },
    citeAPA(b) { return this.getCitations(b).apa; },
    citeMLA(b) { return this.getCitations(b).mla; },
    citeChicago(b) { return this.getCitations(b).chicago; },
    renderQR(url, elId) {
        if (!url) return;
        const el = document.getElementById(elId);
        if (el && !el.querySelector('img')) {
            el.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(url)}" width="140" height="140" alt="QR Code">`;
        }
    },
};

document.addEventListener('DOMContentLoaded', () => app.init());
