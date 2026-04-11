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
import { useTranslation } from 'react-i18next';
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
import { ChatThemeProvider, useChatTheme } from '@/context/ChatThemeContext';
import ChatThemePicker from '@/components/chat/ChatThemePicker';

export default function GroupManagementScreen() {
    return (
        <ChatThemeProvider>
            <GroupManagementContent />
        </ChatThemeProvider>
    );
}

function GroupManagementContent() {
    const { t, i18n } = useTranslation();
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
    const [showThemePicker, setShowThemePicker] = useState(false);

    const { currentTheme, currentEffect, loadTheme, loadEffect } = useChatTheme();

    // Load theme and effect
    useEffect(() => {
        if (id) {
            const unsubTheme = loadTheme(id as string);
            const unsubEffect = loadEffect(id as string);
            return () => {
                unsubTheme();
                unsubEffect();
            };
        }
    }, [id]);

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
                Alert.alert(t('common.success'), result.message);
                loadPendingRequests();
                loadGroupData(); // Reload members
            } else {
                Alert.alert(t('common.error'), result.message);
            }
        } catch (error) {
            console.error('Error approving request:', error);
            Alert.alert(t('common.error'), t('group_management.approve_request_error'));
        }
    };

    const handleRejectRequest = async (requestUid: string) => {
        try {
            const { groupRequestService } = await import('@/services/groupRequestService');
            const result = await groupRequestService.rejectRequest(id as string, requestUid);

            if (result.success) {
                Alert.alert(t('common.success'), result.message);
                loadPendingRequests();
            } else {
                Alert.alert(t('common.error'), result.message);
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            Alert.alert(t('common.error'), t('group_management.reject_request_error'));
        }
    };

    const loadGroupData = async () => {
        try {
            setLoading(true);

            if (!id || !user?.uid) return;

            // Load group info
            const groupDoc = await getDoc(doc(db, 'groups', id as string));
            if (!groupDoc.exists()) {
                Alert.alert(t('common.error'), t('group_management.group_not_found'));
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
            Alert.alert(t('common.error'), t('group_management.load_group_error'));
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
            Alert.alert(t('common.error'), t('group_management.follow_toggle_error'));
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
                Alert.alert(t('common.success'), result.message);
                loadGroupData();
            } else {
                Alert.alert(t('common.error'), result.message);
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('group_management.change_role_error'));
        }
        setMenuVisible(null);
    };

    const handleRemoveMember = async (targetUserId: string) => {
        Alert.alert(
            t('common.confirm'),
            t('group_management.remove_member_confirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await groupPermissionService.removeMember(
                                id as string,
                                targetUserId,
                                user!.uid
                            );

                            if (result.success) {
                                Alert.alert(t('common.success'), result.message);
                                loadGroupData();
                            } else {
                                Alert.alert(t('common.error'), result.message);
                            }
                        } catch (error) {
                            Alert.alert(t('common.error'), t('group_management.remove_member_error'));
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
                Alert.alert(t('common.error'), t('group_management.empty_group_name'));
                return;
            }

            await updateDoc(doc(db, 'groups', id as string), {
                name: editedName.trim(),
                description: editedDescription.trim(),
                updatedAt: serverTimestamp(),
            });

            Alert.alert(t('common.success'), t('group_management.update_group_success'));
            setIsEditingInfo(false);
            loadGroupData();
        } catch (error) {
            Alert.alert(t('common.error'), t('group_management.update_group_error'));
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

                Alert.alert(t('common.success'), t('group_management.update_avatar_success'));
                loadGroupData();
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('group_management.update_avatar_error'));
        }
    };

    const handleAddMember = async () => {
        try {
            const uid = newMemberUid.trim();
            if (!uid) return;

            // Check if user exists
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (!userDoc.exists()) {
                Alert.alert(t('common.error'), t('group_management.user_not_found_uid'));
                return;
            }

            // Check if already member
            if (group?.members.includes(uid)) {
                Alert.alert(t('common.error'), t('group_management.user_already_member'));
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

            Alert.alert(t('common.success'), t('group_management.add_member_success'));
            setNewMemberUid('');
            setAddMemberModalVisible(false);
            loadGroupData();
        } catch (error) {
            Alert.alert(t('common.error'), t('group_management.add_member_error'));
        }
    };

    const handleLeaveGroup = () => {
        Alert.alert(
            t('group_management.leave_group_title'),
            t('group_management.leave_group_confirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('group_management.leave_group_action'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await groupPermissionService.removeMember(
                                id as string,
                                user!.uid,
                                user!.uid
                            );

                            if (result.success) {
                                Alert.alert(t('common.success'), t('group_management.leave_group_success'));
                                router.replace('/(tabs)/groups');
                            } else {
                                Alert.alert(t('common.error'), result.message);
                            }
                        } catch (error) {
                            Alert.alert(t('common.error'), t('group_management.leave_group_error'));
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
            <TouchableOpacity
                key={member.uid}
                style={[styles.memberCard, {
                    backgroundColor: currentThemeColors.surface,
                    borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
                }]}
                onPress={() => router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId: member.uid } })}
            >
                <Avatar.Image
                    size={48}
                    source={{ uri: member.photoURL || 'https://via.placeholder.com/48' }}
                />

                <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: currentThemeColors.text }]}>
                        {member.displayName}
                        {isCreator && ' 👑'}
                        {isCurrentUser && ` (${t('common.you')})`}
                    </Text>
                    <View style={styles.roleBadge}>
                        <MaterialCommunityIcons
                            name={roleInfo.icon as any}
                            size={14}
                            color={roleInfo.color}
                        />
                        <Text style={[styles.roleText, { color: roleInfo.color }]}>
                            {roleInfo.label}
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
                            {followingStatus[member.uid] ? t('group_management.following') : t('profile.follow')}
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
                            title={t('group_management.role_set_admin')}
                            disabled={member.role === GroupRole.ADMIN}
                        />
                        <Menu.Item
                            leadingIcon="shield-check"
                            onPress={() => handleChangeRole(member.uid, GroupRole.MODERATOR)}
                            title={t('group_management.role_set_moderator')}
                            disabled={member.role === GroupRole.MODERATOR}
                        />
                        <Menu.Item
                            leadingIcon="account"
                            onPress={() => handleChangeRole(member.uid, GroupRole.MEMBER)}
                            title={t('group_management.role_set_member')}
                            disabled={member.role === GroupRole.MEMBER}
                        />
                        <Menu.Item
                            leadingIcon="account-outline"
                            onPress={() => handleChangeRole(member.uid, GroupRole.NEWBIE)}
                            title={t('group_management.role_set_newbie')}
                            disabled={member.role === GroupRole.NEWBIE}
                        />
                        <Divider />
                        <Menu.Item
                            leadingIcon="account-remove"
                            onPress={() => handleRemoveMember(member.uid)}
                            title={t('group_management.remove_from_group')}
                            titleStyle={{ color: '#EF4444' }}
                        />
                    </Menu>
                )}
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
                <View style={styles.loadingContainer}>
                    <Text style={{ color: currentThemeColors.text }}>{t('common.loading')}</Text>
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
                    {t('group_management.title')}
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
                                label={t('group_management.group_name_label')}
                                value={editedName}
                                onChangeText={setEditedName}
                                style={styles.input}
                            />
                            <PaperTextInput
                                mode="outlined"
                                label={t('group_management.description_label')}
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
                                    <Text style={styles.buttonText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: currentThemeColors.tint }]}
                                    onPress={handleUpdateGroupInfo}
                                >
                                    <Text style={styles.buttonText}>{t('common.save')}</Text>
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
                                {t('group_management.member_count', { count: members.length })}
                            </Text>
                            {group?.id && (
                                <TouchableOpacity
                                    style={[styles.groupIdContainer, { backgroundColor: theme === 'dark' ? '#1F2937' : '#F3F4F6' }]}
                                    onPress={() => {
                                        // Copy to clipboard
                                        Clipboard.setString(group.id);
                                        Alert.alert(t('group_management.copied_title'), t('group_management.group_id_copied'));
                                    }}
                                    onLongPress={() => {
                                        // Show full ID on long press
                                        Alert.alert(t('group_management.group_id_title'), group.id, [
                                            { text: t('common.close'), style: 'cancel' },
                                            {
                                                text: t('group_management.copy_action'),
                                                onPress: () => {
                                                    Clipboard.setString(group.id);
                                                    Alert.alert(t('group_management.copied_title'), t('group_management.group_id_copied'));
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
                                        {t('group_management.edit_info')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                <Divider />

                {/* Group Theme Section */}
                {canManage && (
                    <>
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                                    {t('group_management.group_theme')}
                                </Text>
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => setShowThemePicker(true)}
                                >
                                    <MaterialCommunityIcons name="palette" size={16} color={currentThemeColors.tint} />
                                    <Text style={[styles.editButtonText, { color: currentThemeColors.tint }]}>
                                        {t('group_management.change_action')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.themePreview, {
                                backgroundColor: currentTheme.backgroundColor || currentThemeColors.surface,
                                borderColor: currentTheme.sentMessageColor || currentThemeColors.border,
                            }]}>
                                <View style={styles.themeInfo}>
                                    <Text style={[styles.themeName, { color: currentTheme.textColor || currentThemeColors.text }]}>
                                        {t('group_management.theme_label', { name: currentTheme.name })}
                                    </Text>
                                    <Text style={[styles.effectName, { color: currentTheme.textColor || currentThemeColors.subtleText }]}>
                                        {t('group_management.effect_label', {
                                            effect: currentEffect === 'none' ? t('chat.theme.none') : currentEffect
                                        })}
                                    </Text>
                                </View>
                                {currentTheme.backgroundImage && (
                                    <Image
                                        source={{ uri: currentTheme.backgroundImage }}
                                        style={styles.themeImagePreview}
                                    />
                                )}
                            </View>
                        </View>
                        <Divider />
                    </>
                )}

                {/* Your Role */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
                        {t('group_management.your_role')}
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
                            {ROLE_LABELS[userRole].label}
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
                                {t('group_management.members_tab', { count: members.length })}
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
                                    {t('group_management.requests_tab', { count: pendingRequests.length })}
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
                                        {t('group_management.add_member')}
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
                                    <Text style={{ color: currentThemeColors.subtleText }}>{t('group_management.loading_media')}</Text>
                                </View>
                            ) : mediaItems.length === 0 ? (
                                <View style={styles.emptyMediaContainer}>
                                    <MaterialCommunityIcons name="image-off" size={48} color={currentThemeColors.subtleText} />
                                    <Text style={[styles.emptyMediaText, { color: currentThemeColors.subtleText }]}>
                                        {t('group_management.no_group_images')}
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
                                        {t('group_management.no_pending_requests')}
                                    </Text>
                                </View>
                            ) : (
                                pendingRequests.map((req) => (
                                    <TouchableOpacity
                                        key={req.uid}
                                        style={[styles.requestItem, {
                                            backgroundColor: currentThemeColors.surface,
                                            borderColor: theme === 'dark' ? '#374151' : '#E5E7EB'
                                        }]}
                                        onPress={() => router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId: req.uid } })}
                                    >
                                        <Avatar.Image
                                            size={48}
                                            source={{ uri: req.photoURL || 'https://via.placeholder.com/48' }}
                                        />
                                        <View style={styles.requestInfo}>
                                            <Text style={[styles.requestName, { color: currentThemeColors.text }]}>
                                                {req.displayName}
                                            </Text>
                                            <Text style={[styles.requestTime, { color: currentThemeColors.subtleText }]}>
                                                {req.requestedAt?.toDate
                                                    ? req.requestedAt.toDate().toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')
                                                    : t('common.time.just_now')}
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
                                    </TouchableOpacity>
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
                        <Text style={styles.leaveButtonText}>{t('group_management.leave_group_action')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Add Member Modal */}
            {addMemberModalVisible && (
                <View style={styles.modalOverlay}>
                    <View style={[styles.modal, { backgroundColor: currentThemeColors.surface }]}>
                        <Text style={[styles.modalTitle, { color: currentThemeColors.text }]}>
                            {t('group_management.add_member')}
                        </Text>
                        <PaperTextInput
                            mode="outlined"
                            label={t('group_management.user_uid_label')}
                            value={newMemberUid}
                            onChangeText={setNewMemberUid}
                            style={styles.modalInput}
                            placeholder={t('group_management.user_uid_placeholder')}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: '#6B7280' }]}
                                onPress={() => {
                                    setAddMemberModalVisible(false);
                                    setNewMemberUid('');
                                }}
                            >
                                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: currentThemeColors.tint }]}
                                onPress={handleAddMember}
                            >
                                <Text style={styles.modalButtonText}>{t('group_management.add_action')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
            {/* Theme Picker */}
            <ChatThemePicker
                visible={showThemePicker}
                onClose={() => setShowThemePicker(false)}
                roomId={id as string}
                currentUser={user}
                isGroup={true}
                isAdmin={canManage}
            />
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
    themePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 4,
    },
    themeInfo: {
        flex: 1,
    },
    themeName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    effectName: {
        fontSize: 14,
    },
    themeImagePreview: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginLeft: 12,
    },
});
