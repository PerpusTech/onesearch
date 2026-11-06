const fs = require('fs');
const books = JSON.parse(fs.readFileSync('data/books.json', 'utf8'));

const q = 'tere liye';
const field = 'author';

const qClean = q.replace(/["']/g, '').trim().toLowerCase();
const words = qClean.split(/\s+/).filter(w => w.length > 0);

const results = books.filter(b => {
    switch (field) {
        case 'title': {
            if (!b.t) return false;
            const tLower = b.t.toLowerCase();
            return tLower.includes(qClean) || (words.length > 0 && words.every(w => tLower.includes(w)));
        }
        case 'author': {
            if (!b.a) return false;
            const aLower = b.a.toLowerCase();
            return aLower.includes(qClean) || (words.length > 0 && words.every(w => aLower.includes(w)));
        }
        default:
            return false;
    }
});

console.log('Results for "tere liye" (field=author):', results.length);
const kohaResults = results.filter(b => b.src === 'UMS');
console.log('Koha UMS results:', kohaResults.length);
console.log('Titles found:');
kohaResults.forEach((b, i) => console.log(`${i + 1}. [${b.src}] ${b.t} - ${b.a} (${b.yr || '-'}, DDC: ${b.ddc || '-'})`));

