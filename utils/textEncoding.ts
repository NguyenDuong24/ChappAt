const MOJIBAKE_REGEX = /Ã|Ä|Â|áº|á»|ðŸ|ï¿½|�/;

function scoreText(text: string): number {
  const mojibakeMatches = text.match(/Ã|Ä|Â|áº|á»|ðŸ|ï¿½|�/g)?.length || 0;
  const replacementChars = text.match(/�/g)?.length || 0;
  return mojibakeMatches + replacementChars * 2;
}

function decodeLatin1Utf8(text: string): string {
  try {
    return Buffer.from(text, 'latin1').toString('utf8');
  } catch {
    return text;
  }
}

export function normalizeDisplayText(value: unknown): string {
  if (typeof value !== 'string') return '';
  if (!MOJIBAKE_REGEX.test(value)) return value;

  let best = value;
  let bestScore = scoreText(value);
  let current = value;

  for (let i = 0; i < 2; i++) {
    const decoded = decodeLatin1Utf8(current);
    const decodedScore = scoreText(decoded);
    if (decodedScore < bestScore) {
      best = decoded;
      bestScore = decodedScore;
    }
    current = decoded;
  }

  return best;
}
