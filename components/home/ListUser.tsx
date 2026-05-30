// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  Easing,
  FadeInUp, 
  Layout, 
  useAnimatedStyle, 
  useSharedValue, 
  withDelay,
  withRepeat, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';
import { LocationContext } from '@/context/LocationContext';
import { useAuth } from '@/context/authContext';
import { useThemedColors } from '@/hooks/useThemedColors';
import { useExploreData } from '@/hooks/useExploreData';
import { calculateDistance } from '@/utils/calculateDistance';
import simpleHotSpotsService from '@/services/simpleHotSpotsService';
import aiMatchmakerService from '@/services/aiMatchmakerService';
import UserCard from './UserCard';
import { useTranslation } from 'react-i18next';

/* â”€â”€â”€ Trending Hashtags â”€â”€â”€ */
import TrendingHashtagChip from '@/components/common/TrendingHashtagChip';

const ITEM_HEIGHT = 94;
const NEON: [string, string, string] = ['#FF35B8', '#8B5CF6', '#22D3EE'];
const PANEL = '#070B18';
const TEXT = '#F8FAFC';
const MUTED = '#A7B0C5';
const getAdultAgeReplies = (t: any) => [t('list_user.ai.age_18_25'), t('list_user.ai.age_22_28'), t('list_user.ai.age_25_32')];
const getUnderageMatchmakerMessage = (t: any) => t('list_user.ai.underage_message');

const getAiStatus = (t: any) => ({
  idle: { label: t('list_user.ai.status_idle'), icon: 'sparkles' as const },
  listening: { label: t('list_user.ai.status_listening'), icon: 'ear-outline' as const },
  thinking: { label: t('list_user.ai.status_thinking'), icon: 'bulb-outline' as const },
  replying: { label: t('list_user.ai.status_replying'), icon: 'chatbubble-ellipses-outline' as const },
});

const getStarterPrompts = (t: any) => [
  t('list_user.ai.starter_today'),
  t('list_user.ai.starter_deep_talk'),
  t('list_user.ai.starter_female_cafe'),
];

const getQuickReplyOptions = (intent: Record<string, any> = {}, t: any) => {
  if (!Array.isArray(intent.genders) || intent.genders.length === 0) {
    return [t('list_user.ai.quick_no_limit'), t('list_user.ai.quick_female_22_28'), t('list_user.ai.quick_male_cafe')];
  }

  if (!intent.minAge && !intent.maxAge) {
    return [t('list_user.ai.age_22_28'), t('list_user.ai.quick_serious_25_32'), t('list_user.ai.age_18_25')];
  }

  return [t('list_user.ai.quick_near_saigon'), t('list_user.ai.quick_cafe_movies'), t('list_user.ai.quick_serious_date')];
};

/* helpers */
const normalize = (value: any) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

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

const cleanHashtag = (value: string) => String(value || '').replace(/^#/, '').trim();
const getVibeLabel = (user: any) => {
  const currentVibe = user?.currentVibe;
  const vibe = currentVibe?.vibe || currentVibe;
  if (!vibe) return '';
  const name = vibe?.name || vibe?.label || '';
  const emoji = vibe?.emoji || '';
  const message = currentVibe?.customMessage || user?.vibeStatus || '';
  return [emoji, name, message].filter(Boolean).join(' ').trim();
};
const getStatusLabel = (user: any) => (
  user?.statusMessage || user?.statusText || user?.customStatus || user?.bio || ''
);

const getMatchUserId = (match: any) => String(match?.id || match?.uid || match?.userId || '').trim();
type ResultPanelCommand = 'hide' | 'show' | 'clear';

const isMoreResultsPrompt = (value: string) => {
  const text = normalize(value);
  return /\b(them|xem them|loc tiep|goi y tiep|nguoi khac|ho so khac|ket qua moi|khac nua|nua di|them nua|more|another|next)\b/.test(text);
};

const getResultPanelCommand = (value: string): ResultPanelCommand | null => {
  const text = normalize(value);
  const mentionsResults = /\b(ket qua|goi y|match|ho so|danh sach|panel|card)\b/.test(text);
  if (!mentionsResults) return null;

  if (/\b(xoa|reset|clear|bo het|lam lai tu dau|xoa sach)\b/.test(text)) return 'clear';
  if (/\b(dong|an|hide|close|thu gon|tat|dep|cat)\b/.test(text)) return 'hide';
  if (/\b(mo lai|mo|hien lai|hien|show|open|xem lai|bat lai|dua lai)\b/.test(text)) return 'show';

  return null;
};

const getHiddenResultQuickReplies = (t: any) => [t('list_user.ai.quick_reopen_results'), t('list_user.ai.quick_find_more'), t('list_user.ai.quick_refine_match')];

const mergeUniqueMatches = (currentMatches: any[], nextMatches: any[]) => {
  const seen = new Set<string>();
  return [...currentMatches, ...nextMatches].filter((match) => {
    const id = getMatchUserId(match) || `${match?.username || 'user'}-${match?.age || ''}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const getResultQuickReplies = (hasMatches: boolean, t: any) => (
  hasMatches
    ? [t('list_user.ai.quick_find_more'), t('list_user.ai.quick_hide_results'), t('list_user.ai.quick_refine_match')]
    : [t('list_user.ai.quick_expand_age'), t('list_user.ai.quick_near_area'), t('list_user.ai.quick_change_taste')]
);

const buildResultSummary = (totalCount: number, addedCount: number, appended: boolean, translate: any) => {
  if (appended) {
    return addedCount > 0
      ? translate('list_user.ai.summary_added', { added: addedCount, total: totalCount })
      : translate('list_user.ai.summary_kept', { total: totalCount });
  }

  return translate('list_user.ai.summary_total', { total: totalCount });
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

const getSmartContextChips = ({ intent = {}, matches = [], location, prompt, t }: any) => {
  const chips: { icon: any; label: string; tone: 'cyan' | 'violet' | 'rose' }[] = [];
  const hasAge = Boolean(intent?.minAge || intent?.maxAge);
  const hasGender = Array.isArray(intent?.genders) && intent.genders.length > 0;
  const hasInterests = Array.isArray(intent?.interests) && intent.interests.length > 0;
  const hasLocation = Boolean(location?.coords || (Array.isArray(intent?.cities) && intent.cities.length > 0));

  if (matches.length > 0) {
    const best = Math.round(Number(matches[0]?.matchPercent || matches[0]?.matchScore || 0));
    chips.push({ icon: 'analytics-outline', label: best ? `${best}% top match` : t('list_user.ai.match_results'), tone: 'rose' });
  }
  if (hasGender || hasAge) chips.push({ icon: 'options-outline', label: t('list_user.ai.smart_filter_chip', { defaultValue: 'Đã hiểu gu' }), tone: 'violet' });
  if (hasInterests) chips.push({ icon: 'sparkles-outline', label: intent.interests.slice(0, 2).join(' • '), tone: 'cyan' });
  if (hasLocation) chips.push({ icon: 'navigate-outline', label: t('list_user.ai.smart_nearby_chip', { defaultValue: 'Ưu tiên gần bạn' }), tone: 'cyan' });
  if (!chips.length && prompt.trim()) chips.push({ icon: 'ear-outline', label: t('list_user.ai.smart_listening_chip', { defaultValue: 'Đang bắt vibe' }), tone: 'violet' });

  return chips.slice(0, 3);
};

function AiBotMascot() {
  return (
    <View style={styles.mascotRoot}>
      <View style={styles.mascotAntenna} />
      <View style={styles.mascotEarLeft}>
        <View style={styles.mascotEarInner} />
      </View>
      <View style={styles.mascotEarRight}>
        <View style={styles.mascotEarInner} />
      </View>
      <LinearGradient
        colors={['#F8FAFC', '#D7D6F4', '#A78BFA']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mascotHead}
      >
        <LinearGradient
          colors={['#111035', '#1C1556']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mascotVisor}
        >
          <View style={styles.mascotEye} />
          <View style={styles.mascotEye} />
          <View style={styles.mascotSmile} />
        </LinearGradient>
      </LinearGradient>
      <LinearGradient
        colors={['#BFA7FF', '#5B21B6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mascotBody}
      />
      <View style={styles.mascotHandLeft} />
      <View style={styles.mascotHandRight} />
    </View>
  );
}

function AiDiscoveryPanel({ users, viewer, colors, location }: any) {
  const router = useRouter();
  const { t } = useTranslation();
  const accent = colors.palette?.sphereGradient || colors.gradientPrimary || NEON;
  const isDark = colors.isDark;
  const cardColors = colors.palette?.cardGradient || (isDark
    ? ['#121633', '#090E20', '#070B18']
    : [colors.palette?.cardGradient?.[0] || colors.surface || '#FFFFFF', colors.palette?.cardGradient?.[1] || colors.cardBackground || '#F8FAFC']);
  const inactiveSendGradient = isDark ? ['#353B55', '#23283D'] : ['#F1F5F9', '#E2E8F0'];
  const chipTextColor = isDark ? '#EAF6FF' : colors.text || '#0F172A';
  const assistantTextColor = isDark ? '#F8FAFC' : colors.text || '#0F172A';
  const assistantMetaColor = isDark ? '#A5F3FC' : colors.primary || '#6366F1';
  const aiTextColor = colors.text || TEXT;
  const aiMutedColor = colors.subtleText || colors.mutedText || MUTED;
  const aiLabelColor = colors.primary || colors.tint || (isDark ? '#C4B5FD' : '#6366F1');
  const [prompt, setPrompt] = useState('');
  const [aiMode, setAiMode] = useState<'idle' | 'thinking' | 'replying'>('idle');
  const [messages, setMessages] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchSummary, setMatchSummary] = useState('');
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [isResultsPanelOpen, setIsResultsPanelOpen] = useState(true);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [suggestedAction, setSuggestedAction] = useState<any | null>(null);
  const [lastIntent, setLastIntent] = useState<Record<string, any>>({});
  const viewerName = viewer?.username || viewer?.displayName || viewer?.name || t('list_user.ai.you');
  const pendingReplyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayMode = aiMode === 'thinking'
    ? 'thinking'
    : prompt.trim()
      ? 'listening'
      : aiMode;
  const aiStatus = getAiStatus(t)[displayMode];
  const showStatusDots = displayMode === 'listening' || displayMode === 'thinking';

  // Animation values
  const floatAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);
  const tiltAnim = useSharedValue(0);
  const orbitAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);
  const waveAnim = useSharedValue(1);
  const dotAnim = useSharedValue(0);
  const dotTwoAnim = useSharedValue(0);
  const dotThreeAnim = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );

    scaleAnim.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );

    tiltAnim.value = withRepeat(
      withSequence(
        withTiming(-1.8, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(2.2, { duration: 2600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    orbitAnim.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1
    );

    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );

    waveAnim.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.84, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.04, { duration: 900, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );

    dotAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 760, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.28, { duration: 760, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    dotTwoAnim.value = withDelay(150, withRepeat(
      withSequence(
        withTiming(1, { duration: 760, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.28, { duration: 760, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    ));

    dotThreeAnim.value = withDelay(300, withRepeat(
      withSequence(
        withTiming(1, { duration: 760, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.28, { duration: 760, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    ));
  }, []);

  useEffect(() => {
    return () => {
      if (pendingReplyRef.current) clearTimeout(pendingReplyRef.current);
    };
  }, []);

  const animatedBotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatAnim.value },
      { rotate: `${tiltAnim.value}deg` },
      { scale: scaleAnim.value }
    ],
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitAnim.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.26 + glowAnim.value * 0.24,
    transform: [{ scale: 0.96 + glowAnim.value * 0.08 }],
  }));

  const waveLeftStyle = useAnimatedStyle(() => ({
    opacity: 0.42 + glowAnim.value * 0.25,
    transform: [{ scaleY: waveAnim.value }],
  }));

  const waveRightStyle = useAnimatedStyle(() => ({
    opacity: 0.38 + glowAnim.value * 0.22,
    transform: [{ scaleY: 1.28 - waveAnim.value * 0.2 }],
  }));

  const dotOneStyle = useAnimatedStyle(() => ({
    opacity: dotAnim.value,
    transform: [{ scale: 0.72 + dotAnim.value * 0.38 }],
  }));

  const dotTwoStyle = useAnimatedStyle(() => ({
    opacity: dotTwoAnim.value,
    transform: [{ scale: 0.72 + dotTwoAnim.value * 0.32 }],
  }));

  const dotThreeStyle = useAnimatedStyle(() => ({
    opacity: dotThreeAnim.value,
    transform: [{ scale: 0.72 + dotThreeAnim.value * 0.28 }],
  }));

  const sendMessage = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || aiMode === 'thinking') return;
    if (pendingReplyRef.current) clearTimeout(pendingReplyRef.current);
    const currentMatches = matches;
    const currentMatchSummary = matchSummary;
    const nextConversation = [
      ...messages,
      { role: 'user' as const, text },
    ];
    const resultPanelCommand = getResultPanelCommand(text);

    setPrompt('');

    if (resultPanelCommand) {
      let assistantText = '';

      if (resultPanelCommand === 'hide') {
        if (currentMatches.length) {
          setIsResultsPanelOpen(false);
          setShowAllMatches(false);
          setQuickReplies(getHiddenResultQuickReplies(t));
          assistantText = t('list_user.ai.hidden_results_message', { count: currentMatches.length });
        } else {
          setQuickReplies([t('list_user.ai.quick_try_match'), t('list_user.ai.quick_female_22_28'), t('list_user.ai.quick_no_limit')]);
          assistantText = t('list_user.ai.no_results_to_hide');
        }
      } else if (resultPanelCommand === 'show') {
        if (currentMatches.length) {
          setIsResultsPanelOpen(true);
          setQuickReplies(getResultQuickReplies(true, t));
          assistantText = t('list_user.ai.reopened_results_message', { count: currentMatches.length });
        } else {
          setQuickReplies([t('list_user.ai.quick_try_match'), t('list_user.ai.quick_female_22_28'), t('list_user.ai.quick_no_limit')]);
          assistantText = t('list_user.ai.no_saved_results');
        }
      } else {
        setMatches([]);
        setMatchSummary('');
        setLastIntent({});
        setShowAllMatches(false);
        setIsResultsPanelOpen(true);
        setQuickReplies([t('list_user.ai.quick_restart'), t('list_user.ai.quick_female_22_28'), t('list_user.ai.quick_no_limit')]);
        assistantText = currentMatches.length
          ? t('list_user.ai.cleared_results')
          : t('list_user.ai.no_results_to_clear');
      }

      setMessages([
        ...nextConversation,
        { role: 'assistant' as const, text: assistantText },
      ]);
      setSuggestedAction(null);
      setAiMode('replying');
      return;
    }

    const wantsMoreResults = currentMatches.length > 0 && isMoreResultsPrompt(text);
    const excludeIds = wantsMoreResults
      ? currentMatches.map(getMatchUserId).filter(Boolean)
      : [];

    setAiMode('thinking');
    if (wantsMoreResults || !currentMatches.length) {
      setIsResultsPanelOpen(true);
    }
    if (!currentMatches.length) {
      setMatchSummary('');
      setShowAllMatches(false);
    }
    setQuickReplies([]);
    setSuggestedAction(null);
    setMessages(nextConversation);

    const safetyGuidance = hasUnderageMatchRequest(text)
      ? {
        message: getUnderageMatchmakerMessage(t),
        replies: getAdultAgeReplies(t),
      }
      : null;
    if (safetyGuidance) {
      setMessages([
        ...nextConversation,
        { role: 'assistant' as const, text: safetyGuidance.message },
      ]);
      setQuickReplies(safetyGuidance.replies);
      setSuggestedAction(null);
      setAiMode('replying');
      return;
    }

    try {
      const response = await aiMatchmakerService.findMatches({
        prompt: text,
        limit: 6,
        messages: nextConversation.slice(-8),
        location: location?.coords
          ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
          : null,
        excludeIds,
      });
      const nextMatches = Array.isArray(response.matches) ? response.matches : [];
      const responseMode = response.mode || (response.needsMoreInfo ? 'clarify' : nextMatches.length ? 'results' : 'chat');
      setLastIntent(response.intent || {});
      const resultMatches = wantsMoreResults ? mergeUniqueMatches(currentMatches, nextMatches) : nextMatches;
      const addedMatchCount = wantsMoreResults
        ? Math.max(0, resultMatches.length - currentMatches.length)
        : nextMatches.length;
      const hasFreshResults = responseMode === 'results' && addedMatchCount > 0;
      const shouldKeepCurrentMatches = currentMatches.length > 0 && !hasFreshResults;
      const nextMatchSummary = buildResultSummary(resultMatches.length, addedMatchCount, wantsMoreResults, t);
      const assistantText = wantsMoreResults && responseMode === 'results' && addedMatchCount === 0
        ? t('list_user.ai.no_new_profiles')
        : response.assistantMessage || (
          responseMode === 'clarify'
          ? t('list_user.ai.need_more_info')
          : responseMode === 'results' && nextMatches.length
          ? t('list_user.ai.found_profiles', { count: nextMatches.length })
          : t('list_user.ai.listening_message')
        );

      setMessages([
        ...nextConversation,
        {
          role: 'assistant',
          text: assistantText,
        },
      ]);
      setMatchSummary(hasFreshResults ? nextMatchSummary : shouldKeepCurrentMatches ? currentMatchSummary : '');
      setMatches(hasFreshResults ? resultMatches : shouldKeepCurrentMatches ? currentMatches : []);
      if (hasFreshResults || wantsMoreResults) {
        setIsResultsPanelOpen(true);
      }
      setShowAllMatches(wantsMoreResults && hasFreshResults ? true : false);
      const serverReplies = Array.isArray(response.suggestedReplies)
        ? response.suggestedReplies.filter((reply: string) => !hasUnderageMatchRequest(reply))
        : [];
      const safeSuggestedAction = isSafeSuggestedAction(response.suggestedAction) ? response.suggestedAction : null;
      setSuggestedAction(responseMode === 'results' ? null : safeSuggestedAction);
      setQuickReplies(
        serverReplies.length > 0
          ? serverReplies
          : hasFreshResults || shouldKeepCurrentMatches
          ? getResultQuickReplies((hasFreshResults ? resultMatches : currentMatches).length > 0, t)
          : responseMode === 'clarify'
          ? getQuickReplyOptions(response.intent, t)
          : []
      );
      setAiMode('replying');
    } catch (error: any) {
      const errorMessage = error?.message || t('list_user.ai.error_busy');
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: errorMessage },
      ]);
      setMatches(currentMatches);
      setMatchSummary(currentMatchSummary);
      if (wantsMoreResults && currentMatches.length) {
        setIsResultsPanelOpen(true);
      }
      setQuickReplies(currentMatches.length ? getResultQuickReplies(true, t) : []);
      setSuggestedAction(null);
      setAiMode('replying');
    } finally {
      pendingReplyRef.current = null;
    }
  }, [aiMode, location?.coords, matchSummary, matches, messages]);

  const handleSend = useCallback(() => {
    sendMessage(prompt);
  }, [prompt, sendMessage]);

  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
    if (aiMode !== 'thinking') {
      setAiMode(value.trim() ? 'idle' : matches.length ? 'replying' : 'idle');
    }
  }, [aiMode, matches.length]);

  const handlePromptBlur = useCallback(() => {
    if (aiMode !== 'thinking' && !prompt.trim() && !matches.length) {
      setAiMode('idle');
    }
  }, [aiMode, matches.length, prompt]);

  const visibleMatches = showAllMatches ? matches : matches.slice(0, 3);
  const canRevealStoredMatches = matches.length > visibleMatches.length;
  const hasHiddenResults = matches.length > 0 && !isResultsPanelOpen;
  const smartChips = getSmartContextChips({
    intent: lastIntent,
    matches,
    location,
    prompt,
    t,
  });

  return (
    <View style={styles.aiCard}>
      <LinearGradient
        colors={cardColors}
        style={[styles.aiGradient, !isDark && { borderWidth: 1, borderColor: colors.border }]}
      >
        {isDark ? <View style={[styles.aiGlowRight, { backgroundColor: colors.palette?.glowTop?.[0] || 'rgba(139, 92, 246, 0.15)' }]} pointerEvents="none" /> : null}
        {isDark ? <View style={[styles.aiGlowLeft, { backgroundColor: colors.palette?.glowBottom?.[0] || 'rgba(8, 145, 178, 0.15)' }]} pointerEvents="none" /> : null}

        <View style={styles.aiHeaderRow}>
          <View style={styles.aiLabelRow}>
            <MaterialCommunityIcons name="robot-happy-outline" size={13} color={aiLabelColor} />
            <Text style={[styles.aiLabel, { color: aiLabelColor }]}>AI Matchmaker</Text>
          </View>

          <View style={styles.aiStateLine}>
            <Ionicons name={aiStatus.icon} size={11} color={aiMutedColor} />
            <Text style={[styles.aiStateText, { color: aiMutedColor }]} numberOfLines={1}>{aiStatus.label}</Text>
            {showStatusDots ? (
              <View style={styles.thinkingDots}>
                <Animated.View style={[styles.thinkingDot, dotOneStyle]} />
                <Animated.View style={[styles.thinkingDot, dotTwoStyle]} />
                <Animated.View style={[styles.thinkingDot, dotThreeStyle]} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.aiInsightRail}>
          {smartChips.map((chip) => (
            <View key={`${chip.icon}-${chip.label}`} style={[styles.aiInsightChip, styles[`aiInsightChip${chip.tone}`]]}>
              <Ionicons name={chip.icon} size={12} color={chip.tone === 'rose' ? '#FDA4AF' : chip.tone === 'violet' ? '#DDD6FE' : '#A5F3FC'} />
              <Text style={[styles.aiInsightText, { color: chipTextColor }]} numberOfLines={1}>{chip.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.aiMainRow}>
          <View style={styles.aiCopyBlock}>
            <Text style={[styles.aiHint, { color: aiTextColor }]} numberOfLines={2}>
              {t('list_user.ai.hint', { name: viewerName })}
            </Text>
          </View>

          <View style={styles.botStage} pointerEvents="none">
            <Animated.View style={[styles.botAura, glowStyle]} />
            <Animated.View style={[styles.botOrbit, orbitStyle]}>
              <View style={[styles.orbitDot, styles.orbitDotTop]} />
              <View style={[styles.orbitDot, styles.orbitDotBottom]} />
            </Animated.View>
            <Animated.View style={[styles.botIllustration, animatedBotStyle]}>
              <AiBotMascot />
            </Animated.View>
            <View style={styles.botBaseGlow} />
          </View>
        </View>

        {!messages.length && !matches.length ? (
          <Animated.View entering={FadeInUp.duration(180)} style={styles.starterBlock}>
            <View style={styles.starterRow}>
              {getStarterPrompts(t).map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.starterChip,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                      borderColor: colors.border || (isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)'),
                    }
                  ]}
                  onPress={() => sendMessage(item)}
                >
                  <Text style={[styles.starterText, { color: aiTextColor }]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {messages.length > 0 ? (
          <Animated.View entering={FadeInUp.duration(220)} style={styles.messageStack}>
            {messages.slice(matches.length ? -3 : -2).map((message, index) => (
              <View
                key={`${message.role}-${index}-${message.text}`}
                style={[
                  styles.messageBubble,
                  message.role === 'user'
                    ? [styles.userBubble, { backgroundColor: colors.primary || '#7C3AED', borderColor: colors.palette?.menuBorder || 'rgba(255,255,255,0.16)' }]
                    : [styles.assistantBubble, {
                        backgroundColor: isDark ? 'rgba(8,13,32,0.94)' : 'rgba(255,255,255,0.96)',
                        borderColor: isDark ? 'rgba(103,232,249,0.22)' : colors.border || 'rgba(0,0,0,0.08)'
                      }],
                ]}
              >
                {message.role === 'assistant' ? (
                  <View style={styles.assistantMetaRow}>
                    <View style={styles.assistantMiniIcon}>
                      <Ionicons name="sparkles" size={9} color={colors.primary || "#67E8F9"} />
                    </View>
                    <Text style={[styles.assistantMetaText, { color: assistantMetaColor }]}>ChappAt AI</Text>
                  </View>
                ) : null}
                <Text style={[styles.messageText, { color: message.role === 'user' ? '#FFFFFF' : assistantTextColor }]}>{message.text}</Text>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {quickReplies.length > 0 ? (
          <Animated.View entering={FadeInUp.duration(180)} style={styles.quickReplyRow}>
            {quickReplies.map((reply) => (
              <Pressable
                key={reply}
                style={[
                  styles.quickReplyChip,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: colors.border || (isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)'),
                  }
                ]}
                onPress={() => sendMessage(reply)}
              >
                <Text style={[styles.quickReplyText, { color: aiTextColor }]}>{reply}</Text>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        {suggestedAction && !matches.length ? (
          <Animated.View
            entering={FadeInUp.duration(220)}
            style={[
              styles.suggestionCard,
              {
                backgroundColor: isDark ? 'rgba(8,13,32,0.92)' : 'rgba(255,255,255,0.94)',
                borderColor: isDark ? 'rgba(103,232,249,0.22)' : colors.border || 'rgba(0,0,0,0.08)'
              }
            ]}
          >
            <View style={styles.suggestionTextBlock}>
              <Text style={[styles.suggestionEyebrow, { color: isDark ? '#67E8F9' : colors.primary || '#6366F1' }]}>{t('list_user.ai.suggestion_understood')}</Text>
              <Text style={[styles.suggestionTitle, { color: aiTextColor }]}>{suggestedAction.label}</Text>
              {suggestedAction.summary ? (
                <Text style={[styles.suggestionSummary, { color: aiMutedColor }]} numberOfLines={2}>{suggestedAction.summary}</Text>
              ) : null}
            </View>
            <Pressable
              style={[styles.suggestionButton, { backgroundColor: colors.primary || '#6366F1' }]}
              onPress={() => sendMessage(suggestedAction.prompt)}
            >
              <Ionicons name="sparkles-outline" size={14} color="#FFF" />
              <Text style={styles.suggestionButtonText}>{t('list_user.ai.try_filter')}</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {hasHiddenResults ? (
          <Animated.View
            entering={FadeInUp.duration(220)}
            style={[
              styles.aiResultDock,
              {
                backgroundColor: isDark ? 'rgba(8,13,32,0.92)' : 'rgba(255,255,255,0.94)',
                borderColor: isDark ? 'rgba(103,232,249,0.22)' : colors.border || 'rgba(0,0,0,0.08)'
              }
            ]}
          >
            <View style={styles.aiResultDockInfo}>
              <View style={styles.aiResultDockIcon}>
                <Ionicons name="albums-outline" size={15} color={colors.primary || "#67E8F9"} />
              </View>
              <View style={styles.aiResultDockTextBlock}>
                <Text style={[styles.aiResultDockTitle, { color: aiTextColor }]} numberOfLines={1}>{t('list_user.ai.hidden_dock_title', { count: matches.length })}</Text>
                <Text style={[styles.aiResultDockText, { color: aiMutedColor }]} numberOfLines={1}>{t('list_user.ai.hidden_dock_text')}</Text>
              </View>
            </View>
            <View style={styles.aiResultDockActions}>
              <Pressable style={styles.aiDockSecondaryButton} onPress={() => setIsResultsPanelOpen(true)}>
                <Ionicons name="eye-outline" size={14} color="#E0F2FE" />
                <Text style={styles.aiDockSecondaryText}>{t('list_user.ai.open')}</Text>
              </Pressable>
              <Pressable
                style={styles.aiDockPrimaryButton}
                onPress={() => sendMessage(t('list_user.ai.find_more_prompt'))}
                disabled={aiMode === 'thinking'}
              >
                <LinearGradient
                  colors={aiMode === 'thinking' ? ['#334155', '#1E293B'] : (colors.palette?.sphereGradient || [colors.primary || '#0EA5E9', colors.secondary || '#6366F1'])}
                  style={styles.aiDockPrimaryGradient}
                >
                  <Ionicons name="shuffle" size={14} color="#fff" />
                  <Text style={styles.aiDockPrimaryText}>{t('list_user.ai.find_new')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}

        {matches.length > 0 && isResultsPanelOpen ? (
          <Animated.View
            entering={FadeInUp.duration(260)}
            style={[
              styles.aiResultPanel,
              {
                backgroundColor: isDark ? 'rgba(8,13,32,0.94)' : 'rgba(255,255,255,0.96)',
                borderColor: isDark ? 'rgba(103,232,249,0.22)' : colors.border || 'rgba(0,0,0,0.08)'
              }
            ]}
          >
            <View style={styles.aiResultHeader}>
              <View style={styles.aiResultTitleBlock}>
                <View style={styles.aiResultEyebrowRow}>
                  <Text style={[styles.aiResultEyebrow, { color: isDark ? '#67E8F9' : colors.primary || '#6366F1' }]}>{t('list_user.ai.match_results')}</Text>
                  <View style={styles.aiResultCountPill}>
                    <Ionicons name="people-outline" size={10} color={isDark ? '#BAE6FD' : colors.primary || '#6366F1'} />
                    <Text style={[styles.aiResultCountText, { color: isDark ? '#E0F2FE' : colors.primary || '#6366F1' }]}>{matches.length}</Text>
                  </View>
                </View>
                <Text style={[styles.aiResultTitle, { color: aiTextColor }]}>{matchSummary || t('list_user.ai.default_match_summary')}</Text>
              </View>
              <Pressable 
                onPress={() => {
                  setIsResultsPanelOpen(false);
                  setShowAllMatches(false);
                  setQuickReplies(getHiddenResultQuickReplies(t));
                  setSuggestedAction(null);
                  setAiMode('replying');
                }}
                style={styles.aiCloseButton}
              >
                <Ionicons name="close" size={16} color="#A7B0C5" />
              </Pressable>
            </View>
            {aiMode === 'thinking' ? (
              <View style={styles.aiSearchingInline}>
                <Ionicons name="sparkles" size={12} color={colors.primary || "#67E8F9"} />
                <Text style={[styles.aiSearchingText, { color: isDark ? '#BAE6FD' : colors.text || '#0F172A' }]}>{t('list_user.ai.searching_more')}</Text>
              </View>
            ) : null}
            {visibleMatches.map((item: any, index: number) => {
              const avatar = item?.profileUrl || item?.photoURL || item?.avatarUrl;
              const userId = item.id || item.uid;
              const distance = location ? calculateDistance(location.coords, item?.location) : null;
              const reason = Array.isArray(item?.matchReasons) ? item.matchReasons[0] : '';
              const matchPercent = Math.round(Number(item?.matchPercent || item?.matchScore || Math.max(78, 92 - index * 3)));
              return (
                <Pressable
                  key={userId || `${item?.username}-${index}`}
                  style={[
                    styles.aiResultRow,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border || 'rgba(0,0,0,0.08)'
                    }
                  ]}
                  onPress={() => router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId } })}
                >
                  {avatar
                    ? <Image source={{ uri: avatar }} style={styles.aiResultAvatar} contentFit="cover" />
                    : <LinearGradient colors={NEON} style={styles.aiResultAvatar} />
                  }
                  <View style={styles.aiResultInfo}>
                    <Text style={[styles.aiResultName, { color: aiTextColor }]} numberOfLines={1}>
                      {item?.username || 'SaiGon Match user'}{typeof item?.age === 'number' ? `, ${item.age}` : ''}
                    </Text>
                    <Text style={[styles.aiResultMeta, { color: aiMutedColor }]} numberOfLines={1}>
                      {reason || item?.job || item?.bio || t('list_user.ai.new_profile')}
                    </Text>
                    {(item?.distanceKm !== undefined || (distance !== null && !Number.isNaN(distance))) ? (
                      <Text style={styles.aiResultDistance} numberOfLines={1}>
                        {t('list_user.ai.distance_km', { count: Math.round(Number(item?.distanceKm ?? distance)) })}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.aiMatchBadge, index === 2 && styles.aiMatchBadgeWarm]}>
                    <Text style={[styles.aiMatchBadgeText, index === 2 && styles.aiMatchBadgeTextWarm]}>
                      {t('list_user.ai.match_percent', { percent: Math.max(1, Math.min(99, matchPercent)) })}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {canRevealStoredMatches ? (
              <View style={styles.aiResultActions}>
                <Pressable style={styles.aiRevealButton} onPress={() => setShowAllMatches(true)}>
                  <Ionicons name="albums-outline" size={14} color="#BAE6FD" />
                  <Text style={styles.aiRevealText}>{t('list_user.ai.view_all', { count: matches.length })}</Text>
                </Pressable>
                <Pressable
                  style={[styles.aiMoreButton, styles.aiMoreButtonInline]}
                  onPress={() => sendMessage(t('list_user.ai.find_more_prompt'))}
                  disabled={aiMode === 'thinking'}
                >
                  <LinearGradient
                    colors={aiMode === 'thinking' ? ['#334155', '#1E293B'] : (colors.palette?.sphereGradient || [colors.primary || '#0EA5E9', colors.secondary || '#6366F1'])}
                    style={styles.aiMoreGradient}
                  >
                    <Ionicons name="shuffle" size={14} color="#fff" />
                    <Text style={styles.aiMoreText}>{t('list_user.ai.find_more')}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.aiMoreButton}
                onPress={() => sendMessage(t('list_user.ai.find_more_prompt'))}
                disabled={aiMode === 'thinking'}
              >
                <LinearGradient
                  colors={aiMode === 'thinking' ? ['#334155', '#1E293B'] : (colors.palette?.sphereGradient || [colors.primary || '#0EA5E9', colors.secondary || '#6366F1'])}
                  style={styles.aiMoreGradient}
                >
                  <Ionicons name="shuffle" size={14} color="#fff" />
                  <Text style={styles.aiMoreText}>{t('list_user.ai.find_more')}</Text>
                </LinearGradient>
              </Pressable>
            )}
          </Animated.View>
        ) : null}

        <View
          style={[
            styles.promptBox,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.inputBackground || 'rgba(15, 23, 42, 0.04)',
              borderColor: colors.border || (isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.08)'),
            }
          ]}
        >
          <TextInput
            value={prompt}
            onChangeText={handlePromptChange}
            placeholder={t('list_user.ai.input_placeholder')}
            placeholderTextColor={aiMutedColor}
            style={[styles.promptInput, { color: aiTextColor }]}
            onSubmitEditing={handleSend}
            onBlur={handlePromptBlur}
            editable={aiMode !== 'thinking'}
            returnKeyType="send"
          />
          <Pressable onPress={handleSend} disabled={!prompt.trim() || aiMode === 'thinking'} style={styles.promptButtonWrap}>
            <LinearGradient 
              colors={prompt.trim() && aiMode !== 'thinking' ? accent : inactiveSendGradient} 
              style={[styles.promptSend, (!prompt.trim() || aiMode === 'thinking') && { opacity: 0.72 }]}
            >
              <Ionicons name="paper-plane" size={17} color={prompt.trim() && aiMode !== 'thinking' ? "#fff" : aiMutedColor} />
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

/* Featured Cards (Gợi ý nổi bật) - tall portrait style */
const MATCH_COLORS: Record<number, string> = { 0: '#EF4444', 1: '#A855F7', 2: '#EF4444' };

function FeaturedCard({ user, index, location }: any) {
  const router = useRouter();
  const { t } = useTranslation();
  const image = user?.profileUrl || user?.photoURL || user?.avatarUrl;
  const distance = location ? calculateDistance(location.coords, user?.location) : null;

  // Pseudo match%
  const matchPct = useMemo(() => 92 - index * 3, [index]);

  if (!user?.id && !user?.uid) return null;

  return (
    <Animated.View entering={FadeInUp.delay(index * 20).duration(200)}>
      <Pressable
        style={styles.featuredCard}
        onPress={() => router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId: user?.id || user?.uid } })}
      >
        {image
          ? <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={220} />
          : <LinearGradient colors={NEON} style={StyleSheet.absoluteFillObject} />
        }
        {/* Dark gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.35)']}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Heart button */}
        <Pressable style={styles.featuredHeart}>
          <Ionicons name="heart-outline" size={15} color="#fff" />
        </Pressable>
        {/* Online dot */}
        {user?.isOnline ? <View style={styles.featuredOnline} /> : null}
        {/* Info */}
        <View style={styles.featuredInfo}>
          <View style={styles.featuredNameRow}>
            <Text style={styles.featuredName} numberOfLines={1}>
              {user?.username}{typeof user?.age === 'number' ? `, ${user.age}` : ''}
            </Text>
          </View>
          <Text style={styles.featuredJob} numberOfLines={1}>
            {user?.job || user?.bio || 'SaiGon Match user'}
          </Text>
          {/* Vibe */}
          {getVibeLabel(user) && (
            <Text style={styles.featuredVibe} numberOfLines={1}>
              {getVibeLabel(user)}
            </Text>
          )}
          {distance !== null && !Number.isNaN(distance) ? (
            <View style={styles.featuredDistRow}>
              <Ionicons name="location-sharp" size={10} color={MUTED} />
              <Text style={styles.featuredDist}>{t('list_user.ai.distance_km', { count: distance.toFixed(0) })}</Text>
            </View>
          ) : null}
          {/* Match badge */}
          <View style={[styles.matchBadge, { backgroundColor: 'rgba(0,0,0,0.55)', borderColor: MATCH_COLORS[index] || '#EF4444' }]}>
            <Text style={[styles.matchText, { color: MATCH_COLORS[index] || '#EF4444' }]}>
              {t('list_user.ai.match_percent', { percent: matchPct })}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const FeaturedSuggestions = React.memo(function FeaturedSuggestions({ users, location }: any) {
  const { t } = useTranslation();
  const featured = useMemo(
    () => users.filter((u: any) => u?.profileUrl || u?.photoURL || u?.avatarUrl).slice(0, 20),
    [users]
  );

  if (!featured.length) return null;

  return (
    <>
      <View style={styles.sectionRow}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <Text style={styles.sectionTitle}>{t('list_user.featured_title')}</Text>
        </View>
      </View>
      <FlatList
        horizontal
        data={featured}
        keyExtractor={(item: any) => item.id || item.uid}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredRow}
        renderItem={({ item, index }) => (
          <FeaturedCard user={item} index={index} location={location} />
        )}
      />
    </>
  );
});

const normalizeTrendingHashtag = (item: any) => {
  const rawTag = String(item?.tag || item?.name || item?.hashtag || '').trim();
  if (!rawTag) return null;

  return {
    tag: rawTag.startsWith('#') ? rawTag : `#${rawTag}`,
    count: Number(item?.count || item?.total || item?.usage || 0),
  };
};

const TrendingHashtags = React.memo(function TrendingHashtags({ colors, hashtags = [], loading = false }: any) {
  const { t } = useTranslation();
  const router = useRouter();
  const data = useMemo(
    () => hashtags.map(normalizeTrendingHashtag).filter(Boolean).slice(0, 8),
    [hashtags]
  );

  if (!loading && data.length === 0) return null;

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.sectionRow}>
        <View style={styles.sectionTitleWrap}>
          <Ionicons name="trending-up" size={15} color={colors.tint || '#C4B5FD'} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('list_user.trending_title')}</Text>
        </View>
      </View>
      <FlatList
        horizontal
        data={loading ? [] : data}
        keyExtractor={(item: any) => item.tag}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trendingHashtagRow}
        ListEmptyComponent={loading ? (
          <View style={{ minHeight: 42, justifyContent: 'center' }}>
            <ActivityIndicator size="small" color={colors.tint || '#C4B5FD'} />
          </View>
        ) : null}
        renderItem={({ item }: any) => (
          <TrendingHashtagChip
            hashtag={item.tag}
            count={item.count}
            onPress={() => router.push({ pathname: '/(screens)/social/HashtagScreen', params: { hashtag: item.tag.replace('#', '') } })}
            style={{ marginRight: 8 }}
          />
        )}
      />
    </View>
  );
});

/* â”€â”€â”€ Suggestions List Header â”€â”€â”€ */
function SuggestionsHeader({ onFilter, colors }: any) {
  const { t } = useTranslation();
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sparkleEmoji}>✨</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('list_user.suggestions_title')}</Text>
      </View>
      <Pressable style={styles.filterLink} onPress={onFilter}>
        <Text style={[styles.sectionLink, { color: colors.tint }]}>{t('list_user.filter')}</Text>
        <Ionicons name="filter" size={14} color={colors.tint} />
      </Pressable>
    </View>
  );
}


/* â”€â”€â”€ Main List Header â”€â”€â”€ */
function HomeListHeader({ users, location, onFilter, viewer, colors, trendingHashtags, hashtagsLoading }: any) {
  return (
    <View style={styles.headerContent}>
      <AiDiscoveryPanel users={users} viewer={viewer} colors={colors} location={location} />
      <TrendingHashtags colors={colors} hashtags={trendingHashtags} loading={hashtagsLoading} />
      <FeaturedSuggestions users={users} location={location} />
      <SuggestionsHeader onFilter={onFilter} colors={colors} />
    </View>
  );
}

/* â”€â”€â”€ UserCard override (match design) â”€â”€â”€ */
/* DesignUserCard merged into UserCard */
const ListUser = React.forwardRef(({ users, onRefresh, refreshing, activeTab = 'home', loadMore, hasMore, loading, loadingMore, onOpenFilter, onScroll }: any, ref: any) => {
  const { location } = React.useContext(LocationContext);
  const insets = useSafeAreaInsets();
  const colors: any = useThemedColors();
  const themedColors: any = useMemo(() => ({
    ...colors,
    text: colors.text,
    subtleText: colors.subtleText,
    surface: colors.surface,
    cardBackground: colors.cardBackground || colors.surface,
    border: colors.border,
    tint: colors.tint,
    palette: {
      ...colors.palette,
      sphereGradient: colors.palette?.sphereGradient || colors.gradientPrimary || NEON,
    },
  }), [colors]);
  const { user: viewer } = useAuth();
  const { trendingHashtags, loading: hashtagsLoading } = useExploreData(true);
  const viewerShowOnline = viewer?.showOnlineStatus !== false;

  const filteredUsers = useMemo(() => {
    const validUsers = users.filter((user: any) =>
      user.username &&
      user.username !== 'Unknown User' &&
      (user.profileUrl || user.photoURL || user.avatarUrl) &&
      user.age !== null &&
      user.age !== undefined &&
      user.gender
    );
    return Array.from(new Map(validUsers.map((u: any) => [u.id || u.uid, u])).values());
  }, [users]);

  const featuredUsers = useMemo(
    () => filteredUsers.filter((u: any) => u?.profileUrl || u?.photoURL || u?.avatarUrl).slice(0, 6),
    [filteredUsers]
  );

  const renderUserItem = useCallback(({ item, index }: any) => (
    <UserCard item={item} index={index} location={location} currentThemeColors={themedColors} viewerShowOnline={viewerShowOnline} activeTab={activeTab} />
  ), [location, activeTab, themedColors, viewerShowOnline]);

  const keyExtractor = useCallback((item: any) => item.id || item.uid, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[colors.tint]}
      tintColor={colors.tint}
    />
  ), [colors.tint, refreshing, onRefresh]);

  const listHeaderComponent = useMemo(() => (
    <HomeListHeader
      users={featuredUsers}
      location={location}
      onFilter={onOpenFilter}
      viewer={viewer}
      colors={themedColors}
      trendingHashtags={trendingHashtags}
      hashtagsLoading={hashtagsLoading}
    />
  ), [featuredUsers, location, onOpenFilter, viewer, themedColors, trendingHashtags, hashtagsLoading]);

  const contentContainerStyle = useMemo(() => [
    styles.listContainer,
    { paddingBottom: Math.max(insets.bottom, 14) + 102 },
  ], [insets.bottom]);

  const handleEndReached = useCallback(() => {
    if (loadMore && hasMore && !loadingMore && !refreshing && !loading) loadMore();
  }, [loadMore, hasMore, loadingMore, refreshing, loading]);

  return (
    <FlatList
      ref={ref}
      data={filteredUsers}
      renderItem={renderUserItem}
      keyExtractor={keyExtractor}
      extraData={viewerShowOnline}
      contentInsetAdjustmentBehavior="automatic"
      ListHeaderComponent={listHeaderComponent}
      contentContainerStyle={contentContainerStyle}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      initialNumToRender={8}
      maxToRenderPerBatch={6}
      windowSize={7}
      updateCellsBatchingPeriod={50}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.15}
      scrollEventThrottle={16}
      onScroll={onScroll}
    />
  );
});

export default React.memo(ListUser);

const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
    backgroundColor: 'transparent',
    paddingTop: 2,
  },
  headerContent: {
    paddingBottom: 2,
  },

  /* AI Card */
  aiCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  aiGradient: {
    minHeight: 160,
    padding: 16,
    gap: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },
  aiGlowRight: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    transform: [{ scale: 1.5 }],
  },
  aiGlowLeft: {
    position: 'absolute',
    left: -40,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    transform: [{ scale: 1.5 }],
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  aiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  aiMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botStage: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -4,
  },
  botAura: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    shadowOffset: { width: 0, height: 0 },
  },
  botOrbit: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.15)',
  },
  orbitDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C4B5FD',
    shadowColor: '#C4B5FD',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  orbitDotTop: {
    top: 6,
    right: 15,
  },
  orbitDotBottom: {
    left: 12,
    bottom: 10,
    backgroundColor: '#22D3EE',
  },
  botIllustration: {
    zIndex: 2,
    transform: [{ scale: 0.72 }],
  },
  botBaseGlow: {
    position: 'absolute',
    bottom: 15,
    width: 60,
    height: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.45)',
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  mascotRoot: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotAntenna: {
    position: 'absolute',
    top: 5,
    width: 24,
    height: 6,
    borderRadius: 5,
    backgroundColor: '#C4B5FD',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    zIndex: 4,
  },
  mascotEarLeft: {
    position: 'absolute',
    left: 8,
    top: 28,
    width: 18,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E9E7FF',
    borderWidth: 1.5,
    borderColor: '#A78BFA',
    zIndex: 2,
  },
  mascotEarRight: {
    position: 'absolute',
    right: 8,
    top: 28,
    width: 18,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E9E7FF',
    borderWidth: 1.5,
    borderColor: '#A78BFA',
    zIndex: 2,
  },
  mascotEarInner: {
    width: 8,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#8B5CF6',
    alignSelf: 'center',
    marginTop: 4,
  },
  mascotHead: {
    width: 54,
    height: 46,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    zIndex: 3,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  mascotVisor: {
    width: 38,
    height: 22,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.45)',
  },
  mascotEye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  mascotSmile: {
    position: 'absolute',
    bottom: 4,
    width: 12,
    height: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: '#C4B5FD',
    borderRadius: 7,
  },
  mascotBody: {
    position: 'absolute',
    bottom: 8,
    width: 36,
    height: 16,
    borderRadius: 15,
    zIndex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  mascotHandLeft: {
    position: 'absolute',
    left: 16,
    top: 20,
    width: 10,
    height: 18,
    borderRadius: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#A78BFA',
    transform: [{ rotate: '-28deg' }],
    zIndex: 1,
  },
  mascotHandRight: {
    position: 'absolute',
    right: 16,
    top: 20,
    width: 10,
    height: 18,
    borderRadius: 7,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#A78BFA',
    transform: [{ rotate: '28deg' }],
    zIndex: 1,
  },
  aiCopyBlock: {
    flex: 1,
    zIndex: 3,
    paddingRight: 16,
    justifyContent: 'center',
  },
  aiHint: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  aiStateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(196,181,253,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.16)',
  },
  aiStateText: {
    color: '#B8BFE0',
    fontSize: 10,
    fontWeight: '800',
    flexShrink: 1,
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  thinkingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#C4B5FD',
  },
  aiInsightRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    zIndex: 3,
    marginTop: -2,
  },
  aiInsightChip: {
    maxWidth: '100%',
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
  },
  aiInsightChipcyan: {
    backgroundColor: 'rgba(8,145,178,0.14)',
    borderColor: 'rgba(103,232,249,0.24)',
  },
  aiInsightChipviolet: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderColor: 'rgba(196,181,253,0.24)',
  },
  aiInsightChiprose: {
    backgroundColor: 'rgba(244,63,94,0.14)',
    borderColor: 'rgba(251,113,133,0.24)',
  },
  aiInsightText: {
    color: '#EAF6FF',
    fontSize: 10.5,
    fontWeight: '900',
  },

  promptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1.5,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 12,
    zIndex: 3,
    marginTop: 4,
  },
  promptInput: {
    flex: 1,
    minHeight: 36,
    fontSize: 14,
    fontWeight: '500',
  },
  promptButtonWrap: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  promptSend: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starterBlock: {
    gap: 6,
    zIndex: 3,
  },
  starterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  starterChip: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  starterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageStack: {
    gap: 6,
    zIndex: 3,
  },
  messageBubble: {
    maxWidth: '92%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#7C3AED',
    borderTopRightRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(8,13,32,0.94)',
    borderColor: 'rgba(103,232,249,0.22)',
    borderWidth: 1,
    borderTopLeftRadius: 7,
  },
  assistantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 5,
  },
  assistantMiniIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,165,233,0.18)',
  },
  assistantMetaText: {
    color: '#A5F3FC',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  messageText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  quickReplyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    zIndex: 3,
  },
  quickReplyChip: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: 'rgba(196,181,253,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.26)',
  },
  quickReplyText: {
    color: '#EDE9FE',
    fontSize: 11,
    fontWeight: '800',
  },
  suggestionCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(103, 232, 249, 0.24)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 3,
  },
  suggestionTextBlock: {
    flex: 1,
    gap: 3,
  },
  suggestionEyebrow: {
    color: '#A5F3FC',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  suggestionTitle: {
    color: TEXT,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  suggestionSummary: {
    color: '#CFE8F5',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  suggestionButton: {
    minWidth: 84,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  suggestionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  aiResultDock: {
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.28)',
    backgroundColor: 'rgba(8,31,52,0.58)',
    gap: 9,
    zIndex: 3,
  },
  aiResultDockInfo: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  aiResultDockIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,165,233,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.22)',
  },
  aiResultDockTextBlock: {
    flex: 1,
    gap: 2,
  },
  aiResultDockTitle: {
    color: TEXT,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  aiResultDockText: {
    color: '#BAE6FD',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  aiResultDockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiDockSecondaryButton: {
    height: 32,
    minWidth: 72,
    borderRadius: 12,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.22)',
  },
  aiDockSecondaryText: {
    color: '#E0F2FE',
    fontSize: 11,
    fontWeight: '900',
  },
  aiDockPrimaryButton: {
    flex: 1,
    height: 32,
    borderRadius: 12,
    overflow: 'hidden',
  },
  aiDockPrimaryGradient: {
    flex: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  aiDockPrimaryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  aiResultPanel: {
    padding: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.42)',
    backgroundColor: 'rgba(8,31,52,0.86)',
    gap: 8,
    zIndex: 3,
  },
  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  aiResultTitleBlock: {
    flex: 1,
    gap: 3,
  },
  aiResultEyebrowRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  aiResultEyebrow: {
    color: '#67E8F9',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  aiResultCountPill: {
    minWidth: 32,
    height: 18,
    borderRadius: 999,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: 'rgba(14,165,233,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.22)',
  },
  aiResultCountText: {
    color: '#BAE6FD',
    fontSize: 9,
    fontWeight: '900',
  },
  aiResultTitle: {
    color: TEXT,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  aiSearchingInline: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(14,165,233,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(103,232,249,0.22)',
  },
  aiSearchingText: {
    color: '#BAE6FD',
    fontSize: 10,
    fontWeight: '800',
  },
  aiCloseButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiResultRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 13,
    backgroundColor: 'rgba(3,12,28,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.12)',
  },
  aiResultAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  aiResultInfo: {
    flex: 1,
    gap: 1,
  },
  aiResultName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '900',
  },
  aiResultMeta: {
    color: '#D7E7F5',
    fontSize: 10.5,
    fontWeight: '700',
  },
  aiResultDistance: {
    color: '#8994B8',
    fontSize: 9,
    fontWeight: '700',
  },
  aiMatchBadge: {
    minWidth: 74,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(244,63,94,0.16)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.24)',
  },
  aiMatchBadgeWarm: {
    backgroundColor: 'rgba(249,115,22,0.13)',
  },
  aiMatchBadgeText: {
    color: '#FB7185',
    fontSize: 10,
    fontWeight: '900',
  },
  aiMatchBadgeTextWarm: {
    color: '#FDBA74',
  },
  aiResultActions: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiRevealButton: {
    height: 32,
    minWidth: 96,
    borderRadius: 12,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(15,23,42,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.22)',
  },
  aiRevealText: {
    color: '#E0F2FE',
    fontSize: 11,
    fontWeight: '900',
  },
  aiMoreButton: {
    marginTop: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  aiMoreButtonInline: {
    flex: 1,
    marginTop: 0,
  },
  aiMoreGradient: {
    minHeight: 32,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  aiMoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },

  /* Featured Cards */
  sectionRow: {
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fireEmoji: { fontSize: 16 },
  sparkleEmoji: { fontSize: 14 },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionLink: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '700',
  },
  featuredRow: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 10,
  },
  trendingHashtagRow: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  featuredCard: {
    width: 130,
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: PANEL,
  },
  featuredHeart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  featuredOnline: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    zIndex: 2,
  },
  featuredInfo: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    gap: 3,
  },
  featuredNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
   featuredJob: {
     color: 'rgba(255,255,255,0.75)',
     fontSize: 10,
     fontWeight: '600',
   },
   featuredVibe: {
     color: '#FDBA74',
     fontSize: 10,
     fontWeight: '600',
   },
   featuredDistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  featuredDist: {
    color: MUTED,
    fontSize: 9,
    fontWeight: '600',
  },
  matchBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  matchText: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* â”€â”€ User List Items â”€â”€ */
  filterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heartBtn: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },

  /* â”€â”€ Upgrade Banner â”€â”€ */
  bannerWrap: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerCopy: {
    flex: 1,
  },
  bannerTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
  },
  bannerSub: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 14,
  },
  bannerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
});
