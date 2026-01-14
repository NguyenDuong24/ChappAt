import React, { useContext, useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors, PRIMARY_COLOR } from '@/constants/Colors';
import { UserVibe } from '@/types/vibe';
import { useAuth } from '@/context/authContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vibeService } from '@/services/vibeService';
import { db } from '@/firebaseConfig';
import { addDoc, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { getRoomId } from '@/utils/common';
import { useVibeExpiration } from '@/hooks/useVibeExpiration';

interface VibeStoryModalProps {
  visible: boolean;
  onClose: () => void;
  user?: { id: string; username?: string; profileUrl?: string };
  userVibe?: UserVibe | null;
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥'];

const VibeStoryModal: React.FC<VibeStoryModalProps> = ({ visible, onClose, user, userVibe }) => {
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const colors = theme === 'dark' ? Colors.dark : Colors.light;
  const { user: authUser } = useAuth();
  const [reply, setReply] = useState('');
  const vibe = userVibe?.vibe;
  const { formattedTimeAgo } = useVibeExpiration(userVibe);

  // Storage key to track seen
  const seenKey = useMemo(() => userVibe?.id ? `vibeSeen:${userVibe.id}` : undefined, [userVibe?.id]);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkSeen = async () => {
      if (!seenKey) return;
      try {
        const v = await AsyncStorage.getItem(seenKey);
        if (mounted) setSeen(!!v);
      } catch { }
    };
    if (visible) checkSeen();
    return () => { mounted = false };
  }, [visible, seenKey]);

  const markSeen = async () => {
    try {
      if (seenKey) await AsyncStorage.setItem(seenKey, '1');
      if (userVibe?.id && authUser?.uid && authUser.uid !== userVibe.userId) {
        await vibeService.markVibeSeen(userVibe.id, authUser.uid);
      }
      setSeen(true);
    } catch { }
  };

  useEffect(() => {
    if (visible) markSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sendChatMessage = async (toUserId: string, text: string, replyTo?: any) => {
    try {
      if (!authUser?.uid || !text?.trim()) return;
      if (authUser.uid === toUserId) return; // avoid sending to self
      const roomId = getRoomId(authUser.uid, toUserId);
      await setDoc(doc(db, 'rooms', roomId), { roomId, createdAt: Timestamp.fromDate(new Date()) }, { merge: true });
      const messageRef = collection(doc(db, 'rooms', roomId), 'messages');
      await addDoc(messageRef, {
        uid: authUser.uid,
        text: text.trim(),
        profileUrl: authUser?.profileUrl,
        senderName: authUser?.username,
        createdAt: Timestamp.fromDate(new Date()),
        status: 'sent',
        readBy: [],
        ...(replyTo ? { replyTo } : {}),
      });
    } catch (e) {
      // swallow errors silently for modal UX
      console.warn('sendChatMessage failed', e);
    }
  };

  const buildVibeReplyMeta = () => {
    if (!userVibe || !vibe) return null;
    return {
      type: 'vibe',
      id: userVibe.id,
      vibeId: userVibe.vibeId,
      vibeName: vibe.name,
      vibeEmoji: vibe.emoji,
      senderName: 'Vibe',
      text: `${vibe.name} ${vibe.emoji}${userVibe.customMessage ? ` — "${userVibe.customMessage}"` : ''}`,
    };
  };

  const handleQuickReaction = async (emoji: string) => {
    try {
      if (!userVibe?.id || !authUser?.uid) return;
      await vibeService.addVibeReaction(userVibe.id, authUser.uid, { emoji });
      const replyMeta = buildVibeReplyMeta();
      await sendChatMessage(userVibe.userId, emoji, replyMeta || undefined);
      onClose();
    } catch (e) {
      onClose();
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim()) return;
    try {
      if (!userVibe?.id || !authUser?.uid) return;
      const text = reply.trim();
      await vibeService.addVibeReaction(userVibe.id, authUser.uid, { text });
      const replyMeta = buildVibeReplyMeta();
      await sendChatMessage(userVibe.userId, text, replyMeta || undefined);
      setReply('');
      onClose();
    } catch (e) {
      onClose();
    }
  };

  if (!userVibe || !vibe) return null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen">
      <LinearGradient colors={[vibe.color + 'E6', '#000000']} style={styles.gradientBg}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <View style={styles.userRow}>
              {user?.profileUrl ? (
                <Image source={{ uri: user.profileUrl }} style={styles.miniAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.miniAvatar, { backgroundColor: colors.border }]} />
              )}
              <View>
                <Text style={[styles.username, { color: 'white' }]} numberOfLines={1}>
                  {user?.username || 'User'}
                </Text>
                <Text style={styles.timeText}>{formattedTimeAgo}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.center}>
            <Text style={styles.emoji}>{vibe.emoji}</Text>
            <Text style={styles.vibeName}>{vibe.name}</Text>
            {!!userVibe.customMessage && (
              <Text style={styles.message} numberOfLines={3}>
                {userVibe.customMessage}
              </Text>
            )}
          </View>

          <View style={styles.reactionsRow}>
            {QUICK_REACTIONS.map((e) => (
              <TouchableOpacity key={e} onPress={() => handleQuickReaction(e)} style={styles.reactionBtn}>
                <Text style={styles.reactionText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.replyRow, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.25)' }]}>
              <TextInput
                value={reply}
                onChangeText={setReply}
                placeholder="Reply to vibe..."
                placeholderTextColor={'#FFFFFF99'}
                style={styles.input}
              />
              <TouchableOpacity onPress={handleSendReply} style={[styles.sendBtn, { backgroundColor: PRIMARY_COLOR }]}>
                <MaterialIcons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gradientBg: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  userRow: { flexDirection: 'row', alignItems: 'center', maxWidth: '80%' },
  miniAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, borderWidth: 1, borderColor: '#fff', overflow: 'hidden' },
  username: { fontSize: 15, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  timeText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  closeBtn: { padding: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 80, marginBottom: 10 },
  vibeName: { fontSize: 24, color: '#fff', fontWeight: '700', marginBottom: 6 },
  message: { fontSize: 16, color: '#fff', opacity: 0.9, textAlign: 'center', paddingHorizontal: 12 },
  reactionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 },
  reactionBtn: { padding: 8 },
  reactionText: { fontSize: 28 },
  replyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12, borderWidth: 1 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 8, paddingHorizontal: 4 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
});

export default VibeStoryModal;
