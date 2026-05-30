import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { truncateText } from '@/utils/common';
import { normalizeDisplayText } from '@/utils/textEncoding';
import { useThemedColors } from '@/hooks/useThemedColors';
import UnifiedChatItem from '@/components/chat/UnifiedChatItem';
import GroupPreviewModal from './GroupPreviewModal';

interface GroupItemProps {
  item: any;
  lastMessage?: any;
  currentUser: any;
  noBorder?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  unreadCount?: number;
  isTyping?: boolean;
  onlineMembers?: string[];
  isVoiceCallActive?: boolean;
  voiceCallParticipantsCount?: number;
  isJoined?: boolean;
  onJoinGroup?: (groupId: string) => void;
  isSearchResult?: boolean;
  isPinned?: boolean;
}

const EnhancedGroupItem = ({
  item,
  lastMessage,
  currentUser,
  noBorder = false,
  onPress,
  onLongPress,
  unreadCount = 0,
  isTyping = false,
  onlineMembers = [],
  isVoiceCallActive = false,
  isJoined = false,
  onJoinGroup,
  isSearchResult = false,
  isPinned = false,
}: GroupItemProps) => {
  const { t } = useTranslation();
  const colors = useThemedColors();
  const router = useRouter();
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const onlineCount = onlineMembers?.length || 0;
  const memberCount = item?.members?.length || 0;

  const groupDescription = useMemo(() => {
    if (!item?.description) return null;
    return truncateText(normalizeDisplayText(item.description), 60);
  }, [item?.description]);

  const groupTypeInfo = useMemo(() => {
    const type = item?.type || item?.privacy || (item?.isPublic ? 'public' : 'private');
    if (type === 'public' || type === 'Public') {
      return { icon: 'earth' as const, color: '#0EA5E9', label: t('groups.public') };
    }
    return { icon: 'lock' as const, color: '#F59E0B', label: t('groups.private') };
  }, [item?.type, item?.privacy, item?.isPublic, t]);

  const effectiveLastMessage = useMemo(() => {
    if (isJoined && lastMessage) return lastMessage;
    if (!isJoined) {
      return {
        text: groupDescription || `${memberCount} ${t('groups.members', { defaultValue: 'members' })} • ${onlineCount} ${t('chat.online')}`,
        createdAt: item?.createdAt || null,
      };
    }
    return null;
  }, [groupDescription, isJoined, item?.createdAt, lastMessage, memberCount, onlineCount, t]);

  if (!item?.id) return null;

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    try {
      if (!isJoined) {
        setShowPreviewModal(true);
        return;
      }

      try {
        const readStatusRef = doc(db, 'groups', item.id, 'readStatus', currentUser.uid);
        setDoc(readStatusRef, { lastReadAt: serverTimestamp() }, { merge: true }).catch(() => { });
      } catch { }

      router.push({ pathname: '/groups/[id]', params: { id: item.id } });
    } catch (error) {
      console.error('Error navigating to group:', error);
    }
  };

  const handleJoinGroup = () => {
    if (onJoinGroup && item?.id) {
      onJoinGroup(item.id);
    }
  };

  return (
    <View style={styles.wrapper}>
      <UnifiedChatItem
        item={item}
        isGroup
        currentUser={currentUser}
        lastMessage={effectiveLastMessage}
        unreadCount={isJoined ? unreadCount : 0}
        onPress={handlePress}
        onLongPress={onLongPress}
        isPinned={isPinned}
        isTyping={isTyping}
        onlineCount={onlineCount}
        isVoiceCallActive={isVoiceCallActive}
        groupTypeInfo={groupTypeInfo}
        noBorder={noBorder}
        viewerShowOnline={false}
      />

      {!isJoined && isSearchResult ? (
        <TouchableOpacity
          onPress={handleJoinGroup}
          style={[styles.joinButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.joinButtonText}>{t('groups.join', { defaultValue: 'Join' })}</Text>
        </TouchableOpacity>
      ) : null}

      <GroupPreviewModal
        visible={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        group={item}
        onJoinGroup={handleJoinGroup}
        currentUser={currentUser}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  joinButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default React.memo(EnhancedGroupItem);
