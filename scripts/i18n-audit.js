const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = ['app', 'components', 'context', 'hooks', 'services', 'src'];
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.json']);
const MOJIBAKE_PATTERNS = [
  /Ã[^\s]/,
  /Ä[^\s]/,
  /áº[^\s]/,
  /á»[^\s]/,
  /ðŸ/,
  /\uFFFD/,
  /�/,
];

function walk(dir, output = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'android' || entry.name === 'ios' || entry.name === 'admin-web') {
        continue;
      }
      walk(fullPath, output);
      continue;
    }
    if (!EXTENSIONS.has(path.extname(entry.name))) continue;
    output.push(fullPath);
  }
  return output;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const findings = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (trimmed.startsWith('console.log(') || trimmed.startsWith('console.warn(') || trimmed.startsWith('console.error(')) return;

    for (const pattern of MOJIBAKE_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({
          file: path.relative(ROOT, filePath),
          line: idx + 1,
          token: pattern.toString(),
          text: line.trim().slice(0, 180),
        });
        break;
      }
    }
  });
  return findings;
}

function flattenKeys(obj, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, next, out);
    } else {
      out.add(next);
    }
  }
  return out;
}

function diffKeys(a, b) {
  return [...a].filter((k) => !b.has(k)).sort();
}

function run() {
  const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
  let allFindings = [];
  files.forEach((file) => {
    allFindings = allFindings.concat(scanFile(file));
  });

  const enPath = path.join(ROOT, 'src', 'localization', 'en.json');
  const viPath = path.join(ROOT, 'src', 'localization', 'vi.json');
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'));
  const enKeys = flattenKeys(en);
  const viKeys = flattenKeys(vi);

  const missingInVi = diffKeys(enKeys, viKeys);
  const missingInEn = diffKeys(viKeys, enKeys);

  console.log('=== I18N Audit Report ===');
  console.log(`Scanned files: ${files.length}`);
  console.log(`Mojibake findings: ${allFindings.length}`);
  if (allFindings.length > 0) {
    allFindings.slice(0, 200).forEach((f) => {
      console.log(`${f.file}:${f.line} [${f.token}] ${f.text}`);
    });
    if (allFindings.length > 200) {
      console.log(`...and ${allFindings.length - 200} more findings`);
    }
  }

  console.log('');
  console.log(`Missing keys in vi: ${missingInVi.length}`);
  missingInVi.slice(0, 200).forEach((k) => console.log(`- ${k}`));
  if (missingInVi.length > 200) {
    console.log(`...and ${missingInVi.length - 200} more missing keys in vi`);
  }

  console.log('');
  console.log(`Missing keys in en: ${missingInEn.length}`);
  missingInEn.slice(0, 200).forEach((k) => console.log(`- ${k}`));
  if (missingInEn.length > 200) {
    console.log(`...and ${missingInEn.length - 200} more missing keys in en`);
  }

  const hasError = allFindings.length > 0 || missingInVi.length > 0 || missingInEn.length > 0;
  process.exitCode = hasError ? 1 : 0;
}

run();
