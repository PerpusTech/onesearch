/**
 * SearchEngine — Full-text search engine for book data
 * Supports searching by title, author, subject and DDC
 */
class SearchEngine {
    constructor() {
        this.books = [];
        this.titleIndex = new Map();   // word -> [bookIndex, ...]
        this.authorIndex = new Map();
        this.subjectIndex = new Map();
        this.ddcIndex = new Map();     // ddc prefix -> [bookIndex, ...]
        this.ready = false;
    }

    /**
     * Build search indices from books array
     */
    build(books) {
        this.books = books;
        this.idMap = new Map(books.map(b => [b.id, b])); // O(1) lookup
        this.titleIndex.clear();
        this.authorIndex.clear();
        this.subjectIndex.clear();
        this.ddcIndex.clear();

        for (let i = 0; i < books.length; i++) {
            const book = books[i];

            // Index title words
            if (book.t) {
                const words = this.tokenize(book.t);
                for (const word of words) {
                    if (!this.titleIndex.has(word)) this.titleIndex.set(word, []);
                    this.titleIndex.get(word).push(i);
                }
            }

            // Index author words
            if (book.a) {
                const words = this.tokenize(book.a);
                for (const word of words) {
                    if (!this.authorIndex.has(word)) this.authorIndex.set(word, []);
                    this.authorIndex.get(word).push(i);
                }
            }

            // Index subjects
            if (book.sub) {
                for (const subject of book.sub) {
                    const words = this.tokenize(subject);
                    for (const word of words) {
                        if (!this.subjectIndex.has(word)) this.subjectIndex.set(word, []);
                        this.subjectIndex.get(word).push(i);
                    }
                }
            }

            // Index DDC
            if (book.ddc) {
                const ddc = book.ddc;
                // Index all prefixes: "345" -> "3", "34", "345"
                for (let len = 1; len <= ddc.length; len++) {
                    const prefix = ddc.substring(0, len);
                    if (!this.ddcIndex.has(prefix)) this.ddcIndex.set(prefix, []);
                    this.ddcIndex.get(prefix).push(i);
                }
            }
        }

        this.ready = true;
    }

    /**
     * Tokenize text into searchable words
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 2);
    }

    /**
     * Search books by query string with support for:
     * - Exact phrases in quotes ("machine learning")
     * - Boolean operators: AND, OR, NOT / -term
     * - Prefix matching & DDC classification numbers
     */
    search(query, limit = 100) {
        if (!this.ready || !query.trim()) return [];

        const rawQuery = query.trim();

        // 1. Extract exact quoted phrases: "artificial intelligence"
        const exactPhrases = [];
        const phraseRegex = /"([^"]+)"|'([^']+)'/g;
        let pMatch;
        while ((pMatch = phraseRegex.exec(rawQuery)) !== null) {
            const p = (pMatch[1] || pMatch[2] || '').trim().toLowerCase();
            if (p) exactPhrases.push(p);
        }

        // Remove quotes from query string for token extraction
        const remainingQuery = rawQuery.replace(/"[^"]+"|'[^']+'/g, ' ').trim();

        // 2. Parse boolean operators: AND, OR, NOT / -
        const tokens = remainingQuery.split(/\s+/).filter(t => t.length > 0);
        const mustWords = [];
        const notWords = [];
        const shouldWords = [];

        let currentOp = 'AND'; // default operator is AND
        for (let i = 0; i < tokens.length; i++) {
            const tok = tokens[i];
            const upper = tok.toUpperCase();

            if (upper === 'AND') {
                currentOp = 'AND';
            } else if (upper === 'OR') {
                currentOp = 'OR';
            } else if (upper === 'NOT') {
                currentOp = 'NOT';
            } else if (tok.startsWith('-') && tok.length > 1) {
                notWords.push(tok.substring(1).toLowerCase().replace(/[^\w]/g, ''));
            } else {
                const cleanWord = tok.toLowerCase().replace(/[^\w]/g, '');
                if (cleanWord.length >= 2) {
                    if (currentOp === 'NOT') {
                        notWords.push(cleanWord);
                        currentOp = 'AND';
                    } else if (currentOp === 'OR') {
                        shouldWords.push(cleanWord);
                    } else {
                        mustWords.push(cleanWord);
                    }
                }
            }
        }

        const words = [...mustWords, ...shouldWords];
        const scores = new Map(); // bookIndex -> score

        // Check if query looks like a DDC number
        const ddcMatch = rawQuery.match(/^(\d{1,3}(\.\d+)?)/);
        if (ddcMatch) {
            const ddcQuery = ddcMatch[1];
            const indices = this.ddcIndex.get(ddcQuery) || [];
            for (const idx of indices) {
                scores.set(idx, (scores.get(idx) || 0) + 15);
            }
        }

        // If no standalone words, but has exact phrases: search by phrase substring
        if (words.length === 0 && exactPhrases.length > 0) {
            for (let i = 0; i < this.books.length; i++) {
                const book = this.books[i];
                const t = (book.t || '').toLowerCase();
                const a = (book.a || '').toLowerCase();
                const subStr = (book.sub || []).join(' ').toLowerCase();
                const allText = `${t} ${a} ${subStr}`;

                let allPhrasesMatch = true;
                for (const ph of exactPhrases) {
                    if (!allText.includes(ph)) {
                        allPhrasesMatch = false;
                        break;
                    }
                }
                if (allPhrasesMatch) {
                    let score = 25;
                    if (exactPhrases.some(ph => t.includes(ph))) score += 20;
                    scores.set(i, score);
                }
            }
        } else {
            // Match individual tokens
            for (const word of words) {
                this.findMatches(this.titleIndex, word).forEach(idx => {
                    scores.set(idx, (scores.get(idx) || 0) + 6);
                });
                this.findMatches(this.authorIndex, word).forEach(idx => {
                    scores.set(idx, (scores.get(idx) || 0) + 3);
                });
                this.findMatches(this.subjectIndex, word).forEach(idx => {
                    scores.set(idx, (scores.get(idx) || 0) + 4);
                });
            }

            // Boost exact phrases if present
            if (exactPhrases.length > 0) {
                for (const [idx, score] of scores) {
                    const book = this.books[idx];
                    const fullTxt = `${book.t || ''} ${book.a || ''} ${(book.sub || []).join(' ')}`.toLowerCase();
                    for (const ph of exactPhrases) {
                        if (fullTxt.includes(ph)) {
                            scores.set(idx, score + 25);
                        }
                    }
                }
            }
        }

        // Filter out NOT words
        if (notWords.length > 0) {
            for (const [idx] of Array.from(scores.entries())) {
                const book = this.books[idx];
                const fullTxt = `${book.t || ''} ${book.a || ''} ${(book.sub || []).join(' ')}`.toLowerCase();
                if (notWords.some(nw => nw && fullTxt.includes(nw))) {
                    scores.delete(idx);
                }
            }
        }

        // Sort by score descending
        const results = Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([idx, score]) => ({
                book: this.books[idx],
                score: score,
                index: idx
            }));

        return results;
    }

    /**
     * Find indices matching a word (prefix match for short words)
     */
    findMatches(index, word) {
        const results = [];

        // Exact match first
        if (index.has(word)) {
            results.push(...index.get(word));
        }

        // Prefix match for words >= 3 chars
        if (word.length >= 3) {
            for (const [key, indices] of index) {
                if (key !== word && key.startsWith(word)) {
                    results.push(...indices);
                }
            }
        }

        return results;
    }

    /**
     * Get autocomplete suggestions
     */
    suggest(query, limit = 30) {
        if (!query.trim() || query.length < 2) return [];

        const words = this.tokenize(query);
        const lastWord = words[words.length - 1] || '';
        const suggestions = [];
        const seen = new Set();

        // Title suggestions
        const titleResults = this.search(query, limit);
        for (const { book } of titleResults) {
            const key = 'title:' + book.id;
            if (!seen.has(key)) {
                seen.add(key);
                suggestions.push({
                    type: 'title',
                    text: book.t,
                    subtext: book.a,
                    book: book
                });
            }
        }

        // Subject suggestions (match subjects containing query)
        const queryLower = query.toLowerCase();
        for (const [word, indices] of this.subjectIndex) {
            if (word.startsWith(queryLower.split(/\s+/).pop())) {
                // Find the full subject name from books
                for (const idx of indices.slice(0, 1)) {
                    const book = this.books[idx];
                    for (const sub of book.sub || []) {
                        const key = 'subject:' + sub.toUpperCase();
                        if (!seen.has(key) && sub.toLowerCase().includes(queryLower)) {
                            seen.add(key);
                            suggestions.push({
                                type: 'subject',
                                text: sub,
                                subtext: `${indices.length} ${typeof app !== 'undefined' ? app.t('books_unit') : 'buku'}`,
                            });
                            break;
                        }
                    }
                }
            }
            if (suggestions.length >= limit) break;
        }

        return suggestions.slice(0, limit);
    }

    /**
     * Get books by DDC prefix
     */
    getByDDC(ddcPrefix, limit = 500) {
        const indices = this.ddcIndex.get(ddcPrefix) || [];
        return indices.slice(0, limit).map(idx => this.books[idx]);
    }

    /**
     * Get book by ID
     */
    getById(id) {
        return this.idMap ? this.idMap.get(id) : this.books.find(b => b.id === id);
    }

    /**
     * Get books by author
     */
    getByAuthor(author, limit = 20) {
        const words = this.tokenize(author);
        const scores = new Map();

        for (const word of words) {
            this.findMatches(this.authorIndex, word).forEach(idx => {
                scores.set(idx, (scores.get(idx) || 0) + 1);
            });
        }

        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([idx]) => this.books[idx]);
    }

    /**
     * Get books by subject
     */
    getBySubject(subject, limit = 20) {
        const words = this.tokenize(subject);
        const scores = new Map();

        for (const word of words) {
            this.findMatches(this.subjectIndex, word).forEach(idx => {
                scores.set(idx, (scores.get(idx) || 0) + 1);
            });
        }

        return Array.from(scores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([idx]) => this.books[idx]);
    }
}
