import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Image,
    SafeAreaView,
    FlatList,
    Dimensions,
    Clipboard,
} from 'react-native';
import { Text, Divider, Avatar, Menu, IconButton, TextInput as PaperTextInput, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion, collection, query, where, orderBy, getDocs, arrayRemove } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { groupPermissionService } from '@/services/groupPermissionService';
import CustomImage from '@/components/common/CustomImage';
import {
    GroupRole,
    GroupPermission,
    GroupMemberWithRole,
    GroupWithRoles,
    ROLE_LABELS,
    ROLE_HIERARCHY,
} from '@/types/groupPermissions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebaseConfig';
import { nanoid } from 'nanoid';

export default function GroupManagementScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const themeCtx = useContext(ThemeContext);
    const theme = themeCtx?.theme || 'light';
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
    const insets = useSafeAreaInsets();

    const [group, setGroup] = useState<GroupWithRoles | null>(null);
    const [members, setMembers] = useState<GroupMemberWithRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState<GroupRole>(GroupRole.NEWBIE);
    const [canManage, setCanManage] = useState(false);

    // Edit states
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [editedDescription, setEditedDescription] = useState('');

    // Menu states
    const [menuVisible, setMenuVisible] = useState<string | null>(null);
    const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
    const [newMemberUid, setNewMemberUid] = useState('');

    // NEW: Tab and Media states
    const [activeTab, setActiveTab] = useState<'members' | 'media' | 'requests'>('members');
    const [mediaItems, setMediaItems] = useState<any[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    useEffect(() => {
        loadGroupData();
    }, [id]);

    // Load pending requests if user can manage
    useEffect(() => {
        if (canManage && activeTab === 'requests') {
            loadPendingRequests();
        }
    }, [canManage, activeTab]);

    const loadPendingRequests = async () => {
        if (!id) return;
        const { groupRequestService } = await import('@/services/groupRequestService');
        const requests = await groupRequestService.getPendingRequests(id as string);
        setPendingRequests(requests);
    };

    const handleApproveRequest = async (requestUid: string) => {
        try {
            const { groupRequestService } = await import('@/services/groupRequestService');
            const result = await groupRequestService.approveRequest(id as string, requestUid, user!.uid);

            if (result.success) {
                Alert.alert('Thành công', result.message);
                loadPendingRequests();
                loadGroupData(); // Reload members
            } else {
                Alert.alert('Lỗi', result.message);
            }
        } catch (error) {
            console.error('Error approving request:', error);
            Alert.alert('Lỗi', 'Không thể duyệt yêu cầu');
        }
    };

    const handleRejectRequest = async (requestUid: string) => {
        try {
            const { groupRequestService } = await import('@/services/groupRequestService');
            const result = await groupRequestService.rejectRequest(id as string, requestUid);

            if (result.success) {
                Alert.alert('Thành công', result.message);
                loadPendingRequests();
            } else {
                Alert.alert('Lỗi', result.message);
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            Alert.alert('Lỗi', 'Không thể từ chối yêu cầu');
        }
    };

    const loadGroupData = async () => {
        try {
            setLoading(true);

            if (!id || !user?.uid) return;

            // Load group info
            const groupDoc = await getDoc(doc(db, 'groups', id as string));
            if (!groupDoc.exists()) {
                Alert.alert('Lỗi', 'Không tìm thấy nhóm');
                router.back();
                return;
            }

            const groupData = { id: groupDoc.id, ...groupDoc.data() } as GroupWithRoles;
            setGroup(groupData);
            setEditedName(groupData.name);
            setEditedDescription(groupData.description || '');

            // Load user role
            const role = await groupPermissionService.getUserRole(id as string, user.uid);
            setUserRole(role);

            // Check if user can manage
            const canEdit = await groupPermissionService.hasPermission(
                id as string,
                user.uid,
                GroupPermission.EDIT_GROUP_INFO
            );
            setCanManage(canEdit.hasPermission);

            // Load members with roles
            const membersData = await groupPermissionService.getMembersWithRoles(id as string);
            setMembers(membersData);

        } catch (error) {
            console.error('Error loading group data:', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin nhóm');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadGroupData();
        if (activeTab === 'media') {
            loadMediaItems();
        }
    };

    // NEW: Load media from group messages
    const loadMediaItems = async () => {
        try {
            setLoadingMedia(true);
            const messagesRef = collection(db, 'groups', id as string, 'messages');
            const mediaQuery = query(
                messagesRef,
                where('type', '==', 'image'),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(mediaQuery);
            const media = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            setMediaItems(media);
        } catch (error) {
            console.error('Error loading media:', error);
        } finally {
            setLoadingMedia(false);
        }
    };

    // NEW: Load following status for members
    const loadFollowingStatus = async () => {
        try {
            const currentUserDoc = await getDoc(doc(db, 'users', user!.uid));
            const following = currentUserDoc.data()?.following || [];

            const status: Record<string, boolean> = {};
            members.forEach(member => {
                status[member.uid] = following.includes(member.uid);
            });

            setFollowingStatus(status);
        } catch (error) {
            console.error('Error loading following status:', error);
        }
    };

    // NEW: Toggle follow/unfollow
    const handleToggleFollow = async (targetUserId: string) => {
        try {
            const currentUserRef = doc(db, 'users', user!.uid);
            const isFollowing = followingStatus[targetUserId];

            if (isFollowing) {
                // Unfollow
                await updateDoc(currentUserRef, {
                    following: arrayRemove(targetUserId),
                });
                setFollowingStatus(prev => ({ ...prev, [targetUserId]: false }));
            } else {
                // Follow
                await updateDoc(currentUserRef, {
                    following: arrayUnion(targetUserId),
                });
                setFollowingStatus(prev => ({ ...prev, [targetUserId]: true }));
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
            Alert.alert('Lỗi', 'Không thể cập nhật trạng thái theo dõi');
        }
    };

    // Load following status when members load
    useEffect(() => {
        if (members.length > 0) {
            loadFollowingStatus();
        }
    }, [members]);

    // Load media when switching to media tab
    useEffect(() => {
        if (activeTab === 'media' && mediaItems.length === 0) {
            loadMediaItems();
        }
    }, [activeTab]);

    const handleChangeRole = async (targetUserId: string, newRole: GroupRole) => {
        try {
            const result = await groupPermissionService.changeMemberRole(
                id as string,
                targetUserId,
                newRole,
                user!.uid
            );

            if (result.success) {
                Alert.alert('Thành công', result.message);
                loadGroupData();
            } else {
                Alert.alert('Lỗi', result.message);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể thay đổi vai trò');
        }
        setMenuVisible(null);
    };

    const handleRemoveMember = async (targetUserId: string) => {
        Alert.alert(
            'Xác nhận',
            'Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await groupPermissionService.removeMember(
                                id as string,
                                targetUserId,
                                user!.uid
                            );

                            if (result.success) {
                                Alert.alert('Thành công', result.message);
                                loadGroupData();
                            } else {
                                Alert.alert('Lỗi', result.message);
                            }
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể xóa thành viên');
                        }
                    },
                },
            ]
        );
        setMenuVisible(null);
    };

    const handleUpdateGroupInfo = async () => {
        try {
            if (!editedName.trim()) {
                Alert.alert('Lỗi', 'Tên nhóm không được để trống');
                return;
            }

            await updateDoc(doc(db, 'groups', id as string), {
                name: editedName.trim(),
                description: editedDescription.trim(),
                updatedAt: serverTimestamp(),
            });

            Alert.alert('Thành công', 'Đã cập nhật thông tin nhóm');
            setIsEditingInfo(false);
            loadGroupData();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể cập nhật thông tin');
        }
    };

    const handleChangeAvatar = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                const uri = result.assets[0].uri;

                // Upload to storage
                const response = await fetch(uri);
                const blob = await response.blob();
                const imageRef = ref(storage, `groups/${id}/avatar-${nanoid()}`);
                await uploadBytes(imageRef, blob);
                const photoURL = await getDownloadURL(imageRef);

                // Update group
                await updateDoc(doc(db, 'groups', id as string), {
                    photoURL,
                    avatarUrl: photoURL,
                    updatedAt: serverTimestamp(),
                });

                Alert.alert('Thành công', 'Đã cập nhật ảnh nhóm');
                loadGroupData();
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể cập nhật ảnh');
        }
    };

    const handleAddMember = async () => {
        try {
            const uid = newMemberUid.trim();
            if (!uid) return;

            // Check if user exists
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (!userDoc.exists()) {
                Alert.alert('Lỗi', 'Không tìm thấy người dùng với UID này');
                return;
            }

            // Check if already member
            if (group?.members.includes(uid)) {
                Alert.alert('Lỗi', 'Người dùng đã là thành viên');
                return;
            }

            // Add member
            const groupRef = doc(db, 'groups', id as string);
            const memberRoles = group?.memberRoles || {};
            memberRoles[uid] = GroupRole.NEWBIE;

            await updateDoc(groupRef, {
                members: arrayUnion(uid),
                memberRoles,
                updatedAt: serverTimestamp(),
            });

            Alert.alert('Thành công', 'Đã thêm thành viên mới');
            setNewMemberUid('');
            setAddMemberModalVisible(false);
            loadGroupData();
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể thêm thành viên');
        }
    };

    const handleLeaveGroup = () => {
        Alert.alert(
            'Rời nhóm',
            'Bạn có chắc chắn muốn rời khỏi nhóm này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Rời nhóm',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await groupPermissionService.removeMember(
                                id as string,
                                user!.uid,
                                user!.uid
                            );

                            if (result.success) {
                                Alert.alert('Thành công', 'Đã rời khỏi nhóm');
                                router.replace('/(tabs)/groups');
                            } else {
                                Alert.alert('Lỗi', result.message);
                            }
                        } catch (error) {
                            Alert.alert('Lỗi', 'Không thể rời nhóm');
                        }
                    },
                },
            ]
        );
    };

    const canManageRole = (targetRole: GroupRole) => {
        return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
    };

    const renderMember = (member: GroupMemberWithRole) => {
        const roleInfo = ROLE_LABELS[member.role];
        const isCurrentUser = member.uid === user?.uid;
        const isCreator = member.uid === group?.createdBy;
        const canManageThisMember = canManageRole(member.role) && !isCreator && !isCurrentUser;

        return (
            <View key={member.uid} style={[styles.memberCard, {
                backgroundColor: currentThemeColors.surface,
                borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
            }]}>
                <Avatar.Image
                    size={48}
                    source={{ uri: member.photoURL || 'https://via.placeholder.com/48' }}
                />

                <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: currentThemeColors.text }]}>
                        {member.displayName}
                        {isCreator && ' 👑'}
                        {isCurrentUser && ' (Bạn)'}
                    </Text>
                    <View style={styles.roleBadge}>
                        <MaterialCommunityIcons
                            name={roleInfo.icon as any}
                            size={14}
                            color={roleInfo.color}
                        />
                        <Text style={[styles.roleText, { color: roleInfo.color }]}>
                            {roleInfo.vi}
                        </Text>
                    </View>
                </View>

                {/* NEW: Follow button for non-current users */}
                {!isCurrentUser && (
                    <TouchableOpacity
                        style={[styles.followButton, {
                            backgroundColor: followingStatus[member.uid]
                                ? 'transparent'
                                : currentThemeColors.tint,
                            borderColor: currentThemeColors.tint,
                            borderWidth: followingStatus[member.uid] ? 1 : 0,
                        }]}
                        onPress={() => handleToggleFollow(member.uid)}
                    >
                        <Text style={[styles.followButtonText, {
                            color: followingStatus[member.uid]
                                ? currentThemeColors.tint
                                : '#FFF'
                        }]}>
                            {followingStatus[member.uid] ? 'Đang theo dõi' : 'Theo dõi'}
                        </Text>
                    </TouchableOpacity>
                )}

                {canManageThisMember && (
                    <Menu
                        visible={menuVisible === member.uid}
                        onDismiss={() => setMenuVisible(null)}
                        anchor={
                            <IconButton
                                icon="dots-vertical"
                                size={20}
                                onPress={() => setMenuVisible(member.uid)}
                            />
                        }
                    >
                        <Menu.Item
                            leadingIcon="arrow-up"
                            onPress={() => handleChangeRole(member.uid, GroupRole.ADMIN)}
                            title="Đặt làm Admin"
                            disabled={member.role === GroupRole.ADMIN}
                        />
                        <Menu.Item
                            leadingIcon="shield-check"
                            onPress={() => handleChangeRole(member.uid, GroupRole.MODERATOR)}
                            title="Đặt làm Moderator"
                            disabled={member.role === GroupRole.MODERATOR}
                        />
                        <Menu.Item
                            leadingIcon="account"
                            onPress={() => handleChangeRole(member.uid, GroupRole.MEMBER)}
                            title="Đặt làm Member"
                            disabled={member.role === GroupRole.MEMBER}
                        />
                        <Menu.Item
                            leadingIcon="account-outline"
                            onPress={() => handleChangeRole(member.uid, GroupRole.NEWBIE)}
                            title="Đặt làm Newbie"
                            disabled={member.role === GroupRole.NEWBIE}
                        />
                        <Divider />
                        <Menu.Item
                            leadingIcon="account-remove"
                            onPress={() => handleRemoveMember(member.uid)}
                            title="Xóa khỏi nhóm"
                            titleStyle={{ color: '#EF4444' }}
                        />
                    </Menu>
                )}
            </View>
        );
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
                <View style={styles.loadingContainer}>
                    <Text style={{ color: currentThemeColors.text }}>Đang tải...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            {/* Header */}
            <View style={[styles.header, {
                backgroundColor: currentThemeColors.backgroundHeader,
                borderBottomColor: theme === 'dark' ? '#374151' : '#E5E7EB',
            }]}>
                <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
                <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>
                    Quản lý nhóm
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[currentThemeColors.tint]}
                    />
                }
            >
                {/* Group Info Section */}
                <View style={styles.section}>
                    <View style={styles.avatarContainer}>
                        <Avatar.Image
                            size={100}
                            source={{ uri: group?.photoURL || group?.avatarUrl || 'https://via.placeholder.com/100' }}
                        />
                        {canManage && (
                            <TouchableOpacity
                                style={[styles.changeAvatarButton, { backgroundColor: currentThemeColors.tint }]}
                                onPress={handleChangeAvatar}
                            >
                                <MaterialCommunityIcons name="camera" size={20} color="#FFF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {isEditingInfo ? (
                        <View style={styles.editContainer}>
                            <PaperTextInput
                                mode="outlined"
                                label="Tên nhóm"
                                value={editedName}
                                onChangeText={setEditedName}
                                style={styles.input}
                            />
                            <PaperTextInput
                                mode="outlined"
                                label="Mô tả"
                                value={editedDescription}
                                onChangeText={setEditedDescription}
                                multiline
                                numberOfLines={3}
                                style={styles.input}
                            />
                            <View style={styles.editButtons}>
                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: '#6B7280' }]}
                                    onPress={() => setIsEditingInfo(false)}
                                >
                                    <Text style={styles.buttonText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: currentThemeColors.tint }]}
                                    onPress={handleUpdateGroupInfo}
                                >
                                    <Text style={styles.buttonText}>Lưu</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.infoContainer}>
                            <Text style={[styles.groupName, { color: currentThemeColors.text }]}>
                                {group?.name}
                            </Text>
                            {group?.description && (
                                <Text style={[styles.groupDescription, { color: currentThemeColors.subtleText }]}>
                                    {group.description}
                                </Text>
                            )}
                            <Text style={[styles.memberCount, { color: currentThemeColors.subtleText }]}>
                                {members.length} thành viên
                            </Text>
                            {group?.id && (
                                <TouchableOpacity
                                    style={[styles.groupIdContainer, { backgroundColor: theme === 'dark' ? '#1F2937' : '#F3F4F6' }]}
                                    onPress={() => {
                                        // Copy to clipboard
                                        Clipboard.setString(group.id);
                                        Alert.alert('Đã sao chép', 'ID nhóm đã được sao chép vào clipboard');
                                    }}
                                    onLongPress={() => {
                                        // Show full ID on long press
                                        Alert.alert('ID Nhóm', group.id, [
                                            { text: 'Đóng', style: 'cancel' },
                                            {
                                                text: 'Sao chép',
                                                onPress: () => {
                                                    Clipboard.setString(group.id);
                                                    Alert.alert('Đã sao chép', 'ID nhóm đã được sao chép vào clipboard');
                                                }
                                            }
                                        ]);
                                    }}
                                >
                                    <MaterialCommunityIcons name="identifier" size={16} color={currentThemeColors.subtleText} />
                                    <Text style={[styles.groupIdText, { color: currentThemeColors.subtleText }]} numberOfLines={1}>
                                        ID: {group.id}
                                    </Text>
                                    <MaterialCommunityIcons name="content-copy" size={14} color={currentThemeColors.tint} />
                                </TouchableOpacity>
                            )}
                            {canManage && (
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => setIsEditingInfo(true)}
                                >
                                    <MaterialCommunityIcons name="pencil" size={16} color={currentThemeColors.tint} />
                                    <Text style={[styles.editButtonText, { color: currentThemeColors.tint }]}>
                                        Chỉnh sửa thông tin
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                <Divider />

                {/* Your Role */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                        Vai trò của bạn
                    </Text>
                    <View style={[styles.roleCard, {
                        backgroundColor: currentThemeColors.surface,
                        borderColor: ROLE_LABELS[userRole].color,
                    }]}>
                        <MaterialCommunityIcons
                            name={ROLE_LABELS[userRole].icon as any}
                            size={24}
                            color={ROLE_LABELS[userRole].color}
                        />
                        <Text style={[styles.roleCardText, { color: ROLE_LABELS[userRole].color }]}>
                            {ROLE_LABELS[userRole].vi}
                        </Text>
                    </View>
                </View>

                <Divider />

                {/* NEW: Tabs for Members and Media */}
                <View style={styles.section}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'members' && styles.activeTab,
                                { borderBottomColor: activeTab === 'members' ? currentThemeColors.tint : 'transparent' }
                            ]}
                            onPress={() => setActiveTab('members')}
                        >
                            <MaterialCommunityIcons
                                name="account-group"
                                size={20}
                                color={activeTab === 'members' ? currentThemeColors.tint : currentThemeColors.subtleText}
                            />
                            <Text style={[
                                styles.tabText,
                                {
                                    color: activeTab === 'members' ? currentThemeColors.tint : currentThemeColors.subtleText,
                                    fontWeight: activeTab === 'members' ? '700' : '500',
                                }
                            ]}>
                                Thành viên ({members.length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.tab,
                                activeTab === 'media' && styles.activeTab,
                                { borderBottomColor: activeTab === 'media' ? currentThemeColors.tint : 'transparent' }
                            ]}
                            onPress={() => setActiveTab('media')}
                        >
                            <MaterialCommunityIcons
                                name="image-multiple"
                                size={20}
                                color={activeTab === 'media' ? currentThemeColors.tint : currentThemeColors.subtleText}
                            />
                            <Text style={[
                                styles.tabText,
                                {
                                    color: activeTab === 'media' ? currentThemeColors.tint : currentThemeColors.subtleText,
                                    fontWeight: activeTab === 'media' ? '700' : '500',
                                }
                            ]}>
                                Media ({mediaItems.length})
                            </Text>
                        </TouchableOpacity>

                        {canManage && (
                            <TouchableOpacity
                                style={[
                                    styles.tab,
                                    activeTab === 'requests' && styles.activeTab,
                                    { borderBottomColor: activeTab === 'requests' ? currentThemeColors.tint : 'transparent' }
                                ]}
                                onPress={() => setActiveTab('requests')}
                            >
                                <MaterialCommunityIcons
                                    name="account-clock"
                                    size={20}
                                    color={activeTab === 'requests' ? currentThemeColors.tint : currentThemeColors.subtleText}
                                />
                                <Text style={[
                                    styles.tabText,
                                    {
                                        color: activeTab === 'requests' ? currentThemeColors.tint : currentThemeColors.subtleText,
                                        fontWeight: activeTab === 'requests' ? '700' : '500',
                                    }
                                ]}>
                                    Yêu cầu ({pendingRequests.length})
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Members Tab Content */}
                    {activeTab === 'members' && (
                        <>
                            {canManage && (
                                <TouchableOpacity
                                    style={styles.addMemberButton}
                                    onPress={() => setAddMemberModalVisible(true)}
                                >
                                    <MaterialCommunityIcons name="plus-circle" size={20} color={currentThemeColors.tint} />
                                    <Text style={[styles.addMemberButtonText, { color: currentThemeColors.tint }]}>
                                        Thêm thành viên
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {members.map(renderMember)}
                        </>
                    )}

                    {/* Media Tab Content */}
                    {activeTab === 'media' && (
                        <View style={styles.mediaContainer}>
                            {loadingMedia ? (
                                <View style={styles.loadingMediaContainer}>
                                    <Text style={{ color: currentThemeColors.subtleText }}>Đang tải media...</Text>
                                </View>
                            ) : mediaItems.length === 0 ? (
                                <View style={styles.emptyMediaContainer}>
                                    <MaterialCommunityIcons name="image-off" size={48} color={currentThemeColors.subtleText} />
                                    <Text style={[styles.emptyMediaText, { color: currentThemeColors.subtleText }]}>
                                        Chưa có ảnh nào trong nhóm
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={mediaItems}
                                    numColumns={3}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <View style={styles.mediaItem}>
                                            <CustomImage
                                                source={item.imageUrl || item.url}
                                                style={styles.mediaImage}
                                                onLongPress={() => { }}
                                            />
                                        </View>
                                    )}
                                    contentContainerStyle={styles.mediaGrid}
                                    scrollEnabled={false}
                                />
                            )}
                        </View>
                    )}

                    {/* Requests Tab Content */}
                    {activeTab === 'requests' && canManage && (
                        <View style={styles.requestsContainer}>
                            {pendingRequests.length === 0 ? (
                                <View style={styles.emptyMediaContainer}>
                                    <MaterialCommunityIcons name="account-check-outline" size={48} color={currentThemeColors.subtleText} />
                                    <Text style={[styles.emptyMediaText, { color: currentThemeColors.subtleText }]}>
                                        Không có yêu cầu tham gia nào
                                    </Text>
                                </View>
                            ) : (
                                pendingRequests.map((req) => (
                                    <View key={req.uid} style={[styles.requestItem, {
                                        backgroundColor: currentThemeColors.surface,
                                        borderColor: theme === 'dark' ? '#374151' : '#E5E7EB'
                                    }]}>
                                        <Avatar.Image
                                            size={48}
                                            source={{ uri: req.photoURL || 'https://via.placeholder.com/48' }}
                                        />
                                        <View style={styles.requestInfo}>
                                            <Text style={[styles.requestName, { color: currentThemeColors.text }]}>
                                                {req.displayName}
                                            </Text>
                                            <Text style={[styles.requestTime, { color: currentThemeColors.subtleText }]}>
                                                {req.requestedAt?.toDate ? req.requestedAt.toDate().toLocaleDateString() : 'Vừa xong'}
                                            </Text>
                                        </View>
                                        <View style={styles.requestActions}>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.rejectButton]}
                                                onPress={() => handleRejectRequest(req.uid)}
                                            >
                                                <MaterialCommunityIcons name="close" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.actionButton, styles.approveButton]}
                                                onPress={() => handleApproveRequest(req.uid)}
                                            >
                                                <MaterialCommunityIcons name="check" size={20} color="#FFF" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </View>

                {/* Leave Group Button */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={[styles.leaveButton, { borderColor: '#EF4444' }]}
                        onPress={handleLeaveGroup}
                    >
                        <MaterialCommunityIcons name="exit-to-app" size={20} color="#EF4444" />
                        <Text style={styles.leaveButtonText}>Rời khỏi nhóm</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Add Member Modal */}
            {addMemberModalVisible && (
                <View style={styles.modalOverlay}>
                    <View style={[styles.modal, { backgroundColor: currentThemeColors.surface }]}>
                        <Text style={[styles.modalTitle, { color: currentThemeColors.text }]}>
                            Thêm thành viên
                        </Text>
                        <PaperTextInput
                            mode="outlined"
                            label="UID người dùng"
                            value={newMemberUid}
                            onChangeText={setNewMemberUid}
                            style={styles.modalInput}
                            placeholder="Nhập UID của người dùng"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#6B7280' }]}
                                onPress={() => {
                                    setAddMemberModalVisible(false);
                                    setNewMemberUid('');
                                }}
                            >
                                <Text style={styles.modalButtonText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: currentThemeColors.tint }]}
                                onPress={handleAddMember}
                            >
                                <Text style={styles.modalButtonText}>Thêm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarContainer: {
        alignSelf: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    changeAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    infoContainer: {
        alignItems: 'center',
    },
    groupName: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    groupDescription: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 8,
    },
    memberCount: {
        fontSize: 14,
        marginBottom: 16,
    },
    groupIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
        marginTop: 4,
    },
    groupIdText: {
        fontSize: 12,
        fontFamily: 'monospace',
        flex: 1,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    editContainer: {
        gap: 12,
    },
    input: {
        fontSize: 14,
    },
    editButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        gap: 12,
    },
    roleCardText: {
        fontSize: 18,
        fontWeight: '700',
    },
    memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        gap: 12,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        gap: 8,
    },
    leaveButtonText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: '80%',
        padding: 20,
        borderRadius: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalInput: {
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // NEW: Tab styles
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        // Active tab styling is handled dynamically
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
    },
    // NEW: Follow button styles
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginLeft: 'auto',
    },
    followButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // NEW: Add member button
    addMemberButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12,
        gap: 8,
    },
    addMemberButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // NEW: Media container styles
    mediaContainer: {
        paddingTop: 8,
    },
    loadingMediaContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyMediaContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyMediaText: {
        fontSize: 15,
        fontWeight: '500',
    },
    mediaGrid: {
        paddingVertical: 4,
    },
    mediaItem: {
        flex: 1 / 3,
        aspectRatio: 1,
        padding: 2,
    },
    mediaImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    // NEW: Request styles
    requestsContainer: {
        gap: 12,
    },
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    requestInfo: {
        flex: 1,
    },
    requestName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    requestTime: {
        fontSize: 12,
    },
    requestActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    approveButton: {
        backgroundColor: '#10B981',
    },
    rejectButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
});
