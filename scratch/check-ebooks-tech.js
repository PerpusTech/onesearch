const fs = require('fs');
const js = fs.readFileSync('js/app.js', 'utf8');
const lines = js.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('fetchInternationalEBooks') || l.includes('getSubscribedJournalsList') || l.includes('getSubscribedEBooksList') || l.includes('doab') || l.includes('openlibrary')) {
    console.log(`L${idx+1}: ${l.trim().slice(0, 90)}`);
  }
});

