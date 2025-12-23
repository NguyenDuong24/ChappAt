import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { doc, getDoc, collection, query, orderBy, limit, getDocs, where, documentId } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Text, Avatar, Card, Button, Chip } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemedStatusBar from '@/components/common/ThemedStatusBar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';

interface Member {
  uid: string;
  username?: string;
  profileUrl?: string;
  role?: string;
}

interface Message {
  id: string;
  text?: string;
  senderName?: string;
  profileUrl?: string;
  createdAt?: any;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private';
  isSearchable: boolean;
  createdBy: string;
  members: string[]; // array of uids
  avatarUrl?: string;
}

export default function GroupPreviewScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const themeCtx = useContext(ThemeContext);
  const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (id) {
      loadGroupPreview();
    }
  }, [id]);

  const loadGroupPreview = async () => {
    try {
      setLoading(true);

      // Load group data
      const groupDoc = await getDoc(doc(db, 'groups', id as string));
      if (groupDoc.exists()) {
        const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;
        setGroup(groupData);
        const memberFlag = groupData.members?.includes(user?.uid);
        setIsMember(!!memberFlag);

        // If group is private and user is not a member, don't fetch members or messages
        if (groupData.type === 'private' && !memberFlag) {
          setMembers([]);
          setRecentMessages([]);
          return;
        }

        // Load some members (first 10)
        if (groupData.members?.length > 0) {
          const memberUIDs = groupData.members.slice(0, 10);
          const memberDetails: Member[] = [];

          // Load member details in batches
          for (let i = 0; i < memberUIDs.length; i += 10) {
            const batch = memberUIDs.slice(i, i + 10);
            const q = query(collection(db, 'users'), where(documentId(), 'in', batch));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
              memberDetails.push({ uid: doc.id, ...doc.data() });
            });
          }

          setMembers(memberDetails);
        }

        // Load recent messages (last 5)
        const messagesRef = collection(db, 'groups', id as string, 'messages');
        const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(5));
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as Message[];
        setRecentMessages(messages.reverse()); // Reverse to show oldest first
      }
    } catch (error) {
      console.error('Error loading group preview:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin nhóm');
    } finally {
      setLoading(false);
    }
  };

  const [requestStatus, setRequestStatus] = useState<'none' | 'pending'>('none');

  useEffect(() => {
    if (id && user?.uid) {
      checkRequestStatus();
    }
  }, [id, user]);

  const checkRequestStatus = async () => {
    if (!id || !user?.uid) return;
    const { groupRequestService } = await import('@/services/groupRequestService');
    const result = await groupRequestService.checkRequestStatus(id as string, user.uid);
    if (result.exists && result.data?.status === 'pending') {
      setRequestStatus('pending');
    }
  };

  const handleJoinGroup = async () => {
    if (!user?.uid || !group) return;

    try {
      setJoining(true);

      // Check if already member
      if (group.members?.includes(user.uid)) {
        Alert.alert('Thông báo', 'Bạn đã là thành viên của nhóm này');
        return;
      }

      // Handle Private Groups: Send Request instead of direct join
      if (group.type === 'private') {
        const { groupRequestService } = await import('@/services/groupRequestService');
        const result = await groupRequestService.sendJoinRequest(group.id, user);

        if (result.success) {
          Alert.alert('Thành công', 'Đã gửi yêu cầu tham gia nhóm. Vui lòng chờ quản trị viên duyệt.');
          setRequestStatus('pending');
        } else {
          Alert.alert('Thông báo', result.message);
        }
        return;
      }

      // Public Groups: Join directly
      const { updateDoc, arrayUnion, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'groups', group.id), {
        members: arrayUnion(user.uid),
        updatedAt: serverTimestamp()
      });

      Alert.alert('Thành công', 'Đã tham gia nhóm!', [
        {
          text: 'Vào nhóm',
          onPress: () => router.replace(`/groups/${group.id}`)
        }
      ]);
      setIsMember(true);
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Lỗi', 'Không thể tham gia nhóm. Vui lòng thử lại.');
    } finally {
      setJoining(false);
    }
  };

  const copyGroupId = async () => {
    if (!group?.id) return;
    try {
      await Clipboard.setStringAsync(group.id);
      Alert.alert('Sao chép', 'ID nhóm đã được sao chép vào clipboard');
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const getGroupAvatar = () => {
    return group?.avatarUrl || 'https://via.placeholder.com/100x100/667eea/ffffff?text=G';
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <ThemedStatusBar />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={40} color={currentThemeColors.tint} />
          <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <ThemedStatusBar />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={currentThemeColors.subtleText} />
          <Text style={[styles.errorText, { color: currentThemeColors.text }]}>Không tìm thấy nhóm</Text>
          <Button onPress={() => router.back()}>Quay lại</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <ThemedStatusBar />

      {/* Header */}
      <LinearGradient
        colors={theme === 'dark' ? ['#1a1a2e', '#16213e'] : ['#4facfe', '#00f2fe']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xem trước nhóm</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown} style={styles.content}>

          {/* Group Info Card */}
          <Card style={[styles.groupCard, { backgroundColor: currentThemeColors.cardBackground }]}>
            <Card.Content style={styles.groupCardContent}>
              <Avatar.Image size={80} source={{ uri: getGroupAvatar() }} style={styles.groupAvatar} />
              <View style={styles.groupInfo}>
                <Text style={[styles.groupName, { color: currentThemeColors.text }]}>{group.name || 'Nhóm chưa đặt tên'}</Text>
                <View style={styles.groupMeta}>
                  <Chip icon="account-group" style={styles.chip}>
                    {group.members?.length || 0} thành viên
                  </Chip>
                  {group.type === 'public' && (
                    <Chip icon="earth" style={styles.chip}>
                      Công khai
                    </Chip>
                  )}
                </View>
                {group.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={[styles.descriptionLabel, { color: currentThemeColors.text }]}>Mô tả nhóm:</Text>
                    <Text style={[styles.groupDescription, { color: currentThemeColors.subtleText }]}>
                      {group.description}
                    </Text>
                  </View>
                )}
                <View style={styles.groupMetaRow}>
                  <Text style={[styles.groupIdText, { color: currentThemeColors.subtleText }]}>ID: {group.id}</Text>
                  <TouchableOpacity onPress={copyGroupId} accessibilityRole="button">
                    <MaterialCommunityIcons name="content-copy" size={16} color={currentThemeColors.subtleText} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Join Button */}
          <View style={styles.joinSection}>
            <Button
              mode="contained"
              onPress={handleJoinGroup}
              loading={joining}
              disabled={joining || (group?.type === 'private' && !isMember && requestStatus === 'pending')}
              style={styles.joinButton}
              contentStyle={styles.joinButtonContent}
            >
              {group?.members?.includes(user?.uid) || isMember
                ? 'Đã tham gia'
                : (requestStatus === 'pending'
                  ? 'Đã gửi yêu cầu'
                  : (joining
                    ? 'Đang xử lý...'
                    : (group?.type === 'private' ? 'Xin vào nhóm' : 'Tham gia nhóm')))}
            </Button>
          </View>

          {/* Members Preview */}
          {(group?.type === 'public' || isMember) && members.length > 0 && (
            <Card style={[styles.sectionCard, { backgroundColor: currentThemeColors.cardBackground }]}>
              <Card.Content>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>Thành viên ({members.length})</Text>
                <View style={styles.membersList}>
                  {members.slice(0, 5).map((member) => (
                    <View key={member.uid} style={styles.memberItem}>
                      <Avatar.Image
                        size={40}
                        source={{ uri: member.profileUrl || 'https://via.placeholder.com/40x40/667eea/ffffff?text=U' }}
                      />
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: currentThemeColors.text }]} numberOfLines={1}>
                          {member.username || 'Người dùng'}
                        </Text>
                        {member.uid === group.createdBy && (
                          <Text style={[styles.memberRole, { color: currentThemeColors.subtleText }]}>Người tạo</Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {members.length > 5 && (
                    <Text style={[styles.moreMembers, { color: currentThemeColors.subtleText }]}>
                      và {members.length - 5} thành viên khác...
                    </Text>
                  )}
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Recent Messages Preview */}
          {(group?.type === 'public' || isMember) && recentMessages.length > 0 && (
            <Card style={[styles.sectionCard, { backgroundColor: currentThemeColors.cardBackground }]}>
              <Card.Content>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>Tin nhắn gần đây</Text>
                <View style={styles.messagesList}>
                  {recentMessages.map((message) => (
                    <View key={message.id} style={styles.messageItem}>
                      <Avatar.Image
                        size={32}
                        source={{ uri: message.profileUrl || 'https://via.placeholder.com/32x32/667eea/ffffff?text=U' }}
                      />
                      <View style={styles.messageContent}>
                        <View style={styles.messageHeader}>
                          <Text style={[styles.messageSender, { color: currentThemeColors.text }]} numberOfLines={1}>
                            {message.senderName || 'Người dùng'}
                          </Text>
                          <Text style={[styles.messageTime, { color: currentThemeColors.subtleText }]}>
                            {formatTime(message.createdAt)}
                          </Text>
                        </View>
                        <Text style={[styles.messageText, { color: currentThemeColors.subtleText }]} numberOfLines={2}>
                          {message.text || 'Tin nhắn'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                <Text style={[styles.previewNote, { color: currentThemeColors.subtleText }]}>
                  Tham gia nhóm để xem tất cả tin nhắn
                </Text>
              </Card.Content>
            </Card>
          )}
          {/* Restricted notice for private groups */}
          {group?.type === 'private' && !isMember && (
            <Card style={[styles.sectionCard, { backgroundColor: currentThemeColors.cardBackground }]}>
              <Card.Content>
                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>Nhóm riêng tư</Text>
                <Text style={[styles.previewNote, { color: currentThemeColors.subtleText }]}>
                  Đây là nhóm riêng tư. Bạn cần được mời để xem thành viên và tin nhắn.
                </Text>
                <Button mode="outlined" disabled style={{ marginTop: 12 }}>
                  Liên hệ quản trị viên
                </Button>
              </Card.Content>
            </Card>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  groupCard: {
    marginBottom: 16,
    elevation: 2,
  },
  groupCardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  groupAvatar: {
    marginBottom: 16,
  },
  groupInfo: {
    alignItems: 'center',
    width: '100%',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  groupMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  descriptionContainer: {
    marginTop: 12,
    width: '100%',
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  joinSection: {
    marginBottom: 24,
  },
  joinButton: {
    backgroundColor: '#667eea',
  },
  joinButtonContent: {
    paddingVertical: 8,
  },
  sectionCard: {
    marginBottom: 16,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 14,
  },
  moreMembers: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  messagesList: {
    gap: 16,
  },
  messageItem: {
    flexDirection: 'row',
    gap: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewNote: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  groupMetaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupIdText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
