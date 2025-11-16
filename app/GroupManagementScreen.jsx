import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  Platform,
  Animated,
  Switch,
  Clipboard
} from 'react-native';
import { 
  Text, 
  Avatar, 
  TextInput, 
  Button, 
  Card,
  Divider,
  IconButton,
  Chip,
  ActivityIndicator,
  Surface,
  FAB,
  Snackbar
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  onSnapshot,
  orderBy,
  documentId,
  deleteDoc,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FlatList } from 'react-native';
import CustomImage from '@/components/common/CustomImage';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const imageSize = Math.floor((width - 8 * 2 - 8) / 3);
const IMAGE_SIZE = Math.floor((width - 32) / 3);

const storage = getStorage();
const primaryColor = Colors.primary || '#667eea';
const userCache = new Map();

export default function ModernGroupManagementScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const viewerShowOnline = user?.showOnlineStatus !== false;
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupType, setGroupType] = useState('public');
  const [isSearchable, setIsSearchable] = useState(true);
  const [newMemberUID, setNewMemberUID] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [sharedImages, setSharedImages] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(false);

  // Refs and config to reduce Firebase calls and support pagination
  const unsubscribesRef = useRef([]);
  const mediaListenerRef = useRef(null);
  const lastMediaDocRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const MEDIA_PAGE_SIZE = 30;

  // Cleanup all listeners on unmount or id change
  useEffect(() => {
    return () => {
      (unsubscribesRef.current || []).forEach(u => { try { u(); } catch(e){} });
      unsubscribesRef.current = [];
      if (mediaListenerRef.current) { try { mediaListenerRef.current(); } catch(e){}; mediaListenerRef.current = null; }
    };
  }, []);

  // Single realtime listener for the group document (keeps group state up-to-date without repeated getDoc calls)
  useEffect(() => {
    if (!id) return;
    const groupRef = doc(db, 'groups', id);
    const unsubscribe = onSnapshot(groupRef, (snap) => {
      if (snap.exists()) {
        const groupData = { id: snap.id, ...snap.data() };
        setGroup(groupData);
        // initialize form fields only once when first loaded
        setGroupName(prev => prev || groupData.name);
        setGroupDescription(prev => prev || groupData.description || '');
        setGroupType(prev => prev || groupData.type || 'public');
        setIsSearchable(prev => (prev === undefined ? (groupData.isSearchable !== false) : prev));
        setLoading(false);
      } else {
        setGroup(null);
        setLoading(false);
      }
    }, (err) => {
      console.error('Group realtime error:', err);
      setLoading(false);
    });

    // keep track for cleanup
    unsubscribesRef.current.push(unsubscribe);
    return () => { try { unsubscribe(); } catch(e){} };
  }, [id]);

  // Load media pages (initial + load more), and attach small realtime listener only for newest page
  const loadInitialMediaPage = useCallback(async () => {
    if (!id) return;
    setSharedLoading(true);
    try {
      const messagesRef = collection(db, 'groups', id, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(MEDIA_PAGE_SIZE));
      const snapshot = await getDocs(q);
      const imgs = snapshot.docs
        .map(d => ({ id: d.id, url: d.data().imageUrl || d.data().url, createdAt: d.data().createdAt, createdBy: d.data().createdBy, type: d.data().type }))
        .filter(m => m.type === 'image' && typeof m.url === 'string');
      setSharedImages(imgs);
      lastMediaDocRef.current = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      setSharedLoading(false);
    } catch (e) {
      console.error('Error loading media page:', e);
      setSharedLoading(false);
    }
  }, [id]);

  // Load more (older) media page when user scrolls
  const loadMoreMedia = useCallback(async () => {
    if (!id || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    try {
      const messagesRef = collection(db, 'groups', id, 'messages');
      if (!lastMediaDocRef.current) {
        // nothing to page from yet
        isLoadingMoreRef.current = false;
        return;
      }
      const nextQ = query(messagesRef, orderBy('createdAt', 'desc'), startAfter(lastMediaDocRef.current), limit(MEDIA_PAGE_SIZE));
      const qs = await getDocs(nextQ);
      if (!qs.empty) {
        const imgs = qs.docs
          .map(d => ({ id: d.id, url: d.data().imageUrl || d.data().url, createdAt: d.data().createdAt, createdBy: d.data().createdBy, type: d.data().type }))
          .filter(m => m.type === 'image' && typeof m.url === 'string');
        setSharedImages(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const merged = [...prev, ...imgs.filter(i => !existingIds.has(i.id))];
          return merged.sort((a, b) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt));
        });
        lastMediaDocRef.current = qs.docs[qs.docs.length - 1];
      }
    } catch (err) {
      console.error('Error loading more media:', err);
    } finally {
      isLoadingMoreRef.current = false;
    }
  }, [id]);

  // Setup realtime listener for newest media images with pagination support
  useEffect(() => {
    if (!id) return;
    const messagesRef = collection(db, 'groups', id, 'messages');

    try {
      // realtime listener for newest media (limited to MEDIA_PAGE_SIZE)
      const newestQ = query(messagesRef, orderBy('createdAt', 'desc'), limit(MEDIA_PAGE_SIZE));
      const unsubscribeNew = onSnapshot(newestQ, (snapshot) => {
        const newImages = snapshot.docs
          .map(d => ({ id: d.id, url: d.data().imageUrl || d.data().url, createdAt: d.data().createdAt, createdBy: d.data().createdBy, type: d.data().type }))
          .filter(m => m.type === 'image' && typeof m.url === 'string');
        setSharedImages(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const toAdd = newImages.filter(ni => !existingIds.has(ni.id));
          const merged = [...toAdd, ...prev];
          return merged.sort((a, b) => (b.createdAt?.toMillis ? b.createdAt.toMillis() : b.createdAt) - (a.createdAt?.toMillis ? a.createdAt.toMillis() : a.createdAt));
        });
        if (sharedLoading) setSharedLoading(false);
      }, (err) => {
        console.error('Media realtime error:', err);
        if (sharedLoading) setSharedLoading(false);
      });

      mediaListenerRef.current = unsubscribeNew;
      unsubscribesRef.current.push(unsubscribeNew);
    } catch (err) {
      console.error('Failed to setup media listener:', err);
      setSharedLoading(false);
    }

    return () => {
      try { if (mediaListenerRef.current) mediaListenerRef.current(); } catch(e){}
    };
  }, [id]);

  // Load initial media when tab is active
  useEffect(() => {
    if (activeTab === 'media' && sharedImages.length === 0) {
      loadInitialMediaPage();
    }
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab === 'members' && group && members.length === 0) {
      loadMemberDetails(group.members);
    }
  }, [activeTab, group]);

  useEffect(() => {
    if (groupType === 'private') {
      setIsSearchable(false);
    }
  }, [groupType]);

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const copyGroupId = async () => {
    try {
      await Clipboard.setString(group.id);
      showSnackbar('Đã sao chép ID nhóm vào clipboard');
    } catch (error) {
      console.error('Error copying group ID:', error);
      showSnackbar('Không thể sao chép ID nhóm');
    }
  };

  const loadGroupData = async () => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', id));
      if (groupDoc.exists()) {
        const groupData = { id: groupDoc.id, ...groupDoc.data() };
        setGroup(groupData);
        setGroupName(groupData.name);
        setGroupDescription(groupData.description || '');
        setGroupType(groupData.type || 'public');
        setIsSearchable(groupData.isSearchable !== false);
      }
    } catch (error) {
      console.error('Error loading group:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin nhóm');
    } finally {
      setLoading(false);
    }
  };

  const loadMemberDetails = async (memberUIDs) => {
    try {
      const missing = memberUIDs.filter(uid => !userCache.has(uid));
      const chunkSize = 10;
      for (let i = 0; i < missing.length; i += chunkSize) {
        const chunk = missing.slice(i, i + chunkSize);
        const qUsers = query(collection(db, 'users'), where(documentId(), 'in', chunk));
        const qs = await getDocs(qUsers);
        qs.docs.forEach(d => {
          userCache.set(d.id, { uid: d.id, ...d.data() });
        });
        chunk.forEach(uid => {
          if (!userCache.has(uid)) userCache.set(uid, { uid, username: 'Unknown User', bio: '', isOnline: false });
        });
      }
      const memberDetails = memberUIDs.map(uid => userCache.get(uid));
      setMembers(memberDetails);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const searchUserByUID = async () => {
    if (!newMemberUID.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập UID hoặc username của người dùng');
      return;
    }

    setSearchLoading(true);
    setSearchResults([]);

    try {
      const userDoc = await getDoc(doc(db, 'users', newMemberUID.trim()));
      if (userDoc.exists()) {
        const userData = { uid: userDoc.id, ...userDoc.data() };
        setSearchResults([userData]);
      } else {
        const q = query(
          collection(db, 'users'), 
          where('username', '==', newMemberUID.trim())
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const users = querySnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
          }));
          setSearchResults(users);
        } else {
          showSnackbar('Không tìm thấy người dùng với UID hoặc username này');
        }
      }
    } catch (error) {
      console.error('Error searching user:', error);
      showSnackbar('Không thể tìm kiếm người dùng');
    } finally {
      setSearchLoading(false);
    }
  };

  const addMemberToGroup = async (newUser) => {
    if (!group) return;

    if (group.members.includes(newUser.uid)) {
      showSnackbar('Người dùng này đã là thành viên của nhóm');
      return;
    }

    setUpdating(true);
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayUnion(newUser.uid),
        memberCount: group.members.length + 1,
        updatedAt: new Date()
      });

      setGroup(prev => prev ? {
        ...prev,
        members: [...prev.members, newUser.uid],
        memberCount: prev.members.length + 1
      } : null);
      
      setMembers(prev => [...prev, newUser]);
      setNewMemberUID('');
      setSearchResults([]);
      setActiveTab('members');

      showSnackbar(`Đã thêm ${newUser.username} vào nhóm`);
    } catch (error) {
      console.error('Error adding member:', error);
      showSnackbar('Không thể thêm thành viên');
    } finally {
      setUpdating(false);
    }
  };

  const removeMember = async (memberUID) => {
    if (!group) return;

    if (memberUID === group.createdBy) {
      Alert.alert('Lỗi', 'Không thể xóa người tạo nhóm');
      return;
    }

    const memberName = members.find(m => m.uid === memberUID)?.username || 'Thành viên này';

    Alert.alert(
      'Xác nhận xóa thành viên',
      `Bạn có chắc chắn muốn xóa ${memberName} khỏi nhóm?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const groupRef = doc(db, 'groups', group.id);
              await updateDoc(groupRef, {
                members: arrayRemove(memberUID),
                admins: arrayRemove(memberUID),
                memberCount: group.members.length - 1,
                updatedAt: new Date()
              });

              setGroup(prev => prev ? {
                ...prev,
                members: prev.members.filter(uid => uid !== memberUID),
                admins: prev.admins?.filter(uid => uid !== memberUID) || [],
                memberCount: prev.members.length - 1
              } : null);
              
              setMembers(prev => prev.filter(member => member.uid !== memberUID));

              showSnackbar(`Đã xóa ${memberName} khỏi nhóm`);
            } catch (error) {
              console.error('Error removing member:', error);
              showSnackbar('Không thể xóa thành viên');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const leaveGroup = async () => {
    if (!group || !user?.uid) return;

    if (user.uid === group.createdBy) {
      Alert.alert('Lỗi', 'Người tạo nhóm không thể rời nhóm. Vui lòng chuyển quyền admin cho người khác trước.');
      return;
    }

    Alert.alert(
      'Xác nhận rời nhóm',
      `Bạn có chắc chắn muốn rời khỏi nhóm "${group.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rời nhóm',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const groupRef = doc(db, 'groups', group.id);
              await updateDoc(groupRef, {
                members: arrayRemove(user.uid),
                admins: arrayRemove(user.uid),
                memberCount: group.members.length - 1,
                updatedAt: new Date()
              });

              showSnackbar('Đã rời khỏi nhóm');
              router.back();
            } catch (error) {
              console.error('Error leaving group:', error);
              showSnackbar('Không thể rời khỏi nhóm');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const deleteGroup = async () => {
    if (!group || !user?.uid) return;

    if (user.uid !== group.createdBy) {
      Alert.alert('Lỗi', 'Chỉ người tạo nhóm mới có thể xóa nhóm.');
      return;
    }

    Alert.alert(
      'Xác nhận xóa nhóm',
      `Bạn có chắc chắn muốn xóa nhóm "${group.name}"? Hành động này không thể hoàn tác và sẽ xóa tất cả dữ liệu của nhóm.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa nhóm',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const groupRef = doc(db, 'groups', group.id);
              
              // Delete all subcollections first (messages, etc.)
              const subcollections = ['messages', 'typing', 'presence', 'readStatus'];
              for (const subcollection of subcollections) {
                const subRef = collection(groupRef, subcollection);
                const subDocs = await getDocs(subRef);
                const deletePromises = subDocs.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
              }
              
              // Delete the main group document
              await deleteDoc(groupRef);
              
              showSnackbar('Đã xóa nhóm');
              router.replace('/(tabs)/groups');
            } catch (error) {
              console.error('Error deleting group:', error);
              showSnackbar('Không thể xóa nhóm');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const updateGroupInfo = async () => {
    if (!group) return;
    
    if (!groupName.trim()) {
      Alert.alert('Lỗi', 'Tên nhóm không được để trống');
      return;
    }

    setUpdating(true);
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        name: groupName.trim(),
        description: groupDescription.trim(),
        type: groupType,
        isSearchable: groupType === 'private' ? false : isSearchable,
        updatedAt: new Date()
      });

      setGroup(prev => prev ? {
        ...prev,
        name: groupName.trim(),
        description: groupDescription.trim(),
        type: groupType,
        isSearchable: groupType === 'private' ? false : isSearchable
      } : null);

      showSnackbar('Đã cập nhật thông tin nhóm');
    } catch (error) {
      console.error('Error updating group:', error);
      showSnackbar('Không thể cập nhật thông tin nhóm');
    } finally {
      setUpdating(false);
    }
  };

  const toggleAdmin = async (memberUID) => {
    if (!group) return;

    const isAdmin = group.admins?.includes(memberUID);
    const memberName = members.find(m => m.uid === memberUID)?.username || 'Thành viên này';
    
    setUpdating(true);

    try {
      const groupRef = doc(db, 'groups', group.id);
      if (isAdmin) {
        await updateDoc(groupRef, {
          admins: arrayRemove(memberUID),
          updatedAt: new Date()
        });
      } else {
        await updateDoc(groupRef, {
          admins: arrayUnion(memberUID),
          updatedAt: new Date()
        });
      }

      setGroup(prev => prev ? {
        ...prev,
        admins: isAdmin 
          ? (prev.admins?.filter(uid => uid !== memberUID) || [])
          : [...(prev.admins || []), memberUID]
      } : null);

      showSnackbar(
        isAdmin 
          ? `Đã bỏ quyền admin của ${memberName}` 
          : `Đã cấp quyền admin cho ${memberName}`
      );
    } catch (error) {
      console.error('Error toggling admin:', error);
      showSnackbar('Không thể thay đổi quyền admin');
    } finally {
      setUpdating(false);
    }
  };

  const isGroupOwner = () => group?.createdBy === user?.uid;
  const isGroupAdmin = () => group?.createdBy === user?.uid || group?.admins?.includes(user?.uid);
  const canManageMembers = () => isGroupAdmin();

  const handleChangeGroupAvatar = async () => {
    if (!group) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        const avatarRef = ref(storage, `groups/${group.id}/avatar_${Date.now()}`);
        await uploadBytes(avatarRef, blob);
        const downloadURL = await getDownloadURL(avatarRef);
        await updateDoc(doc(db, 'groups', group.id), {
          avatarUrl: downloadURL,
          updatedAt: new Date(),
        });
        setGroup(prev => prev ? { ...prev, avatarUrl: downloadURL } : null);
        showSnackbar('Đã cập nhật ảnh nhóm!');
      }
    } catch (error) {
      console.error('Error changing group avatar:', error);
      showSnackbar('Không thể đổi ảnh nhóm');
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const renderGalleryList = () => (
    <View style={styles.galleryContainer}>
      <FlatList
        data={sharedImages}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.galleryContent}
        onEndReachedThreshold={0.5}
        onEndReached={() => loadMoreMedia()}
        ListHeaderComponent={
          sharedLoading ? (
            <View style={styles.galleryLoadingContainer}>
              <ActivityIndicator size="large" color={primaryColor} />
            </View>
          ) : sharedImages.length === 0 ? (
            <View style={styles.emptyGalleryContainer}>
              <MaterialCommunityIcons name="image-off" size={80} color={currentThemeColors.subtleText} />
              <Text style={[styles.emptyGalleryText, { color: currentThemeColors.subtleText }]}>
                Chưa có ảnh nào được chia sẻ trong nhóm
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.galleryItem}>
            <CustomImage source={item.url} style={styles.galleryImage} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              style={styles.galleryOverlay}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderTabBar = () => {
    const tabs = [
      { key: 'info', label: 'Thông tin', icon: 'information' },
      { key: 'members', label: 'Thành viên', icon: 'account-group' },
      { key: 'media', label: 'Media', icon: 'image-multiple' },
    ];
    if (canManageMembers()) {
      tabs.push({ key: 'add', label: 'Thêm', icon: 'account-plus' });
    }

    return (
      <View style={[styles.tabBar, { backgroundColor: currentThemeColors.surface }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabItem,
                activeTab === tab.key && [styles.activeTabItem, { backgroundColor: primaryColor }]
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={20}
                color={activeTab === tab.key ? '#fff' : currentThemeColors.text}
              />
              <Text style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? '#fff' : currentThemeColors.text }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderGroupInfo = () => (
    <Animated.ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      scrollEventThrottle={16}
    >
      <Card style={[styles.infoCard, { backgroundColor: currentThemeColors.surface }]} elevation={0}>
        <Card.Content>
          <View style={styles.avatarSection}>
            <TouchableOpacity 
              onPress={canManageMembers() ? handleChangeGroupAvatar : undefined}
              disabled={!canManageMembers()}
            >
              <View style={styles.avatarWrapper}>
                <Avatar.Image
                  size={140}
                  source={{ uri: group?.avatarUrl || 'https://via.placeholder.com/140x140/667eea/ffffff?text=G' }}
                />
                {canManageMembers() && (
                  <View style={styles.cameraIconWrapper}>
                    <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: primaryColor }]}>
                  {group?.memberCount ?? group?.members?.length ?? members.length}
                </Text>
                <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>
                  Thành viên
                </Text>
              </View>
              
              <View style={[styles.statDivider, { backgroundColor: currentThemeColors.border }]} />
              
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: primaryColor }]}>
                  {group?.admins?.length || 0}
                </Text>
                <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>
                  Quản trị
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <TextInput
              label="Tên nhóm"
              value={groupName}
              onChangeText={setGroupName}
              mode="outlined"
              disabled={!canManageMembers()}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              theme={{ 
                colors: { 
                  primary: primaryColor, 
                  background: currentThemeColors.surface,
                  onSurfaceVariant: currentThemeColors.subtleText 
                } 
              }}
              left={<TextInput.Icon icon="account-group" color={primaryColor} />}
            />

            <TextInput
              label="Mô tả nhóm"
              value={groupDescription}
              onChangeText={setGroupDescription}
              mode="outlined"
              multiline
              numberOfLines={5}
              disabled={!canManageMembers()}
              style={[styles.input, styles.textArea]}
              outlineStyle={styles.inputOutline}
              theme={{ 
                colors: { 
                  primary: primaryColor, 
                  background: currentThemeColors.surface,
                  onSurfaceVariant: currentThemeColors.subtleText 
                } 
              }}
              left={<TextInput.Icon icon="text" color={primaryColor} />}
            />

            <View style={styles.groupIdSection}>
              <Text style={[styles.groupIdLabel, { color: currentThemeColors.text }]}>
                ID nhóm:
              </Text>
              <TouchableOpacity 
                onPress={copyGroupId}
                style={[styles.groupIdContainer, { backgroundColor: currentThemeColors.background, borderColor: currentThemeColors.border }]}
              >
                <Text style={[styles.groupIdText, { color: currentThemeColors.text }]} numberOfLines={1}>
                  {group.id}
                </Text>
                <MaterialCommunityIcons name="content-copy" size={20} color={primaryColor} />
              </TouchableOpacity>
              <Text style={[styles.groupIdNote, { color: currentThemeColors.subtleText }]}>
                Nhấn để sao chép. Sử dụng ID này để tìm kiếm nhóm.
              </Text>
            </View>

            <View style={styles.groupTypeSection}>
              <Text style={[styles.groupTypeLabel, { color: currentThemeColors.text }]}
              >
                Loại nhóm:
              </Text>
              
              <View style={styles.groupTypeOptions}>
                <TouchableOpacity
                  style={[
                    styles.groupTypeButton,
                    { 
                      backgroundColor: groupType === 'public' ? primaryColor : 'transparent',
                      borderColor: primaryColor,
                      borderWidth: 2
                    }
                  ]}
                  onPress={() => setGroupType('public')}
                >
                  <MaterialCommunityIcons 
                    name="earth" 
                    size={20} 
                    color={groupType === 'public' ? '#fff' : primaryColor} 
                  />
                  <Text style={[
                    styles.groupTypeText,
                    { color: groupType === 'public' ? '#fff' : primaryColor }
                  ]}>
                    Công khai
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.groupTypeButton,
                    { 
                      backgroundColor: groupType === 'private' ? primaryColor : 'transparent',
                      borderColor: primaryColor,
                      borderWidth: 2
                    }
                  ]}
                  onPress={() => setGroupType('private')}
                >
                  <MaterialCommunityIcons 
                    name="lock" 
                    size={20} 
                    color={groupType === 'private' ? '#fff' : primaryColor} 
                  />
                  <Text style={[
                    styles.groupTypeText,
                    { color: groupType === 'private' ? '#fff' : primaryColor }
                  ]}>
                    Riêng tư
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchableSection}>
              <View style={styles.searchableRow}>
                <Text style={[styles.searchableLabel, { color: currentThemeColors.text }]}>
                  Cho phép tìm kiếm:
                </Text>
                
                <Switch
                  value={isSearchable}
                  onValueChange={setIsSearchable}
                  disabled={groupType === 'private'}
                  trackColor={{ false: '#767577', true: primaryColor }}
                  thumbColor={isSearchable ? '#fff' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                  style={styles.searchableSwitch}
                />
              </View>
              
              {groupType === 'private' && (
                <Text style={[styles.searchableNote, { color: currentThemeColors.subtleText }]}>
                  Nhóm riêng tư không thể tìm kiếm được
                </Text>
              )}
            </View>

            {canManageMembers() && (
              <Button
                mode="contained"
                onPress={updateGroupInfo}
                loading={updating}
                disabled={updating}
                style={styles.primaryButton}
                icon="content-save"
                buttonColor={primaryColor}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Cập nhật thông tin
              </Button>
            )}

            {isGroupOwner() && (
              <Button
                mode="contained"
                onPress={deleteGroup}
                loading={updating}
                disabled={updating}
                style={[styles.dangerButton, { backgroundColor: '#DC2626' }]}
                icon="delete-forever"
                buttonColor="#DC2626"
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Xóa nhóm
              </Button>
            )}

            {!isGroupOwner() && (
              <Button
                mode="outlined"
                onPress={leaveGroup}
                loading={updating}
                disabled={updating}
                style={[styles.dangerButton, { borderColor: '#EF4444' }]}
                icon="exit-to-app"
                textColor="#EF4444"
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Rời nhóm
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    </Animated.ScrollView>
  );

  const renderMembersList = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.membersHeader}>
        <Text style={[styles.membersTitle, { color: currentThemeColors.text }]}>
          Danh sách thành viên
        </Text>
        <Chip 
          mode="flat" 
          style={{ backgroundColor: `${primaryColor}20` }}
          textStyle={{ color: primaryColor, fontWeight: '600' }}
        >
          {members.length} người
        </Chip>
      </View>

      {members.map((member, index) => (
        <Card 
          key={member.uid} 
          style={[styles.memberCard, { backgroundColor: currentThemeColors.surface }]} 
          elevation={0}
        >
          <Card.Content style={styles.memberCardContent}>
            <View style={styles.memberLeft}>
              <View style={styles.memberAvatarContainer}>
                <Avatar.Image 
                  size={56} 
                  source={{ uri: member.profileUrl || 'https://via.placeholder.com/56x56/667eea/ffffff?text=U' }} 
                />
                {viewerShowOnline && member.isOnline && (
                  <View style={styles.onlineBadge} />
                )}
              </View>

              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={[styles.memberName, { color: currentThemeColors.text }]} numberOfLines={1}>
                    {member.username || 'Unknown User'}
                  </Text>
                  {member.uid === group?.createdBy && (
                    <View style={styles.ownerBadge}>
                      <MaterialCommunityIcons name="crown" size={14} color="#FFD700" />
                    </View>
                  )}
                  {group?.admins?.includes(member.uid) && member.uid !== group?.createdBy && (
                    <View style={styles.adminBadge}>
                      <MaterialCommunityIcons name="shield-account" size={14} color="#9C27B0" />
                    </View>
                  )}
                </View>

                <Text style={[styles.memberBio, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
                  {member.bio || 'Chưa có thông tin'}
                </Text>

                <View style={styles.memberMeta}>
                  {member.age && (
                    <Text style={[styles.metaText, { color: currentThemeColors.subtleText }]}>
                      {member.age} tuổi
                    </Text>
                  )}
                  {member.gender && (
                    <>
                      <View style={styles.metaDot} />
                      <Text style={[styles.metaText, { color: currentThemeColors.subtleText }]}>
                        {member.gender}
                      </Text>
                    </>
                  )}
                  {viewerShowOnline && (
                    <>
                      <View style={styles.metaDot} />
                      <Text style={[styles.metaText, { color: member.isOnline ? '#10B981' : currentThemeColors.subtleText }]}>
                        {member.isOnline ? 'Đang online' : 'Offline'}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {canManageMembers() && member.uid !== group?.createdBy && member.uid !== user?.uid && (
              <View style={styles.memberActions}>
                <IconButton
                  icon={group?.admins?.includes(member.uid) ? 'shield-remove' : 'shield-account'}
                  size={22}
                  iconColor={primaryColor}
                  onPress={() => toggleAdmin(member.uid)}
                  disabled={updating}
                  containerColor={`${primaryColor}15`}
                />
                <IconButton
                  icon='account-remove'
                  size={22}
                  iconColor='#EF4444'
                  onPress={() => removeMember(member.uid)}
                  disabled={updating}
                  containerColor='#EF444415'
                />
              </View>
            )}
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );

  const renderAddMember = () => (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <Card style={[styles.addMemberCard, { backgroundColor: currentThemeColors.surface }]} elevation={0}>
        <Card.Content>
          <View style={styles.addMemberHeader}>
            <MaterialCommunityIcons name="account-plus" size={32} color={primaryColor} />
            <Text style={[styles.addMemberTitle, { color: currentThemeColors.text }]}>
              Thêm thành viên mới
            </Text>
            <Text style={[styles.addMemberSubtitle, { color: currentThemeColors.subtleText }]}>
              Nhập UID hoặc username để tìm kiếm
            </Text>
          </View>

          <TextInput
            label='Tìm kiếm người dùng'
            value={newMemberUID}
            onChangeText={setNewMemberUID}
            mode='outlined'
            style={styles.searchInput}
            outlineStyle={styles.inputOutline}
            theme={{ 
              colors: { 
                primary: primaryColor, 
                background: currentThemeColors.surface,
                onSurfaceVariant: currentThemeColors.subtleText 
              } 
            }}
            left={<TextInput.Icon icon='magnify' color={primaryColor} />}
            right={
              <TextInput.Icon 
                icon='send' 
                onPress={searchUserByUID} 
                disabled={searchLoading}
                color={searchLoading ? currentThemeColors.subtleText : primaryColor}
              />
            }
            onSubmitEditing={searchUserByUID}
          />

          {searchLoading && (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size='small' color={primaryColor} />
              <Text style={{ color: currentThemeColors.text, marginLeft: 12, fontSize: 15 }}>
                Đang tìm kiếm...
              </Text>
            </View>
          )}

          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={[styles.searchResultsTitle, { color: currentThemeColors.text }]}>
                Kết quả tìm kiếm
              </Text>
              
              {searchResults.map((searchUser) => (
                <TouchableOpacity 
                  key={searchUser.uid}
                  onPress={() => addMemberToGroup(searchUser)} 
                  disabled={updating}
                  style={[styles.searchResultCard, { backgroundColor: currentThemeColors.background }]}
                >
                  <Avatar.Image 
                    size={60} 
                    source={{ uri: searchUser.profileUrl || 'https://via.placeholder.com/60x60/667eea/ffffff?text=U' }} 
                  />
                  
                  <View style={styles.searchUserInfo}>
                    <Text style={[styles.searchUserName, { color: currentThemeColors.text }]}>
                      {searchUser.username || 'Unknown User'}
                    </Text>
                    <Text style={[styles.searchUserBio, { color: currentThemeColors.subtleText }]} numberOfLines={2}>
                      {searchUser.bio || 'Chưa có thông tin'}
                    </Text>
                    <View style={styles.searchUserMeta}>
                      {searchUser.age && (
                        <Text style={[styles.metaText, { color: currentThemeColors.subtleText }]}>
                          {searchUser.age} tuổi
                        </Text>
                      )}
                      {searchUser.gender && (
                        <>
                          <View style={styles.metaDot} />
                          <Text style={[styles.metaText, { color: currentThemeColors.subtleText }]}>
                            {searchUser.gender}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={[styles.addButton, { backgroundColor: updating ? currentThemeColors.border : `${primaryColor}15` }]}>
                    <MaterialCommunityIcons 
                      name='plus' 
                      size={24} 
                      color={updating ? currentThemeColors.subtleText : primaryColor} 
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentThemeColors.background }]}>
        <StatusBar 
          style={theme === 'dark' ? 'light' : 'dark'}
          backgroundColor="transparent"
          translucent
        />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Đang tải thông tin nhóm...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: currentThemeColors.background }]}>
        <StatusBar 
          style={theme === 'dark' ? 'light' : 'dark'}
          backgroundColor={currentThemeColors.background}
        />
        <MaterialCommunityIcons name="alert-circle" size={80} color={primaryColor} />
        <Text style={[styles.errorText, { color: currentThemeColors.text }]}>
          Không tìm thấy nhóm
        </Text>
        <Button 
          mode="contained" 
          onPress={() => router.back()}
          style={styles.backButton}
          icon="arrow-left"
          buttonColor={primaryColor}
        >
          Quay lại
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <StatusBar 
        style={'light'}
        backgroundColor="transparent"
        translucent
      />
      
      {/* Modern Header with Animated Background */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <Animated.View style={[styles.headerBackground, { opacity: headerOpacity }]} />
        
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.headerButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Quản lý nhóm</Text>
            <Text style={styles.headerSubtitle}>{group.name}</Text>
          </View>
          
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {renderTabBar()}

      {activeTab === 'media' ? (
        renderGalleryList()
      ) : (
        <>
          {activeTab === 'info' && renderGroupInfo()}
          {activeTab === 'members' && renderMembersList()}
          {activeTab === 'add' && canManageMembers() && renderAddMember()}
        </>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[styles.snackbar, { backgroundColor: currentThemeColors.surface }]}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
          labelStyle: { color: primaryColor, fontWeight: '600' },
        }}
      >
        <Text style={{ color: currentThemeColors.text, fontSize: 15 }}>{snackbarMessage}</Text>
      </Snackbar>
    </View>
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
  loadingGradient: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 20,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    borderRadius: 25,
  },
  header: {
    paddingBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  tabBar: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabScrollContent: {
    paddingHorizontal: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginHorizontal: 4,
  },
  activeTabItem: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  infoCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  cameraIconWrapper: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: primaryColor,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  statBox: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 50,
  },
  formSection: {
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
  },
  inputOutline: {
    borderRadius: 16,
    borderWidth: 1.5,
  },
  textArea: {
    minHeight: 120,
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 16,
    elevation: 0,
  },
  dangerButton: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  memberCard: {
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatarContainer: {
    position: 'relative',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  ownerBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 4,
  },
  adminBadge: {
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 4,
    marginLeft: 4,
  },
  memberBio: {
    fontSize: 14,
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 6,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addMemberCard: {
    borderRadius: 24,
  },
  addMemberHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  addMemberTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  addMemberSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchInput: {
    marginTop: 8,
    marginBottom: 16,
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  searchResultsContainer: {
    marginTop: 16,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  searchUserInfo: {
    flex: 1,
    marginLeft: 16,
  },
  searchUserName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchUserBio: {
    fontSize: 14,
    marginBottom: 4,
  },
  searchUserMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  galleryContainer: {
    flex: 1,
  },
  galleryContent: {
    padding: 8,
  },
  galleryLoadingContainer: {
    height: '30%',
  },
  emptyGalleryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyGalleryText: {
    fontSize: 16,
    textAlign: 'center',
  },
  galleryItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
  },
  groupIdSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  groupIdLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  groupIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  groupIdText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  groupIdNote: {
    fontSize: 12,
  },
  groupTypeSection: {
    marginBottom: 16,
  },
  groupTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  groupTypeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  groupTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    marginHorizontal: 4,
    elevation: 0,
  },
  groupTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchableSection: {
    marginBottom: 16,
  },
  searchableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchableLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  searchableSwitch: {
    transform: [{ scale: 1.2 }],
  },
  searchableNote: {
    fontSize: 12,
    marginTop: 4,
  },
  snackbar: {
    borderRadius: 12,
    elevation: 6,
  },
});