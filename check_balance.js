const fs = require('fs');
const s = fs.readFileSync('client/src/pages/DashboardPage.tsx', 'utf8');
const lines = s.split('\n');
let paren = 0, brace = 0;
let inString = false, strChar = null, inTemplate = false;
let inLineComment = false, inBlockComment = false;
for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  for (let j = 0; j < L.length; j++) {
    const c = L[j], n = L[j + 1];
    if (inLineComment) { if (c === '\n') inLineComment = false; continue; }
    if (inBlockComment) { if (c === '*' && n === '/') { inBlockComment = false; j++; } continue; }
    if (inString) { if (c === strChar && L[j - 1] !== '\\') inString = false; continue; }
    if (inTemplate) { if (c === '`' && L[j - 1] !== '\\') inTemplate = false; continue; }
    if (c === '/' && n === '/') { inLineComment = true; j++; continue; }
    if (c === '/' && n === '*') { inBlockComment = true; j++; continue; }
    if (c === "'" || c === '"') { inString = true; strChar = c; continue; }
    if (c === '`') { inTemplate = true; continue; }
    if (c === '(') paren++;
    if (c === ')') { paren--; if (paren < 0) { console.log('NEG PAREN line', i + 1, JSON.stringify(L.trim())); paren = 0; } }
    if (c === '{') brace++;
    if (c === '}') { brace--; if (brace < 0) { console.log('NEG BRACE line', i + 1, JSON.stringify(L.trim())); brace = 0; } }
  }
}
console.log('final paren', paren, 'brace', brace);
