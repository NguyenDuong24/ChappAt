import { getAuth } from 'firebase/auth';

const API_BASE_URL =
  (process.env.EXPO_PUBLIC_SAIGON_SERVER_API_URL ||
    'https://saigondating-server.onrender.com/api').replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = 15000;

export interface AiMatchmakerLocation {
  latitude: number;
  longitude: number;
}

export interface AiMatchmakerMatch {
  id: string;
  uid: string;
  username: string;
  displayName?: string;
  age?: number | string | null;
  gender?: string | null;
  profileUrl?: string;
  photoURL?: string;
  avatarUrl?: string;
  bio?: string;
  job?: string;
  educationLevel?: string;
  university?: string;
  city?: string;
  locationName?: string;
  interests?: string[];
  currentVibe?: any;
  vibeStatus?: string;
  statusMessage?: string;
  isOnline?: boolean;
  location?: AiMatchmakerLocation | null;
  matchPercent?: number;
  matchScore?: number;
  matchReasons?: string[];
  distanceKm?: number;
}

export interface AiMatchmakerResponse {
  success: boolean;
  prompt: string;
  intent: Record<string, any>;
  source: 'ai' | 'heuristic';
  needsMoreInfo?: boolean;
  assistantMessage: string;
  count: number;
  matches: AiMatchmakerMatch[];
}

export interface AiMatchmakerMessage {
  role: 'user' | 'assistant';
  text: string;
}

async function getAuthToken() {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Vui long dang nhap de dung AI Matchmaker');
  }

  return user.getIdToken(false);
}

async function postJson<T>(path: string, body: Record<string, any>): Promise<T> {
  const token = await getAuthToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
    }

    return data as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('AI Matchmaker dang phan hoi cham, vui long thu lai');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function findAiMatches(params: {
  prompt: string;
  limit?: number;
  location?: AiMatchmakerLocation | null;
  messages?: AiMatchmakerMessage[];
}) {
  return postJson<AiMatchmakerResponse>('/ai-matchmaker/search', {
    prompt: params.prompt,
    limit: params.limit ?? 6,
    location: params.location ?? null,
    messages: params.messages ?? [],
  });
}

export const aiMatchmakerService = {
  findMatches: findAiMatches,
};

export default aiMatchmakerService;
