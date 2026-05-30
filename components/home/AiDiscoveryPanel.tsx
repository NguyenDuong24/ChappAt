import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import Animated, { 
  Easing,
  FadeInUp, 
  useAnimatedStyle, 
  useSharedValue, 
  withDelay,
  withRepeat, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';
import { calculateDistance } from '@/utils/calculateDistance';
import aiMatchmakerService from '@/services/aiMatchmakerService';

const NEON: [string, string, string] = ['#FF35B8', '#8B5CF6', '#22D3EE'];
const PANEL = '#070B18';
const TEXT = '#F8FAFC';
const MUTED = '#A7B0C5';

const AI_STATUS = {
  idle: { label: 'NÃ³i tá»± nhiÃªn, mÃ¬nh lá»c giÃºp', icon: 'sparkles' as const },
  listening: { label: 'MÃ¬nh Ä‘ang nghe báº¡n', icon: 'ear-outline' as const },
  thinking: { label: 'MÃ¬nh Ä‘ang lá»c ngÆ°á»i phÃ¹ há»£p', icon: 'bulb-outline' as const },
  replying: { label: 'MÃ¬nh nghe báº¡n Ä‘Ã¢y', icon: 'chatbubble-ellipses-outline' as const },
};

const STARTER_PROMPTS = [
  'HÃ´m nay lÃ  thá»© máº¥y?',
  'MÃ¬nh thÃ­ch ngÆ°á»i nÃ³i chuyá»‡n sÃ¢u vÃ  tinh táº¿',
  'Lá»c giÃºp mÃ¬nh ná»¯ thÃ­ch cafe á»Ÿ SÃ i GÃ²n',
];

const getQuickReplyOptions = (intent: Record<string, any> = {}) => {
  if (!Array.isArray(intent.genders) || intent.genders.length === 0) {
    return ['KhÃ´ng giá»›i háº¡n', 'Ná»¯ 22-28 á»Ÿ SÃ i GÃ²n', 'Nam thÃ­ch cafe'];
  }
  if (!intent.minAge && !intent.maxAge) {
    return ['22-28 tuá»•i', '25-32 tuá»•i, nghiÃªm tÃºc', '18-25 tuá»•i'];
  }
  return ['Quanh SÃ i GÃ²n', 'ThÃ­ch cafe vÃ  phim', 'Muá»‘n háº¹n hÃ² nghiÃªm tÃºc'];
};

const normalize = (value: any) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ä‘/g, 'd');

const getUserSearchText = (user: any) => normalize([
  user?.username, user?.bio, user?.job, user?.educationLevel, user?.university,
  user?.city, user?.locationName,
  Array.isArray(user?.interests) ? user.interests.join(' ') : '',
].join(' '));

const scoreUserForPrompt = (user: any, prompt: string, viewer: any) => {
  const query = normalize(prompt);
  if (!query.trim()) return 0;
  const haystack = getUserSearchText(user);
  const tokens = query.split(/\s+/).filter(t => t.length > 1);
  let score = 0;
  tokens.forEach((token) => {
    if (haystack.includes(token)) score += 3;
    if (normalize(user?.username).includes(token)) score += 2;
  });
  if (/(nu|gai|female|girl|ban gai)/.test(query) && user?.gender === 'female') score += 8;
  if (/(nam|trai|male|boy|ban trai)/.test(query) && user?.gender === 'male') score += 8;
  if (viewer?.gender && user?.gender && viewer.gender !== user.gender) score += 1;
  const ageMatch = query.match(/(\d{2})/);
  if (ageMatch && typeof user?.age === 'number') {
    const wantedAge = Number(ageMatch[1]);
    score += Math.max(0, 6 - Math.abs(user.age - wantedAge));
  }
  const interests = Array.isArray(user?.interests) ? user.interests : [];
  interests.forEach((interest: string) => { if (query.includes(normalize(interest))) score += 6; });
  return score;
};

const getMatchUserId = (match: any) => String(match?.id || match?.uid || match?.userId || '').trim();
const mergeUniqueMatches = (currentMatches: any[], nextMatches: any[]) => {
  const seen = new Set<string>();
  return [...currentMatches, ...nextMatches].filter((match) => {
    const id = getMatchUserId(match) || `anonymous-${seen.size}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const getResultQuickReplies = (hasMatches: boolean) => (
  hasMatches
    ? ['TÃ¬m thÃªm ngÆ°á»i má»›i', 'áº¨n káº¿t quáº£ gá»£i Ã½', 'Lá»c sÃ¡t hÆ¡n theo gu']
    : ['Ná»›i rá»™ng Ä‘á»™ tuá»•i', 'ThÃªm khu vá»±c gáº§n mÃ¬nh', 'Äá»•i gu tÃ¬m kiáº¿m']
);

const buildResultSummary = (totalCount: number, addedCount: number, appended: boolean) => {
  if (appended) {
    return addedCount > 0
      ? `Đã thêm ${addedCount} hồ sơ mới, tổng cộng ${totalCount} gợi ý.`
      : `Vẫn giữ ${totalCount} hồ sơ hợp nhất hiện tại.`;
  }
  return `${totalCount} hồ sơ phù hợp với gu hiện tại.`;
};

const hasUnderageMatchRequest = (value: string) => {
  const text = normalize(value);
  if (/\b(?:duoi|nho hon|under)\s*(1[0-7]|18)\b/.test(text)) return true;
  if (/\b(1[0-7])\s*(?:-|den|toi|->)\s*(1[0-7])\b/.test(text)) return true;
  const ageMatch = text.match(/\b(1[0-7])\s*(?:tuoi)?\b/);
  if (!ageMatch) return false;
  const age = Number(ageMatch[1]);
  const matchIndex = ageMatch.index ?? 0;
  const prefix = text.slice(Math.max(0, matchIndex - 16), matchIndex);
  if (age === 17 && /\b(?:tren|lon hon|over)\s*$/.test(prefix)) return false;
  return true;
};

const isSafeSuggestedAction = (action: any) => {
  if (!action) return false;
  return !hasUnderageMatchRequest([action.label, action.prompt, action.summary].filter(Boolean).join(' '));
};
