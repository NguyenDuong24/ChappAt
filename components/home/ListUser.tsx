import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

const ITEM_HEIGHT = 88;
const NEON: [string, string, string] = ['#FF35B8', '#8B5CF6', '#22D3EE'];
const PANEL = '#070B18';
const TEXT = '#F8FAFC';
const MUTED = '#A7B0C5';

const AI_STATUS = {
  idle: { label: 'Sẵn sàng hỗ trợ', icon: 'sparkles' as const },
  listening: { label: 'Đang lắng nghe', icon: 'ear-outline' as const },
  thinking: { label: 'Đang suy nghĩ', icon: 'bulb-outline' as const },
  replying: { label: 'Đã có gợi ý', icon: 'chatbubble-ellipses-outline' as const },
};

/* ─── helpers ─── */
const normalize = (value: any) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

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
  const accent = colors.palette?.sphereGradient || colors.gradientPrimary || NEON;
  const [prompt, setPrompt] = useState('');
  const [aiMode, setAiMode] = useState<'idle' | 'thinking' | 'replying'>('idle');
  const [messages, setMessages] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchSummary, setMatchSummary] = useState('');
  const [showAllMatches, setShowAllMatches] = useState(false);
  const viewerName = viewer?.username || viewer?.displayName || viewer?.name || 'bạn';
  const pendingReplyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayMode = aiMode === 'thinking'
    ? 'thinking'
    : prompt.trim()
      ? 'listening'
      : aiMode;
  const aiStatus = AI_STATUS[displayMode];
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

  const handleSend = useCallback(async () => {
    const text = prompt.trim();
    if (!text || aiMode === 'thinking') return;
    if (pendingReplyRef.current) clearTimeout(pendingReplyRef.current);
    setAiMode('thinking');
    setPrompt('');
    setMatches([]);
    setMatchSummary('');
    setShowAllMatches(false);
    const nextConversation = [
      ...messages,
      { role: 'user' as const, text },
    ];
    setMessages(nextConversation);

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
      });
      const nextMatches = Array.isArray(response.matches) ? response.matches : [];
      const assistantText = response.assistantMessage || (
        response.needsMoreInfo
          ? 'Bạn nói thêm một chút để mình tìm đúng người hơn nhé.'
          : nextMatches.length
          ? `Mình tìm thấy ${nextMatches.length} hồ sơ phù hợp với bạn.`
          : 'Hiện chưa có hồ sơ thật nào khớp đủ tốt. Bạn thử mô tả rộng hơn một chút nhé.'
      );

      setMessages([
        ...nextConversation,
        {
          role: 'assistant',
          text: assistantText,
        },
      ]);
      setMatchSummary(assistantText);
      setMatches(nextMatches);
      setAiMode('replying');
    } catch (error: any) {
      const errorMessage = error?.message || 'AI Matchmaker đang bận, vui lòng thử lại sau.';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: errorMessage },
      ]);
      setMatches([]);
      setAiMode('replying');
    } finally {
      pendingReplyRef.current = null;
    }
  }, [aiMode, location?.coords, messages, prompt]);

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
  const canShowMoreMatches = matches.length > visibleMatches.length;

  return (
    <View style={styles.aiCard}>
      <LinearGradient
        colors={['#121633', '#090E20', '#070B18']}
        style={styles.aiGradient}
      >
        <View style={styles.aiGlowRight} pointerEvents="none" />
        <View style={styles.aiGlowLeft} pointerEvents="none" />

        <View style={styles.aiLabelRow}>
          <MaterialCommunityIcons name="robot-happy-outline" size={13} color="#C4B5FD" />
          <Text style={styles.aiLabel}>AI Matchmaker</Text>
        </View>

        <View style={styles.aiMainRow}>
          <View style={styles.aiCopyBlock}>
            <Text style={styles.aiTitle}>Xin chào {viewerName}! 👋</Text>
            <Text style={styles.aiIntro}>Mình là trợ lý AI của bạn.</Text>
            <Text style={styles.aiIntro}>Bạn muốn gặp ai hôm nay?</Text>

            <View style={styles.aiStateLine}>
              <Ionicons name={aiStatus.icon} size={11} color="#DDD6FE" />
              <Text style={styles.aiStateText}>{aiStatus.label}</Text>
              {showStatusDots ? (
                <View style={styles.thinkingDots}>
                  <Animated.View style={[styles.thinkingDot, dotOneStyle]} />
                  <Animated.View style={[styles.thinkingDot, dotTwoStyle]} />
                  <Animated.View style={[styles.thinkingDot, dotThreeStyle]} />
                </View>
              ) : null}
            </View>
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

        {messages.length && !matches.length ? (
          <Animated.View entering={FadeInUp.duration(220)} style={styles.messageStack}>
            {messages.slice(-1).map((message, index) => (
              <View
                key={`${message.role}-${index}-${message.text}`}
                style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                <Text style={styles.messageText} numberOfLines={2}>{message.text}</Text>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {matches.length ? (
          <Animated.View entering={FadeInUp.duration(260)} style={styles.aiResultPanel}>
            <View style={styles.aiResultHeader}>
              <Text style={styles.aiResultTitle}>{matchSummary || 'Đây là những gợi ý phù hợp với bạn nè! ✨'}</Text>
              <Pressable 
                onPress={() => {
                  setMatches([]);
                  setMessages([]);
                  setMatchSummary('');
                  setShowAllMatches(false);
                  setAiMode('idle');
                }}
                style={styles.aiCloseButton}
              >
                <Ionicons name="close" size={16} color="#A7B0C5" />
              </Pressable>
            </View>
            {visibleMatches.map((item: any, index: number) => {
              const avatar = item?.profileUrl || item?.photoURL || item?.avatarUrl;
              const userId = item.id || item.uid;
              const distance = location ? calculateDistance(location.coords, item?.location) : null;
              const reason = Array.isArray(item?.matchReasons) ? item.matchReasons[0] : '';
              const matchPercent = Math.round(Number(item?.matchPercent || item?.matchScore || Math.max(78, 92 - index * 3)));
              return (
                <Pressable
                  key={userId || `${item?.username}-${index}`}
                  style={styles.aiResultRow}
                  onPress={() => router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId } })}
                >
                  {avatar
                    ? <Image source={{ uri: avatar }} style={styles.aiResultAvatar} contentFit="cover" />
                    : <LinearGradient colors={NEON} style={styles.aiResultAvatar} />
                  }
                  <View style={styles.aiResultInfo}>
                    <Text style={styles.aiResultName} numberOfLines={1}>
                      {item?.username || 'ChappAt user'}{typeof item?.age === 'number' ? `, ${item.age}` : ''}
                    </Text>
                    <Text style={styles.aiResultMeta} numberOfLines={1}>
                      {reason || item?.job || item?.bio || 'Hồ sơ mới'}
                    </Text>
                    {(item?.distanceKm !== undefined || (distance !== null && !Number.isNaN(distance))) ? (
                      <Text style={styles.aiResultDistance} numberOfLines={1}>
                        {Math.round(Number(item?.distanceKm ?? distance))}km away
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.aiMatchBadge, index === 2 && styles.aiMatchBadgeWarm]}>
                    <Text style={[styles.aiMatchBadgeText, index === 2 && styles.aiMatchBadgeTextWarm]}>
                      {Math.max(1, Math.min(99, matchPercent))}% match
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {canShowMoreMatches ? (
              <Pressable style={styles.aiMoreButton} onPress={() => setShowAllMatches(true)}>
                <LinearGradient colors={['#6D28D9', '#4F46E5']} style={styles.aiMoreGradient}>
                  <Text style={styles.aiMoreText}>Xem thêm nhiều gợi ý hơn</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </LinearGradient>
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}

        <View style={styles.promptBox}>
          <TextInput
            value={prompt}
            onChangeText={handlePromptChange}
            placeholder="Nhập điều bạn đang tìm..."
            placeholderTextColor="#7F89A8"
            style={styles.promptInput}
            onSubmitEditing={handleSend}
            onBlur={handlePromptBlur}
            returnKeyType="send"
          />
          <Pressable onPress={handleSend} disabled={!prompt.trim() || aiMode === 'thinking'} style={styles.promptButtonWrap}>
            <LinearGradient 
              colors={prompt.trim() && aiMode !== 'thinking' ? accent : ['#353B55', '#23283D']} 
              style={[styles.promptSend, (!prompt.trim() || aiMode === 'thinking') && { opacity: 0.72 }]}
            >
              <Ionicons name="paper-plane" size={17} color={prompt.trim() && aiMode !== 'thinking' ? "#fff" : "#9CA3AF"} />
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

/* ─── Category Row ─── */
const CATEGORIES = [
  { label: 'Dating', icon: 'heart' as const },
  { label: 'Movies', icon: 'film' as const },
  { label: 'Game', icon: 'game-controller' as const },
  { label: 'Chill', icon: 'cafe' as const },
  { label: 'Travel', icon: 'airplane' as const },
  { label: 'More', icon: 'grid' as const },
];

function CategoryRow({ colors }: any) {
  const [active, setActive] = useState('Dating');
  const accent = colors.palette?.sphereGradient || colors.gradientPrimary || NEON;

  return (
    <FlatList
      horizontal
      data={CATEGORIES}
      keyExtractor={(item) => item.label}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryRow}
      renderItem={({ item, index }) => {
        const isActive = item.label === active;
        return (
          <Animated.View entering={FadeInUp.delay(index * 30).duration(280)}>
            <Pressable onPress={() => setActive(item.label)} style={styles.categoryChip}>
              {isActive ? (
                <LinearGradient colors={accent} style={styles.categoryGradient}>
                  <Ionicons name={item.icon} size={14} color="#fff" />
                  <Text style={styles.categoryTextActive}>{item.label}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.categoryGradient, styles.categoryInactive, { borderColor: colors.border }]}>
                  <Ionicons name={item.icon} size={14} color={colors.subtleText || MUTED} />
                  <Text style={[styles.categoryTextInactive, { color: colors.subtleText || MUTED }]}>{item.label}</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        );
      }}
    />
  );
}

/* ─── Featured Cards (Gợi ý nổi bật) - tall portrait style ─── */
const MATCH_COLORS: Record<number, string> = { 0: '#EF4444', 1: '#A855F7', 2: '#EF4444' };

function FeaturedCard({ user, index, location }: any) {
  const router = useRouter();
  const image = user?.profileUrl || user?.photoURL || user?.avatarUrl;
  const distance = location ? calculateDistance(location.coords, user?.location) : null;

  // Pseudo match%
  const matchPct = useMemo(() => 92 - index * 3, [index]);

  if (!user?.id && !user?.uid) return null;

  return (
    <Animated.View entering={FadeInUp.delay(index * 40).duration(300)} layout={Layout.springify()}>
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
          colors={['transparent', 'rgba(0,0,0,0.75)']}
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
            {user?.job || user?.bio || 'ChappAt user'}
          </Text>
          {distance !== null && !Number.isNaN(distance) ? (
            <View style={styles.featuredDistRow}>
              <Ionicons name="location-sharp" size={10} color={MUTED} />
              <Text style={styles.featuredDist}>{distance.toFixed(0)}km away</Text>
            </View>
          ) : null}
          {/* Match badge */}
          <View style={[styles.matchBadge, { backgroundColor: 'rgba(0,0,0,0.55)', borderColor: MATCH_COLORS[index] || '#EF4444' }]}>
            <Text style={[styles.matchText, { color: MATCH_COLORS[index] || '#EF4444' }]}>
              🔥 {matchPct}% match
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function FeaturedSuggestions({ users, location }: any) {
  const featured = users.filter((u: any) => u?.profileUrl || u?.photoURL || u?.avatarUrl).slice(0, 6);
  if (!featured.length) return null;

  return (
    <>
      <View style={styles.sectionRow}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <Text style={styles.sectionTitle}>Gợi ý nổi bật</Text>
        </View>
        <Pressable onPress={() => {}}>
          <Text style={styles.sectionLink}>Xem tất cả {'>'}</Text>
        </Pressable>
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
}

/* ─── Trending Hashtags ─── */
import TrendingHashtagChip from '@/components/common/TrendingHashtagChip';

const TRENDING_HASHTAGS = [
  { tag: '#DatingHanoi', count: 1240 },
  { tag: '#CoffeeChill', count: 856 },
  { tag: '#GymBuddy', count: 642 },
  { tag: '#FindYourVibe', count: 2100 },
  { tag: '#WeekendTrip', count: 435 },
];

function TrendingHashtags({ colors }: any) {
  const router = useRouter();
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.sectionRow}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sparkleEmoji}> ट्रेंड </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Xu hướng</Text>
        </View>
      </View>
      <FlatList
        horizontal
        data={TRENDING_HASHTAGS}
        keyExtractor={(item) => item.tag}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredRow}
        renderItem={({ item }) => (
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
}

/* ─── Suggestions List Header ─── */
function SuggestionsHeader({ onFilter, colors }: any) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sparkleEmoji}>✨</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gợi ý cho bạn</Text>
      </View>
      <Pressable style={styles.filterLink} onPress={onFilter}>
        <Text style={[styles.sectionLink, { color: colors.tint }]}>Lọc</Text>
        <Ionicons name="filter" size={14} color={colors.tint} />
      </Pressable>
    </View>
  );
}

/* ─── Upgrade Banner (bottom) ─── */
function UpgradeBanner({ colors }: any) {
  const accent = colors.palette?.sphereGradient || colors.gradientPrimary || NEON;
  return (
    <View style={styles.bannerWrap}>
      <LinearGradient
        colors={['#1A103A', '#120D2E']}
        style={styles.bannerCard}
      >
        <LinearGradient colors={accent} style={styles.bannerIcon}>
          <Ionicons name="diamond" size={18} color="#fff" />
        </LinearGradient>
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerTitle}>Kết nối không giới hạn</Text>
          <Text style={styles.bannerSub} numberOfLines={2}>
            Xem ai thích bạn, nhắn tin không giới hạn và nhiều đặc quyền khác
          </Text>
        </View>
        <Pressable>
          <LinearGradient colors={accent} style={styles.bannerBtn}>
            <Text style={styles.bannerBtnText}>Nâng cấp ngay</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

/* ─── Main List Header ─── */
function HomeListHeader({ users, location, onFilter, viewer, colors }: any) {
  return (
    <View style={styles.headerContent}>
      <AiDiscoveryPanel users={users} viewer={viewer} colors={colors} location={location} />
      <CategoryRow colors={colors} />
      <TrendingHashtags colors={colors} />
      <FeaturedSuggestions users={users} location={location} />
      <SuggestionsHeader onFilter={onFilter} colors={colors} />
    </View>
  );
}

/* ─── UserCard override (match design) ─── */
function DesignUserCard({ item, index, location, activeTab, colors, viewerShowOnline }: any) {
  const router = useRouter();
  const accent = colors.palette?.sphereGradient || NEON;
  const avatar = item?.profileUrl || item?.photoURL || item?.avatarUrl;
  const distance = location ? calculateDistance(location.coords, item?.location) : null;
  const tags = useMemo(() => {
    const src = Array.isArray(item?.interests) && item.interests.length > 0
      ? item.interests : ['Travel', 'Cafe', 'Music'];
    return src.slice(0, 3);
  }, [item?.interests]);
  const isOnline = item?.isOnline;

  const handleProfile = useCallback(() => {
    router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId: item.id || item.uid } });
  }, [item.id, item.uid, router]);

  const handleChat = useCallback(() => {
    const userId = item.id || item.uid;
    const dest = activeTab === 'chat'
      ? `/(tabs)/chat/${userId}`
      : activeTab === 'home'
        ? `/(tabs)/home/chat/${userId}`
        : `/chat/${userId}`;
    router.push(dest as any);
  }, [activeTab, item.id, item.uid, router]);

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * 35).duration(300)} layout={Layout.springify()}>
      <Pressable style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleProfile}>
        {/* Avatar */}
        <View style={styles.userAvatarWrap}>
          {avatar
            ? <Image source={{ uri: avatar }} style={styles.userAvatar} contentFit="cover" transition={180} />
            : (
              <LinearGradient colors={accent} style={styles.userAvatar}>
                <Ionicons name="person" size={22} color="#fff" />
              </LinearGradient>
            )
          }
          {viewerShowOnline && (
            <View style={[styles.userOnlineDot, { backgroundColor: isOnline ? '#22C55E' : '#6B7280' }]} />
          )}
        </View>

        {/* Info */}
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {item?.username || 'ChappAt user'}{item?.age ? `, ${item.age}` : ''}
            </Text>
            {item?.gender && (
              <MaterialCommunityIcons 
                name={item.gender === 'female' ? 'gender-female' : 'gender-male'} 
                size={14} 
                color={item.gender === 'female' ? '#F472B6' : '#60A5FA'} 
              />
            )}
          </View>
          <View style={styles.userStatusRow}>
            {isOnline && <View style={styles.onlineBadge}><Text style={styles.onlineBadgeText}>Online</Text></View>}
            <Text style={[styles.userBio, { color: colors.subtleText }]} numberOfLines={1}>
              {isOnline ? '  • ' : ''}{item?.bio || item?.job || (distance !== null && !Number.isNaN(distance) ? `${distance.toFixed(0)}km away` : 'ChappAt user')}
            </Text>
          </View>
          <View style={styles.userTags}>
            {tags.map((tag: string, i: number) => (
              <View key={`${tag}-${i}`} style={styles.userTag}>
                <Text style={styles.userTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.userActions}>
          <Pressable style={[styles.userActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleChat}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/* ─── ListUser ─── */
function ListUser({ users, onRefresh, refreshing, activeTab = 'home', loadMore, hasMore, loading, onOpenFilter }: any) {
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
  const viewerShowOnline = viewer?.showOnlineStatus !== false;

  const filteredUsers = useMemo(() =>
    users.filter((user: any) =>
      user.username &&
      user.username !== 'Unknown User' &&
      (user.profileUrl || user.photoURL || user.avatarUrl) &&
      user.age !== null &&
      user.age !== undefined &&
      user.gender
    ),
    [users]
  );

  const renderUserItem = useCallback(({ item, index }: any) => (
    <DesignUserCard
      item={item}
      index={index}
      location={location}
      activeTab={activeTab}
      colors={themedColors}
      viewerShowOnline={viewerShowOnline}
    />
  ), [location, activeTab, themedColors, viewerShowOnline]);

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

  const handleEndReached = useCallback(() => {
    if (loadMore && hasMore && !loading && !refreshing) loadMore();
  }, [loadMore, hasMore, loading, refreshing]);

  return (
    <FlatList
      data={filteredUsers}
      renderItem={renderUserItem}
      keyExtractor={(item: any) => item.id || item.uid}
      getItemLayout={getItemLayout}
      ListHeaderComponent={
        <HomeListHeader
          users={filteredUsers}
          location={location}
          onFilter={onOpenFilter}
          viewer={viewer}
          colors={themedColors}
        />
      }
      ListFooterComponent={<UpgradeBanner colors={themedColors} />}
      contentContainerStyle={[styles.listContainer, { paddingBottom: Math.max(insets.bottom, 14) + 102 }]}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      maxToRenderPerBatch={4}
      windowSize={7}
      removeClippedSubviews
      updateCellsBatchingPeriod={100}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      scrollEventThrottle={16}
    />
  );
}

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
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.42)',
    backgroundColor: '#070B18',
  },
  aiGradient: {
    minHeight: 232,
    padding: 12,
    paddingTop: 12,
    gap: 7,
  },
  aiGlowRight: {
    position: 'absolute',
    right: 20,
    top: 68,
    width: 120,
    height: 72,
    borderRadius: 60,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  aiGlowLeft: {
    position: 'absolute',
    left: -56,
    bottom: -44,
    width: 160,
    height: 112,
    borderRadius: 80,
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
  },
  aiLabelRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 3,
  },
  aiLabel: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  aiMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginBottom: 4,
  },
  botStage: {
    width: 120,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  botAura: {
    position: 'absolute',
    width: 80,
    height: 60,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  botOrbit: {
    position: 'absolute',
    width: 90,
    height: 70,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
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
    transform: [{ scale: 0.85 }],
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
    gap: 2,
  },
  aiTitle: {
    color: TEXT,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
  },
  aiIntro: {
    color: '#D7DCEB',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  aiStateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  aiStateText: {
    color: '#B8BFE0',
    fontSize: 10,
    fontWeight: '800',
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

  promptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.075)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingLeft: 12,
    paddingRight: 5,
    paddingVertical: 4,
    gap: 8,
    zIndex: 3,
  },
  promptInput: {
    flex: 1,
    minHeight: 32,
    color: TEXT,
    fontSize: 13,
    fontWeight: '500',
  },
  promptButtonWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  promptSend: {
    width: 34,
    height: 34,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageStack: {
    gap: 6,
    zIndex: 3,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#7C3AED',
    borderTopRightRadius: 7,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(11,16,36,0.92)',
    borderColor: 'rgba(139,92,246,0.35)',
    borderWidth: 1,
  },
  messageText: {
    color: TEXT,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  aiResultPanel: {
    padding: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    gap: 6,
    zIndex: 3,
  },
  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  aiResultTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
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
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiResultAvatar: {
    width: 38,
    height: 38,
    borderRadius: 9,
  },
  aiResultInfo: {
    flex: 1,
    gap: 1,
  },
  aiResultName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '900',
  },
  aiResultMeta: {
    color: '#B8BFE0',
    fontSize: 10,
    fontWeight: '700',
  },
  aiResultDistance: {
    color: '#8994B8',
    fontSize: 9,
    fontWeight: '700',
  },
  aiMatchBadge: {
    minWidth: 68,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(244,63,94,0.13)',
    alignItems: 'center',
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
  aiMoreButton: {
    marginTop: 2,
    borderRadius: 12,
    overflow: 'hidden',
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

  /* ── Category ── */
  categoryRow: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  categoryChip: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryGradient: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryInactive: {
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  categoryTextActive: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryTextInactive: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* ── Featured Cards ── */
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

  /* ── User List Items ── */
  filterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  userAvatarWrap: {
    position: 'relative',
    width: 52,
    height: 52,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  userOnlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#0A0E1F',
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  userStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  onlineBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  onlineBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  userBio: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  userTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  userTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  userTagText: {
    color: '#C4B5FD',
    fontSize: 9,
    fontWeight: '700',
  },
  userActions: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
  },
  userActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heartBtn: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },

  /* ── Upgrade Banner ── */
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
