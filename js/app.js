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
            hero_subtitle: "Temukan koleksi literatur akademik terlengkap dari berbagai perpustakaan dan arsip publik dengan mudah.",
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
            footer_tagline: "UMS Library OneSearch — Pencarian Terintegrasi",
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
            cite_qr: "Kutip & 📱 QR URL",
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
            scopus_live_prompt: "Pencarian Scopus terhubung secara live (waktu nyata). Silakan ketik kata kunci Anda di kotak pencarian.",
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
            hero_title1: "UMS Library",
            hero_title2: "OneSearch",
            hero_subtitle: "Discover the most comprehensive academic literature collections from various libraries and public archives effortlessly.",
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
            footer_tagline: "UMS Library OneSearch — Integrated Search",
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

    theme: 'dark',

    initTheme() {
        const saved = localStorage.getItem('bf-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        this.setTheme(saved);
    },

    toggleTheme() {
        this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    },

    setTheme(t) {
        this.theme = t;
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('bf-theme', t);
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.setAttribute('aria-label', t === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
            btn.title = t === 'dark' ? 'Mode Terang' : 'Mode Gelap';
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

    OPAC: 'https://search-lib.ums.ac.id/cgi-bin/koha/opac-detail.pl?biblionumber=',

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

    // ──── Init ────
    async init() {
        const bar = document.getElementById('ld-bar');
        const txt = document.getElementById('ld-text');
        try {
            txt.textContent = this.t('loading_books');
            bar.style.width = '20%';
            const t = new Date().getTime();

            // Memuat lokal dan SIBI secara bersamaan (concurrent)
            const [localBooks, sibiBooks] = await Promise.all([
                fetch('data/books.json?t=' + t).then(r => r.json()),
                this.fetchSibiBooks()
            ]);

            this.books = localBooks.concat(sibiBooks);
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

            setTimeout(() => {
                document.getElementById('ld-screen').classList.add('hidden');

                // Deep Linking: Auto-search query parameters 
                const queryParams = new URLSearchParams(window.location.search);
                const queryId = queryParams.get('id');
                const querySearch = queryParams.get('q');
                const queryField = queryParams.get('field');

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
        inp.addEventListener('input', e => {
            clearTimeout(this.debounce);
            const q = e.target.value.trim();
            document.getElementById('search-clear').style.display = q ? 'block' : 'none';
            this.debounce = setTimeout(() => q.length >= 2 ? this.showSuggest(q) : this.hideSuggest(), 200);
        });
        inp.addEventListener('keydown', e => {
            if (e.key === 'Enter') { this.hideSuggest(); this.doSearch(inp.value.trim()); }
            if (e.key === 'Escape') this.hideSuggest();
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeBookDetail(); });

        window.addEventListener('popstate', e => {
            if (e.state && e.state.modal === 'open' && e.state.id) {
                this._openModalInternal(e.state.id);
            } else {
                this._closeModalInternal();
            }
        });
    },

    // ──── Theme ────
    initTheme() {
        const saved = localStorage.getItem('bf-theme');
        if (saved) document.documentElement.setAttribute('data-theme', saved);
    },
    toggleTheme() {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('bf-theme', next);
    },

    // ──── Navigation ────
    showPage(p) {
        document.querySelectorAll('.page').forEach(el => el.classList.remove('on'));
        document.getElementById('page-' + p).classList.add('on');
        document.querySelectorAll('.nav-mid a').forEach(a => a.classList.remove('on'));
        const link = document.querySelector(`.nav-mid a[data-page="${p}"]`);
        if (link) link.classList.add('on');
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
        const ddcArea = document.getElementById('browse-ddc-area');
        const prodiArea = document.getElementById('browse-prodi-area');
        const tabDdc = document.getElementById('bmt-ddc');
        const tabProdi = document.getElementById('bmt-prodi');
        const isDdc = this.browseMode !== 'prodi';
        if (ddcArea) ddcArea.style.display = isDdc ? 'block' : 'none';
        if (prodiArea) prodiArea.style.display = isDdc ? 'none' : 'block';
        if (tabDdc) tabDdc.classList.toggle('active', isDdc);
        if (tabProdi) tabProdi.classList.toggle('active', !isDdc);
    },
    showBookmarks() {
        this.showPage('bookmarks');
        this.renderBookmarks();
    },
    showStats() { this.showPage('stats'); this.renderStats(); },
    toggleMobileMenu() { document.getElementById('mob-menu').classList.toggle('open'); },

    // ──── Bookmarks Logic ────
    _bmSort: 'az', // current sort mode for bookmarks page

    toggleBookmark(id) {
        if (this.bookmarks.has(id)) {
            this.bookmarks.delete(id);
        } else {
            this.bookmarks.add(id);
        }
        localStorage.setItem('bf-bookmarks', JSON.stringify([...this.bookmarks]));

        // Update button in currently open modal if any
        const btn = document.getElementById('btn-toggle-bookmark');
        if (btn) {
            const isBookmarked = this.bookmarks.has(id);
            btn.innerHTML = isBookmarked ? this.t('btn_bookmarked') : this.t('btn_bookmark');
            btn.className = 'btn btn-ghost' + (isBookmarked ? ' txt-brand' : '');
            if (isBookmarked) btn.style.color = 'var(--brand)';
            else btn.style.color = '';
        }

        // Update star button directly on the card (if visible in grid)
        const cardBtn = document.getElementById('bm-star-' + id);
        if (cardBtn) {
            const isBm = this.bookmarks.has(id);
            cardBtn.textContent = isBm ? '⭐' : '☆';
            cardBtn.style.color = isBm ? 'var(--brand)' : 'var(--ink-3)';
        }

        // Update badge count on nav
        this._updateBmBadge();

        // If we're on the bookmarks page, re-render it to reflect changes instantly
        if (this.currentPage === 'bookmarks') {
            this.renderBookmarks();
        }
    },

    _updateBmBadge() {
        const count = this.bookmarks.size;
        const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
        const show = count > 0;
        ['bm-badge', 'bm-badge-mob'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = text;
            el.style.display = show ? 'inline-flex' : 'none';
        });
    },

    setBmSort(mode) {
        this._bmSort = mode;
        // Update active button style
        ['az', 'year', 'ddc'].forEach(m => {
            const el = document.getElementById('bm-sort-' + m);
            if (el) el.classList.toggle('active', m === mode);
        });
        this.renderBookmarks(false); // re-render without rebuilding toolbar
    },

    clearAllBookmarks() {
        if (!confirm(this.lang === 'id' ? 'Hapus semua koleksi yang tersimpan?' : 'Clear all saved collections?')) return;
        this.bookmarks.clear();
        localStorage.removeItem('bf-bookmarks');
        this._updateBmBadge();
        this.renderBookmarks();
    },

    exportBookmarks(format) {
        const books = [...this.bookmarks].map(id => this.searchEngine.getById(id)).filter(Boolean);
        if (!books.length) return;
        let content, filename, mime;
        if (format === 'csv') {
            const header = 'Judul,Pengarang,Tahun,Penerbit,DDC,Tipe,Sumber';
            const rows = books.map(b => [
                `"${(b.t || '').replace(/"/g, '""')}"`,
                `"${(b.a || '').replace(/"/g, '""')}"`,
                b.yr || '',
                `"${(b.pub || '').replace(/"/g, '""')}"`,
                b.ddc || '',
                b.type || '',
                `"${(b.src || '').replace(/"/g, '""')}"`
            ].join(','));
            content = [header, ...rows].join('\n');
            filename = 'koleksi-saya.csv';
            mime = 'text/csv;charset=utf-8;';
        } else {
            // BibTeX
            content = books.map((b, i) => {
                const key = ((b.a || 'anon').split(/[,\s]/)[0].toLowerCase() || 'ref') + (b.yr || i);
                return `@book{${key},\n  title={${b.t || ''}},\n  author={${b.a || ''}},\n  year={${b.yr || ''}},\n  publisher={${b.pub || ''}},\n}`;
            }).join('\n\n');
            filename = 'koleksi-saya.bib';
            mime = 'text/plain;charset=utf-8;';
        }
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    },

    renderBookmarks(buildToolbar = true) {
        const wrap = document.getElementById('bookmarks-wrap');
        const grid = document.getElementById('bookmarks-grid');
        if (!grid) return;

        let savedBooks = [...this.bookmarks].map(id => this.searchEngine.getById(id)).filter(Boolean);

        // Sort
        if (this._bmSort === 'az') savedBooks.sort((a, b) => (a.t || '').localeCompare(b.t || ''));
        else if (this._bmSort === 'year') savedBooks.sort((a, b) => (b.yr || '').localeCompare(a.yr || ''));
        else if (this._bmSort === 'ddc') savedBooks.sort((a, b) => (a.ddc || '').localeCompare(b.ddc || '') || (a.t || '').localeCompare(b.t || ''));

        // Toolbar (hanya bangun ulang saat pertama render atau dipanggil manual)
        if (buildToolbar && wrap) {
            const toolbar = document.getElementById('bookmarks-toolbar');
            if (toolbar) {
                toolbar.style.display = savedBooks.length > 0 ? 'flex' : 'none';
            }
        }

        if (savedBooks.length > 0) {
            grid.style.display = 'grid';
            grid.innerHTML = `<div style="grid-column:1/-1;color:var(--ink-2);font-size:.82rem;margin-bottom:.25rem">
                ${this.fmt(savedBooks.length)} ${this.t('results_found').toLowerCase()}</div>` +
                savedBooks.map(b => this.bookCard(b)).join('');
        } else {
            grid.style.display = 'block';
            grid.innerHTML = `<div style="text-align:center; padding:4rem 1rem; color:var(--ink-3);">
                <div style="font-size:3rem; margin-bottom:1rem; opacity:0.5">⭐</div>
                <p>${this.t('no_bookmarks')}</p>
            </div>`;
        }
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
        { id: 'etd', name: 'Skripsi, Tesis & Disertasi', subtitle: 'https://eprints.ums.ac.id', type: 'local_etd', label: 'Skripsi & ETD UMS' },
        { id: 'journal', name: 'Artikel Jurnal UMS', subtitle: 'https://journals.ums.ac.id', type: 'local_journal', label: 'Jurnal Ilmiah UMS' },
        { id: 'sibi', name: 'Buku Digital (SIBI)', subtitle: 'Katalog SIBI Kemdikbud', type: 'sibi_api', label: 'Buku Digital SIBI' },
        { id: 'scopus', name: 'Scopus', subtitle: 'https://www.scopus.com', type: 'remote', remoteKey: 'scopus', domain: 'https://www.scopus.com' },
    ],
    _fedSourcesRow2: [
        { id: 'springer', name: 'Springer', subtitle: 'https://link.springer.com', type: 'remote', remoteKey: 'springer', domain: 'https://link.springer.com' },
        { id: 'emerald', name: 'Emerald', subtitle: 'https://www.emerald.com', type: 'remote', remoteKey: 'emerald', domain: 'https://www.emerald.com' },
        { id: 'openalex', name: 'OpenAlex Global OA', subtitle: 'https://openalex.org', type: 'remote', remoteKey: 'openalex', domain: 'https://openalex.org' },
        { id: 'crossref', name: 'Crossref', subtitle: 'https://www.crossref.org', type: 'remote', remoteKey: 'crossref', domain: 'https://www.crossref.org' },
    ],

    get _allFedSources() {
        return [...this._fedSourcesRow1, ...this._fedSourcesRow2];
    },

    renderFederatedSourcesGrid() {
        const container = document.getElementById('fed-source-container');
        if (!container) return;

        const renderBtn = s => {
            const isActive = this._activeFedSource === s.id;
            return `<button type="button" class="fed-btn${isActive ? ' active' : ''}" onclick="app.selectFedSource('${s.id}')">
                <span class="fed-btn-title">${this.esc(s.name)}</span>
                <span class="fed-btn-url">${this.esc(s.subtitle)}</span>
            </button>`;
        };

        container.innerHTML = `
            <div class="fed-row-1">
                ${this._fedSourcesRow1.map(renderBtn).join('')}
            </div>
            <div class="fed-row-2">
                ${this._fedSourcesRow2.map(renderBtn).join('')}
            </div>
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
                            <p style="font-size:0.85rem; color:var(--ink-3);">Sistem akan mencari jutaan koleksi literatur secara live dari <strong>${this.esc(srcObj.name)}</strong> (${this.esc(srcObj.domain || '')}).</p>
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
            results = this.books.filter(b => b.src !== 'UMS (Journal)' && b.src !== 'UMS (ETD)' && b.type !== 'THESIS' && (!b.src || (!b.src.toLowerCase().includes('journal') && !b.src.toLowerCase().includes('sibi'))));
            titleLabel = 'Katalog Buku (Koha UMS & Mitra)';
        } else if (srcObj.type === 'local_etd') {
            results = this.books.filter(b => b.src === 'UMS (ETD)' || (b.src && b.src.toLowerCase().includes('eprints.ums')));
            titleLabel = 'Skripsi, Tesis & Disertasi (EPrints UMS)';
        } else if (srcObj.type === 'local_journal') {
            results = this.books.filter(b => b.src === 'UMS (Journal)' || (b.src && b.src.toLowerCase().includes('journal')));
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

    fetchFederatedDiscovery(srcObj, query, page = 1) {
        if (!query || !query.trim()) return;
        query = query.trim();
        this._fedCurrentQuery = query;
        this._fedCurrentPage = page;

        const fedWrap = document.getElementById('fed-results-wrap');
        const locWrap = document.getElementById('results-wrap');
        const headerEl = document.getElementById('fed-header');
        const listEl = document.getElementById('fed-items-list');
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
        listEl.innerHTML = `<div style="text-align:center; padding:3rem 1rem; color:var(--ink-3);">
            <div class="ld-spinner" style="margin:0 auto 1rem; width:28px; height:28px;"></div>
            <p>Menghubungkan ke ${this.esc(srcObj.name)}...</p>
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
                    return;
                }

                const total = data.total || 0;
                const items = data.items || [];
                const totalPages = data.totalPages || (Math.ceil(total / 15) || 1);
                this._fedCurrentTotal = total;
                this._fedTotalPages = totalPages;

                // Render Header
                headerEl.innerHTML = `
                    <div class="fed-header-title">
                        <span>${this.esc(srcObj.name)}</span>
                        <span class="fed-header-url">${this.esc(srcObj.domain || data.sourceUrl || '')}</span>
                    </div>
                    <div class="fed-header-count">Hasil Pencarian : ${this.fmt(total)} record</div>
                `;

                // Render Items
                if (items.length === 0) {
                    listEl.innerHTML = `<div style="text-align:center; padding:3rem 1rem; color:var(--ink-3);">
                        <p>Tidak ada artikel ditemukan untuk kata kunci "${this.esc(query)}".</p>
                    </div>`;
                    return;
                }

                const startNum = (page - 1) * 15 + 1;
                listEl.innerHTML = items.map((it, idx) => {
                    const itemNum = startNum + idx;
                    const safeTitle = this.esc(it.title || 'Untitled');
                    const safeAuthors = this.esc(it.authors || 'Unknown');
                    const safePub = this.esc(it.publicationName || '-');
                    const safeType = this.esc(it.contentType || 'Article');
                    const safePubType = this.esc(it.publicationType || srcObj.name);
                    const safeDate = it.date ? this.esc(it.date) : (it.year ? this.esc(String(it.year)) : '');
                    const linkUrl = it.url || it.doi || '#';
                    const abstractText = it.abstract ? this.esc(it.abstract) : '';

                    return `
                    <div class="fed-item">
                        <div class="fed-item-num-title">
                            ${itemNum}. <a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${safeTitle}</a>
                        </div>
                        <ul class="fed-meta-list">
                            <li><span class="fed-meta-label">Creator :</span> ${safeAuthors}</li>
                            <li><span class="fed-meta-label">Content Type :</span> ${safeType}</li>
                            <li><span class="fed-meta-label">Publication Name :</span> ${safePub}</li>
                            <li><span class="fed-meta-label">Publication Type :</span> ${safePubType}${safeDate ? ` | ${safeDate}` : ''}</li>
                            ${abstractText ? `<li><span class="fed-meta-label">Abstract :</span> <div class="fed-item-abstract">${abstractText}</div></li>` : ''}
                        </ul>
                        <div class="fed-actions-row">
                            <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-brand" style="font-size:0.75rem; padding:0.32rem 0.75rem">
                                Buka Sumber / DOI ↗
                            </a>
                            <button class="btn btn-ghost" onclick="app.copyCitation('${safeTitle.replace(/'/g, "\\'")}', '${safeAuthors.replace(/'/g, "\\'")}', '${it.year || ''}', '${safePub.replace(/'/g, "\\'")}')" style="font-size:0.75rem; padding:0.32rem 0.75rem">
                                Salin Sitasi
                            </button>
                        </div>
                    </div>`;
                }).join('');

                // Render Pagination
                const pagHtml = this.renderFedPaginationHtml(page, totalPages, srcObj);
                pagTop.innerHTML = pagHtml;
                pagBottom.innerHTML = pagHtml;
            })
            .catch(err => {
                headerEl.innerHTML = `<div class="fed-header-count" style="color:var(--rose)">Terjadi kesalahan koneksi: ${this.esc(err.message)}</div>`;
                listEl.innerHTML = `<div style="text-align:center; padding:2rem 1rem; color:var(--ink-3);"><p>Silakan coba kembali.</p></div>`;
            });
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
        if (!sug.length) { this.hideSuggest(); return; }
        const inp = document.getElementById('search-input').value;
        box.innerHTML = sug.map(s => {
            const type = s.type === 'title' ? this.t('sug_title') : s.type === 'author' ? this.t('sug_author') : this.t('sug_subject');
            const cls = s.type === 'title' ? 'is-title' : s.type === 'author' ? 'is-author' : 'is-subject';
            const sub = s.subtext ? `<small> — ${this.esc(s.subtext)}</small>` : '';
            return `<div class="sug-item" onclick="app.pickSuggest(${s.book ? `'book',${this.idAttr(s.book.id)}` : `'q','${this.esc(s.text).replace(/'/g, "\\'")}'`})">
                <span class="sug-badge ${cls}">${type}</span>
                <span class="sug-text">${this.hl(s.text, inp)}${sub}</span>
            </div>`;
        }).join('');
        box.classList.add('open');
    },
    hideSuggest() { document.getElementById('suggest-box').classList.remove('open'); },
    pickSuggest(type, val) {
        this.hideSuggest();
        if (type === 'book') this.showBookDetail(val);
        else { document.getElementById('search-input').value = val; this.doSearch(val); }
    },
    clearSearch() {
        document.getElementById('search-input').value = '';
        document.getElementById('search-clear').style.display = 'none';
        if (document.getElementById('results-wrap')) document.getElementById('results-wrap').style.display = 'none';
        if (document.getElementById('fed-results-wrap')) document.getElementById('fed-results-wrap').style.display = 'none';
        this.hideSuggest();
    },
    doSearch(q) {
        if (!q) return;

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

        const fieldLabels = {
            all: this.t('sf_all'), title: this.t('sf_title'), author: this.t('sf_author'),
            subject: this.t('sf_subject'), ddc: this.t('sf_ddc'), isbn: this.t('sf_isbn')
        };
        const fieldLabel = field !== 'all' ? ` [${fieldLabels[field]}]` : '';

        this.baseResults = results;
        this.activeFilters = { access: new Set(), src: new Set(), type: new Set(), author: new Set(), year: new Set(), subject: new Set(), ddcClass: new Set() };
        this.resultsPage = 0;
        document.getElementById('results-title').textContent = `"${q}"${fieldLabel} — ${results.length} ${this.t('results_found').toLowerCase()}`;
        this.renderFacets();
        this.applyFiltersAndRender();
        document.getElementById('results-wrap').style.display = 'block';
        document.getElementById('results-wrap').scrollIntoView({ behavior: 'smooth' });

        // Live Fetch from Scopus for generic searches
        if (field === 'all' || field === 'title' || field === 'author') {
            document.getElementById('results-title').innerHTML += ' <span style="opacity:0.7; font-size:0.9em">(Mencari di Scopus...)</span>';
            fetch('/api/scopus?q=' + encodeURIComponent(q))
                .then(r => r.json())
                .then(scopusBooks => {
                    // Cek jika pencarian user sudah berubah
                    if (document.getElementById('search-input').value.toLowerCase() !== q.toLowerCase()) return;

                    if (scopusBooks && scopusBooks.length > 0) {
                        this.baseResults = this.baseResults.concat(scopusBooks);
                        // Sort ulang jika ada
                        if (field === 'all') {
                            // Scopus results naturally sorted by relevance from API, but we just append them.
                        } else {
                            this.baseResults.sort((a, b) => (a.t || '').localeCompare(b.t || ''));
                        }
                        this.resultsPage = 0;
                        document.getElementById('results-title').textContent = `"${q}"${fieldLabel} — ${this.baseResults.length} ${this.t('results_found').toLowerCase()}`;
                        this.renderFacets();
                        this.applyFiltersAndRender();
                    } else {
                        document.getElementById('results-title').textContent = `"${q}"${fieldLabel} — ${this.baseResults.length} ${this.t('results_found').toLowerCase()}`;
                    }
                }).catch(e => {
                    console.error('Scopus fetch error:', e);
                    document.getElementById('results-title').textContent = `"${q}"${fieldLabel} — ${this.baseResults.length} ${this.t('results_found').toLowerCase()}`;
                });
        }
    },
    renderResults() {
        const end = (this.resultsPage + 1) * this.perPage;
        const show = this.currentResults.slice(0, end);
        document.getElementById('results-grid').innerHTML = show.map(b => this.bookCard(b)).join('');
        document.getElementById('more-wrap').style.display = end < this.currentResults.length ? 'block' : 'none';
    },
    loadMore() { this.resultsPage++; this.renderResults(); },
    sortResults() {
        const s = document.getElementById('sort-sel').value;
        if (s === 'title') this.currentResults.sort((a, b) => (a.t || '').localeCompare(b.t || ''));
        else if (s === 'year-desc') this.currentResults.sort((a, b) => (b.yr || '').localeCompare(a.yr || ''));
        else if (s === 'year-asc') this.currentResults.sort((a, b) => (a.yr || '').localeCompare(b.yr || ''));
        else if (s === 'ddc') this.currentResults.sort((a, b) => (a.ddc || '').localeCompare(b.ddc || ''));
        this.resultsPage = 0; this.renderResults();
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
        document.getElementById('btn-clear-filters').style.display = acCount > 0 ? 'inline-block' : 'none';
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
            <div class="facet-item ${isAc ? 'active' : ''}" onclick="app.toggleFilter('${category}', '${this.esc(val).replace(/'/g, "\\'")}')"
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

        this.renderResults();
    },
    sortResults() {
        const s = document.getElementById('sort-sel').value;
        if (s === 'title') this.currentResults.sort((a, b) => (a.t || '').localeCompare(b.t || ''));
        else if (s === 'year-desc') this.currentResults.sort((a, b) => (b.yr || '').localeCompare(a.yr || ''));
        else if (s === 'year-asc') this.currentResults.sort((a, b) => (a.yr || '').localeCompare(b.yr || ''));
        else if (s === 'ddc') this.currentResults.sort((a, b) => (a.ddc || '').localeCompare(b.ddc || ''));
        this.resultsPage = 0; this.renderResults();
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
                <button class="btn btn-ghost" onclick="navigator.clipboard.writeText(window.location.href).then(()=>app.showAlert('${this.t('copied_link')}'))">Share</button>
            </div>
            
            <div id="action-panel-${book.id}" class="action-panel" style="display:none; margin-top:1rem; padding:1.25rem; background:var(--bg-2); border-radius:var(--r-md); border:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1.5rem; flex-wrap:wrap">
                    <div style="flex:1; min-width:260px">
                        <h3 style="font-size:1rem; margin-bottom:.85rem; font-weight:700">${this.t('auto_cite')}</h3>
                        <div class="cite-group">
                            <div class="cite-label">APA 7th</div>
                            <div class="cite-text">${this.esc(this.citeAPA(book))}</div>
                        </div>
                        <div class="cite-group">
                            <div class="cite-label">MLA 9th</div>
                            <div class="cite-text">${this.esc(this.citeMLA(book))}</div>
                        </div>
                        <div class="cite-group">
                            <div class="cite-label">Chicago</div>
                            <div class="cite-text">${this.esc(this.citeChicago(book))}</div>
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
            
            ${book.desc ? `<div style="margin-top:.75rem;padding:.85rem;background:var(--bg-2);border-radius:var(--r-sm);font-size:.82rem;color:var(--ink-2);line-height:1.55"><strong style="color:var(--ink)">${this.t('description')}:</strong> ${this.esc(book.desc)}</div>` : ''}
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
            booksGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--ink-3)">
                <div style="font-size:3rem;margin-bottom:1rem;display:none;"></div>
                <h3>${this.t('no_results')}</h3>
            </div>`;
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
        return `<div class="bk-card" style="--shelf-color:${c}" data-bid="${safeId}" data-url="${safeUrl}" onclick="app._cardClick(this)">
            <button id="bm-star-${safeId}" class="bk-star" onclick="event.stopPropagation();app._bookmarkFromCard(this)" data-bid="${safeId}" title="${isBm ? this.t('btn_bookmarked') : this.t('btn_bookmark')}" style="color:${isBm ? 'var(--brand)' : 'var(--ink-3)'}">${isBm ? '⭐' : '☆'}</button>
            ${b.img ? `<div class="bk-cover" style="background-image:url('${b.img}')"></div>` : ''}
            <div class="bk-title">${this.esc(b.t)}</div>
            ${b.a ? `<div class="bk-author">${this.esc(b.a)}</div>` : ''}
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
        if (!q) return this.esc(text);
        const e = this.esc(text);
        return e.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<strong>$1</strong>');
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
    citeAPA(b) {
        const a = this.cleanAuth(b.a);
        const y = b.yr || this.t('no_year');
        return `${a}. (${y}). ${b.t}. ${b.pub || this.t('unknown_pub')}.`;
    },
    citeMLA(b) {
        const a = this.cleanAuth(b.a);
        const y = b.yr || '';
        return `${a}. ${b.t}. ${b.pub || ''}${b.pub && y ? ', ' : ''}${y}.`;
    },
    citeChicago(b) {
        const a = this.cleanAuth(b.a);
        const y = b.yr || this.t('no_year');
        return `${a}. ${y}. ${b.t}. ${b.pub || this.t('unknown_pub')}.`;
    },
    renderQR(url, elId) {
        if (!url) return;
        const el = document.getElementById(elId);
        if (el && !el.querySelector('img')) {
            el.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(url)}" width="140" height="140" alt="QR Code">`;
        }
    },
};

document.addEventListener('DOMContentLoaded', () => app.init());
