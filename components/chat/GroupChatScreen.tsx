import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import GroupMessageList from '../groups/GroupMessageList';
import { useGroupMessages } from '@/hooks/useGroupMessages';

interface GroupChatScreenProps {
  groupId?: string;
  groupName?: string;
  memberCount?: number;
}

const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ 
  groupId = 'test_group_123',
  groupName = 'Nhóm Chat Vui Vẻ',
  memberCount = 12 
}) => {
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const flatListRef = useRef<FlatList>(null);

  // Mock current user if not available
  const currentUser = user || {
    uid: 'current_user',
    username: 'Bạn',
    profileUrl: 'https://via.placeholder.com/100',
  };

  // Use real Firebase hook for group messages
  const { 
    messages, 
    loading, 
    error, 
    sendMessage, 
    sendImageMessage 
  } = useGroupMessages(groupId, currentUser);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    try {
      await sendMessage(input, replyTo);
      setInput('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleReply = (message: any) => {
    setReplyTo(message);
    // Highlight the message being replied to
    setHighlightedMessageId(message.id);
    setTimeout(() => setHighlightedMessageId(null), 2000);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setHighlightedMessageId(null);
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để gửi hình ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      console.log('Selected image:', result.assets[0].uri);
      
      handleSendImageMessage(result.assets[0].uri);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn hình ảnh');
    }
  };

  const handleSendImageMessage = async (imageUri: string, caption?: string) => {
    try {
      await sendImageMessage(imageUri, caption, replyTo);
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending image message:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: currentThemeColors.background }]}>
        <ActivityIndicator size="large" color={currentThemeColors.tint} />
        <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>
          Đang tải tin nhắn...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, { backgroundColor: currentThemeColors.background }]}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#EF4444" />
        <Text style={[styles.errorText, { color: currentThemeColors.text }]}>
          {error}
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: currentThemeColors.tint }]}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: currentThemeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentThemeColors.surface, borderBottomColor: currentThemeColors.border }]}>
        <TouchableOpacity>
          <MaterialCommunityIcons name="arrow-left" size={24} color={currentThemeColors.tint} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.groupName, { color: currentThemeColors.text }]}>{groupName}</Text>
          <Text style={[styles.memberCount, { color: currentThemeColors.subtleText }]}
            numberOfLines={1}
          >
            {memberCount} thành viên • {messages.length} tin nhắn
          </Text>
        </View>
        <TouchableOpacity>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={currentThemeColors.tint} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <GroupMessageList
        messages={messages}
        currentUser={currentUser}
        groupId={groupId}
        scrollViewRef={flatListRef}
        onReply={handleReply}
        highlightedMessageId={highlightedMessageId}
        onClearHighlight={() => setHighlightedMessageId(null)}
      />

      {/* Reply Bar */}
      {replyTo && (
        <View style={[styles.replyBar, { backgroundColor: currentThemeColors.surface, borderTopColor: currentThemeColors.border }]}>
          <View style={styles.replyContent}>
            <Text style={[styles.replyLabel, { color: currentThemeColors.tint }]}>
              Trả lời {replyTo.senderName}
            </Text>
            <Text style={[styles.replyText, { color: currentThemeColors.text }]} numberOfLines={1}>
              {replyTo.imageUrl ? '📷 Hình ảnh' : replyTo.text}
            </Text>
          </View>
          <TouchableOpacity onPress={cancelReply} style={styles.cancelReply}>
            <Ionicons name="close" size={20} color={currentThemeColors.subtleText} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: currentThemeColors.surface, borderTopColor: currentThemeColors.border }]}
      >
        <TouchableOpacity style={styles.iconButton}>
          <MaterialCommunityIcons name="emoticon-outline" size={24} color={currentThemeColors.tint} />
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { backgroundColor: currentThemeColors.inputBackground, color: currentThemeColors.text }]}
          value={input}
          onChangeText={setInput}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={currentThemeColors.placeholderText}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity style={styles.iconButton} onPress={handleImagePicker}>
          <MaterialCommunityIcons name="attachment" size={24} color={currentThemeColors.tint} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sendButton, { backgroundColor: input.trim() ? currentThemeColors.tint : currentThemeColors.border }]} 
          onPress={handleSendMessage}
          disabled={!input.trim()}
        >
          <MaterialCommunityIcons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberCount: {
    fontSize: 12,
  },
  replyBar: {
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    maxHeight: 100,
    marginHorizontal: 8,
  },
  iconButton: {
    padding: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});

export default GroupChatScreen;
