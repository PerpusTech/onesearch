/**
 * Recommender — DDC-based book recommendation engine
 */
class Recommender {
    constructor(searchEngine) {
        this.search = searchEngine;
    }

    /**
     * Get recommendations for a book
     * Returns { similar, sameAuthor, relatedTopics }
     */
    recommend(book, limit = 8) {
        return {
            similar: this.getSimilar(book, limit),
            sameAuthor: this.getSameAuthor(book, limit),
            relatedTopics: this.getRelatedTopics(book, limit),
        };
    }

    /**
     * Get similar books based on DDC proximity + subject overlap
     */
    getSimilar(book, limit = 8) {
        if (!book.ddc && (!book.sub || book.sub.length === 0)) return [];

        const candidates = new Map(); // bookId -> score

        // 1 & 2. Same DDC section and division (if DDC exists)
        if (book.ddc) {
            const section = book.ddc.substring(0, 3);
            const sectionBooks = this.search.getByDDC(section, 200);
            for (const b of sectionBooks) {
                if (b.id === book.id) continue;
                let score = 5;
                if (b.ddc === book.ddc) score += 5;
                if (book.ddc.includes('.') && b.ddc.includes('.')) {
                    const diff = Math.abs(parseFloat(book.ddc) - parseFloat(b.ddc));
                    if (diff < 1) score += 3;
                }
                candidates.set(b.id, (candidates.get(b.id) || 0) + score);
            }

            const division = book.ddc.substring(0, 2);
            const divBooks = this.search.getByDDC(division, 100);
            for (const b of divBooks) {
                if (b.id === book.id) continue;
                if (!candidates.has(b.id)) {
                    candidates.set(b.id, 2);
                }
            }
        }

        // 3. Subject overlap bonus
        if (book.sub && book.sub.length > 0) {
            for (const subject of book.sub) {
                const subBooks = this.search.getBySubject(subject, 50);
                for (const b of subBooks) {
                    if (b.id === book.id) continue;
                    candidates.set(b.id, (candidates.get(b.id) || 0) + 4);
                }
            }
        }

        // 4. Book type boost (important for THESIS clustering when DDC is absent)
        for (const [id, score] of candidates.entries()) {
            const b = this.search.getById(id);
            if (b && b.type === book.type) {
                candidates.set(id, score + 2);
            }
        }

        // Sort by score and return top results
        return Array.from(candidates.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id, score]) => ({
                book: this.search.getById(id),
                score: score,
                reason: this.getReasonText(this.search.getById(id), book)
            }))
            .filter(r => r.book);
    }

    /**
     * Get books by the same author
     */
    getSameAuthor(book, limit = 8) {
        if (!book.a) return [];

        const targetTokens = this.search.tokenize(book.a);
        if (targetTokens.length === 0) return [];

        const results = this.search.getByAuthor(book.a, 60);
        return results
            .filter(b => {
                if (b.id === book.id || !b.a) return false;
                
                const candTokens = this.search.tokenize(b.a);
                const str1 = targetTokens.join('').toLowerCase();
                const str2 = candTokens.join('').toLowerCase();
                
                // 1. If absolute exact string (ignoring whitespace/punctuation completely)
                if (str1 === str2 && str1.length > 0) return true;
                
                // 2. If one is inside the other exactly, and it's long enough safely (e.g. "Supriyono, AB" vs "Supriyono")
                if ((str1.includes(str2) || str2.includes(str1)) && Math.min(str1.length, str2.length) > 10) return true;

                // 3. Symmetric Identity Check (Jaccard similarity) for out of order names
                // "Budi Santoso" vs "Santoso, Budi"
                const intersection = targetTokens.filter(t => candTokens.includes(t)).length;
                const union = new Set([...targetTokens, ...candTokens]).size;
                
                if (union === 0) return false;
                
                const jaccard = intersection / union;
                return jaccard >= 0.75; // Strict 75% overlap required to avoid false positives!
            })
            .slice(0, limit)
            .map(b => ({
                book: b,
                score: 1,
                reason: typeof app !== 'undefined' ? app.t('same_author') : 'Pengarang sama'
            }));
    }

    /**
     * Get books from related DDC topics (adjacent sections)
     */
    getRelatedTopics(book, limit = 8) {
        if (!book.ddc || book.ddc.length < 3) return [];

        const section = parseInt(book.ddc.substring(0, 3));
        const candidates = new Map();

        // Check adjacent DDC sections
        const adjacentSections = [
            section - 2, section - 1, section + 1, section + 2,
        ].filter(s => s >= 0 && s <= 999);

        for (const adjSection of adjacentSections) {
            const adjStr = String(adjSection).padStart(3, '0');
            const books = this.search.getByDDC(adjStr, 20);
            for (const b of books) {
                if (b.id === book.id) continue;
                if (b.ddc && b.ddc.substring(0, 3) !== book.ddc.substring(0, 3)) {
                    candidates.set(b.id, {
                        book: b,
                        score: 1,
                        reason: `DDC ${b.ddc.substring(0, 3)} — ${typeof app !== 'undefined' ? app.t('related_topics').toLowerCase() : 'topik terkait'}`
                    });
                }
            }
        }

        return Array.from(candidates.values()).slice(0, limit);
    }

    /**
     * Generate human-readable reason for recommendation
     */
    getReasonText(recBook, sourceBook) {
        if (!recBook || !sourceBook) return '';

        // Priority 1: Check shared subjects
        if (recBook.sub && sourceBook.sub) {
            const shared = recBook.sub.filter(s =>
                sourceBook.sub.some(s2 => s2.toUpperCase() === s.toUpperCase())
            );
            if (shared.length > 0) {
                const subjLabel = typeof app !== 'undefined' ? app.t('rs_subject') : 'Subjek';
                return `${subjLabel}: ${shared[0]}`;
            }
        }

        // Priority 2: Check DDC matches
        if (recBook.ddc && sourceBook.ddc) {
            const tClass = typeof app !== 'undefined' ? app.t('rs_same_class') : 'klasifikasi sama';
            const tDDC = typeof app !== 'undefined' ? app.t('rs_same_ddc') : 'ddc sama';
            const tDiv = typeof app !== 'undefined' ? app.t('rs_same_div') : 'divisi sama';

            if (recBook.ddc === sourceBook.ddc) {
                return `DDC ${recBook.ddc} — ${tClass}`;
            }
            if (recBook.ddc.substring(0, 3) === sourceBook.ddc.substring(0, 3)) {
                return `DDC ${recBook.ddc.substring(0, 3)} — ${tDDC}`;
            }
            if (recBook.ddc.substring(0, 2) === sourceBook.ddc.substring(0, 2)) {
                return `DDC ${recBook.ddc.substring(0, 2)}0 — ${tDiv}`;
            }
        }
        
        // Priority 3: Fallback type identifier
        if (recBook.type && recBook.type === sourceBook.type && typeof app !== 'undefined') {
             return `${app.typeName(recBook.type)} ${app.t('rs_similar_type')}`;
        }

        const tRel = typeof app !== 'undefined' ? app.t('rs_related_rel') : 'Rilis Terkait';
        return recBook.ddc ? `DDC ${recBook.ddc}` : tRel;
    }
}
