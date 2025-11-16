import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  Unsubscribe,
  limit,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Alert } from 'react-native';
import contentModerationService from '../services/contentModerationService';

// ✅ Message cache to reduce Firebase reads
const messageCache = new Map<string, { messages: GroupMessage[]; timestamp: number }>();
const CACHE_TTL = 60000; // 60 seconds

export interface GroupMessage {
  id: string;
  text?: string;
  imageUrl?: string;
  uid: string;
  senderName: string;
  profileUrl?: string;
  createdAt: any;
  status: 'sent' | 'delivered' | 'read';
  reactions?: { [emoji: string]: string[] };
  isPinned?: boolean;
  isEdited?: boolean;
  isRecalled?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
    imageUrl?: string | null;
  };
  replies?: any[];
  replyCount?: number;
}

export interface UseGroupMessagesResult {
  messages: GroupMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string, replyTo?: any) => Promise<void>;
  sendImageMessage: (imageUrl: string, text?: string, replyTo?: any) => Promise<void>;
}

export const useGroupMessages = (
  groupId: string, 
  currentUser: { uid: string; username?: string; profileUrl?: string }
): UseGroupMessagesResult => {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    let unsubscribe: Unsubscribe;

    const setupListener = async () => {
      try {
        const groupRef = doc(db, 'groups', groupId);
        const messagesRef = collection(groupRef, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const messagesData: GroupMessage[] = [];
            
            snapshot.forEach((doc) => {
              const data = doc.data();
              
              // Skip recalled messages for non-senders
              if (data.isRecalled && data.uid !== currentUser.uid) {
                return;
              }
              
              // Skip messages deleted by this user
              if (data.deletedFor && data.deletedFor.includes(currentUser.uid)) {
                return;
              }

              const messageObj = {
                id: doc.id,
                text: data.text || '',
                imageUrl: data.imageUrl || null,
                uid: data.uid || '',
                senderName: data.senderName || 'Unknown',
                profileUrl: data.profileUrl || null,
                createdAt: data.createdAt,
                status: data.status || 'sent',
                reactions: data.reactions || {},
                isPinned: data.isPinned || false,
                isEdited: data.isEdited || false,
                isRecalled: data.isRecalled || false,
                replyTo: data.replyTo || null,
                replies: data.replies || [],
                replyCount: data.replyCount || 0,
              };
              
              if (Object.keys(messageObj.reactions).length > 0) {
                console.log('📨 Message with reactions:', messageObj.id, messageObj.reactions);
              }
              
              messagesData.push(messageObj);
            });

            setMessages(messagesData);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error('Error listening to group messages:', err);
            setError('Không thể tải tin nhắn');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up group messages listener:', err);
        setError('Không thể kết nối với nhóm chat');
        setLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [groupId, currentUser?.uid]);

  const sendMessage = async (text: string, replyTo?: any): Promise<void> => {
    if (!text.trim() || !groupId || !currentUser?.uid) {
      return;
    }

    try {
      const groupRef = doc(db, 'groups', groupId);
      const messagesRef = collection(groupRef, 'messages');

      const messageData = {
        text: text.trim(),
        uid: currentUser.uid,
        senderName: currentUser.username || 'Unknown User',
        profileUrl: currentUser.profileUrl || null,
        createdAt: serverTimestamp(),
        status: 'sent',
        reactions: {},
        isPinned: false,
        isEdited: false,
        isRecalled: false,
        ...(replyTo && {
          replyTo: {
            id: replyTo.id,
            text: replyTo.text || '',
            senderName: replyTo.senderName || '',
            imageUrl: replyTo.imageUrl || null,
          }
        }),
      };

      await addDoc(messagesRef, messageData);
    } catch (err) {
      console.error('Error sending group message:', err);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
      throw err;
    }
  };

  const sendImageMessage = async (imageUrl: string, text?: string, replyTo?: any): Promise<void> => {
    if (!imageUrl || !groupId || !currentUser?.uid) {
      return;
    }

    try {
      // Use imported moderation service
      
      // Kiểm tra content moderation cho cả text và image
      const moderationResult = await contentModerationService.moderateContent(
        text?.trim() || undefined,
        imageUrl
      );

      if (!moderationResult.isContentClean) {
        console.log('Content moderation failed:', moderationResult);
        
        let errorMessage = '⚠️ Không thể gửi tin nhắn này:\n';
        
        // Text violations
        if (moderationResult.textResult && !moderationResult.textResult.isClean) {
          errorMessage += `• Tin nhắn: ${contentModerationService.generateWarningMessage(moderationResult.textResult)}\n`;
        }
        
        // Image violations  
        if (moderationResult.imageResult && moderationResult.imageResult.isInappropriate) {
          errorMessage += `• Hình ảnh: ${contentModerationService.generateWarningMessage(moderationResult.imageResult)}`;
          
          if (moderationResult.imageResult.reason) {
            errorMessage += `\n  Lý do: ${moderationResult.imageResult.reason}`;
          }
          
          if (moderationResult.imageResult.confidence) {
            errorMessage += `\n  Độ tin cậy: ${Math.round(moderationResult.imageResult.confidence * 100)}%`;
          }
        }

        Alert.alert(
          '🚫 Nội dung không phù hợp', 
          errorMessage,
          [
            {
              text: 'Đã hiểu',
              style: 'default'
            },
            {
              text: 'Gửi luôn (Không khuyến khích)',
              style: 'destructive',
              onPress: () => {
                // Log warning và vẫn gửi (với flag warning)
                console.warn('User chose to send inappropriate content:', {
                  groupId,
                  userId: currentUser.uid,
                  moderationResult
                });
                
                // Gửi với warning flag
                proceedWithImageMessage(imageUrl, text, replyTo, true);
              }
            }
          ]
        );
        
        return; // Không gửi nếu content không clean
      }

      // Content clean, proceed normally
      await proceedWithImageMessage(imageUrl, text, replyTo, false);
      
    } catch (err) {
      console.error('Error in sendImageMessage:', err);
      
      // Nếu có lỗi trong moderation, hỏi user
      Alert.alert(
        'Lỗi kiểm tra nội dung',
        'Không thể xác minh tính an toàn của nội dung. Bạn có muốn gửi không?',
        [
          {
            text: 'Hủy',
            style: 'cancel'
          },
          {
            text: 'Gửi',
            style: 'default',
            onPress: () => proceedWithImageMessage(imageUrl, text, replyTo, true)
          }
        ]
      );
    }
  };

  // Helper function để thực sự gửi message
  const proceedWithImageMessage = async (
    imageUrl: string, 
    text?: string, 
    replyTo?: any, 
    hasWarning: boolean = false
  ): Promise<void> => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const messagesRef = collection(groupRef, 'messages');

      const messageData = {
        text: text?.trim() || '',
        imageUrl,
        uid: currentUser.uid,
        senderName: currentUser.username || 'Unknown User',
        profileUrl: currentUser.profileUrl || null,
        createdAt: serverTimestamp(),
        status: 'sent',
        reactions: {},
        isPinned: false,
        isEdited: false,
        isRecalled: false,
        // Thêm flag nếu có warning
        ...(hasWarning && { 
          moderationWarning: true,
          moderationTimestamp: serverTimestamp()
        }),
        ...(replyTo && {
          replyTo: {
            id: replyTo.id,
            text: replyTo.text || '',
            senderName: replyTo.senderName || '',
            imageUrl: replyTo.imageUrl || null,
          }
        }),
      };

      await addDoc(messagesRef, messageData);
    } catch (err) {
      console.error('Error sending group image message:', err);
      Alert.alert('Lỗi', 'Không thể gửi hình ảnh');
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    sendImageMessage,
  };
};
