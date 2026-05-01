// Fix remaining single-quoted Vel'thar syntax errors + set Korean name to 벨타르-찬
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function patch(relPath, fn) {
  const full = path.join(root, relPath);
  const raw = fs.readFileSync(full, 'utf8');
  const hasCRLF = raw.includes('\r\n');
  let c = hasCRLF ? raw.replace(/\r\n/g, '\n') : raw;
  const before = c;
  c = fn(c);
  if (c === before) console.warn(`  (no change) ${relPath}`);
  else {
    if (hasCRLF) c = c.replace(/\n/g, '\r\n');
    fs.writeFileSync(full, c, 'utf8');
    console.log(`  patched: ${relPath}`);
  }
}

// Convert broken single-quoted strings: '...Vel'thar...' → `...Vel'thar...`
function fixSingleQuotedVelthar(c) {
  const vt = "Vel'thar";
  return c.split('\n').map(line => {
    if (!line.includes(vt)) return line;
    let idx = line.indexOf(vt);
    while (idx !== -1) {
      const openQ = line.lastIndexOf("'", idx - 1);
      if (openQ !== -1) {
        const afterVt = idx + vt.length;
        const closeQ = line.indexOf("'", afterVt);
        if (closeQ !== -1) {
          line = line.substring(0, openQ) + '`' +
                 line.substring(openQ + 1, closeQ) + '`' +
                 line.substring(closeQ + 1);
          idx = line.indexOf(vt, openQ);
          continue;
        }
      }
      idx = line.indexOf(vt, idx + vt.length);
    }
    return line;
  }).join('\n');
}

// Fix roguelikeData.ts line 543
patch('src/data/roguelikeData.ts', c => fixSingleQuotedVelthar(c));

// Fix achievement files (de, pt-BR, zh-CN)
for (const f of [
  'src/i18n/achievement_de.ts',
  'src/i18n/achievement_pt-BR.ts',
  'src/i18n/achievement_zh-CN.ts',
]) {
  patch(f, c => fixSingleQuotedVelthar(c));
}

// Set Korean name to 벨타르-찬 in ko.ts and achievement_ko.ts
patch('src/i18n/ko.ts', c => {
  c = c.replace(`name: "Vel'thar-chan",`, 'name: "벨타르-찬",');
  c = c.replace(/Vel'thar-찬/g, '벨타르-찬');
  // Also update lore/desc references from Vel'thar to 벨타르
  c = c.replace(/Vel'thar/g, '벨타르');
  return c;
});
patch('src/i18n/achievement_ko.ts', c => {
  c = c.replace(/Vel'thar-chan/g, '벨타르-찬');
  c = c.replace(/Vel'thar/g, '벨타르');
  return c;
});

// Verification
console.log('\nVerifying...');
const files = [
  'src/data/roguelikeData.ts',
  'src/i18n/achievement_de.ts', 'src/i18n/achievement_pt-BR.ts', 'src/i18n/achievement_zh-CN.ts',
  'src/i18n/ko.ts', 'src/i18n/achievement_ko.ts',
];
let ok = true;
for (const f of files) {
  const content = fs.readFileSync(path.join(root, f), 'utf8');
  if (/'Vel'thar/.test(content)) {
    console.error(`  FAIL single-quoted Vel'thar: ${f}`);
    ok = false;
  }
}
if (ok) console.log("  OK All clean.");
