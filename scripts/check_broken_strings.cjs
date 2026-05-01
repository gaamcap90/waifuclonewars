// Detects broken string literals across entire files (handles multi-line backticks).
const fs = require('fs');

const files = [
  'src/i18n/de.ts', 'src/i18n/pt-BR.ts', 'src/i18n/ko.ts', 'src/i18n/zh-CN.ts', 'src/i18n/en.ts',
  'src/i18n/lore_de.ts', 'src/i18n/lore_pt-BR.ts', 'src/i18n/lore_ko.ts', 'src/i18n/lore_zh-CN.ts',
  'src/i18n/achievement_de.ts', 'src/i18n/achievement_pt-BR.ts', 'src/i18n/achievement_ko.ts', 'src/i18n/achievement_zh-CN.ts',
];

let totalIssues = 0;

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  let state = 'code'; // code | single | double | backtick | line_comment | block_comment
  let escape = false;
  let line = 1;
  let col = 1;
  let stringStartLine = 0;
  let stringStartCol = 0;
  let issues = [];

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i+1];

    if (state === 'code') {
      if (c === '/' && next === '/') { state = 'line_comment'; i++; col++; }
      else if (c === '/' && next === '*') { state = 'block_comment'; i++; col++; }
      else if (c === "'") { state = 'single'; stringStartLine = line; stringStartCol = col; }
      else if (c === '"') { state = 'double'; stringStartLine = line; stringStartCol = col; }
      else if (c === '`') { state = 'backtick'; stringStartLine = line; stringStartCol = col; }
    } else if (state === 'line_comment') {
      if (c === '\n') state = 'code';
    } else if (state === 'block_comment') {
      if (c === '*' && next === '/') { state = 'code'; i++; col++; }
    } else if (state === 'single') {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === "'") state = 'code';
      else if (c === '\n') {
        // newline in single-quoted string = broken
        issues.push({ line: stringStartLine, col: stringStartCol, type: 'single-broken-by-newline' });
        state = 'code';
      }
    } else if (state === 'double') {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') state = 'code';
      else if (c === '\n') {
        issues.push({ line: stringStartLine, col: stringStartCol, type: 'double-broken-by-newline' });
        state = 'code';
      }
    } else if (state === 'backtick') {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '`') state = 'code';
      // backticks allow newlines, so don't break on \n
    }

    if (c === '\n') { line++; col = 1; }
    else col++;
  }

  if (issues.length) {
    console.log(`\n${f}:`);
    for (const iss of issues) {
      const lines = content.split('\n');
      const snippet = (lines[iss.line - 1] ?? '').substring(0, 180);
      console.log(`  L${iss.line}:${iss.col} ${iss.type}`);
      console.log(`    ${snippet}`);
      totalIssues++;
    }
  }
}

console.log(`\n=== Total issues: ${totalIssues} ===`);
