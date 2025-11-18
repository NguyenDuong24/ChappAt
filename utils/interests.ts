import interestsData from '@/assets/data/interests.json';

export interface InterestItem {
  id: string;
  label: string;
}

export const getInterestsArray = (): InterestItem[] => {
  if (!interestsData) return [];

  if (Array.isArray(interestsData)) {
    // If the JSON is an array of strings, coerce to id/label pairs
    return (interestsData as string[]).map((s) => ({ id: String(s).toLowerCase().replace(/\s+/g, '_'), label: s }));
  }

  if (typeof interestsData === 'object') {
    return Object.keys(interestsData).map((k) => ({ id: k, label: (interestsData as Record<string, string>)[k] }));
  }

  return [];
};

export const getLabelForInterest = (interest: string): string => {
  if (!interest) return '';
  if (!interestsData) return interest;

  // If interest already looks like an id present in JSON
  if (Object.prototype.hasOwnProperty.call(interestsData, interest)) {
    return (interestsData as Record<string, string>)[interest];
  }

  // If provided interest matches a label exactly (case-insensitive)
  const foundKey = Object.keys(interestsData).find((k) => (interestsData as Record<string, string>)[k].toLowerCase() === String(interest).toLowerCase());
  if (foundKey) return (interestsData as Record<string, string>)[foundKey];

  // Try to match by key ignoring case
  const foundKeyByCase = Object.keys(interestsData).find((k) => k.toLowerCase() === String(interest).toLowerCase());
  if (foundKeyByCase) return (interestsData as Record<string, string>)[foundKeyByCase];

  // Fallback: return the input as label
  return interest;
};

export const getIdForInterest = (interest: string): string => {
  if (!interest) return '';
  if (!interestsData) return interest;

  // If it's already a key
  if (Object.prototype.hasOwnProperty.call(interestsData, interest)) return interest;

  // If it's a label, find the key
  const labelKey = Object.keys(interestsData).find((k) => (interestsData as Record<string, string>)[k].toLowerCase() === String(interest).toLowerCase());
  if (labelKey) return labelKey;

  // Case-insensitive key
  const keyCase = Object.keys(interestsData).find((k) => k.toLowerCase() === String(interest).toLowerCase());
  if (keyCase) return keyCase;

  // If nothing found, just return the original input (best effort)
  return interest;
};

export const normalizeInterestsArray = (arr: string[] | undefined): string[] => {
  if (!arr) return [];
  return arr.map((i) => getIdForInterest(i)).filter(Boolean);
};
