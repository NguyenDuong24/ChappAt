#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function rel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function gitLsFiles(cwd) {
  try {
    return execFileSync('git', ['ls-files'], { cwd, encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (_error) {
    return [];
  }
}

function checkTrackedSecrets(cwd, label, patterns) {
  const tracked = gitLsFiles(cwd);
  for (const file of tracked) {
    const normalized = file.replace(/\\/g, '/');
    if (patterns.some((pattern) => pattern.test(normalized))) {
      fail(`${label}: sensitive file is tracked by git: ${normalized}`);
    }
  }
}

function parseEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && /^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line))
    .map((line) => line.split('=')[0].trim());
}

function walk(dir, ignored = new Set()) {
  if (!fs.existsSync(dir)) return [];

  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relative = rel(fullPath);

    if (ignored.has(entry.name) || relative.startsWith('node_modules/') || relative.includes('/node_modules/')) {
      continue;
    }

    if (entry.isDirectory()) {
      out.push(...walk(fullPath, ignored));
    } else {
      out.push(fullPath);
    }
  }

  return out;
}

checkTrackedSecrets(root, 'root repo', [
  /^\.env$/,
  /^\.env\.(production|staging)$/,
  /^token\.txt$/,
  /^token\.local\.txt$/,
  /^android\/keystore\.properties$/,
  /^android\/app\/(?!debug\.keystore$).*\.(jks|keystore)$/,
  /firebase-service-account\.json$/,
  /serviceAccount.*\.json$/i,
]);

const serverDir = path.join(root, 'saigondating-server');
if (fs.existsSync(path.join(serverDir, '.git'))) {
  checkTrackedSecrets(serverDir, 'saigondating-server repo', [
    /^\.env$/,
    /^\.env\.(production|staging)$/,
    /firebase-service-account\.json$/,
    /serviceAccount.*\.json$/i,
  ]);
}

const publicEnvKeys = [
  ...parseEnvKeys(path.join(root, '.env')),
  ...parseEnvKeys(path.join(root, '.env.example')),
  ...parseEnvKeys(path.join(root, '.env.template')),
];

if (publicEnvKeys.includes('EXPO_PUBLIC_VIDEOSDK_TOKEN')) {
  fail('EXPO_PUBLIC_VIDEOSDK_TOKEN is present. VideoSDK tokens must be requested from the backend per room.');
}

for (const key of publicEnvKeys) {
  if (/SECRET|PRIVATE_KEY|SERVER_KEY/.test(key) && key.startsWith('EXPO_PUBLIC_')) {
    fail(`Public Expo env exposes a secret-like key: ${key}`);
  }
}

const firebaseJsonPath = path.join(root, 'firebase.json');
if (fs.existsSync(firebaseJsonPath)) {
  const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
  const functionsSource = firebaseJson.functions?.source;
  if (!functionsSource || !fs.existsSync(path.join(root, functionsSource, 'package.json'))) {
    fail('firebase.json functions.source must point to a functions folder with package.json');
  }
} else {
  fail('Missing firebase.json');
}

const codeFiles = walk(root, new Set([
  '.git',
  '.expo',
  '.firebase',
  'node_modules',
  'android',
  'build',
  'tmp',
]));

for (const filePath of codeFiles) {
  const relative = rel(filePath);
  if (relative === 'scripts/security-preflight.js') continue;
  if (!/\.(js|jsx|ts|tsx|mjs|cjs|json)$/.test(relative)) continue;
  if (/package-lock\.json$/.test(relative)) continue;
  if (/\.env(\.|$)/.test(relative)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  if (/EXPO_PUBLIC_VIDEOSDK_TOKEN/.test(content)) {
    fail(`${relative}: references EXPO_PUBLIC_VIDEOSDK_TOKEN`);
  }
  if (/const\s+SECRET_KEY\s*=\s*["'][A-Fa-f0-9]{32,}["']/.test(content)) {
    fail(`${relative}: appears to hard-code a secret key`);
  }
  if (/storePassword\s+["'][^"']+["']|keyPassword\s+["'][^"']+["']/.test(content)) {
    fail(`${relative}: hard-codes Android signing credentials`);
  }
}

const appConfigPath = path.join(root, 'app.json');
if (fs.existsSync(appConfigPath)) {
  const appConfig = fs.readFileSync(appConfigPath, 'utf8');
  if (/YOUR_GOOGLE_MAPS_API_KEY_HERE/.test(appConfig)) {
    warn('app.json: Google Maps API key placeholder is still present');
  }
}

if (!fs.existsSync(path.join(root, 'firestore.rules'))) {
  fail('Missing firestore.rules');
}
if (!fs.existsSync(path.join(root, 'storage.rules'))) {
  fail('Missing storage.rules');
}

if (warnings.length) {
  console.log('Warnings:');
  for (const message of warnings) console.log(`- ${message}`);
}

if (failures.length) {
  console.error('Security preflight FAILED:');
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('Security preflight passed');
