const crypto = require('crypto');
const fs = require('fs');

const API_KEY = process.env.VIDEOSDK_API_KEY;
const SECRET_KEY = process.env.VIDEOSDK_SECRET_KEY;
const TTL_MINUTES = Number(process.env.VIDEOSDK_TOKEN_TTL_MINUTES || 30);

if (!API_KEY || !SECRET_KEY) {
  throw new Error('Set VIDEOSDK_API_KEY and VIDEOSDK_SECRET_KEY in your local shell or backend env.');
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateToken() {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000) - 60;
  const payload = {
    apikey: API_KEY,
    permissions: ['allow_join'],
    iat: now,
    exp: now + Math.max(1, Math.min(TTL_MINUTES, 60)) * 60,
    version: 2,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${signatureInput}.${signature}`;
}

const generatedToken = generateToken();

if (process.argv.includes('--write')) {
  fs.writeFileSync('token.local.txt', generatedToken, 'utf8');
  console.log('Token written to token.local.txt');
} else {
  console.log(generatedToken);
}
