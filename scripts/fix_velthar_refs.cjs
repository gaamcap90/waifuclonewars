// Fix all Vel'thar name references: replace Ur-Kael display text, fix single-quote syntax errors
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
  if (c === before) { console.warn(`  (no change) ${relPath}`); }
  else {
    if (hasCRLF) c = c.replace(/\n/g, '\r\n');
    fs.writeFileSync(full, c, 'utf8');
    console.log(`  patched: ${relPath}`);
  }
}

// Convert any remaining single-quoted string that now contains Vel'thar to a template literal.
// Works line by line: find lines where a ' appears before Vel'thar and after it as well,
// indicating a broken single-quoted string, then convert to backtick string.
function fixSingleQuotedVelthar(c) {
  return c.split('\n').map(line => {
    // Check if this line has the broken pattern: 'TEXT Vel'thar TEXT'
    // We look for the char sequence: single-quote ... Vel'thar ... single-quote
    // Strategy: find all positions of ' and see if any pair brackets Vel'thar
    if (!line.includes("Vel'thar") && !line.includes("Vel\u2019thar")) return line;

    // Normalize curly apostrophes to straight for processing, then restore
    // Actually let's just work with the straight apostrophe since that's the issue
    const vt = "Vel'thar";
    let idx = line.indexOf(vt);
    while (idx !== -1) {
      // Find the opening single-quote before this occurrence
      const before = line.lastIndexOf("'", idx - 1);
      if (before !== -1) {
        // Check that what's between before and idx looks like a string value, not a key
        // The character right after the opening quote should not be Vel (which would mean it starts there)
        // Find the closing single-quote after Vel'thar (after idx + vt.length)
        const afterVt = idx + vt.length;
        // Find the next single-quote after the end of Vel'thar
        const closingQ = line.indexOf("'", afterVt);
        if (closingQ !== -1) {
          // Convert: replace opening ' with ` and closing ' with `
          line = line.substring(0, before) + '`' +
                 line.substring(before + 1, closingQ) + '`' +
                 line.substring(closingQ + 1);
          // Recompute idx after mutation
          idx = line.indexOf(vt, before);
          continue;
        }
      }
      idx = line.indexOf(vt, idx + vt.length);
    }
    return line;
  }).join('\n');
}

// ── HistoricalArchives.tsx: fix two single-quoted Vel'thar ────────────────────
patch('src/components/HistoricalArchives.tsx', c => {
  c = fixSingleQuotedVelthar(c);
  return c;
});

// ── en.ts: fix single-quote + lore text ───────────────────────────────────────
patch('src/i18n/en.ts', c => {
  c = fixSingleQuotedVelthar(c);
  c = c.replace(/Ur-Kael led/g, "Vel'thar led");
  return c;
});

// ── de.ts: name + text references ────────────────────────────────────────────
patch('src/i18n/de.ts', c => {
  // First do the name field (currently 'Ur-Kael-chan' — straight replacement)
  c = c.replace("name: 'Ur-Kael-chan',", 'name: "Vel\'thar-chan",');
  // Replace Ur-Kael in text
  c = c.replace(/Ur-Kael/g, "Vel'thar");
  // Fix any single-quoted strings that now contain Vel'thar
  c = fixSingleQuotedVelthar(c);
  return c;
});

// ── pt-BR.ts: name + text references ─────────────────────────────────────────
patch('src/i18n/pt-BR.ts', c => {
  c = c.replace("name: 'Ur-Kael-chan',", 'name: "Vel\'thar-chan",');
  c = c.replace(/Ur-Kael/g, "Vel'thar");
  c = fixSingleQuotedVelthar(c);
  return c;
});

// ── zh-CN.ts: name + text references ─────────────────────────────────────────
patch('src/i18n/zh-CN.ts', c => {
  c = c.replace("name: 'Ur-Kael-chan',", 'name: "Vel\'thar-chan",');
  c = c.replace(/Ur-Kael/g, "Vel'thar");
  c = fixSingleQuotedVelthar(c);
  return c;
});

// ── ko.ts: name + text references ────────────────────────────────────────────
patch('src/i18n/ko.ts', c => {
  c = c.replace("name: '우르-카엘-찬',", 'name: "Vel\'thar-chan",');
  c = c.replace(/우르-카엘-찬/g, "Vel'thar-chan");
  c = c.replace(/우르-카엘/g, "Vel'thar");
  c = fixSingleQuotedVelthar(c);
  return c;
});

// ── cloneDialogue.ts ──────────────────────────────────────────────────────────
patch('src/data/cloneDialogue.ts', c => {
  c = c.replace("urkael:    'Ur-Kael',", "urkael:    \"Vel'thar\",");
  return c;
});

// ── roguelikeData.ts ──────────────────────────────────────────────────────────
patch('src/data/roguelikeData.ts', c => {
  c = c.replace("displayName: 'Ur-Kael-chan',", "displayName: \"Vel'thar-chan\",");
  c = c.replace(/Ur-Kael/g, "Vel'thar");
  return c;
});

// ── cards.ts: comments only ───────────────────────────────────────────────────
patch('src/data/cards.ts', c => {
  c = c.replace(/Ur-Kael/g, "Vel'thar");
  return c;
});

// ── achievement i18n files ────────────────────────────────────────────────────
for (const f of ['src/i18n/achievement_de.ts', 'src/i18n/achievement_pt-BR.ts', 'src/i18n/achievement_zh-CN.ts']) {
  patch(f, c => c.replace(/Ur-Kael/g, "Vel'thar"));
}
patch('src/i18n/achievement_ko.ts', c => {
  c = c.replace(/우르-카엘-찬/g, "Vel'thar-chan");
  c = c.replace(/우르-카엘/g, "Vel'thar");
  c = fixSingleQuotedVelthar(c);
  return c;
});

// ── Verification ──────────────────────────────────────────────────────────────
console.log('\nVerifying...');
const allFiles = [
  'src/components/HistoricalArchives.tsx',
  'src/i18n/en.ts', 'src/i18n/de.ts', 'src/i18n/pt-BR.ts',
  'src/i18n/zh-CN.ts', 'src/i18n/ko.ts',
  'src/data/cloneDialogue.ts', 'src/data/roguelikeData.ts',
  'src/data/cards.ts',
  'src/i18n/achievement_de.ts', 'src/i18n/achievement_pt-BR.ts',
  'src/i18n/achievement_zh-CN.ts', 'src/i18n/achievement_ko.ts',
];
let ok = true;
for (const f of allFiles) {
  const content = fs.readFileSync(path.join(root, f), 'utf8');
  if (/'Vel'thar/.test(content) || /'Vel\u2019thar/.test(content)) {
    console.error(`  FAIL single-quoted Vel'thar: ${f}`);
    ok = false;
  }
  if (/Ur-Kael|우르-카엘/.test(content)) {
    console.warn(`  WARN Ur-Kael still in ${f}`);
  }
}
if (ok) console.log("  OK No single-quoted Vel'thar found.");
console.log('Done.');
