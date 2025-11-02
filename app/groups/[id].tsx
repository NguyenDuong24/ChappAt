import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, StyleSheet, Text, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { doc, getDoc, onSnapshot, collection, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import GroupChatHeader from '@/components/groups/GroupChatHeader';
import GroupMessageList from '@/components/groups/GroupMessageList';
import { TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { decode as atob } from 'base-64';

const storage = getStorage();
const PIC_INPUT_SHAPE = { width: 224, height: 224 };
const NSFW_CLASSES = { 0: 'Drawing', 1: 'Hentai', 2: 'Neutral', 3: 'Porn', 4: 'Sexy' };

// NSFW model assets (relative to this file)
const NSFW_MODEL_JSON = require('../../assets/model/model.json');
const NSFW_MODEL_WEIGHTS = [require('../../assets/model/group1-shard1of1.bin')];

function imageToTensor(rawImageData) {
  try {
    const TO_UINT8ARRAY = true;
    const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY);
    const buffer = new Uint8Array(width * height * 3);
    let offset = 0;
    for (let i = 0; i < buffer.length; i += 3) {
      buffer[i] = data[offset];
      buffer[i + 1] = data[offset + 1];
      buffer[i + 2] = data[offset + 2];
      offset += 4;
    }
    return tf.tidy(() => tf.tensor4d(buffer, [1, height, width, 3]).div(255));
  } catch (error) {
    console.error('Error in imageToTensor:', error);
    throw error;
  }
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const scrollViewRef = useRef<any>(null);

  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [nsfwModel, setNsfwModel] = useState(null);

  const loadGroup = async () => {
    try {
      console.log(`[DEBUG] Loading group ID: ${id}, user UID: ${user.uid}`);
      const groupDoc = await getDoc(doc(db, 'groups', id as string));
      
      if (groupDoc.exists()) {
        const groupData = { id: groupDoc.id, ...groupDoc.data() } as any;
        console.log(`[DEBUG] Group data: ${JSON.stringify(groupData)}`);

        // if (!groupData.members || !Array.isArray(groupData.members) || !groupData.members.includes(user.uid)) {
        //   console.warn(`[WARN] User ${user.uid} not member. Members: ${JSON.stringify(groupData.members)}`);
        //   setError('Bạn không phải thành viên của nhóm này. Kiểm tra quyền truy cập.');
        //   return;
        // }

        setGroup(groupData);
      } else {
        console.error(`[ERROR] Group ${id} not found`);
        setError('Không tìm thấy nhóm chat. Kiểm tra ID nhóm.');
      }
    } catch (error: any) {
      console.error('[ERROR] Load group failed:', error.message);
      setError(`Lỗi tải dữ liệu: ${error.message}. Kiểm tra kết nối hoặc quyền Firebase.`);
    } finally {
      setLoading(false);
    }
  };

  // Load group data - ✅ Fixed dependency array
  useEffect(() => {
    if (!id) {
      setError('ID nhóm không hợp lệ.');
      setLoading(false);
      return;
    }

    if (!user?.uid) {
      console.warn('[WARN] User not authenticated, redirecting to signin');
      setError('Bạn cần đăng nhập để xem nhóm chat.');
      router.replace('/signin');
      return;
    }

    loadGroup();
  }, [id, user?.uid, retryKey]); // ✅ Removed 'group' from dependency array

  // Separate timeout effect - ✅ Better separation of concerns
  useEffect(() => {
    if (!loading) return;

    const timeout = setTimeout(() => {
      if (loading && !group) {
        setLoading(false);
        setError('Tải dữ liệu quá lâu. Kiểm tra mạng hoặc thử lại.');
      }
    }, 20000);

    return () => clearTimeout(timeout);
  }, [loading, group]);

  // Load messages - ✅ This one is correct
  useEffect(() => {
    if (!id || !group || error || loading) return;

    console.log(`[DEBUG] Setup messages listener for group ${id}`);
    const messagesRef = collection(doc(db, 'groups', id as string), 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesList.reverse());
      console.log(`[DEBUG] Loaded ${messagesList.length} messages`);
    }, (err) => {
      console.error('[ERROR] Messages snapshot failed:', err.message);
      setError(`Lỗi tải tin nhắn: ${err.message}`);
    });

    return () => unsubscribe();
  }, [id, group, error, loading]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      const messagesRef = collection(doc(db, 'groups', id as string), 'messages');
      const messageData: any = {
        text: newMessage,
        createdAt: new Date(),
        uid: user.uid,
        profileUrl: user.photoURL || user.profileUrl || '',
        senderName: user.displayName || user.username || '',
        status: 'sent',
        reactions: {},
        isPinned: false,
        isEdited: false,
        isRecalled: false,
      };

      // Add reply data if replying to a message
      if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text || '',
          senderName: replyTo.senderName || '',
          imageUrl: replyTo.imageUrl || null,
        };
      }

      await addDoc(messagesRef, messageData);
      setNewMessage('');
      setReplyTo(null); // Clear reply after sending
      setHighlightedMessageId(null);
    } catch (error) {
      console.error('[ERROR] Send message failed:', (error as any).message);
      setError(`Lỗi gửi tin nhắn: ${(error as any).message}`);
    }
  };

  const handleReply = (message: any) => {
    setReplyTo(message);
    setHighlightedMessageId(message.id);
    // Auto-clear highlight after 2 seconds
    setTimeout(() => setHighlightedMessageId(null), 2000);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setHighlightedMessageId(null);
  };

  const classifyImageNSFW = async (uri) => {
    if (!nsfwModel || !uri) {
      console.warn('NSFW model not loaded or invalid URI');
      return { isInappropriate: false, scores: {}, reason: 'Model not available' };
    }

    console.group(`🔎 NSFW check for: ${uri}`);
    try {
      const resized = await manipulateAsync(
        uri,
        [{ resize: { width: PIC_INPUT_SHAPE.width, height: PIC_INPUT_SHAPE.height } }],
        { format: 'jpeg', base64: true }
      );
      const base64 = resized.base64;
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const input = imageToTensor(bytes);
      const logits = nsfwModel.predict(input);
      const values = await logits.data();
      logits.dispose();
      input.dispose();

      const p = values[3] || 0; // Porn
      const h = values[1] || 0; // Hentai
      const s = values[4] || 0; // Sexy
      const n = values[2] || 0; // Neutral
      const d = values[0] || 0; // Drawing

      // New thresholds: more sensitive
      const isInappropriate = 
        p >= 0.5 ||  
        h >= 0.5 ||  
        s >= 0.7 ||  
        (p + h + s >= 0.8);  

      // Detailed reason, show if above warning threshold
      const reasonParts = [];
      if (p >= 0.45) reasonParts.push(`Porn: ${(p * 100).toFixed(1)}%`);
      if (h >= 0.45) reasonParts.push(`Hentai: ${(h * 100).toFixed(1)}%`);
      if (s >= 0.6) reasonParts.push(`Sexy: ${(s * 100).toFixed(1)}%`);
      const reason = reasonParts.join(', ') || 'An toàn';

      const scores = { p, h, s, n, d };
      console.log('Scores:', scores);
      console.log('Is inappropriate:', isInappropriate);
      console.log('Reason:', reason);

      return { isInappropriate, scores, reason };
    } catch (error) {
      console.error('NSFW classify error:', error);
      return { isInappropriate: true, scores: {}, reason: 'Lỗi xử lý ảnh - chặn để an toàn' }; // Fallback: block if error
    } finally {
      console.groupEnd();
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;

        // Check image content with NSFW model
        const checkResult = await classifyImageNSFW(uri);
        if (checkResult.isInappropriate) {
          Alert.alert('Ảnh không phù hợp', `Ảnh bị chặn vì: ${checkResult.reason}`);
          console.log('⛔ [uploadImage] Image blocked by NSFW check');
          return; // Image blocked
        }
        console.log('✅ [uploadImage] Image passed NSFW check');

        const response = await fetch(uri);
        const blob = await response.blob();
        const imgRef = ref(storage, `groups/${id}/messages/${Date.now()}`);
        await uploadBytes(imgRef, blob);
        const downloadURL = await getDownloadURL(imgRef);
        // Gửi message dạng ảnh
        const messagesRef = collection(doc(db, 'groups', id as string), 'messages');
        await addDoc(messagesRef, {
          imageUrl: downloadURL,
          createdAt: new Date(),
          uid: user.uid,
          profileUrl: user.photoURL || user.profileUrl || '',
          senderName: user.displayName || user.username || '',
          status: 'sent',
          type: 'image',
        });
      }
    } catch (error) {
      console.error('[ERROR] Send image failed:', (error as any).message);
      setError(`Lỗi gửi ảnh: ${(error as any).message}`);
    }
  };

  // Load NSFW model once
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await tf.ready();
        const model = await tf.loadLayersModel(bundleResourceIO(NSFW_MODEL_JSON, NSFW_MODEL_WEIGHTS));
        if (isMounted) setNsfwModel(model);
      } catch (e) {
        console.error('NSFW model load error:', e);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentThemeColors.background }]}>
        <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>
          Đang tải nhóm chat...
        </Text>
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: currentThemeColors.background }]}>
        <Text style={[styles.errorText, { color: currentThemeColors.text }]}>
          {error || 'Không tìm thấy nhóm chat'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
            setRetryKey(prev => prev + 1);
          }}
        >
          <Text style={[styles.buttonText, { color: currentThemeColors.primary }]}>
            Thử lại
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.buttonText, { color: currentThemeColors.primary }]}>
            Quay lại
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}> 
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`/groups/${group.id}`)}>
          <GroupChatHeader group={group} onBack={() => router.back()} />
        </TouchableOpacity>
        <View style={styles.messagesContainer}>
          <GroupMessageList 
            scrollViewRef={scrollViewRef}
            messages={messages}
            currentUser={user}
            groupId={id as string}
            onReply={handleReply}
            highlightedMessageId={highlightedMessageId}
            onClearHighlight={() => setHighlightedMessageId(null)}
          />
        </View>
        
        {/* Reply Preview */}
        {replyTo && (
          <View style={[styles.replyContainer, { backgroundColor: currentThemeColors.surface, borderTopColor: currentThemeColors.border }]}>
            <View style={styles.replyContent}>
              <Text style={[styles.replyLabel, { color: currentThemeColors.tint }]}>
                Trả lời {replyTo.senderName}
              </Text>
              <Text style={[styles.replyText, { color: currentThemeColors.text }]} numberOfLines={1}>
                {replyTo.imageUrl ? '📷 Hình ảnh' : replyTo.text}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelReply} style={styles.cancelReply}>
              <Text style={[styles.cancelText, { color: currentThemeColors.subtleText }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Nhập tin nhắn..."
            mode="outlined"
            style={[styles.input, { backgroundColor: currentThemeColors.inputBackground, borderRadius: 24, paddingLeft: 16 }]}
            theme={{ roundness: 24 }}
            placeholderTextColor={currentThemeColors.placeholderText}
            textColor={currentThemeColors.text}
            left={<TextInput.Icon icon="image" onPress={handlePickImage} />} 
            right={<TextInput.Icon icon="send" onPress={handleSend} />}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  inputContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    height: 50,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  replyContent: {
    flex: 1,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
  },
  cancelReply: {
    padding: 8,
  },
  cancelText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});