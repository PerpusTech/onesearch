const fs = require('fs');
let js = fs.readFileSync('js/app.js', 'utf8');

const target = `    showProdi() {
        this.showPage('prodi');
        this.activeFakultas = null;
        this.renderProdi();
    },

`;

const targetCRLF = target.replace(/\n/g, '\r\n');
if (js.includes(targetCRLF)) {
    js = js.replace(targetCRLF, '');
    fs.writeFileSync('js/app.js', js, 'utf8');
    console.log('Removed duplicate showProdi() successfully!');
} else if (js.includes(target)) {
    js = js.replace(target, '');
    fs.writeFileSync('js/app.js', js, 'utf8');
    console.log('Removed duplicate showProdi() (LF) successfully!');
} else {
    console.log('Target showProdi() not found');
}

