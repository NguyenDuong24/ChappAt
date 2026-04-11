const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = ['app', 'components'];
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORE_DIRS = new Set(['node_modules', 'android', 'ios', '.git', 'admin-web']);

const PROP_NAMES = [
  'title',
  'subtitle',
  'placeholder',
  'label',
  'message',
  'description',
  'headerTitle',
  'buttonText',
  'text',
];

const EXCLUDE_EXACT = new Set([
  'light',
  'dark',
  'none',
  'public',
  'private',
  'small',
  'large',
  'center',
  'left',
  'right',
  'cover',
  'contain',
  'absolute',
  'relative',
  'hidden',
  'visible',
  'auto',
]);

const LATIN_TEXT = /[A-Za-zÀ-ỹ]/;
const KEY_LIKE = /^[a-z0-9_.-]+$/i;

function walk(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(entry.name))) continue;
    output.push(fullPath);
  }
  return output;
}

function cleanLine(line) {
  return line.replace(/\/\/.*$/g, '').trim();
}

function shouldSkipString(str) {
  const s = str.trim();
  if (!s) return true;
  if (EXCLUDE_EXACT.has(s)) return true;
  if (!LATIN_TEXT.test(s)) return true;
  if (KEY_LIKE.test(s) && s.includes('.')) return true; // likely i18n key / id
  if (/^#?[0-9a-f]{3,8}$/i.test(s)) return true; // color
  if (/^(https?:\/\/|\/|[A-Z]:\\)/i.test(s)) return true; // url/path
  if (/^[\w-]+$/.test(s) && s.length <= 2) return true; // very short token
  if (/^[a-z_]+$/i.test(s) && s.length <= 5) return true; // likely enum token
  return false;
}

function findQuotedStrings(line) {
  const out = [];
  const re = /(['"`])((?:\\.|(?!\1).)*)\1/g;
  let m;
  while ((m = re.exec(line))) {
    out.push({ value: m[2], index: m.index });
  }
  return out;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const findings = [];

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    const line = cleanLine(raw);
    if (!line) return;

    // Skip import/export statements
    if (/^(import|export)\s/.test(line)) return;

    // Case 1: Alert.alert('title', 'message')
    if (line.includes('Alert.alert(') || line.includes('alert(')) {
      const strings = findQuotedStrings(line);
      strings.forEach(({ value }) => {
        if (shouldSkipString(value)) return;
        findings.push({ file: filePath, line: lineNo, kind: 'alert', text: value, source: raw.trim() });
      });
      return;
    }

    // Case 2: JSX prop hardcoded (placeholder="...", title="...")
    for (const prop of PROP_NAMES) {
      const propRe = new RegExp(`\\b${prop}\\s*=\\s*(['"\`])([^\\1]*?)\\1`, 'g');
      let pm;
      while ((pm = propRe.exec(line))) {
        const value = pm[2];
        if (shouldSkipString(value)) continue;
        findings.push({ file: filePath, line: lineNo, kind: `prop:${prop}`, text: value, source: raw.trim() });
      }
    }

    // Case 3: JSX inline text between tags: >Some text<
    const jsxTextMatches = [...line.matchAll(/>([^<{][^<>{}]*)</g)];
    jsxTextMatches.forEach((match) => {
      const value = (match[1] || '').trim();
      if (shouldSkipString(value)) return;
      findings.push({ file: filePath, line: lineNo, kind: 'jsx-text', text: value, source: raw.trim() });
    });

    // Case 4: fallback in expressions || 'text'
    const fallbackMatches = [...line.matchAll(/\|\|\s*(['"`])((?:\\.|(?!\1).)*)\1/g)];
    fallbackMatches.forEach((m) => {
      const value = (m[2] || '').trim();
      if (shouldSkipString(value)) return;
      findings.push({ file: filePath, line: lineNo, kind: 'fallback', text: value, source: raw.trim() });
    });
  });

  return findings;
}

function main() {
  const files = TARGET_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
  const findings = files.flatMap((f) => scanFile(f));

  const byFile = new Map();
  findings.forEach((f) => {
    const rel = path.relative(ROOT, f.file);
    byFile.set(rel, (byFile.get(rel) || 0) + 1);
  });

  const topFiles = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80);

  console.log('=== Hardcoded UI Audit ===');
  console.log(`Scanned files: ${files.length}`);
  console.log(`Findings: ${findings.length}`);
  console.log('');
  console.log('Top files:');
  topFiles.forEach(([file, count]) => console.log(`${count}\t${file}`));

  console.log('');
  console.log('Sample findings (first 300):');
  findings.slice(0, 300).forEach((f) => {
    const rel = path.relative(ROOT, f.file);
    console.log(`${rel}:${f.line} [${f.kind}] "${f.text}"`);
  });

  if (findings.length > 300) {
    console.log(`...and ${findings.length - 300} more`);
  }

  process.exitCode = findings.length > 0 ? 1 : 0;
}

main();

