const crypto = require('crypto');
const fs = require('fs');

const API_KEY = "60b7d0c4-264d-4513-8bd8-3f1d27083d6e";
const SECRET_KEY = "88f38656663a575913422e2d9f667403d593bece35e4c0a89228e99052f35b56";

function base64UrlEncode(str) {
    return Buffer.from(str).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function generateToken() {
    const header = {
        alg: "HS256",
        typ: "JWT"
    };

    // Set iat to 600 seconds (10 mins) ago to account for any clock skew
    const now = Math.floor(Date.now() / 1000) - 600;
    const payload = {
        apikey: API_KEY,
        permissions: ["allow_join", "allow_mod"],
        iat: now,
        exp: now + (24 * 60 * 60), // 24 hours
        version: 2,
        roles: ["CRAWLER"]
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));

    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto.createHmac('sha256', SECRET_KEY)
        .update(signatureInput)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return `${signatureInput}.${signature}`;
}

const token = generateToken();
fs.writeFileSync('token.txt', token, 'utf8');
console.log('Token generated');
