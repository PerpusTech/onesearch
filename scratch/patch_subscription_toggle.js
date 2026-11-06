const fs = require('fs');

// 1. Update index.html: add id attributes to hero-chips-wrap, hero-chip-ejrn, hero-chip-ebk
let html = fs.readFileSync('index.html', 'utf8');

const oldChipsHtml = `                        <!-- Shortcut Chips: Jelajahi E-Journal & E-Book Langganan UMS -->
                        <div
                            style="display:flex; justify-content:center; gap:0.6rem; flex-wrap:wrap; margin-top:0.65rem;">
                            <button type="button" class="hero-chip-browse-ejrn" onclick="app.showEJournalDirectory()"
                                title="Lihat katalog seluruh jurnal ilmiah yang dilanggan Perpustakaan UMS">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon
                                        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                <span>Jelajahi E-Journal Langganan</span>
                            </button>
                            <button type="button" class="hero-chip-browse-ejrn hero-chip-browse-ebk"
                                onclick="app.showEBookDirectory()"
                                title="Lihat katalog buku elektronik (e-book) yang dilanggan Perpustakaan UMS">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                </svg>
                                <span>Jelajahi E-Book Langganan</span>
                            </button>
                        </div>`;

const newChipsHtml = `                        <!-- Shortcut Chips: Jelajahi E-Journal & E-Book Langganan UMS -->
                        <div id="hero-chips-wrap"
                            style="display:flex; justify-content:center; gap:0.6rem; flex-wrap:wrap; margin-top:0.65rem;">
                            <button type="button" id="hero-chip-ejrn" class="hero-chip-browse-ejrn" onclick="app.showEJournalDirectory()"
                                title="Lihat katalog seluruh jurnal ilmiah yang dilanggan Perpustakaan UMS">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon
                                        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                <span>Jelajahi E-Journal Langganan</span>
                            </button>
                            <button type="button" id="hero-chip-ebk" class="hero-chip-browse-ejrn hero-chip-browse-ebk"
                                onclick="app.showEBookDirectory()"
                                title="Lihat katalog buku elektronik (e-book) yang dilanggan Perpustakaan UMS">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                </svg>
                                <span>Jelajahi E-Book Langganan</span>
                            </button>
                        </div>`;

if (html.includes(oldChipsHtml)) {
    html = html.replace(oldChipsHtml, newChipsHtml);
    console.log('Added IDs to hero chips in index.html');
} else {
    console.log('oldChipsHtml exact match not found, checking with normalize whitespace...');
    const normalizedHtml = html.replace(/\r\n/g, '\n');
    const normalizedTarget = oldChipsHtml.replace(/\r\n/g, '\n');
    if (normalizedHtml.includes(normalizedTarget)) {
        html = normalizedHtml.replace(normalizedTarget, newChipsHtml.replace(/\r\n/g, '\n'));
        console.log('Added IDs to hero chips with normalized whitespace');
    }
}

// Bump version in index.html
html = html.replace(/css\/style\.css\?v=\d+/, 'css/style.css?v=136');
html = html.replace(/js\/app\.js\?v=\d+/, 'js/app.js?v=136');
html = html.replace(/\/sw\.js\?v=\d+/, '/sw.js?v=136');
fs.writeFileSync('index.html', html, 'utf8');

// 2. Update sw.js to v136
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/onesearch-shell-v\d+/, 'onesearch-shell-v136');
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('Bumped sw.js to v136');

// 3. Update js/app.js
let app = fs.readFileSync('js/app.js', 'utf8');

// Add cache busting to init() fetches
const oldInitFetches = `fetch('/api/international/config').then(r => r.json()).catch(() => ({ enabled: true, sources: {} })),
                fetch('/api/international/journals').then(r => r.json()).catch(() => ({ items: [] })),
                fetch('/api/international/ebooks').then(r => r.json()).catch(() => ({ items: [] }))`;

const newInitFetches = `fetch('/api/international/config?t=' + t).then(r => r.json()).catch(() => ({ enabled: true, sources: {} })),
                fetch('/api/international/journals?t=' + t).then(r => r.json()).catch(() => ({ items: [] })),
                fetch('/api/international/ebooks?t=' + t).then(r => r.json()).catch(() => ({ items: [] }))`;

if (app.includes(oldInitFetches)) {
    app = app.replace(oldInitFetches, newInitFetches);
    console.log('Added cache-busting to /api/international/... in init()');
}

// Add this.updateSubscriptionShortcutChips() right after intlConfig assignment in init()
const oldIntlAssign = `this.intlConfig = intlCfg || { enabled: true, sources: {} };
            const sourcesConfig = (this.intlConfig && this.intlConfig.sources) || {};`;

const newIntlAssign = `this.intlConfig = intlCfg || { enabled: true, sources: {} };
            const sourcesConfig = (this.intlConfig && this.intlConfig.sources) || {};
            this.updateSubscriptionShortcutChips();`;

if (app.includes(oldIntlAssign) && !app.includes('this.updateSubscriptionShortcutChips();')) {
    app = app.replace(oldIntlAssign, newIntlAssign);
    console.log('Called updateSubscriptionShortcutChips() in init()');
}

// Add updateSubscriptionShortcutChips method before renderFederatedSourcesGrid
const methodCode = `
    updateSubscriptionShortcutChips() {
        const isMasterEnabled = !this.intlConfig || this.intlConfig.enabled !== false;
        const sourcesConfig = (this.intlConfig && this.intlConfig.sources) || {};

        const isJournalsEnabled = isMasterEnabled && (sourcesConfig['subscribed_journals'] !== false);
        const isEBooksEnabled = isMasterEnabled && (sourcesConfig['subscribed_ebooks'] !== false);

        const chipEjrn = document.getElementById('hero-chip-ejrn');
        const chipEbk = document.getElementById('hero-chip-ebk');
        const chipsWrap = document.getElementById('hero-chips-wrap');

        if (chipEjrn) chipEjrn.style.display = isJournalsEnabled ? 'inline-flex' : 'none';
        if (chipEbk) chipEbk.style.display = isEBooksEnabled ? 'inline-flex' : 'none';
        if (chipsWrap) chipsWrap.style.display = (isJournalsEnabled || isEBooksEnabled) ? 'flex' : 'none';
    },
`;

if (!app.includes('updateSubscriptionShortcutChips() {')) {
    app = app.replace('    renderFederatedSourcesGrid() {', methodCode + '\n    renderFederatedSourcesGrid() {');
    console.log('Inserted updateSubscriptionShortcutChips() method');
}

// Call this.updateSubscriptionShortcutChips() inside renderFederatedSourcesGrid()
const oldFedGridStart = `    renderFederatedSourcesGrid() {
        const container = document.getElementById('fed-source-container');
        if (!container) return;`;

const newFedGridStart = `    renderFederatedSourcesGrid() {
        this.updateSubscriptionShortcutChips();
        const container = document.getElementById('fed-source-container');
        if (!container) return;`;

if (app.includes(oldFedGridStart)) {
    app = app.replace(oldFedGridStart, newFedGridStart);
    console.log('Called updateSubscriptionShortcutChips() in renderFederatedSourcesGrid');
}

// Update showEBookDirectory to handle ebk-tab-btn-subscribed visibility
const oldShowEbk = `        const isMasterEnabled = !this.intlConfig || this.intlConfig.enabled !== false;
        const sourcesConfig = (this.intlConfig && this.intlConfig.sources) || {};
        const isIntlEbooksActive = isMasterEnabled && (sourcesConfig['intl_ebooks'] !== false);
        const btnIntl = document.getElementById('ebk-tab-btn-international');
        if (btnIntl) btnIntl.style.display = isIntlEbooksActive ? 'inline-flex' : 'none';
        if (!isIntlEbooksActive && this._activeEBookSubTab === 'international') {
            this.switchEBookSubTab('subscribed');
        }`;

const newShowEbk = `        const isMasterEnabled = !this.intlConfig || this.intlConfig.enabled !== false;
        const sourcesConfig = (this.intlConfig && this.intlConfig.sources) || {};
        const isIntlEbooksActive = isMasterEnabled && (sourcesConfig['intl_ebooks'] !== false);
        const isSubEbooksActive = isMasterEnabled && (sourcesConfig['subscribed_ebooks'] !== false);

        const btnSub = document.getElementById('ebk-tab-btn-subscribed');
        if (btnSub) btnSub.style.display = isSubEbooksActive ? 'inline-flex' : 'none';

        const btnIntl = document.getElementById('ebk-tab-btn-international');
        if (btnIntl) btnIntl.style.display = isIntlEbooksActive ? 'inline-flex' : 'none';

        if (!isSubEbooksActive && isIntlEbooksActive && this._activeEBookSubTab === 'subscribed') {
            this.switchEBookSubTab('international');
        } else if (!isIntlEbooksActive && isSubEbooksActive && this._activeEBookSubTab === 'international') {
            this.switchEBookSubTab('subscribed');
        }`;

if (app.includes(oldShowEbk)) {
    app = app.replace(oldShowEbk, newShowEbk);
    console.log('Updated showEBookDirectory() for subscription tabs');
}

// Update renderFedSubscriptionModesBar
const oldModesBar = `    renderFedSubscriptionModesBar(srcObj) {
        const modesEl = document.getElementById('fed-subscription-modes');
        if (!modesEl) return;

        const rawItems = this._fedRawItems || [];
        const matchedJrn = this._fedMatchedJournals || [];
        const matchedEbk = this._fedMatchedEBooks || [];
        const subArticles = rawItems.filter(it => Boolean(it.isSubscribed)).length;
        const matchedSubs = matchedJrn.length + matchedEbk.length;
        const subCount = subArticles + matchedSubs;

        // Gunakan total riil pencarian dari database global (_fedCurrentTotal), bukan panjang pagination per-halaman (15)
        const globalTotal = (typeof this._fedCurrentTotal === 'number' && this._fedCurrentTotal > 0) ? this._fedCurrentTotal : rawItems.length;
        const allTotal = globalTotal + matchedSubs;
        const curMode = this._fedSubscriptionMode || 'all';

        modesEl.style.display = 'flex';
        modesEl.innerHTML = \`
            <button type="button" class="fed-mode-pill \${curMode === 'all' ? 'active' : ''}" onclick="app.setFedSubscriptionMode('all')" title="Tampilkan seluruh artikel dan jurnal langganan">
                <span>Semua Jurnal</span>
                <span class="fed-mode-count">\${this.fmt(allTotal)}</span>
            </button>
            <button type="button" class="fed-mode-pill mode-subscribed \${curMode === 'subscribed' ? 'active' : ''}" onclick="app.setFedSubscriptionMode('subscribed')" title="Tampilkan hanya jurnal dan artikel yang dilanggan resmi oleh UMS">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>Langganan Resmi UMS</span>
                <span class="fed-mode-count">\${this.fmt(subCount)}</span>
            </button>
            <button type="button" class="fed-mode-pill \${curMode === 'international' ? 'active' : ''}" onclick="app.setFedSubscriptionMode('international')" title="Tampilkan artikel pangkalan data internasional">
                <span>Jurnal Internasional Global</span>
                <span class="fed-mode-count">\${this.fmt(globalTotal)}</span>
            </button>
        \`;
    },`;

const newModesBar = `    renderFedSubscriptionModesBar(srcObj) {
        const modesEl = document.getElementById('fed-subscription-modes');
        if (!modesEl) return;

        const isMasterEnabled = !this.intlConfig || this.intlConfig.enabled !== false;
        const sourcesConfig = (this.intlConfig && this.intlConfig.sources) || {};
        const isSubJournalsEnabled = isMasterEnabled && (sourcesConfig['subscribed_journals'] !== false);
        const isSubEbooksEnabled = isMasterEnabled && (sourcesConfig['subscribed_ebooks'] !== false);
        const isSubscriptionAllowed = isSubJournalsEnabled || isSubEbooksEnabled;

        const rawItems = this._fedRawItems || [];
        const matchedJrn = this._fedMatchedJournals || [];
        const matchedEbk = this._fedMatchedEBooks || [];
        const subArticles = isSubscriptionAllowed ? rawItems.filter(it => Boolean(it.isSubscribed)).length : 0;
        const matchedSubs = isSubscriptionAllowed ? (matchedJrn.length + matchedEbk.length) : 0;
        const subCount = subArticles + matchedSubs;

        // Gunakan total riil pencarian dari database global (_fedCurrentTotal), bukan panjang pagination per-halaman (15)
        const globalTotal = (typeof this._fedCurrentTotal === 'number' && this._fedCurrentTotal > 0) ? this._fedCurrentTotal : rawItems.length;
        const allTotal = globalTotal + matchedSubs;

        // Jika fitur langganan dinonaktifkan di admin, sembunyikan baris filter mode langganan
        if (!isSubscriptionAllowed) {
            modesEl.style.display = 'none';
            modesEl.innerHTML = '';
            this._fedSubscriptionMode = 'all';
            return;
        }

        const curMode = this._fedSubscriptionMode || 'all';

        modesEl.style.display = 'flex';
        modesEl.innerHTML = \`
            <button type="button" class="fed-mode-pill \${curMode === 'all' ? 'active' : ''}" onclick="app.setFedSubscriptionMode('all')" title="Tampilkan seluruh artikel dan jurnal langganan">
                <span>Semua Jurnal</span>
                <span class="fed-mode-count">\${this.fmt(allTotal)}</span>
            </button>
            <button type="button" class="fed-mode-pill mode-subscribed \${curMode === 'subscribed' ? 'active' : ''}" onclick="app.setFedSubscriptionMode('subscribed')" title="Tampilkan hanya jurnal dan artikel yang dilanggan resmi oleh UMS">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span>Langganan Resmi UMS</span>
                <span class="fed-mode-count">\${this.fmt(subCount)}</span>
            </button>
            <button type="button" class="fed-mode-pill \${curMode === 'international' ? 'active' : ''}" onclick="app.setFedSubscriptionMode('international')" title="Tampilkan artikel pangkalan data internasional">
                <span>Jurnal Internasional Global</span>
                <span class="fed-mode-count">\${this.fmt(globalTotal)}</span>
            </button>
        \`;
    },`;

if (app.includes(oldModesBar)) {
    app = app.replace(oldModesBar, newModesBar);
    console.log('Updated renderFedSubscriptionModesBar()');
}

fs.writeFileSync('js/app.js', app, 'utf8');
console.log('Finished updating js/app.js');

