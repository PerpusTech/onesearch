const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.js') || f.endsWith('.json') || f.endsWith('.php') || f.endsWith('.py'));
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('/api/international') || content.includes('doab') || content.includes('openlibrary.org')) {
    console.log(f);
  }
});

