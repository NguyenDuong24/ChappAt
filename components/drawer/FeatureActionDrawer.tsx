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
import { BlurView } from 'expo-blur';
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
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { NotificationActionsService } from '@/services/notificationActions';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RevealSideSheet } from '@/components/reveal';
import { LiquidSurface, getLiquidPalette, LiquidGlassBackground } from '@/components/liquid';
import { useTheme } from '@/context/ThemeContext';
import { db, auth, storage } from '@/firebaseConfig';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
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

const FeatureActionDrawer = ({ visible, drawerKey, onClose }: FeatureActionDrawerProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<any>(null);
  const [category, setCategory] = useState<string>('all');
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);
  const [selectedManagementGroup, setSelectedManagementGroup] = useState<string | null>(null);
  const [managementGroupData, setManagementGroupData] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const { theme, isDark, palette: contextPalette } = useTheme();

  // Create group form state
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupType, setGroupType] = useState<'public' | 'private'>('public');
  const [groupImage, setGroupImage] = useState<string | null>(null);

  const localPalette = useMemo(() => getLiquidPalette(theme), [theme]);
  const palette = contextPalette || localPalette;

  const textColor = palette.textColor;
  const subtextColor = palette.subtitleColor;
  const glassPanelBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const glassBorder = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
  const iconWrapBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)';

  const copyMap: Record<FeatureDrawerKey, { title: string; subtitle: string; icon: any }> = useMemo(() => ({
    notification: {
      title: t('drawer.notifications.title'),
      subtitle: t('drawer.notifications.subtitle'),
      icon: 'bell-badge-outline',
    },
    chatSearch: {
      title: t('drawer.chatSearch.title'),
      subtitle: t('drawer.chatSearch.subtitle'),
      icon: 'message-search-outline',
    },
    groupSearch: {
      title: t('drawer.groupSearch.title'),
      subtitle: t('drawer.groupSearch.subtitle'),
      icon: 'account-group-outline',
    },
    addFriend: {
      title: t('drawer.addFriend.title'),
      subtitle: t('drawer.addFriend.subtitle'),
      icon: 'account-plus-outline',
    },
    groupManagement: {
      title: t('drawer.groupManagement.title'),
      subtitle: t('drawer.groupManagement.subtitle'),
      icon: 'shield-crown-outline',
    },
    createGroup: {
      title: t('drawer.createGroup.title'),
      subtitle: t('drawer.createGroup.subtitle'),
      icon: 'account-multiple-plus-outline',
    },
  }), [t]);

  const data = useMemo(() => {
    if (!drawerKey) return null;
    return copyMap[drawerKey];
  }, [drawerKey, copyMap]);

  useEffect(() => {
    if (!visible) {
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
      if (unsubscribe) {
        unsubscribe();
        setUnsubscribe(null);
      }
    } else if (drawerKey === 'notification') {
        setupNotificationsListener();
    } else if (drawerKey === 'groupManagement') {
        loadMyGroups();
    }
  }, [visible, drawerKey]);

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
          title: data.title || t('notifications.new_notification'),
          subtitle: data.message || data.body || '',
          type: 'notification',
          meta: { ...data, id: d.id }, // Keep original data in meta
        };
      });
      setResults(mapped);
      setLoading(false);
    }, (err) => {
      console.error('Notification listener error:', err);
      // Fallback to simple query if index is missing
      const simpleQ = query(
        collection(db, 'notifications'),
        where('receiverId', '==', currentUser.uid),
        limit(25)
      );
      getDocs(simpleQ).then(snap => {
         const mapped: SearchResultItem[] = snap.docs.map(d => ({
            id: d.id,
            title: d.data().title || t('notifications.new_notification'),
            subtitle: d.data().message || d.data().body || '',
            type: 'notification',
            meta: { ...d.data(), id: d.id },
         }));
         setResults(mapped);
         setLoading(false);
      });
    });

    setUnsubscribe(() => unsub);
  }, [t, unsubscribe]);

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

  const loadMyGroups = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setLoading(true);
    try {
        const q = query(
            collection(db, 'groups'),
            where('members', 'array-contains', currentUser.uid),
            limit(15)
        );
        const snap = await getDocs(q);
        const mapped: SearchResultItem[] = snap.docs.map(d => ({
            id: d.id,
            title: d.data().name || t('groups.unnamed'),
            subtitle: d.data().description || t('social.no_posts'),
            type: 'groupManagement',
            meta: { groupId: d.id, type: 'all' },
        }));
        setResults(mapped);
        // Delay detailed loading until after animation completes
        if (mapped.length > 0 && !selectedManagementGroup) {
            InteractionManager.runAfterInteractions(() => {
                loadGroupDetailsForManagement(mapped[0].id);
            });
        }
    } catch (err) {
        console.log('Groups management error:', err);
    } finally {
        setLoading(false);
    }
  }, [t, selectedManagementGroup]);

  const loadGroupDetailsForManagement = useCallback(async (groupId: string) => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (!groupDoc.exists()) return;
      
      const groupData = { id: groupDoc.id, ...groupDoc.data() } as any;
      setManagementGroupData(groupData);
      setSelectedManagementGroup(groupId);
      
      // Load members - only first 10 for drawer display
      const members = (groupData.members || []).slice(0, 10);
      const memberRoles = groupData.memberRoles || {};
      
      // Optimize: batch fetch with Promise.all but limit concurrent requests
      const memberDocs = await Promise.allSettled(
        members.map((uid: string) => getDoc(doc(db, 'users', uid)).catch(() => null))
      );
      
      const membersData = memberDocs
        .map((result: any) => {
          if (result.status === 'fulfilled' && result.value) {
            const doc = result.value;
            return {
              uid: doc.id,
              displayName: doc.data()?.displayName || 'User',
              photoURL: doc.data()?.profilePicture,
              role: memberRoles[doc.id] || 'member'
            };
          }
          return null;
        })
        .filter((m: any): m is any => m !== null);
      
      setGroupMembers(membersData);
    } catch (err) {
      console.log('Load group details error:', err);
    }
  }, []);

  const performSearch = useCallback(async (text: string) => {
    const term = text.trim();
    if (!term || term.length < 2) {
      if (drawerKey === 'notification') loadNotifications();
      else if (drawerKey === 'groupManagement') loadMyGroups();
      else setResults([]);
      return;
    }

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const newResults: SearchResultItem[] = [];

      if (drawerKey === 'chatSearch') {
        const roomsQuery = query(collection(db, 'rooms'), where('participants', 'array-contains', currentUser.uid), limit(15));
        const roomsSnap = await getDocs(roomsQuery);
        for (const roomDoc of roomsSnap.docs) {
          const roomId = roomDoc.id;
          const msgQuery = query(collection(db, 'rooms', roomId, 'messages'), orderBy('createdAt', 'desc'), limit(100));
          const msgSnap = await getDocs(msgQuery);
          msgSnap.docs.forEach((d) => {
            if (d.data().text?.toLowerCase().includes(term.toLowerCase())) {
              newResults.push({
                id: `${roomId}_${d.id}`,
                title: d.data().senderName || t('chat.unknown_user'),
                subtitle: d.data().text,
                type: 'chat',
                meta: { roomId, messageId: d.id },
              });
            }
          });
          if (newResults.length > 10) break;
        }
      } else if (drawerKey === 'addFriend') {
        const userQuery = query(collection(db, 'users'), where('username', '>=', term), where('username', '<=', term + '\uf8ff'), limit(10));
        const userSnap = await getDocs(userQuery);
        userSnap.docs.forEach((d) => {
          if (d.id === currentUser.uid) return;
          newResults.push({ id: d.id, title: d.data().username || t('chat.unknown_user'), subtitle: d.data().bio || '', type: 'user', meta: { userId: d.id } });
        });
      } else if (drawerKey === 'groupSearch') {
        const groupQuery = query(collection(db, 'groups'), where('name', '>=', term), where('name', '<=', term + '\uf8ff'), limit(10));
        const groupSnap = await getDocs(groupQuery);
        groupSnap.docs.forEach((d) => {
          newResults.push({ id: d.id, title: d.data().name || t('groups.unnamed'), subtitle: d.data().description || '', type: 'group', meta: { groupId: d.id } });
        });
      }

      setResults(newResults);
    } catch (err) {
      console.log('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [drawerKey, loadNotifications, loadMyGroups, t]);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
        Alert.alert(t('group_create.errors.name_required'), '');
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
        Alert.alert(t('common.error'), t('group_create.errors.uid_add_failed'));
    } finally {
        setLoading(false);
    }
  }, [groupName, groupDesc, groupType, groupImage, onClose, router, t]);

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
             Alert.alert(t('common.success'), t('notifications.liked_back'));
          }
          break;
        case 'follow_back':
          if (item.meta.senderId) {
             await NotificationActionsService.followUser(currentUser.uid, item.meta.senderId, item.meta.senderName || 'User');
             Alert.alert(t('common.success'), t('notifications.followed_back'));
          }
          break;
        case 'accept_friend':
           // Add friend logic if available in service
           break;
      }
    } catch (e) {
      console.log('Action error:', e);
    } finally {
      setLoading(false);
    }
  };

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
          router.push({ pathname: '/(screens)/groups/GroupManagementScreen', params: { id: item.id } });
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
    switch (drawerKey) {
      case 'notification': return [t('notifications.unread'), t('notifications.types.mention'), t('notifications.types.friend_request'), t('notifications.types.call')];
      case 'chatSearch': return [t('chat.message'), t('chat.user'), t('drawer.chatSearch.links' as any), t('drawer.chatSearch.photos' as any)];
      case 'groupSearch': return [t('social.trending'), t('drawer.groupSearch.local' as any), t('drawer.groupSearch.global' as any), t('drawer.groupSearch.gaming' as any)];
      case 'groupManagement': return [t('drawer.groupManagement.ownership' as any), t('drawer.groupManagement.moderating' as any), t('drawer.groupManagement.invites' as any)];
      default: return [t('social.latest'), t('signup.name_placeholder'), t('proximity.title')];
    }
  }, [drawerKey, t]);
  
  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    const now = new Date().getTime();
    const then = timestamp.seconds * 1000;
    const diff = (now - then) / 1000;
    if (diff < 60) return 'Now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  if (!drawerKey || !data) return null;

  const tabHeight = 65; 
  const totalBottomInset = Math.max(insets.bottom, 20) + tabHeight;

  return (
    <RevealSideSheet visible={visible} onClose={onClose} side="left" widthRatio={0.92} maxWidth={520}>
      <LiquidSurface themeMode={theme} borderRadius={40} intensity={theme === 'dark' ? 44 : 58} style={styles.outerContainer}>
        <LiquidGlassBackground themeMode={theme} style={StyleSheet.absoluteFillObject} />
        
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 24), paddingBottom: totalBottomInset }]}>
          <View style={styles.instaHeader}>
            <Text style={[styles.instaTitle, { color: textColor }]}>{data.title}</Text>
            <Pressable onPress={onClose} style={styles.instaCloseCircle}>
               <MaterialCommunityIcons name="close" size={20} color={textColor} />
            </Pressable>
          </View>

          {drawerKey !== 'notification' && drawerKey !== 'createGroup' && drawerKey !== 'groupManagement' && (
            <View style={[styles.inputContainer, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
              <View style={styles.searchIconBox}>
                <MaterialCommunityIcons name="magnify" size={22} color={subtextColor} />
              </View>
              <TextInput
                value={keyword}
                onChangeText={handleKeywordChange}
                placeholder={t('common.search')}
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
          {drawerKey === 'groupManagement' && (
            <Animated.View 
              style={styles.managementContainer}
              entering={FadeIn.delay(100)}
            >
              {/* Group Selector */}
              {results.length > 0 && (
                <Animated.ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.groupSelectorContainer}
                  style={styles.groupSelectorScroll}
                  entering={FadeIn.delay(150)}
                >
                  {results.map((group) => (
                    <Pressable
                      key={group.id}
                      onPress={() => InteractionManager.runAfterInteractions(() => loadGroupDetailsForManagement(group.id))}
                      style={[
                        styles.groupSelectorItem,
                        selectedManagementGroup === group.id && { 
                          backgroundColor: '#0EA5E9',
                          borderColor: '#0EA5E9'
                        },
                        {
                          backgroundColor: selectedManagementGroup === group.id ? '#0EA5E9' : glassPanelBg,
                          borderColor: selectedManagementGroup === group.id ? '#0EA5E9' : glassBorder
                        }
                      ]}
                    >
                      <Text 
                        style={[
                          styles.groupSelectorText,
                          { color: selectedManagementGroup === group.id ? '#FFF' : textColor }
                        ]}
                        numberOfLines={1}
                      >
                        {group.title}
                      </Text>
                    </Pressable>
                  ))}
                </Animated.ScrollView>
              )}

              {/* Management Content */}
              {managementGroupData && (
                <Animated.View 
                  style={styles.managementContent}
                  entering={FadeIn.delay(200)}
                  key={managementGroupData.id}
                >
                  <View style={[styles.groupInfoCard, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                    <View style={styles.groupInfoHeader}>
                      <View>
                        <Text style={[styles.groupInfoTitle, { color: textColor }]}>
                          {managementGroupData.name}
                        </Text>
                        <Text style={[styles.groupInfoSubtitle, { color: subtextColor }]}>
                          {managementGroupData.description}
                        </Text>
                        <Text style={[styles.memberCountText, { color: subtextColor }]}>
                          {t('group_management.member_count', { count: groupMembers.length })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Members List */}
                  <View style={styles.membersSection}>
                    <View style={styles.sectionHeaderManagement}>
                      <Text style={[styles.sectionTitleMgmt, { color: textColor }]}>
                        {t('group_management.members_tab', { count: groupMembers.length })}
                      </Text>
                    </View>
                    {groupMembers.slice(0, 5).map((member) => (
                      <View key={member.uid} style={[styles.memberItemCompact, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                        <View style={[styles.memberAvatarSmall, { backgroundColor: Colors.primary + '40' }]}>
                          <Text style={{ color: Colors.primary, fontWeight: '700' }}>
                            {member.displayName?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                        <View style={styles.memberInfoCompact}>
                          <Text style={[styles.memberNameCompact, { color: textColor }]}>
                            {member.displayName}
                          </Text>
                          <Text style={[styles.memberRoleCompact, { color: subtextColor }]}>
                            {member.role}
                          </Text>
                        </View>
                      </View>
                    ))}
                    {groupMembers.length > 5 && (
                      <Text style={[styles.moreMembers, { color: Colors.primary }]}>
                        +{groupMembers.length - 5} {t('group_management.member_count', { count: groupMembers.length - 5 })}
                      </Text>
                    )}
                  </View>

                  {/* Action Button to Full Screen */}
                  <Pressable 
                    style={[styles.fullScreenButton, { backgroundColor: Colors.primary }]}
                    onPress={() => {
                      onClose();
                      InteractionManager.runAfterInteractions(() => {
                        router.push({ pathname: '/(screens)/groups/GroupManagementScreen', params: { id: managementGroupData.id } });
                      });
                    }}
                  >
                    <MaterialCommunityIcons name="arrow-top-right" size={18} color="#FFF" />
                    <Text style={styles.fullScreenButtonText}>
                      {t('group_management.edit_info')}
                    </Text>
                  </Pressable>
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
            {drawerKey === 'createGroup' ? (
                <Animated.View entering={FadeIn.delay(100)} style={styles.formContainer}>
                    <View style={styles.imageSection}>
                        <Pressable onPress={pickGroupImage} style={[styles.imagePickCircle, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                            {groupImage ? (
                                <Image source={{ uri: groupImage }} style={styles.pickedImage} />
                            ) : (
                                <MaterialCommunityIcons name="camera-enhance-outline" size={32} color={textColor} />
                            )}
                        </Pressable>
                        <Text style={[styles.imageActionText, { color: subtextColor }]}>{t('drawer.set_avatar')}</Text>
                    </View>

                    <Text style={[styles.label, { color: subtextColor }]}>{t('drawer.group_name')}</Text>
                    <View style={[styles.formInputBox, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                        <TextInput
                            value={groupName}
                            onChangeText={setGroupName}
                            placeholder={t('group_management.group_name_label')}
                            placeholderTextColor={subtextColor}
                            style={[styles.formInput, { color: textColor }]}
                        />
                    </View>

                    <Text style={[styles.label, { color: subtextColor, marginTop: 20 }]}>{t('drawer.description')}</Text>
                    <View style={[styles.formInputBox, styles.textArea, { backgroundColor: glassPanelBg, borderColor: glassBorder }]}>
                        <TextInput
                            value={groupDesc}
                            onChangeText={setGroupDesc}
                            placeholder={t('group_management.description_label')}
                            placeholderTextColor={subtextColor}
                            style={[styles.formInput, { color: textColor }]}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <Text style={[styles.label, { color: subtextColor, marginTop: 20 }]}>{t('drawer.privacy_settings')}</Text>
                    <View style={styles.privacyRow}>
                        <Pressable 
                            onPress={() => setGroupType('public')}
                            style={[styles.privacyOption, groupType === 'public' && { backgroundColor: theme === 'dark' ? 'rgba(235,255,248,0.15)' : 'rgba(0,0,0,0.06)', borderColor: textColor }, { borderColor: glassBorder }]}
                        >
                            <MaterialCommunityIcons name="earth" size={20} color={groupType === 'public' ? textColor : subtextColor} />
                            <Text style={[styles.privacyName, { color: groupType === 'public' ? textColor : subtextColor }]}>{t('drawer.public')}</Text>
                        </Pressable>
                        <Pressable 
                            onPress={() => setGroupType('private')}
                            style={[styles.privacyOption, groupType === 'private' && { backgroundColor: theme === 'dark' ? 'rgba(235,255,248,0.15)' : 'rgba(0,0,0,0.06)', borderColor: textColor }, { borderColor: glassBorder }]}
                        >
                            <MaterialCommunityIcons name="lock-outline" size={20} color={groupType === 'private' ? textColor : subtextColor} />
                            <Text style={[styles.privacyName, { color: groupType === 'private' ? textColor : subtextColor }]}>{t('drawer.private')}</Text>
                        </Pressable>
                    </View>

                    <View style={styles.featureList}>
                        <View style={styles.featureItem}>
                            <MaterialCommunityIcons name="shield-check-outline" size={16} color={textColor} />
                            <Text style={[styles.featureText, { color: subtextColor }]}>{t('drawer.secure_feature')}</Text>
                        </View>
                    </View>
                </Animated.View>
            ) : (keyword.length > 0 || drawerKey === 'notification' || drawerKey === 'groupManagement' ? (
              <>
                {drawerKey === 'notification' ? (
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
                                {t(`notifications.categories.${cat.id}` as any)}
                             </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                ) : (drawerKey === 'chatSearch' || drawerKey === 'groupSearch') && !keyword ? (
                  <View style={styles.discoveryGrid}>
                    <Text style={[styles.sectionTitle, { color: subtextColor, marginBottom: 16 }]}>{t('drawer.start_discovering')}</Text>
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
                                 name={
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
                      {keyword ? t('drawer.matching_results') : t('drawer.your_groups')}
                    </Text>
                    {results.length > 0 && <Text style={[styles.resultCount, { color: subtextColor }]}>{t('drawer.items_count', { count: results.length })}</Text>}
                  </View>
                )}

                {drawerKey !== 'groupManagement' && results.length > 0 ? (
                  results
                    .filter(item => category === 'all' || item.meta?.type === category)
                    .map((item, idx) => (
                    <Animated.View key={item.id} entering={FadeIn.delay(idx * 60).duration(300)}>
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
                              {' '}{item.subtitle || t(`notifications.types.${item.meta?.type}` as any)}
                              <Text style={styles.instaTime}>  {getRelativeTime(item.meta?.timestamp)}</Text>
                           </Text>
                        </View>

                        <View style={styles.instaActionArea}>
                           {item.type === 'notification' && !item.meta?.isRead && (
                              <>
                                 {item.meta?.type === 'like' && (
                                    <Pressable onPress={() => handleAction(item, 'like_back')} style={styles.instaButton}>
                                       <Text style={styles.instaButtonText}>{t('notifications.actions.like_back')}</Text>
                                    </Pressable>
                                 )}
                                 {item.meta?.type === 'friend_request' && (
                                    <Pressable onPress={() => handleAction(item, 'follow_back')} style={[styles.instaButton, { backgroundColor: Colors.primary }]}>
                                       <Text style={[styles.instaButtonText, { color: '#FFF' }]}>{t('notifications.actions.follow_back')}</Text>
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
                    <Text style={[styles.emptyText, { color: subtextColor }]}>{t('drawer.no_results' as any)}</Text>
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
              onPress={drawerKey === 'createGroup' ? handleCreateGroup : onClose}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={isDark ? '#0A4A3A' : '#FFFFFF'} />
                ) : (
                    <>
                        <Text style={[styles.primaryButtonText, { color: isDark ? '#0A4A3A' : '#FFFFFF' }]}>
                            {drawerKey === 'createGroup' ? t('drawer.launch_community') : t('drawer.close_drawer')}
                        </Text>
                        {drawerKey === 'createGroup' && <MaterialCommunityIcons name="rocket-launch-outline" size={22} color={isDark ? '#0A4A3A' : '#FFFFFF'} />}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, paddingTop: 10 },
  headerIconWrap: { width: 58, height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  headerTextWrap: { flex: 1, minWidth: 0 },
  discoveryGrid: { marginTop: 10 },
  filterGrid: { gap: 12 },
  filterCard: { flexDirection: 'row', alignItems: 'center', height: 72, borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, gap: 14 },
  filterIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  filterLabel: { flex: 1, fontSize: 16, fontWeight: '700' },
  filterChevron: { width: 24, alignItems: 'center' },
  instaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4 },
  instaTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
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
  instaText: { fontSize: 13.5, lineHeight: 18, letterSpacing: -0.1 },
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
  centerLoading: { flex: 1, justifyContent: 'center', paddingVertical: 100 },
  guideBox: { marginTop: 36, flexDirection: 'row', gap: 12, paddingHorizontal: 12, opacity: 0.4 },
  guideText: { fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 18 },
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
  // Group Management Drawer Styles
  managementContainer: { flex: 1, gap: 12 },
  groupSelectorScroll: { maxHeight: 60 },
  groupSelectorContainer: { gap: 8, paddingRight: 16 },
  groupSelectorItem: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 16, 
    borderWidth: 1,
    minWidth: 120,
    justifyContent: 'center'
  },
  groupSelectorText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  managementContent: { gap: 12, flex: 1 },
  groupInfoCard: { padding: 12, borderRadius: 16, borderWidth: 1 },
  groupInfoHeader: { gap: 8 },
  groupInfoTitle: { fontSize: 16, fontWeight: '700' },
  groupInfoSubtitle: { fontSize: 13, fontWeight: '500' },
  memberCountText: { fontSize: 12, fontWeight: '600' },
  membersSection: { gap: 8 },
  sectionHeaderManagement: { marginBottom: 4 },
  sectionTitleMgmt: { fontSize: 13, fontWeight: '700' },
  memberItemCompact: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 10, 
    borderRadius: 12, 
    borderWidth: 1,
    gap: 10
  },
  memberAvatarSmall: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center'
  },
  memberInfoCompact: { flex: 1 },
  memberNameCompact: { fontSize: 13, fontWeight: '600' },
  memberRoleCompact: { fontSize: 11, fontWeight: '500' },
  moreMembers: { fontSize: 12, fontWeight: '600', marginTop: 4 },
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
