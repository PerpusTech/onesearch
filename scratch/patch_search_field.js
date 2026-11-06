const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

// 1. Target block in doSearch
const oldFieldSearch = `            // Field-specific search (support quotes stripping and exact phrase matching)
            const qClean = q.replace(/["']/g, '').trim().toLowerCase();
            results = this.books.filter(b => {
                switch (field) {
                    case 'title':
                        return b.t && b.t.toLowerCase().includes(qClean);
                    case 'author':
                        return b.a && b.a.toLowerCase().includes(qClean);
                    case 'subject':
                        return b.sub && b.sub.some(s => s.toLowerCase().includes(qClean));
                    case 'ddc':
                        return b.ddc && b.ddc.startsWith(qClean);
                    case 'isbn':
                        return b.isbn && b.isbn.replace(/[-\s]/g, '').includes(qClean.replace(/[-\s]/g, ''));
                    default:
                        return false;
                }
            });
            // Sort by relevance to phrase first, then alphabetically
            results.sort((a, b) => {
                const at = (a.t || '').toLowerCase();
                const bt = (b.t || '').toLowerCase();
                const aExact = at.startsWith(qClean) ? 2 : (at.includes(qClean) ? 1 : 0);
                const bExact = bt.startsWith(qClean) ? 2 : (bt.includes(qClean) ? 1 : 0);
                if (bExact !== aExact) return bExact - aExact;
                return at.localeCompare(bt);
            });`;

const newFieldSearch = `            // Field-specific search (supports quotes stripping, exact phrase matching, and inverted names like "LIYE, Tere")
            const qClean = q.replace(/["']/g, '').trim().toLowerCase();
            const words = qClean.split(/[\\s,]+/).filter(w => w.length > 0);
            results = this.books.filter(b => {
                switch (field) {
                    case 'title': {
                        if (!b.t) return false;
                        const tLower = b.t.toLowerCase();
                        if (tLower.includes(qClean)) return true;
                        return words.length > 0 && words.every(w => tLower.includes(w));
                    }
                    case 'author': {
                        if (!b.a) return false;
                        const aLower = b.a.toLowerCase();
                        if (aLower.includes(qClean)) return true;
                        return words.length > 0 && words.every(w => aLower.includes(w));
                    }
                    case 'subject': {
                        if (!b.sub || !Array.isArray(b.sub)) return false;
                        return b.sub.some(s => {
                            const sLower = s.toLowerCase();
                            if (sLower.includes(qClean)) return true;
                            return words.length > 0 && words.every(w => sLower.includes(w));
                        });
                    }
                    case 'ddc':
                        return b.ddc && b.ddc.startsWith(qClean);
                    case 'isbn':
                        return b.isbn && b.isbn.replace(/[-\\s]/g, '').includes(qClean.replace(/[-\\s]/g, ''));
                    default:
                        return false;
                }
            });
            // Sort by relevance to phrase first, then alphabetically
            results.sort((a, b) => {
                const targetA = field === 'author' ? (a.a || '').toLowerCase() : (a.t || '').toLowerCase();
                const targetB = field === 'author' ? (b.a || '').toLowerCase() : (b.t || '').toLowerCase();
                const aExact = targetA.startsWith(qClean) ? 2 : (targetA.includes(qClean) ? 1 : 0);
                const bExact = targetB.startsWith(qClean) ? 2 : (targetB.includes(qClean) ? 1 : 0);
                if (bExact !== aExact) return bExact - aExact;
                return (a.t || '').localeCompare(b.t || '');
            });`;

// 2. Target block in doAdvancedSearch
const oldAdvSearch = `        let res = this.books;
        if (p.title) res = res.filter(b => b.t && b.t.toLowerCase().includes(p.title));
        if (p.author) res = res.filter(b => b.a && b.a.toLowerCase().includes(p.author));
        if (p.pub) res = res.filter(b => b.pub && b.pub.toLowerCase().includes(p.pub));
        if (p.year) res = res.filter(b => b.yr == p.year);
        if (p.sub) res = res.filter(b => b.sub && b.sub.some(s => s.toLowerCase().includes(p.sub)));`;

const newAdvSearch = `        let res = this.books;
        if (p.title) {
            const tWords = p.title.split(/[\\s,]+/).filter(w => w.length > 0);
            res = res.filter(b => {
                if (!b.t) return false;
                const tLower = b.t.toLowerCase();
                return tLower.includes(p.title) || (tWords.length > 0 && tWords.every(w => tLower.includes(w)));
            });
        }
        if (p.author) {
            const aWords = p.author.split(/[\\s,]+/).filter(w => w.length > 0);
            res = res.filter(b => {
                if (!b.a) return false;
                const aLower = b.a.toLowerCase();
                return aLower.includes(p.author) || (aWords.length > 0 && aWords.every(w => aLower.includes(w)));
            });
        }
        if (p.pub) res = res.filter(b => b.pub && b.pub.toLowerCase().includes(p.pub));
        if (p.year) res = res.filter(b => b.yr == p.year);
        if (p.sub) {
            const sWords = p.sub.split(/[\\s,]+/).filter(w => w.length > 0);
            res = res.filter(b => b.sub && b.sub.some(s => {
                const sLower = s.toLowerCase();
                return sLower.includes(p.sub) || (sWords.length > 0 && sWords.every(w => sLower.includes(w)));
            }));
        }`;

const norm = s => s.replace(/\r\n/g, '\n');

if (norm(js).includes(norm(oldFieldSearch))) {
    js = js.replace(oldFieldSearch.replace(/\n/g, '\r\n'), newFieldSearch.replace(/\n/g, '\r\n'));
    if (!js.includes('supports quotes stripping, exact phrase matching')) {
        js = js.replace(oldFieldSearch, newFieldSearch);
    }
    console.log('1. Updated field-specific search in doSearch');
} else {
    console.log('1. oldFieldSearch pattern not found');
}

if (norm(js).includes(norm(oldAdvSearch))) {
    js = js.replace(oldAdvSearch.replace(/\n/g, '\r\n'), newAdvSearch.replace(/\n/g, '\r\n'));
    if (!js.includes('const aWords = p.author.split')) {
        js = js.replace(oldAdvSearch, newAdvSearch);
    }
    console.log('2. Updated doAdvancedSearch');
} else {
    console.log('2. oldAdvSearch pattern not found');
}

fs.writeFileSync('js/app.js', js, 'utf8');
console.log('Done!');

