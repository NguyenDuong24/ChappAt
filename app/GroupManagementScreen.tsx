import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  Platform
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
  documentId
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FlatList } from 'react-native';
import CustomImage from '@/components/common/CustomImage';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const imageSize = Math.floor((width - 8 * 2 - 8) / 3); // paddingHorizontal (8*2) + item margins (~8)

// Ensure gallery items have a concrete size (3-column grid)
const IMAGE_SIZE = Math.floor((width - 32) / 3);

interface User {
  uid: string;
  username?: string;
  profileUrl?: string;
  bio?: string;
  age?: number;
  gender?: string;
  isOnline?: boolean;
  lastUpdated?: any;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

interface GroupData {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: any;
  memberCount: number;
}

// Gallery state
interface GalleryImage {
  id: string;
  url: string;
  createdAt?: { seconds: number } | any;
  createdBy?: string;
}
const storage = getStorage();

// Màu mặc định cho primary
const primaryColor = Colors.primary || '#667eea';

// Simple cache to avoid re-fetching user documents across renders/screens
const userCache = new Map<string, User>();

export default function ModernGroupManagementScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const viewerShowOnline = user?.showOnlineStatus !== false;
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'add' | 'gallery'>('info');
  
  // Form states
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [newMemberUID, setNewMemberUID] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Gallery state
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  useEffect(() => {
    loadGroupData();
    // Rely on realtime listener for gallery, avoid initial one-off read
    // loadGalleryImages();
  }, [id]);

  // Lazy-load member details only when Members tab is opened
  useEffect(() => {
    if (activeTab === 'members' && group && members.length === 0) {
      loadMemberDetails(group.members);
    }
  }, [activeTab, group]);

  // Real-time gallery listener so new images appear instantly
  useEffect(() => {
    if (!id) return;
    try {
      const galleryRef = collection(db, 'groups', id as string, 'gallery');
      const q = query(galleryRef, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const images = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((img: any) => typeof img.url === 'string');
        // Debug: see how many images we have and sample first
        try { console.log('Gallery realtime size:', images.length, images[0]); } catch {}
        setGalleryImages(images as any);
        // mark loading done on first emission
        if (galleryLoading) setGalleryLoading(false);
      }, (error) => {
        console.error('Gallery realtime error:', error);
        if (galleryLoading) setGalleryLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error('Failed to setup gallery listener:', e);
      if (galleryLoading) setGalleryLoading(false);
    }
  }, [id]);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const loadGroupData = async () => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', id as string));
      if (groupDoc.exists()) {
        const groupData = { id: groupDoc.id, ...groupDoc.data() } as GroupData;
        setGroup(groupData);
        setGroupName(groupData.name);
        setGroupDescription(groupData.description || '');
        // Defer member detail fetch until Members tab is opened to save reads
        // await loadMemberDetails(groupData.members);
      }
    } catch (error) {
      console.error('Error loading group:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin nhóm');
    } finally {
      setLoading(false);
    }
  };

  const loadMemberDetails = async (memberUIDs: string[]) => {
    try {
      // Determine which UIDs still need fetching
      const missing = memberUIDs.filter(uid => !userCache.has(uid));
      const chunkSize = 10; // Firestore 'in' supports up to 10 values
      for (let i = 0; i < missing.length; i += chunkSize) {
        const chunk = missing.slice(i, i + chunkSize);
        const qUsers = query(collection(db, 'users'), where(documentId(), 'in', chunk));
        const qs = await getDocs(qUsers);
        qs.docs.forEach(d => {
          userCache.set(d.id, { uid: d.id, ...(d.data() as any) });
        });
        // For any doc not found, cache a fallback
        chunk.forEach(uid => {
          if (!userCache.has(uid)) userCache.set(uid, { uid, username: 'Unknown User', bio: '', isOnline: false });
        });
      }
      // Build ordered list
      const memberDetails = memberUIDs.map(uid => userCache.get(uid)!) as User[];
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
      // Search by UID first
      const userDoc = await getDoc(doc(db, 'users', newMemberUID.trim()));
      if (userDoc.exists()) {
        const userData = { uid: userDoc.id, ...userDoc.data() } as User;
        setSearchResults([userData]);
      } else {
        // Search by username if UID not found
        const q = query(
          collection(db, 'users'), 
          where('username', '==', newMemberUID.trim())
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const users = querySnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
          } as User));
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

  const addMemberToGroup = async (newUser: User) => {
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

  const removeMember = async (memberUID: string) => {
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
        updatedAt: new Date()
      });

      setGroup(prev => prev ? {
        ...prev,
        name: groupName.trim(),
        description: groupDescription.trim()
      } : null);

      showSnackbar('Đã cập nhật thông tin nhóm');
    } catch (error) {
      console.error('Error updating group:', error);
      showSnackbar('Không thể cập nhật thông tin nhóm');
    } finally {
      setUpdating(false);
    }
  };

  const toggleAdmin = async (memberUID: string) => {
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

  const loadGalleryImages = async () => {
    if (!id) return;
    setGalleryLoading(true);
    try {
      const galleryRef = collection(db, 'groups', id as string, 'gallery');
      const q = query(galleryRef);
      const snapshot = await getDocs(q);
      const images = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((img): img is GalleryImage => 'url' in img && typeof img.url === 'string');
      setGalleryImages(images.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      }));
      try { console.log('Gallery initial load size:', images.length); } catch {}
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleAddGalleryImage = async () => {
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
        const imgRef = ref(storage, `groups/${group.id}/gallery/${Date.now()}`);
        await uploadBytes(imgRef, blob);
        const downloadURL = await getDownloadURL(imgRef);
        // Lưu metadata vào Firestore
        const galleryRef = collection(db, 'groups', group.id, 'gallery');
        await addDoc(galleryRef, {
          url: downloadURL,
          createdAt: Timestamp.now(),
          createdBy: user?.uid,
        });
        showSnackbar('Đã thêm ảnh vào gallery nhóm!');
        // No manual reload; onSnapshot will update list
      }
    } catch (error) {
      console.error('Error adding gallery image:', error);
      showSnackbar('Không thể thêm ảnh vào gallery');
    }
  };

  const renderGalleryList = () => (
    <FlatList
      data={galleryImages}
      keyExtractor={(item) => item.id}
      numColumns={3}
      contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 8 }}
      ListHeaderComponent={
        <Card style={[styles.card, { backgroundColor: currentThemeColors.surface }]}> 
          <Card.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: currentThemeColors.text, flex: 1 }]}>Ảnh nhóm</Text>
              {canManageMembers() && (
                <IconButton icon="plus" onPress={handleAddGalleryImage} iconColor={primaryColor} />
              )}
            </View>
            {galleryLoading && (
              <ActivityIndicator size="large" color={primaryColor} />
            )}
            {!galleryLoading && galleryImages.length === 0 && (
              <Text style={{ color: currentThemeColors.subtleText, textAlign: 'center', marginVertical: 20 }}>Chưa có ảnh nào trong nhóm</Text>
            )}
          </Card.Content>
        </Card>
      }
      renderItem={({ item }) => (
        <View style={styles.galleryItem}>
          <CustomImage source={item.url} style={styles.galleryImage} />
        </View>
      )}
      ListEmptyComponent={!galleryLoading ? null : undefined}
    />
  );

  const renderTabBar = () => {
    const tabs: { key: typeof activeTab; label: string; icon: string }[] = [
      { key: 'info', label: 'Thông tin', icon: 'information' },
      { key: 'members', label: 'Thành viên', icon: 'account-group' },
      { key: 'gallery', label: 'Ảnh', icon: 'image' },
    ];
    if (canManageMembers()) {
      tabs.push({ key: 'add', label: 'Thêm', icon: 'account-plus' });
    }

    return (
      <Surface style={[styles.tabBar, { backgroundColor: currentThemeColors.surface, elevation: 4 }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && styles.activeTabItem
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={22}
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
      </Surface>
    );
  };

  const renderGroupInfo = () => (
    <Card style={[styles.card, { backgroundColor: currentThemeColors.surface }]} elevation={4}>
      <Card.Content>
        <View style={styles.groupHeader}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.avatarGradient}>
            <Avatar.Image
              size={120}
              source={{ uri: group?.avatarUrl || 'https://via.placeholder.com/120x120/667eea/ffffff?text=G' }}
              style={styles.groupAvatar}
            />
            {canManageMembers() && (
              <TouchableOpacity style={styles.changeAvatarBtn} onPress={handleChangeGroupAvatar}>
                <MaterialCommunityIcons name="camera" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </LinearGradient>

          <View style={styles.groupStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: primaryColor }]}>
                {group?.memberCount ?? group?.members?.length ?? members.length}
              </Text>
              <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>Thành viên</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: primaryColor }]}>
                {group?.admins?.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: currentThemeColors.subtleText }]}>Admin</Text>
            </View>
          </View>
        </View>

        <TextInput
          label="Tên nhóm"
          value={groupName}
          onChangeText={setGroupName}
          mode="outlined"
          disabled={!canManageMembers()}
          style={styles.input}
          theme={{ colors: { primary: primaryColor, background: currentThemeColors.surface } }}
          left={<TextInput.Icon icon="account-group" color={primaryColor} />}
        />

        <TextInput
          label="Mô tả nhóm"
          value={groupDescription}
          onChangeText={setGroupDescription}
          mode="outlined"
          multiline
          numberOfLines={4}
          disabled={!canManageMembers()}
          style={styles.input}
          theme={{ colors: { primary: primaryColor, background: currentThemeColors.surface } }}
          left={<TextInput.Icon icon="text" color={primaryColor} />}
        />

        {canManageMembers() && (
          <Button
            mode="contained"
            onPress={updateGroupInfo}
            loading={updating}
            disabled={updating}
            style={styles.updateButton}
            icon="content-save"
            buttonColor={primaryColor}
            contentStyle={{ height: 48 }}
          >
            Cập nhật thông tin
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  const renderMembersList = () => (
    <Card style={[styles.card, { backgroundColor: currentThemeColors.surface }]} elevation={4}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>Thành viên nhóm ({members.length})</Text>
        {members.map((member, index) => (
          <View key={member.uid}>
            <Surface style={[styles.memberCard, { backgroundColor: currentThemeColors.background }]}>
              <View style={styles.memberInfo}>
                <View style={styles.avatarContainer}>
                  <Avatar.Image size={60} source={{ uri: member.profileUrl || 'https://via.placeholder.com/60x60/667eea/ffffff?text=U' }} />
                  {viewerShowOnline && member.isOnline && <View style={styles.onlineIndicator} />}
                </View>
                <View style={styles.memberDetails}>
                  <View style={styles.memberNameRow}>
                    <Text style={[styles.memberName, { color: currentThemeColors.text }]}>{member.username || 'Unknown User'}</Text>
                    {member.uid === group?.createdBy && (
                      <Chip compact style={styles.ownerChip} textStyle={styles.chipText}>Chủ nhóm</Chip>
                    )}
                    {group?.admins?.includes(member.uid) && member.uid !== group?.createdBy && (
                      <Chip compact style={styles.adminChip} textStyle={styles.chipText}>Admin</Chip>
                    )}
                  </View>
                  <Text style={[styles.memberBio, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
                    {member.bio || 'Chưa có thông tin'}
                  </Text>
                  <View style={styles.memberMetadata}>
                    {member.age && (
                      <Text style={[styles.memberMeta, { color: currentThemeColors.subtleText }]}>{member.age} tuổi</Text>
                    )}
                    {member.gender && (
                      <Text style={[styles.memberMeta, { color: currentThemeColors.subtleText }]}>• {member.gender}</Text>
                    )}
                    {viewerShowOnline && (
                      <Text style={[styles.memberMeta, { color: currentThemeColors.subtleText }]}>• {member.isOnline ? 'Đang online' : 'Offline'}</Text>
                    )}
                  </View>
                </View>
              </View>
              {canManageMembers() && member.uid !== group?.createdBy && member.uid !== user?.uid && (
                <View style={styles.memberActions}>
                  <IconButton
                    icon={group?.admins?.includes(member.uid) ? 'shield-remove' : 'shield-account'}
                    size={24}
                    iconColor={primaryColor}
                    onPress={() => toggleAdmin(member.uid)}
                    disabled={updating}
                    style={styles.actionButton}
                  />
                  <IconButton
                    icon='account-remove'
                    size={24}
                    iconColor='#F44336'
                    onPress={() => removeMember(member.uid)}
                    disabled={updating}
                    style={styles.actionButton}
                  />
                </View>
              )}
            </Surface>
            {index < members.length - 1 && <Divider style={styles.memberDivider} />}
          </View>
        ))}
      </Card.Content>
    </Card>
  );

  const renderAddMember = () => (
    <Card style={[styles.card, { backgroundColor: currentThemeColors.surface }]} elevation={4}>
      <Card.Content>
        <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>Thêm thành viên mới</Text>
        <TextInput
          label='UID hoặc Username'
          value={newMemberUID}
          onChangeText={setNewMemberUID}
          mode='outlined'
          style={styles.input}
          theme={{ colors: { primary: primaryColor, background: currentThemeColors.surface } }}
          left={<TextInput.Icon icon='magnify' color={primaryColor} />}
          right={<TextInput.Icon icon='send' onPress={searchUserByUID} disabled={searchLoading} color={primaryColor} />}
          onSubmitEditing={searchUserByUID}
        />
        {searchLoading && (
          <View style={styles.searchLoading}>
            <ActivityIndicator size='small' color={primaryColor} />
            <Text style={{ color: currentThemeColors.text, marginLeft: 8 }}>Đang tìm kiếm...</Text>
          </View>
        )}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <Text style={[styles.searchTitle, { color: currentThemeColors.text }]}>Kết quả tìm kiếm:</Text>
            {searchResults.map((searchUser) => (
              <Surface key={searchUser.uid} style={[styles.searchResultCard, { backgroundColor: currentThemeColors.background }]}>
                <TouchableOpacity style={styles.searchResultContent} onPress={() => addMemberToGroup(searchUser)} disabled={updating}>
                  <Avatar.Image size={50} source={{ uri: searchUser.profileUrl || 'https://via.placeholder.com/50x50/667eea/ffffff?text=U' }} />
                  <View style={styles.searchUserInfo}>
                    <Text style={[styles.searchUserName, { color: currentThemeColors.text }]}>{searchUser.username || 'Unknown User'}</Text>
                    <Text style={[styles.searchUserBio, { color: currentThemeColors.subtleText }]}>{searchUser.bio || 'Chưa có thông tin'}</Text>
                    <Text style={[styles.searchUserMeta, { color: currentThemeColors.subtleText }]}>
                      {searchUser.age && `${searchUser.age} tuổi`} {searchUser.gender && `• ${searchUser.gender}`}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name='account-plus' size={28} color={updating ? currentThemeColors.subtleText : primaryColor} />
                </TouchableOpacity>
              </Surface>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
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
      
      {/* Modern Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={[styles.modernHeader, { paddingTop: insets.top }]}
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.modernHeaderTitle}>
          Quản lý nhóm
        </Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {renderTabBar()}

      {activeTab === 'gallery' ? (
        renderGalleryList()
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'info' && renderGroupInfo()}
          {activeTab === 'members' && renderMembersList()}
          {activeTab === 'add' && canManageMembers() && renderAddMember()}
        </ScrollView>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: currentThemeColors.surface }}
        wrapperStyle={{ bottom: 20 }}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
          labelStyle: { color: primaryColor },
        }}
      >
        <Text style={{ color: currentThemeColors.text }}>{snackbarMessage}</Text>
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
    borderRadius: 20,
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
    width: 200,
  },
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    // paddingTop will be provided by insets.top at runtime
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  modernHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    marginHorizontal: 4,
  },
  activeTabItem: {
    backgroundColor: primaryColor,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingHorizontal: 8,
  },
  card: {
    marginHorizontal: 8,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarGradient: {
    padding: 4,
    borderRadius: 60,
    marginRight: 20,
  },
  groupAvatar: {
    backgroundColor: 'transparent',
  },
  groupStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    marginBottom: 16,
    borderRadius: 12,
  },
  updateButton: {
    marginTop: 8,
    borderRadius: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    marginVertical: 8,
    elevation: 2,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDetails: {
    marginLeft: 12,
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  memberBio: {
    fontSize: 13,
    marginTop: 4,
  },
  memberMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  memberMeta: {
    fontSize: 12,
    marginRight: 8,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButton: {
    marginHorizontal: 4,
  },
  memberDivider: {
    marginHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  searchResults: {
    marginTop: 12,
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  searchResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchUserName: {
    fontSize: 16,
    fontWeight: '700',
  },
  searchUserBio: {
    fontSize: 13,
    marginTop: 4,
  },
  searchUserMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  changeAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  ownerChip: {
    marginLeft: 8,
    backgroundColor: '#4CAF50',
    height: 38, // tăng từ 24 lên 28
    paddingHorizontal: 10, // tăng từ 8 lên 10
    paddingVertical: 4, // thêm padding dọc
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminChip: {
    marginLeft: 8,
    backgroundColor: '#9C27B0',
    height: 28, // tăng từ 24 lên 28
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    paddingHorizontal: 2,
  },
  // Gallery grid styles to ensure images have size
  galleryItem: {
    width: imageSize,
    height: imageSize,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eaeaea',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});