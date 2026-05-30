import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  arrayUnion,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { NotificationActionsService } from '@/services/notificationActions';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RevealSideSheet } from '@/components/reveal';
import { LiquidSurface, getLiquidPalette } from '@/components/liquid';
import { useTheme } from '@/context/ThemeContext';
import { db, auth, storage } from '@/firebaseConfig';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { groupPermissionService } from '@/services/groupPermissionService';
import { GroupPermission, GroupRole, ROLE_HIERARCHY } from '@/types/groupPermissions';
import type { FeatureDrawerKey } from './AppDrawer';

type FeatureActionDrawerProps = {
  visible: boolean;
  drawerKey: FeatureDrawerKey | null;
  onClose: () => void;
  paramsByKey?: Partial<Record<FeatureDrawerKey, Record<string, string>>>;
};

type SearchResultItem = {
  id: string;
  title: string;
  subtitle: string;
  type: 'chat' | 'user' | 'group' | 'notification' | 'groupManagement';
  meta?: any;
};

const normalizeSearchText = (value: any) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const getSearchVariants = (term: string) => {
  const trimmed = term.trim();
  const lower = trimmed.toLowerCase();
  const title = lower.length > 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
  return Array.from(new Set([trimmed, lower, title].filter(Boolean)));
};

const pushUniqueResult = (items: SearchResultItem[], item: SearchResultItem, max = 12) => {
  if (items.length >= max) return;
  if (items.some(existing => existing.id === item.id)) return;
  items.push(item);
};

const buildUserSearchResult = (id: string, data: any, tf: (key: string, fallback: string) => string): SearchResultItem => {
  const title = data?.displayName || data?.fullName || data?.name || data?.username || tf('chat.unknown_user', 'Người dùng');
  const handle = data?.username ? `@${data.username}` : data?.email || '';
  const bio = data?.bio || data?.job || data?.university || tf('drawer.addFriend.user_result', 'Kết quả tìm kiếm');
  return {
    id,
    title,
    subtitle: [handle, bio].filter(Boolean).join(' - '),
    type: 'user',
    meta: {
      userId: id,
      senderAvatar: data?.profilePicture || data?.profileUrl || data?.photoURL || data?.avatarUrl,
      type: 'user',
    },
  };
};

const userMatchesTerm = (data: any, normalizedTerm: string) => {
  const haystack = [
    data?.username,
    data?.displayName,
    data?.fullName,
    data?.name,
    data?.email,
  ].map(normalizeSearchText).join(' ');
  return haystack.includes(normalizedTerm);
};

const FeatureActionDrawer = ({ visible, drawerKey, onClose, paramsByKey }: FeatureActionDrawerProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [renderedDrawerKey, setRenderedDrawerKey] = useState<FeatureDrawerKey | null>(drawerKey);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<any>(null);
  const closeResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openWorkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  const [selectedManagementGroup, setSelectedManagementGroup] = useState<string | null>(null);
  const [managementGroupData, setManagementGroupData] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupManagementKeyword, setGroupManagementKeyword] = useState('');
  const [managementFilter, setManagementFilter] = useState<'all' | 'owner' | 'admin' | 'member'>('all');
  const [groupDetailsLoading, setGroupDetailsLoading] = useState(false);
  const [managementError, setManagementError] = useState<string | null>(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [managementTab, setManagementTab] = useState<'overview' | 'members' | 'requests' | 'settings'>('overview');
  const [editedGroupName, setEditedGroupName] = useState('');
  const [editedGroupDesc, setEditedGroupDesc] = useState('');
  const [newMemberUid, setNewMemberUid] = useState('');
  const [currentUserGroupRole, setCurrentUserGroupRole] = useState<GroupRole>(GroupRole.NEWBIE);
  const [canManageCurrentGroup, setCanManageCurrentGroup] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const { theme, isDark, palette: contextPalette } = useTheme();
  const managementGroupId = paramsByKey?.groupManagement?.id || null;
  const currentDrawerKey = drawerKey || renderedDrawerKey;

  // Create group form state
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupType, setGroupType] = useState<'public' | 'private'>('public');
  const [groupImage, setGroupImage] = useState<string | null>(null);

  const localPalette = useMemo(() => getLiquidPalette(theme), [theme]);
  const palette = contextPalette || localPalette;

  // Fallback helper
  const tf = useCallback((key: string, fallback: string) => {
    const translated = t(key);
    return translated !== key ? translated : fallback;
  }, [t]);

  const textColor = palette.textColor;
  const subtextColor = palette.subtitleColor;
  const glassPanelBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const glassBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
  const sheetPanelStyle = useMemo(() => ({ backgroundColor: palette.menuBackground }), [palette.menuBackground]);

  const copyMap: Record<FeatureDrawerKey, { title: string; subtitle: string; icon: any }> = useMemo(() => ({
    notification: {
      title: tf('drawer.notifications.title', 'Thông báo'),
      subtitle: tf('drawer.notifications.subtitle', 'Xem các thông báo của bạn'),
      icon: 'bell-badge-outline',
    },
    chatSearch: {
      title: tf('drawer.chatSearch.title', 'Tìm kiếm chat'),
      subtitle: tf('drawer.chatSearch.subtitle', 'Tìm tin nhắn và cuộc trò chuyện'),
      icon: 'message-search-outline',
    },
    groupSearch: {
      title: tf('drawer.groupSearch.title', 'Tìm kiếm nhóm'),
      subtitle: tf('drawer.groupSearch.subtitle', 'Khám phá các nhóm'),
      icon: 'account-group-outline',
    },
    addFriend: {
      title: tf('drawer.addFriend.title', 'Thêm bạn'),
      subtitle: tf('drawer.addFriend.subtitle', 'Tìm và kết nối với bạn bè'),
      icon: 'account-plus-outline',
    },
    groupManagement: {
      title: tf('drawer.groupManagement.title', 'Quản lý nhóm'),
      subtitle: tf('drawer.groupManagement.subtitle', 'Quản trị nhóm của bạn'),
      icon: 'shield-crown-outline',
    },
    createGroup: {
      title: tf('drawer.createGroup.title', 'Tạo nhóm'),
      subtitle: tf('drawer.createGroup.subtitle', 'Tạo nhóm mới'),
      icon: 'account-multiple-plus-outline',
    },
  }), [tf]);

  const data = useMemo(() => {
    if (!currentDrawerKey) return null;
    return copyMap[currentDrawerKey];
  }, [currentDrawerKey, copyMap]);

  useEffect(() => {
    if (drawerKey) {
      setRenderedDrawerKey(drawerKey);
    }
  }, [drawerKey]);

  useEffect(() => {
    if (closeResetTimer.current) {
      clearTimeout(closeResetTimer.current);
      closeResetTimer.current = null;
    }
    if (openWorkTimer.current) {
      clearTimeout(openWorkTimer.current);
      openWorkTimer.current = null;
    }

    if (!visible) {
      if (!currentDrawerKey) return;
      closeResetTimer.current = setTimeout(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (unsubscribe) unsubscribe();
        setUnsubscribe(null);
        setKeyword('');
        setResults([]);
        setLoading(false);
        setGroupName('');
        setGroupDesc('');
        setGroupType('public');
        setGroupImage(null);
        setSelectedManagementGroup(null);
        setManagementGroupData(null);
        setGroupMembers([]);
        setGroupManagementKeyword('');
        setManagementFilter('all');
        setManagementError(null);
        setManagementTab('overview');
        setEditedGroupName('');
        setEditedGroupDesc('');
        setNewMemberUid('');
        setCurrentUserGroupRole(GroupRole.NEWBIE);
        setCanManageCurrentGroup(false);
        setPendingRequests([]);
        setRenderedDrawerKey(null);
        closeResetTimer.current = null;
      }, 420);
      return;
    }

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      openWorkTimer.current = setTimeout(() => {
        if (cancelled) return;
        if (currentDrawerKey === 'notification') {
          setupNotificationsListener();
        } else if (currentDrawerKey === 'groupManagement') {
          loadMyGroups();
        }
      }, 120);
    });

    return () => {
      cancelled = true;
      task.cancel?.();
      if (openWorkTimer.current) {
        clearTimeout(openWorkTimer.current);
        openWorkTimer.current = null;
      }
    };
  }, [visible, currentDrawerKey, managementGroupId]);

  const setupNotificationsListener = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (unsubscribe) unsubscribe();

    setLoading(true);
    const q = query(
      collection(db, 'notifications'),
      where('receiverId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(25)
    );

    const unsub = onSnapshot(q, (snap) => {
      const mapped: SearchResultItem[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || tf('notifications.new_notification', 'Thông báo mới'),
          subtitle: data.message || data.body || '',
          type: 'notification',
          meta: { ...data, id: d.id },
        };
      });
      setResults(mapped);
      setLoading(false);
    }, (err) => {
      console.error('Notification listener error:', err);
      const simpleQ = query(
        collection(db, 'notifications'),
        where('receiverId', '==', currentUser.uid),
        limit(25)
      );
      getDocs(simpleQ).then(snap => {
         const mapped: SearchResultItem[] = snap.docs.map(d => ({
            id: d.id,
            title: d.data().title || tf('notifications.new_notification', 'Thông báo mới'),
            subtitle: d.data().message || d.data().body || '',
            type: 'notification',
            meta: { ...d.data(), id: d.id },
         }));
         setResults(mapped);
         setLoading(false);
      });
    });

    setUnsubscribe(() => unsub);
  }, [tf, unsubscribe]);

  const pickGroupImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setGroupImage(result.assets[0].uri);
      }
    } catch (error) {
       console.log('Image pick error', error);
    }
  };

  const loadNotifications = useCallback(async () => {
    setupNotificationsListener();
  }, [setupNotificationsListener]);

  const loadGroupDetailsForManagement = useCallback(async (groupId: string) => {
    try {
      setGroupDetailsLoading(true);
      setManagementError(null);
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (!groupDoc.exists()) return;
      
      const groupData = { id: groupDoc.id, ...groupDoc.data() } as any;
      const currentUser = auth.currentUser;
      setManagementGroupData(groupData);
      setSelectedManagementGroup(groupId);
      setPendingRequestCount(0);
      
      const role = await groupPermissionService.getUserRole(groupId, currentUser?.uid || '');
      const permission = currentUser
        ? await groupPermissionService.hasPermission(groupId, currentUser.uid, GroupPermission.EDIT_GROUP_INFO)
        : { hasPermission: false };
      setCurrentUserGroupRole(role);
      setCanManageCurrentGroup(!!permission.hasPermission);

      const members = (groupData.members || []).slice(0, 40);
      const memberRoles = groupData.memberRoles || {};
      
      const memberDocs = await Promise.allSettled(
        members.map((uid: string) => getDoc(doc(db, 'users', uid)).catch(() => null))
      );
      
      const membersData = memberDocs
        .map((result: any) => {
          if (result.status === 'fulfilled' && result.value) {
            const doc = result.value;
            return {
              uid: doc.id,
              displayName: doc.data()?.displayName || doc.data()?.username || tf('chat.unknown_user', 'Người dùng'),
              photoURL: doc.data()?.profilePicture || doc.data()?.profileUrl || doc.data()?.photoURL,
              role: memberRoles[doc.id] || 'member'
            };
          }
          return null;
        })
        .filter((m: any): m is any => m !== null);
      
      setGroupMembers(membersData);
      const admins = Array.isArray(groupData.admins) ? groupData.admins : [];
      const ownerId = groupData.ownerId || groupData.createdBy;
      const canReviewRequests = currentUser && (ownerId === currentUser.uid || admins.includes(currentUser.uid));
      if (canReviewRequests) {
        try {
          const { groupRequestService } = await import('@/services/groupRequestService');
          const requests = await groupRequestService.getPendingRequests(groupId);
          setPendingRequests(requests);
          setPendingRequestCount(requests.length);
        } catch {
          setPendingRequests([]);
          setPendingRequestCount(0);
        }
      } else {
        setPendingRequests([]);
        setPendingRequestCount(0);
      }
    } catch (err) {
      console.log('Load group details error:', err);
      setManagementError(tf('drawer.groupManagement.detail_error', 'Lỗi tải chi tiết nhóm'));
    } finally {
      setGroupDetailsLoading(false);
    }
  }, [tf]);

  const loadMyGroups = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    if (!managementGroupId) {
      setResults([]);
      setManagementGroupData(null);
      setGroupMembers([]);
      setManagementError(tf('drawer.groupManagement.open_from_group', 'Vui lòng mở từ nhóm'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setManagementError(null);
    try {
      await loadGroupDetailsForManagement(managementGroupId);
    } catch (err) {
      console.log('Groups management error:', err);
      setManagementError(tf('drawer.groupManagement.load_error', 'Lỗi tải danh sách nhóm'));
    } finally {
      setLoading(false);
    }
  }, [loadGroupDetailsForManagement, managementGroupId, tf]);

  const performSearch = useCallback(async (text: string) => {
    const term = text.trim();
    if (!term || term.length < 2) {
      if (currentDrawerKey === 'notification') loadNotifications();
      else if (currentDrawerKey === 'groupManagement') loadMyGroups();
      else setResults([]);
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const newResults: SearchResultItem[] = [];
      const normalizedTerm = normalizeSearchText(term);

      if (currentDrawerKey === 'chatSearch') {
        const roomsQuery = query(collection(db, 'rooms'), where('participants', 'array-contains', currentUser.uid), limit(15));
        const roomsSnap = await getDocs(roomsQuery);
        for (const roomDoc of roomsSnap.docs) {
          const roomId = roomDoc.id;
          const roomData: any = roomDoc.data();
          const otherUserId = Array.isArray(roomData?.participants)
            ? roomData.participants.find((uid: string) => uid !== currentUser.uid)
            : null;
          if (otherUserId) {
            let otherUserData = roomData?.participantsData?.[otherUserId] || {};
            if (!userMatchesTerm(otherUserData, normalizedTerm)) {
              try {
                const userSnap = await getDoc(doc(db, 'users', otherUserId));
                if (userSnap.exists()) {
                  otherUserData = { id: otherUserId, ...userSnap.data() };
                }
              } catch { }
            }
            if (userMatchesTerm(otherUserData, normalizedTerm)) {
              const title = otherUserData?.displayName || otherUserData?.username || otherUserData?.name || tf('chat.unknown_user', 'Người dùng');
              const preview = roomData?.lastMessage?.text || tf('chat.message', 'Tin nhắn');
              pushUniqueResult(newResults, {
                id: `${roomId}_conversation`,
                title,
                subtitle: preview,
                type: 'chat',
                meta: {
                  roomId,
                  senderAvatar: otherUserData?.profilePicture || otherUserData?.profileUrl || otherUserData?.photoURL || otherUserData?.avatarUrl,
                  type: 'user',
                },
              });
            }
          }

          const msgQuery = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt', 'desc'), limit(100));
          const msgSnap = await getDocs(msgQuery);
          msgSnap.docs.forEach((d) => {
            if (normalizeSearchText(d.data().text).includes(normalizedTerm)) {
              pushUniqueResult(newResults, {
                id: `${roomId}_${d.id}`,
                title: d.data().senderName || tf('chat.unknown_user', 'Người dùng'),
                subtitle: d.data().text,
                type: 'chat',
                meta: { roomId, messageId: d.id, senderAvatar: d.data().profileUrl, type: 'message' },
              });
            }
          });
          if (newResults.length > 10) break;
        }
      } else if (currentDrawerKey === 'addFriend') {
        const usersRef = collection(db, 'users');
        const variants = getSearchVariants(term);
        const fields = ['username', 'displayName', 'name', 'fullName'];
        const searchPromises = fields.flatMap((field) =>
          variants.map((variant) => getDocs(query(usersRef, where(field, '>=', variant), where(field, '<=', variant + '\uf8ff'), limit(10))))
        );
        const snaps = await Promise.allSettled(searchPromises);
        snaps.forEach((result) => {
          if (result.status !== 'fulfilled') return;
          result.value.docs.forEach((d) => {
            if (d.id === currentUser.uid) return;
            const data = d.data();
            if (!userMatchesTerm(data, normalizedTerm)) return;
            pushUniqueResult(newResults, buildUserSearchResult(d.id, data, tf), 14);
          });
        });

        if (newResults.length < 8) {
          const fallbackSnap = await getDocs(query(usersRef, limit(80)));
          fallbackSnap.docs.forEach((d) => {
            if (d.id === currentUser.uid) return;
            const data = d.data();
            if (!userMatchesTerm(data, normalizedTerm)) return;
            pushUniqueResult(newResults, buildUserSearchResult(d.id, data, tf), 14);
          });
        }
      } else if (currentDrawerKey === 'groupSearch') {
        const groupsRef = collection(db, 'groups');
        const variants = getSearchVariants(term);
        const groupSnaps = await Promise.allSettled(
          variants.map((variant) => getDocs(query(groupsRef, where('name', '>=', variant), where('name', '<=', variant + '\uf8ff'), limit(10))))
        );
        groupSnaps.forEach((result) => {
          if (result.status !== 'fulfilled') return;
          result.value.docs.forEach((d) => {
            const data = d.data();
            const matches = normalizeSearchText(`${data?.name || ''} ${data?.description || ''}`).includes(normalizedTerm);
            if (!matches) return;
            pushUniqueResult(newResults, { id: d.id, title: data.name || tf('groups.unnamed', 'Nhóm không tên'), subtitle: data.description || '', type: 'group', meta: { groupId: d.id } });
          });
        });
      }

      setResults(newResults);
    } catch (err) {
      console.log('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDrawerKey, loadNotifications, loadMyGroups, tf]);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
        Alert.alert(tf('group_create.errors.name_required', 'Tên nhóm không được để trống'), '');
        return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setLoading(true);
    try {
        let photoURL = '';
        if (groupImage) {
            const response = await fetch(groupImage);
            const blob = await response.blob();
            const imageRef = ref(storage, `groups/${nanoid()}`);
            await uploadBytes(imageRef, blob);
            photoURL = await getDownloadURL(imageRef);
        }

        const groupData = {
            name: groupName.trim(),
            description: groupDesc.trim(),
            ownerId: currentUser.uid,
            members: [currentUser.uid],
            admins: [currentUser.uid],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            type: groupType,
            photoURL,
            isSearchable: groupType === 'public',
        };
        const docRef = await addDoc(collection(db, 'groups'), groupData);
        onClose();
        InteractionManager.runAfterInteractions(() => {
            router.push(`/chat/${docRef.id}`);
        });
    } catch (err) {
        console.log('Create group error:', err);
        Alert.alert(tf('common.error', 'Lỗi'), tf('group_create.errors.uid_add_failed', 'Lỗi thêm thành viên'));
    } finally {
        setLoading(false);
    }
  }, [groupName, groupDesc, groupType, groupImage, onClose, router, tf]);

  const handleKeywordChange = (text: string) => {
    setKeyword(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      performSearch(text);
    }, 450);
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (e) {
      console.log('Mark read error:', e);
    }
  };

  const handleAction = async (item: SearchResultItem, action: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
      setLoading(true);
      switch (action) {
        case 'like_back':
          if (item.meta.postId && item.meta.senderId) {
             await NotificationActionsService.likePost(currentUser.uid, item.meta.postId, item.meta.senderId);
             Alert.alert(tf('common.success', 'Thành công'), tf('notifications.liked_back', 'Đã thích lại'));
          }
          break;
        case 'follow_back':
          if (item.meta.senderId) {
             await NotificationActionsService.followUser(currentUser.uid, item.meta.senderId, item.meta.senderName || tf('chat.unknown_user', 'Người dùng'));
             Alert.alert(tf('common.success', 'Thành công'), tf('notifications.followed_back', 'Đã theo dõi lại'));
          }
          break;
        case 'accept_friend':
           break;
      }
    } catch (e) {
      console.log('Action error:', e);
    } finally {
      setLoading(false);
    }
  };

  const canManageMemberRole = useCallback((targetRole: GroupRole | string) => {
    return ROLE_HIERARCHY[currentUserGroupRole] > (ROLE_HIERARCHY[targetRole as GroupRole] || 0);
  }, [currentUserGroupRole]);

  const saveManagedGroupInfo = useCallback(async () => {
    if (!managementGroupId || !canManageCurrentGroup) return;
    if (!editedGroupName.trim()) {
      Alert.alert(tf('common.error', 'Lỗi'), tf('group_management.empty_group_name', 'Tên nhóm không được để trống'));
      return;
    }

    setGroupDetailsLoading(true);
    try {
      await updateDoc(doc(db, 'groups', managementGroupId), {
        name: editedGroupName.trim(),
        description: editedGroupDesc.trim(),
        updatedAt: serverTimestamp(),
      });
      await loadGroupDetailsForManagement(managementGroupId);
      Alert.alert(tf('common.success', 'Thành công'), tf('group_management.update_group_success', 'Cập nhật nhóm thành công'));
    } catch (error) {
      console.log('Save managed group error:', error);
      Alert.alert(tf('common.error', 'Lỗi'), tf('group_management.update_group_error', 'Lỗi cập nhật nhóm'));
    } finally {
      setGroupDetailsLoading(false);
    }
  }, [canManageCurrentGroup, editedGroupDesc, editedGroupName, loadGroupDetailsForManagement, managementGroupId, tf]);

  const changeManagedGroupAvatar = useCallback(async () => {
    if (!managementGroupId || !canManageCurrentGroup) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setGroupDetailsLoading(true);
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const imageRef = ref(storage, `groups/${managementGroupId}/avatar-${nanoid()}`);
        await uploadBytes(imageRef, blob);
        const photoURL = await getDownloadURL(imageRef);
        await updateDoc(doc(db, 'groups', managementGroupId), {
          photoURL,
          avatarUrl: photoURL,
          updatedAt: serverTimestamp(),
        });
        await loadGroupDetailsForManagement(managementGroupId);
      }
    } catch (error) {
      console.log('Managed avatar error:', error);
      Alert.alert(tf('common.error', 'Lỗi'), tf('group_management.update_avatar_error', 'Lỗi cập nhật ảnh đại diện'));
    } finally {
      setGroupDetailsLoading(false);
    }
  }, [canManageCurrentGroup, loadGroupDetailsForManagement, managementGroupId, tf]);

  const addManagedMember = useCallback(async () => {
    const uid = newMemberUid.trim();
    if (!managementGroupId || !canManageCurrentGroup || !uid) return;

    setGroupDetailsLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        Alert.alert(tf('common.error', 'Lỗi'), tf('group_management.user_not_found_uid', 'Không tìm thấy người dùng'));
        return;
      }
      if ((managementGroupData?.members || []).includes(uid)) {
        Alert.alert(tf('common.error', 'Lỗi'), tf('group_management.user_already_member', 'Người dùng đã là thành viên'));
        return;
      }

      await updateDoc(doc(db, 'groups', managementGroupId), {
        members: arrayUnion(uid),
        memberRoles: {
          ...(managementGroupData?.memberRoles || {}),
          [uid]: GroupRole.NEWBIE,
        },
        updatedAt: serverTimestamp(),
      });
      setNewMemberUid('');
      await loadGroupDetailsForManagement(managementGroupId);
    } catch (error) {
      console.log('Managed add member error:', error);
      Alert.alert(tf('common.error', 'Lỗi'), tf('group_management.add_member_error', 'Lỗi thêm thành viên'));
    } finally {
      setGroupDetailsLoading(false);
    }
  }, [canManageCurrentGroup, loadGroupDetailsForManagement, managementGroupData, managementGroupId, newMemberUid, tf]);

  const changeManagedMemberRole = useCallback(async (targetUserId: string, newRole: GroupRole) => {
    const currentUser = auth.currentUser;
    if (!managementGroupId || !currentUser) return;
    setGroupDetailsLoading(true);
    try {
      const result = await groupPermissionService.changeMemberRole(managementGroupId, targetUserId, newRole, currentUser.uid);
      if (!result.success) {
        Alert.alert(tf('common.error', 'Lỗi'), result.message);
      }
      await loadGroupDetailsForManagement(managementGroupId);
    } catch {
      Alert.alert(tf('common.error', 'Lỗi'), tf('group_management.change_role_error', 'Lỗi thay đổi vai trò'));
    } finally {
      setGroupDetailsLoading(false);
    }
  }, [loadGroupDetailsForManagement, managementGroupId, tf]);

  const removeManagedMember = useCallback((targetUserId: string) => {
    const currentUser = auth.currentUser;
    if (!managementGroupId || !currentUser) return;
    Alert.alert(tf('common.confirm', 'Xác nhận'), tf('group_management.remove_member_confirm', 'Bạn có chắc muốn xóa thành viên này?'), [
      { text: tf('common.cancel', 'Hủy'), style: 'cancel' },
      {
        text: tf('common.delete', 'Xóa'),
        style: 'destructive',
        onPress: async () => {
          setGroupDetailsLoading(true);
          try {
            const result = await groupPermissionService.removeMember(managementGroupId, targetUserId, currentUser.uid);
            if (!result.success) {
              Alert.alert(tf('common.error', 'Lỗi'), result.message);
            }
            await loadGroupDetailsForManagement(managementGroupId);
          } catch {
            Alert.alert(tf('common.error', 'Lỗi'), tf('group_management.remove_member_error', 'Lỗi xóa thành viên'));
          } finally {
            setGroupDetailsLoading(false);
          }
        },
      },
    ]);
  }, [loadGroupDetailsForManagement, managementGroupId, tf]);

  const handleManagedRequest = useCallback(async (requestUid: string, action: 'approve' | 'reject') => {
    const currentUser = auth.currentUser;
    if (!managementGroupId || !currentUser) return;
    setGroupDetailsLoading(true);
    try {
      const { groupRequestService } = await import('@/services/groupRequestService');
      const result = action === 'approve'
        ? await groupRequestService.approveRequest(managementGroupId, requestUid, currentUser.uid)
        : await groupRequestService.rejectRequest(managementGroupId, requestUid);
      if (!result.success) Alert.alert(tf('common.error', 'Lỗi'), result.message);
      await loadGroupDetailsForManagement(managementGroupId);
    } catch {
      Alert.alert(tf('common.error', 'Lỗi'), action === 'approve' ? tf('group_management.approve_request_error', 'Lỗi phê duyệt yêu cầu') : tf('group_management.reject_request_error', 'Lỗi từ chối yêu cầu'));
    } finally {
      setGroupDetailsLoading(false);
    }
  }, [loadGroupDetailsForManagement, managementGroupId, tf]);

  const updateManagedGroupType = useCallback(async (nextType: 'public' | 'private') => {
    if (!managementGroupId || !canManageCurrentGroup) return;
    setGroupDetailsLoading(true);
    try {
      await updateDoc(doc(db, 'groups', managementGroupId), {
        type: nextType,
        isSearchable: nextType === 'public',
        updatedAt: serverTimestamp(),
      });
      await loadGroupDetailsForManagement(managementGroupId);
    } catch {
      Alert.alert(tf('common.error', 'Lỗi'), tf('group_management.update_group_error', 'Lỗi cập nhật nhóm'));
    } finally {
      setGroupDetailsLoading(false);
    }
  }, [canManageCurrentGroup, loadGroupDetailsForManagement, managementGroupId, tf]);

  const leaveManagedGroup = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!managementGroupId || !currentUser) return;
    Alert.alert(tf('group_management.leave_group_title', 'Rời nhóm'), tf('group_management.leave_group_confirm', 'Bạn có chắc muốn rời nhóm?'), [
      { text: tf('common.cancel', 'Hủy'), style: 'cancel' },
      {
        text: tf('group_management.leave_group_action', 'Rời nhóm'),
        style: 'destructive',
        onPress: async () => {
          setGroupDetailsLoading(true);
          try {
            const result = await groupPermissionService.removeMember(managementGroupId, currentUser.uid, currentUser.uid);
            if (result.success) {
              onClose();
              router.replace('/(tabs)/groups');
            } else {
              Alert.alert(tf('common.error', 'Lỗi'), result.message);
            }
          } catch {
            Alert.alert(tf('common.error', 'Lỗi'), tf('group_management.leave_group_error', 'Lỗi rời nhóm'));
          } finally {
            setGroupDetailsLoading(false);
          }
        },
      },
    ]);
  }, [managementGroupId, onClose, router, tf]);

  const handleResultPress = (item: SearchResultItem) => {
    if (item.type === 'notification') {
        markAsRead(item.id);
    }
    
    Keyboard.dismiss();
    onClose();
    InteractionManager.runAfterInteractions(() => {
      switch (item.type) {
        case 'chat':
          router.push({ pathname: '/chat/[id]', params: { id: item.meta.roomId, messageId: item.meta.messageId } });
          break;
        case 'user':
          router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId: item.id } });
          break;
        case 'group':
          router.push(`/chat/${item.id}`);
          break;
        case 'groupManagement':
          router.push(`/groups/${item.id}`);
          break;
        case 'notification':
          if (item.meta.chatId) {
            router.push(`/chat/${item.meta.chatId}`);
          } else if (item.meta.postId) {
            router.push({ pathname: '/(screens)/social/PostDetailScreen', params: { postId: item.meta.postId } });
          } else if (item.meta.hotSpotId) {
            router.push({ pathname: '/(screens)/hotspots/HotSpotDetailScreen', params: { hotSpotId: item.meta.hotSpotId } });
          } else if (item.meta.groupId) {
            router.push(`/groups/${item.meta.groupId}`);
          } else if (item.meta.senderId || item.meta.userId) {
            router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId: item.meta.senderId || item.meta.userId } });
          }
          break;
      }
    });
  };

  const quickActions = useMemo(() => {
    switch (currentDrawerKey) {
      case 'notification': return [
        tf('notifications.categories.all', 'Tất cả'),
        tf('notifications.categories.mention', 'Nhắc đến'),
        tf('notifications.categories.friend_request', 'Lời mời kết bạn'),
        tf('notifications.categories.call', 'Cuộc gọi')
      ];
      case 'chatSearch': return [
        tf('chat.message', 'Tin nhắn'),
        tf('chat.user', 'Người dùng'),
        tf('drawer.chatSearch.links', 'Liên kết'),
        tf('drawer.chatSearch.photos', 'Ảnh')
      ];
      case 'addFriend': return [
        tf('drawer.addFriend.nearby', 'Gần đây'),
        tf('drawer.addFriend.same_city', 'Cùng thành phố'),
        tf('drawer.addFriend.same_school', 'Cùng trường'),
        tf('drawer.addFriend.interests', 'Sở thích')
      ];
      case 'groupSearch': return [
        tf('social.trending', 'Xu hướng'),
        tf('drawer.groupSearch.local', 'Địa phương'),
        tf('drawer.groupSearch.global', 'Toàn cầu'),
        tf('drawer.groupSearch.gaming', 'Game')
      ];
      case 'groupManagement': return [
        tf('drawer.groupManagement.ownership', 'Sở hữu'),
        tf('drawer.groupManagement.moderating', 'Quản lý'),
        tf('drawer.groupManagement.invites', 'Lời mời')
      ];
      default: return [
        tf('social.latest', 'Mới nhất'),
        tf('signup.name_placeholder', 'Tên'),
        tf('proximity.title', 'Gần đây')
      ];
    }
  }, [currentDrawerKey, tf]);
  
  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    const now = new Date().getTime();
    const then = timestamp.seconds * 1000;
    const diff = (now - then) / 1000;
    if (diff < 60) return tf('time.now', 'Vừa xong');
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const filteredManagementGroups = useMemo(() => {
    const term = groupManagementKeyword.trim().toLowerCase();
    return results.filter(item => {
      if (item.type !== 'groupManagement') return false;
      const matchesRole = managementFilter === 'all' || item.meta?.role === managementFilter;
      const matchesTerm = !term
        || item.title.toLowerCase().includes(term)
        || (item.subtitle || '').toLowerCase().includes(term);
      return matchesRole && matchesTerm;
    });
  }, [groupManagementKeyword, managementFilter, results]);

  const selectedGroupRole = useMemo(() => {
    return currentUserGroupRole || GroupRole.NEWBIE;
  }, [currentUserGroupRole]);

  const canQuickManageSelectedGroup = canManageCurrentGroup || selectedGroupRole === GroupRole.ADMIN;

  const managementCounts = useMemo(() => {
    return results.reduce((acc, item) => {
      if (item.type !== 'groupManagement') return acc;
      acc.total += 1;
      if (item.meta?.role === 'owner') acc.owner += 1;
      if (item.meta?.role === 'admin') acc.admin += 1;
      if (item.meta?.role === 'member') acc.member += 1;
      return acc;
    }, { total: 0, owner: 0, admin: 0, member: 0 });
  }, [results]);

  if (!currentDrawerKey || !data) return null;

  const tabHeight = 65;
  const totalBottomInset = Math.max(insets.bottom, 20) + tabHeight;

  return (
    <RevealSideSheet
      visible={visible}
      onClose={onClose}
      side="left"
      widthRatio={0.92}
      maxWidth={520}
      bottomInset={totalBottomInset}
      contentMountDelayMs={70}
      panelStyle={sheetPanelStyle}
    >
      <LiquidSurface themeMode={theme} borderRadius={40} intensity={theme === 'dark' ? 44 : 58} style={styles.outerContainer}>
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.instaHeader}>
            <Text style={[styles.instaTitle, { color: textColor }]}>{data.title}</Text>
            <Pressable onPress={onClose} style={styles.instaCloseCircle}>
               <MaterialCommunityIcons name="close" size={20} color={textColor} />
            </Pressable>
          </View>

          {currentDrawerKey !== 'notification' && currentDrawerKey !== 'createGroup' && currentDrawerKey !== 'groupManagement' && (
            <View style={[styles.inputContainer, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
              <View style={styles.searchIconBox}>
                <MaterialCommunityIcons name="magnify" size={22} color={subtextColor} />
              </View>
              <TextInput
                value={keyword}
                onChangeText={handleKeywordChange}
                placeholder={
                  currentDrawerKey === 'addFriend'
                    ? tf('drawer.addFriend.search_placeholder', 'Tìm theo tên...')
                    : currentDrawerKey === 'chatSearch'
                      ? tf('drawer.chatSearch.search_placeholder', 'Tìm tin nhắn...')
                      : currentDrawerKey === 'groupSearch'
                        ? tf('drawer.groupSearch.search_placeholder', 'Tìm nhóm...')
                        : tf('common.search', 'Tìm kiếm')
                }
                placeholderTextColor={subtextColor}
                style={[styles.input, { color: textColor }]}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={() => performSearch(keyword)}
              />
              {loading && <ActivityIndicator size="small" color={'#1A8A6E'} style={{ marginRight: 12 }} />}
            </View>
          )}

          {/* Group Management Inline Interface */}
          {currentDrawerKey === 'groupManagement' && (
            <Animated.View 
              style={styles.managementContainer}
              entering={FadeIn.delay(100)}
            >
              {managementError && (
                <Pressable style={[styles.managementNotice, { backgroundColor: '#EF44441A', borderColor: '#EF444433' }]} onPress={loadMyGroups}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#EF4444" />
                  <Text style={[styles.managementNoticeText, { color: '#EF4444' }]}>{managementError}</Text>
                </Pressable>
              )}

              {managementGroupData && (
                <Animated.View style={styles.managementContent} entering={FadeIn.delay(200)} key={managementGroupData.id}>
                  <LinearGradient
                    colors={isDark ? ['rgba(14,165,233,0.22)', 'rgba(255,255,255,0.06)'] : ['#E0F2FE', '#FFFFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.groupInfoCard, { borderColor: glassBorder }]}
                  >
                    <View style={styles.groupInfoHeader}>
                      {managementGroupData.photoURL || managementGroupData.avatarUrl ? (
                        <Image source={{ uri: managementGroupData.photoURL || managementGroupData.avatarUrl }} style={styles.managementGroupAvatar} contentFit="cover" />
                      ) : (
                        <View style={[styles.managementGroupAvatar, { backgroundColor: Colors.primary + '22' }]}>
                          <MaterialCommunityIcons name="account-group" size={26} color={Colors.primary} />
                        </View>
                      )}
                      <View style={styles.groupInfoText}>
                        <View style={styles.groupTitleRow}>
                          <Text style={[styles.groupInfoTitle, { color: textColor }]} numberOfLines={1}>{managementGroupData.name}</Text>
                          <View style={[styles.roleCapsule, { backgroundColor: Colors.primary + '18' }]}>
                            <Text style={[styles.roleCapsuleText, { color: Colors.primary }]}>
                              {tf(`drawer.groupManagement.${selectedGroupRole}`, selectedGroupRole)}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.groupInfoSubtitle, { color: subtextColor }]} numberOfLines={2}>
                          {managementGroupData.description || tf('group_management.no_description', 'Chưa có mô tả')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.groupMetricRow}>
                      <View style={styles.groupMetricItem}>
                        <Text style={[styles.groupMetricValue, { color: textColor }]}>{managementGroupData.members?.length || 0}</Text>
                        <Text style={[styles.groupMetricLabel, { color: subtextColor }]}>{tf('group_management.members', 'Thành viên')}</Text>
                      </View>
                      <View style={styles.groupMetricItem}>
                        <Text style={[styles.groupMetricValue, { color: textColor }]}>{pendingRequestCount}</Text>
                        <Text style={[styles.groupMetricLabel, { color: subtextColor }]}>{tf('group_management.pending', 'Đang chờ')}</Text>
                      </View>
                      <View style={styles.groupMetricItem}>
                        <Text style={[styles.groupMetricValue, { color: textColor }]}>{managementGroupData.type === 'private' ? tf('drawer.private', 'Riêng tư') : tf('drawer.public', 'Công khai')}</Text>
                        <Text style={[styles.groupMetricLabel, { color: subtextColor }]}>{tf('group_management.visibility', 'Hiển thị')}</Text>
                      </View>
                    </View>
                  </LinearGradient>

                  <View style={styles.managementTabs}>
                    {[
                      { key: 'overview', icon: 'view-dashboard-outline', label: tf('group_management.overview', 'Tổng quan') },
                      { key: 'members', icon: 'account-multiple-outline', label: tf('group_management.members', 'Thành viên') },
                      { key: 'requests', icon: 'account-clock-outline', label: tf('group_management.requests', 'Yêu cầu') },
                      { key: 'settings', icon: 'cog-outline', label: tf('group_management.settings', 'Cài đặt') },
                    ].map((tab) => {
                      const active = managementTab === tab.key;
                      return (
                        <Pressable
                          key={tab.key}
                          onPress={() => setManagementTab(tab.key as any)}
                          style={[styles.managementTab, { backgroundColor: active ? Colors.primary : glassPanelBg, borderColor: active ? Colors.primary : glassBorder }]}
                        >
                          <MaterialCommunityIcons name={tab.icon as any} size={17} color={active ? '#FFF' : subtextColor} />
                          <Text style={[styles.managementTabText, { color: active ? '#FFF' : subtextColor }]} numberOfLines={1}>{tab.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {managementTab === 'overview' && (
                    <View style={styles.quickManagementGrid}>
                      <Pressable style={[styles.quickManagementAction, { backgroundColor: glassPanelBg, borderColor: glassBorder }]} onPress={changeManagedGroupAvatar} disabled={!canManageCurrentGroup}>
                        <MaterialCommunityIcons name="camera-enhance-outline" size={22} color={textColor} />
                        <Text style={[styles.quickManagementText, { color: textColor }]}>{tf('group_management.change_avatar', 'Đổi ảnh')}</Text>
                      </Pressable>
                      <Pressable style={[styles.quickManagementAction, { backgroundColor: glassPanelBg, borderColor: glassBorder }]} onPress={() => setManagementTab('members')}>
                        <MaterialCommunityIcons name="account-cog-outline" size={22} color={textColor} />
                        <Text style={[styles.quickManagementText, { color: textColor }]}>{tf('group_management.manage_members', 'Quản lý TV')}</Text>
                      </Pressable>
                      <Pressable style={[styles.quickManagementAction, { backgroundColor: glassPanelBg, borderColor: glassBorder, opacity: canManageCurrentGroup ? 1 : 0.45 }]} onPress={() => setManagementTab('requests')} disabled={!canManageCurrentGroup}>
                        <MaterialCommunityIcons name="account-clock-outline" size={22} color={textColor} />
                        <Text style={[styles.quickManagementText, { color: textColor }]}>{tf('group_management.requests', 'Yêu cầu')}</Text>
                      </Pressable>
                    </View>
                  )}

                  {managementTab === 'settings' && (
                    <View style={styles.managementForm}>
                      <Text style={[styles.label, { color: subtextColor }]}>{tf('drawer.group_name', 'Tên nhóm')}</Text>
                      <View style={[styles.formInputBox, { backgroundColor: glassPanelBg, borderColor: glassBorder, opacity: canManageCurrentGroup ? 1 : 0.55 }]}>
                        <TextInput value={editedGroupName} onChangeText={setEditedGroupName} editable={canManageCurrentGroup} style={[styles.formInput, { color: textColor }]} placeholderTextColor={subtextColor} />
                      </View>
                      <Text style={[styles.label, { color: subtextColor, marginTop: 14 }]}>{tf('drawer.description', 'Mô tả')}</Text>
                      <View style={[styles.formInputBox, styles.textArea, { backgroundColor: glassPanelBg, borderColor: glassBorder, opacity: canManageCurrentGroup ? 1 : 0.55 }]}>
                        <TextInput value={editedGroupDesc} onChangeText={setEditedGroupDesc} editable={canManageCurrentGroup} multiline style={[styles.formInput, { color: textColor }]} placeholderTextColor={subtextColor} />
                      </View>
                      <Text style={[styles.label, { color: subtextColor, marginTop: 14 }]}>{tf('drawer.privacy_settings', 'Quyền riêng tư')}</Text>
                      <View style={styles.privacyRow}>
                        {(['public', 'private'] as const).map((type) => {
                          const active = managementGroupData.type === type;
                          return (
                            <Pressable
                              key={type}
                              disabled={!canManageCurrentGroup}
                              onPress={() => updateManagedGroupType(type)}
                              style={[
                                styles.privacyOption,
                                {
                                  borderColor: active ? Colors.primary : glassBorder,
                                  backgroundColor: active ? Colors.primary + '18' : glassPanelBg,
                                  opacity: canManageCurrentGroup ? 1 : 0.55,
                                },
                              ]}
                            >
                              <MaterialCommunityIcons name={type === 'public' ? 'earth' : 'lock-outline'} size={18} color={active ? Colors.primary : subtextColor} />
                              <Text style={[styles.privacyName, { color: active ? Colors.primary : subtextColor }]}>{type === 'public' ? tf('drawer.public', 'Công khai') : tf('drawer.private', 'Riêng tư')}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Pressable style={[styles.fullScreenButton, { backgroundColor: Colors.primary, opacity: canManageCurrentGroup ? 1 : 0.5 }]} onPress={saveManagedGroupInfo} disabled={!canManageCurrentGroup || groupDetailsLoading}>
                        {groupDetailsLoading ? <ActivityIndicator color="#FFF" /> : <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFF" />}
                        <Text style={styles.fullScreenButtonText}>{tf('group_management.save_changes', 'Lưu thay đổi')}</Text>
                      </Pressable>
                      <Pressable style={[styles.fullScreenButton, { backgroundColor: '#EF4444' }]} onPress={leaveManagedGroup}>
                        <MaterialCommunityIcons name="exit-to-app" size={18} color="#FFF" />
                        <Text style={styles.fullScreenButtonText}>{tf('group_management.leave_group_action', 'Rời nhóm')}</Text>
                      </Pressable>
                    </View>
                  )}

                  {managementTab === 'members' && (
                    <View style={styles.membersSection}>
                      <View style={[styles.addMemberBox, { backgroundColor: glassPanelBg, borderColor: glassBorder, opacity: canManageCurrentGroup ? 1 : 0.55 }]}>
                        <TextInput value={newMemberUid} onChangeText={setNewMemberUid} editable={canManageCurrentGroup} placeholder={tf('group_management.user_uid_placeholder', 'UID người dùng')} placeholderTextColor={subtextColor} style={[styles.addMemberInput, { color: textColor }]} />
                        <Pressable onPress={addManagedMember} disabled={!canManageCurrentGroup || !newMemberUid.trim()} style={[styles.addMemberButton, { backgroundColor: Colors.primary }]}>
                          <MaterialCommunityIcons name="account-plus-outline" size={18} color="#FFF" />
                        </Pressable>
                      </View>
                      {groupMembers.map((member) => {
                        const isSelf = member.uid === auth.currentUser?.uid;
                        const manageable = canManageCurrentGroup && !isSelf && canManageMemberRole(member.role);
                        return (
                          <View key={member.uid} style={[styles.memberItemCompact, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                            {member.photoURL ? <Image source={{ uri: member.photoURL }} style={styles.memberAvatarSmall} contentFit="cover" /> : (
                              <View style={[styles.memberAvatarSmall, { backgroundColor: Colors.primary + '20' }]}>
                                <Text style={{ color: Colors.primary, fontWeight: '900' }}>{member.displayName?.charAt(0).toUpperCase() || 'U'}</Text>
                              </View>
                            )}
                            <Pressable style={styles.memberInfoCompact} onPress={() => router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId: member.uid } })}>
                              <Text style={[styles.memberNameCompact, { color: textColor }]} numberOfLines={1}>{member.displayName}</Text>
                              <Text style={[styles.memberRoleCompact, { color: subtextColor }]}>{tf(`drawer.groupManagement.${member.role || 'member'}`, member.role || 'Member')}</Text>
                            </Pressable>
                            {manageable && (
                              <View style={styles.memberActionRow}>
                                <Pressable onPress={() => changeManagedMemberRole(member.uid, member.role === GroupRole.MODERATOR ? GroupRole.MEMBER : GroupRole.MODERATOR)} style={styles.memberIconButton}>
                                  <MaterialCommunityIcons name="shield-account-outline" size={18} color={Colors.primary} />
                                </Pressable>
                                <Pressable onPress={() => removeManagedMember(member.uid)} style={styles.memberIconButton}>
                                  <MaterialCommunityIcons name="account-remove-outline" size={18} color="#EF4444" />
                                </Pressable>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {managementTab === 'requests' && (
                    <View style={styles.membersSection}>
                      {pendingRequests.length === 0 ? (
                        <View style={[styles.managementNotice, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                          <MaterialCommunityIcons name="account-check-outline" size={18} color={subtextColor} />
                          <Text style={[styles.managementNoticeText, { color: subtextColor }]}>{tf('group_management.no_pending_requests', 'Không có yêu cầu đang chờ')}</Text>
                        </View>
                      ) : pendingRequests.map((request) => (
                        <View key={request.uid} style={[styles.memberItemCompact, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                          {request.photoURL ? <Image source={{ uri: request.photoURL }} style={styles.memberAvatarSmall} contentFit="cover" /> : (
                            <View style={[styles.memberAvatarSmall, { backgroundColor: Colors.primary + '20' }]}>
                              <Text style={{ color: Colors.primary, fontWeight: '900' }}>{request.displayName?.charAt(0).toUpperCase() || 'U'}</Text>
                            </View>
                          )}
                          <View style={styles.memberInfoCompact}>
                            <Text style={[styles.memberNameCompact, { color: textColor }]} numberOfLines={1}>{request.displayName}</Text>
                            <Text style={[styles.memberRoleCompact, { color: subtextColor }]}>{tf('group_management.pending', 'Đang chờ')}</Text>
                          </View>
                          <View style={styles.memberActionRow}>
                            <Pressable onPress={() => handleManagedRequest(request.uid, 'approve')} style={styles.memberIconButton}>
                              <MaterialCommunityIcons name="check" size={18} color={Colors.primary} />
                            </Pressable>
                            <Pressable onPress={() => handleManagedRequest(request.uid, 'reject')} style={styles.memberIconButton}>
                              <MaterialCommunityIcons name="close" size={18} color="#EF4444" />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </Animated.View>
              )}
            </Animated.View>
          )}

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            keyboardShouldPersistTaps="handled" 
            contentContainerStyle={styles.resultsScroll}
            style={styles.flexScroll}
          >
            {currentDrawerKey === 'createGroup' ? (
                <Animated.View entering={FadeIn.delay(100)} style={styles.formContainer}>
                    <View style={styles.imageSection}>
                        <Pressable onPress={pickGroupImage} style={[styles.imagePickCircle, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                            {groupImage ? (
                                <Image source={{ uri: groupImage }} style={styles.pickedImage} />
                            ) : (
                                <MaterialCommunityIcons name="camera-enhance-outline" size={32} color={textColor} />
                            )}
                        </Pressable>
                        <Text style={[styles.imageActionText, { color: subtextColor }]}>{tf('drawer.set_avatar', 'Đặt ảnh đại diện')}</Text>
                    </View>

                    <Text style={[styles.label, { color: subtextColor }]}>{tf('drawer.group_name', 'Tên nhóm')}</Text>
                    <View style={[styles.formInputBox, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                        <TextInput
                            value={groupName}
                            onChangeText={setGroupName}
                            placeholder={tf('group_management.group_name_label', 'Tên nhóm')}
                            placeholderTextColor={subtextColor}
                            style={[styles.formInput, { color: textColor }]}
                        />
                    </View>

                    <Text style={[styles.label, { color: subtextColor, marginTop: 20 }]}>{tf('drawer.description', 'Mô tả')}</Text>
                    <View style={[styles.formInputBox, styles.textArea, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                        <TextInput
                            value={groupDesc}
                            onChangeText={setGroupDesc}
                            placeholder={tf('group_management.description_label', 'Mô tả')}
                            placeholderTextColor={subtextColor}
                            style={[styles.formInput, { color: textColor }]}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <Text style={[styles.label, { color: subtextColor, marginTop: 20 }]}>{tf('drawer.privacy_settings', 'Quyền riêng tư')}</Text>
                    <View style={styles.privacyRow}>
                        <Pressable 
                            onPress={() => setGroupType('public')}
                            style={[styles.privacyOption, groupType === 'public' && { backgroundColor: theme === 'dark' ? 'rgba(235,255,248,0.15)' : 'rgba(0,0,0,0.06)', borderColor: textColor }, { borderColor: glassBorder }]}
                        >
                            <MaterialCommunityIcons name="earth" size={20} color={groupType === 'public' ? textColor : subtextColor} />
                            <Text style={[styles.privacyName, { color: groupType === 'public' ? textColor : subtextColor }]}>{tf('drawer.public', 'Công khai')}</Text>
                        </Pressable>
                        <Pressable 
                            onPress={() => setGroupType('private')}
                            style={[styles.privacyOption, groupType === 'private' && { backgroundColor: theme === 'dark' ? 'rgba(235,255,248,0.15)' : 'rgba(0,0,0,0.06)', borderColor: textColor }, { borderColor: glassBorder }]}
                        >
                            <MaterialCommunityIcons name="lock-outline" size={20} color={groupType === 'private' ? textColor : subtextColor} />
                            <Text style={[styles.privacyName, { color: groupType === 'private' ? textColor : subtextColor }]}>{tf('drawer.private', 'Riêng tư')}</Text>
                        </Pressable>
                    </View>

                    <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="shield-check-outline" size={16} color={textColor} />
                            <Text style={[styles.featureText, { color: subtextColor }]}>{tf('drawer.secure_feature', 'Tính năng bảo mật')}</Text>
                        </View>
                    </View>
                </Animated.View>
            ) : (keyword.length > 0 || currentDrawerKey === 'notification' ? (
              <>
                {currentDrawerKey === 'notification' ? (
                    <View style={styles.instaFilterScrollContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.instaFilterRow}>
                        {[
                          { id: 'all', icon: 'all-inclusive' },
                          { id: 'message', icon: 'chat-outline' },
                          { id: 'like', icon: 'heart-outline' },
                          { id: 'friend_request', icon: 'account-plus-outline' },
                          { id: 'system', icon: 'shield-outline' },
                          { id: 'call', icon: 'phone-outline' }
                        ].map((cat) => (
                          <Pressable 
                            key={cat.id} 
                            onPress={() => setCategory(cat.id)}
                            style={[
                              styles.instaPill, 
                              category === cat.id && { backgroundColor: Colors.primary }
                            ]}
                          >
                             <MaterialCommunityIcons 
                                name={cat.icon as any} 
                                size={14} 
                                color={category === cat.id ? '#FFF' : subtextColor} 
                                style={{ marginRight: 6 }} 
                             />
                             <Text style={[styles.instaPillText, { color: category === cat.id ? '#FFF' : subtextColor }]}>
                                {tf(`notifications.categories.${cat.id}`, cat.id === 'all' ? 'Tất cả' : cat.id === 'message' ? 'Tin nhắn' : cat.id === 'like' ? 'Thích' : cat.id === 'friend_request' ? 'Lời mời' : cat.id === 'system' ? 'Hệ thống' : 'Cuộc gọi')}
                             </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                ) : (currentDrawerKey === 'chatSearch' || currentDrawerKey === 'groupSearch' || currentDrawerKey === 'addFriend') && !keyword ? (
                  <View style={styles.discoveryGrid}>
                    <Text style={[styles.sectionTitle, { color: subtextColor, marginBottom: 16 }]}>
                      {currentDrawerKey === 'addFriend' ? tf('drawer.addFriend.start_discovering', 'Bắt đầu khám phá') : tf('drawer.start_discovering', 'Bắt đầu khám phá')}
                    </Text>
                    <View style={styles.filterGrid}>
                       {quickActions.map((label, idx) => (
                         <Pressable 
                           key={label}
                           onPress={() => handleKeywordChange(label)}
                           style={({ pressed }) => [
                             styles.filterCard,
                             { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: glassBorder },
                             pressed && { transform: [{ scale: 0.96 }] }
                           ]}
                         >
                            <View style={[styles.filterIconBox, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                               <MaterialCommunityIcons 
                                 name={currentDrawerKey === 'addFriend' ? (
                                   idx === 0 ? 'map-marker-radius' :
                                   idx === 1 ? 'city-variant-outline' :
                                   idx === 2 ? 'school-outline' : 'heart-outline'
                                 ) :
                                   label.includes('Trending') || label.includes('Thịnh') ? 'fire' :
                                   label.includes('Local') || label.includes('Gần') ? 'map-marker-radius' :
                                   label.includes('Global') || label.includes('Toàn') ? 'earth' :
                                   label.includes('Gaming') || label.includes('Game') ? 'controller-classic' :
                                   label.includes('Message') || label.includes('Tin') ? 'message-text' :
                                   label.includes('User') || label.includes('Người') ? 'account' :
                                   label.includes('Link') ? 'link-variant' : 'image-multiple'
                                 } 
                                 size={24} 
                                 color={textColor} 
                               />
                            </View>
                            <Text style={[styles.filterLabel, { color: textColor }]}>{label}</Text>
                            <View style={styles.filterChevron}>
                               <MaterialCommunityIcons name="chevron-right" size={16} color={subtextColor} style={{ opacity: 0.4 }} />
                            </View>
                         </Pressable>
                       ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: subtextColor }]}>
                      {keyword ? tf('drawer.matching_results', 'Kết quả phù hợp') : tf('drawer.your_groups', 'Nhóm của bạn')}
                    </Text>
                    {results.length > 0 && <Text style={[styles.resultCount, { color: subtextColor }]}>{tf('drawer.items_count', '{{count}} mục').replace('{{count}}', String(results.length))}</Text>}
                  </View>
                )}

                {currentDrawerKey !== 'groupManagement' && results.length > 0 ? (
                  results
                    .filter(item => category === 'all' || item.meta?.type === category)
                    .map((item, idx) => (
                    <Animated.View key={item.id} entering={idx < 8 ? FadeIn.delay(idx * 20).duration(180) : undefined}>
                      <Pressable 
                        onPress={() => handleResultPress(item)} 
                        style={({ pressed }) => [
                          styles.instaItem, 
                          pressed && { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                        ]}
                      >
                        <View style={styles.instaAvatarWrap}>
                           {item.meta?.senderAvatar ? (
                               <Image source={{ uri: item.meta.senderAvatar }} style={styles.instaAvatar} contentFit="cover" transition={200} />
                            ) : (
                               <View style={[styles.instaAvatarPlaceholder, { backgroundColor: glassPanelBg }]}>
                                 <MaterialCommunityIcons name="account" size={24} color={subtextColor} />
                               </View>
                            )}
                            {item.meta?.type === 'like' && (
                               <View style={styles.instaIconBadge}>
                                  <MaterialCommunityIcons name="heart" size={10} color="#FF3040" />
                               </View>
                            )}
                        </View>

                        <View style={styles.instaContent}>
                           <Text numberOfLines={3} style={[styles.instaText, { color: textColor }]}>
                              <Text style={styles.instaUsername}>{item.meta?.senderName || item.title}</Text>
                              {' '}{item.subtitle || tf(`notifications.types.${item.meta?.type}`, item.meta?.type || '')}
                              <Text style={styles.instaTime}>  {getRelativeTime(item.meta?.timestamp)}</Text>
                           </Text>
                        </View>

                        <View style={styles.instaActionArea}>
                           {item.type === 'notification' && !item.meta?.isRead && (
                              <>
                                 {item.meta?.type === 'like' && (
                                    <Pressable onPress={() => handleAction(item, 'like_back')} style={styles.instaButton}>
                                       <Text style={styles.instaButtonText}>{tf('notifications.actions.like_back', 'Thích lại')}</Text>
                                    </Pressable>
                                 )}
                                 {item.meta?.type === 'friend_request' && (
                                    <Pressable onPress={() => handleAction(item, 'follow_back')} style={[styles.instaButton, { backgroundColor: Colors.primary }]}>
                                       <Text style={[styles.instaButtonText, { color: '#FFF' }]}>{tf('notifications.actions.follow_back', 'Theo dõi lại')}</Text>
                                    </Pressable>
                                 )}
                              </>
                           )}
                           {item.meta?.postImage && (
                              <Image source={{ uri: item.meta.postImage }} style={styles.instaThumb} contentFit="cover" />
                           )}
                        </View>
                      </Pressable>
                    </Animated.View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="cloud-search-outline" size={56} color={subtextColor} style={{ opacity: 0.2 }} />
                    <Text style={[styles.emptyText, { color: subtextColor }]}>
                      {currentDrawerKey === 'addFriend' ? tf('drawer.addFriend.no_results', 'Không tìm thấy người dùng') : tf('drawer.no_results', 'Không có kết quả')}
                    </Text>
                  </View>
                )}
              </>
            ) : null)}
          </ScrollView>

          <View style={styles.footerWrap}>
            <Pressable 
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton, 
                { backgroundColor: isDark ? 'rgba(235,255,248,0.92)' : 'rgba(11,53,44,0.95)' },
                pressed && { scale: 0.98, opacity: 0.9 }
              ]} 
              onPress={currentDrawerKey === 'createGroup' ? handleCreateGroup : onClose}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={isDark ? '#0A4A3A' : '#FFFFFF'} />
                ) : (
                    <>
                        <Text style={[styles.primaryButtonText, { color: isDark ? '#0A4A3A' : '#FFFFFF' }]}>
                            {currentDrawerKey === 'createGroup' ? tf('drawer.launch_community', 'Tạo nhóm') : tf('drawer.close_drawer', 'Đóng')}
                        </Text>
                        {currentDrawerKey === 'createGroup' && <MaterialCommunityIcons name="rocket-launch-outline" size={22} color={isDark ? '#0A4A3A' : '#FFFFFF'} />}
                    </>
                )}
            </Pressable>
          </View>
        </View>
      </LiquidSurface>
    </RevealSideSheet>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1, overflow: 'hidden' },
  container: { flex: 1, paddingHorizontal: 20 },
  instaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4 },
  instaTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 0 },
  instaCloseCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  inputContainer: { height: 64, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  searchIconBox: { width: 24, alignItems: 'center' },
  input: { flex: 1, fontSize: 17, fontWeight: '700' },
  flexScroll: { flex: 1 },
  resultsScroll: { flexGrow: 1, paddingBottom: 20 },
  instaFilterScrollContainer: { marginBottom: 20 },
  instaFilterRow: { gap: 10, paddingRight: 20, flexDirection: 'row', alignItems: 'center' },
  instaPill: { paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  instaPillText: { fontSize: 13, fontWeight: '800' },
  instaItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 2, gap: 14 },
  instaAvatarWrap: { position: 'relative', width: 54, height: 54 },
  instaAvatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  instaAvatarPlaceholder: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  instaIconBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3 },
  instaContent: { flex: 1, gap: 2 },
  instaText: { fontSize: 13.5, lineHeight: 18, letterSpacing: 0 },
  instaUsername: { fontWeight: '900' },
  instaTime: { opacity: 0.45, fontSize: 12.5, fontWeight: '500' },
  instaActionArea: { minWidth: 60, alignItems: 'flex-end' },
  instaButton: { paddingHorizontal: 18, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  instaButtonText: { fontSize: 13, fontWeight: '800' },
  instaThumb: { width: 50, height: 50, borderRadius: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.8, opacity: 0.6 },
  resultCount: { fontSize: 11, fontWeight: '700', opacity: 0.5 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 16 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  footerWrap: { marginTop: 10 },
  primaryButton: { height: 66, borderRadius: 24, alignItems: 'center', justifyContent: 'center', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 18, flexDirection: 'row', gap: 12 },
  primaryButtonText: { fontSize: 17, fontWeight: '900', letterSpacing: 0.6 },
  formContainer: { paddingVertical: 10 },
  imageSection: { alignItems: 'center', marginBottom: 24, gap: 10 },
  imagePickCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pickedImage: { width: '100%', height: '100%' },
  imageActionText: { fontSize: 12, fontWeight: '700', opacity: 0.8 },
  label: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  formInputBox: { height: 60, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center' },
  formInput: { fontSize: 16, fontWeight: '700' },
  textArea: { height: 110, alignItems: 'flex-start', paddingTop: 12 },
  privacyRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  privacyOption: { flex: 1, height: 52, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  privacyName: { fontSize: 14, fontWeight: '800' },
  featureList: { marginTop: 24, gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, fontWeight: '600' },
  managementContainer: { gap: 12, marginBottom: 12 },
  managementNotice: { minHeight: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  managementNoticeText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  managementContent: { gap: 12 },
  groupInfoCard: { padding: 14, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  groupInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  managementGroupAvatar: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  groupInfoText: { flex: 1, minWidth: 0 },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  roleCapsule: { paddingHorizontal: 8, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleCapsuleText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  groupInfoTitle: { flex: 1, fontSize: 18, fontWeight: '900' },
  groupInfoSubtitle: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  groupMetricRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  groupMetricItem: { flex: 1, minHeight: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  groupMetricValue: { fontSize: 15, fontWeight: '900', marginBottom: 3, textAlign: 'center' },
  groupMetricLabel: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  managementTabs: { flexDirection: 'row', gap: 7 },
  managementTab: { flex: 1, minHeight: 50, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, gap: 3 },
  managementTabText: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  quickManagementGrid: { flexDirection: 'row', gap: 8 },
  quickManagementAction: { flex: 1, minHeight: 72, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 7 },
  quickManagementText: { fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'center' },
  managementForm: { gap: 8 },
  addMemberBox: { minHeight: 52, borderRadius: 18, borderWidth: 1, paddingLeft: 14, paddingRight: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addMemberInput: { flex: 1, fontSize: 14, fontWeight: '700' },
  addMemberButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  memberActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberIconButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  membersSection: { gap: 8 },
  memberItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10
  },
  memberAvatarSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  memberInfoCompact: { flex: 1 },
  memberNameCompact: { fontSize: 14, fontWeight: '800' },
  memberRoleCompact: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  fullScreenButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 12, 
    gap: 8,
    marginTop: 8
  },
  fullScreenButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

export default React.memo(FeatureActionDrawer);