/**
 * Group Permission Service
 * Service để quản lý và kiểm tra quyền hạn trong group
 */

import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import {
    GroupRole,
    GroupPermission,
    GroupMemberWithRole,
    GroupWithRoles,
    PermissionCheckResult,
    ROLE_PERMISSIONS,
    ROLE_HIERARCHY,
    DEFAULT_MEMBER_ROLE,
    NEWBIE_DURATION_DAYS,
} from '@/types/groupPermissions';

class GroupPermissionService {
    /**
     * Lấy role của user trong group
     */
    async getUserRole(groupId: string, userId: string): Promise<GroupRole> {
        try {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));

            if (!groupDoc.exists()) {
                throw new Error('Group không tồn tại');
            }

            const groupData = groupDoc.data() as GroupWithRoles;

            // Check if user is creator (always admin)
            if (groupData.createdBy === userId) {
                return GroupRole.ADMIN;
            }

            // Check memberRoles mapping
            if (groupData.memberRoles && groupData.memberRoles[userId]) {
                return groupData.memberRoles[userId];
            }

            // Backward compatibility: check old admins array
            if (groupData.admins && groupData.admins.includes(userId)) {
                return GroupRole.ADMIN;
            }

            // Default role
            return DEFAULT_MEMBER_ROLE;
        } catch (error) {
            console.error('[GroupPermissionService] Error getting user role:', error);
            return DEFAULT_MEMBER_ROLE;
        }
    }

    /**
     * Kiểm tra xem user có permission cụ thể không
     */
    async hasPermission(
        groupId: string,
        userId: string,
        permission: GroupPermission
    ): Promise<PermissionCheckResult> {
        try {
            const userRole = await this.getUserRole(groupId, userId);
            const rolePermissions = ROLE_PERMISSIONS[userRole];
            const hasPermission = rolePermissions.includes(permission);

            return {
                hasPermission,
                userRole,
                reason: hasPermission ? undefined : `Role ${userRole} không có quyền ${permission}`,
            };
        } catch (error) {
            console.error('[GroupPermissionService] Error checking permission:', error);
            return {
                hasPermission: false,
                reason: 'Lỗi khi kiểm tra quyền',
            };
        }
    }

    /**
     * Kiểm tra nhiều permissions cùng lúc
     */
    async hasAllPermissions(
        groupId: string,
        userId: string,
        permissions: GroupPermission[]
    ): Promise<PermissionCheckResult> {
        try {
            const userRole = await this.getUserRole(groupId, userId);
            const rolePermissions = ROLE_PERMISSIONS[userRole];
            const hasAll = permissions.every(perm => rolePermissions.includes(perm));

            return {
                hasPermission: hasAll,
                userRole,
                reason: hasAll ? undefined : `Role ${userRole} thiếu một số quyền`,
            };
        } catch (error) {
            return {
                hasPermission: false,
                reason: 'Lỗi khi kiểm tra quyền',
            };
        }
    }

    /**
     * Thay đổi role của member
     */
    async changeMemberRole(
        groupId: string,
        targetUserId: string,
        newRole: GroupRole,
        actorUserId: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const groupRef = doc(db, 'groups', groupId);
            const groupDoc = await getDoc(groupRef);

            if (!groupDoc.exists()) {
                return { success: false, message: 'Group không tồn tại' };
            }

            const groupData = groupDoc.data() as GroupWithRoles;

            // Check if actor has permission to manage roles
            const actorRole = await this.getUserRole(groupId, actorUserId);
            if (!ROLE_PERMISSIONS[actorRole].includes(GroupPermission.MANAGE_ROLES)) {
                return { success: false, message: 'Bạn không có quyền thay đổi vai trò' };
            }

            // Cannot change role of group creator
            if (groupData.createdBy === targetUserId) {
                return { success: false, message: 'Không thể thay đổi vai trò của người tạo nhóm' };
            }

            // Check hierarchy: actor must have higher role than target's current and new role
            const targetCurrentRole = await this.getUserRole(groupId, targetUserId);

            if (ROLE_HIERARCHY[actorRole] <= ROLE_HIERARCHY[targetCurrentRole]) {
                return {
                    success: false,
                    message: 'Bạn không thể thay đổi vai trò của người có cấp bậc cao hơn hoặc bằng bạn'
                };
            }

            if (ROLE_HIERARCHY[actorRole] <= ROLE_HIERARCHY[newRole]) {
                return {
                    success: false,
                    message: 'Bạn không thể gán vai trò cao hơn hoặc bằng vai trò của bạn'
                };
            }

            // Update memberRoles
            const memberRoles = groupData.memberRoles || {};
            memberRoles[targetUserId] = newRole;

            await updateDoc(groupRef, {
                memberRoles,
                updatedAt: serverTimestamp(),
            });

            return {
                success: true,
                message: `Đã thay đổi vai trò thành công`
            };
        } catch (error) {
            console.error('[GroupPermissionService] Error changing member role:', error);
            return {
                success: false,
                message: 'Lỗi khi thay đổi vai trò'
            };
        }
    }

    /**
     * Lấy danh sách members với role
     */
    async getMembersWithRoles(groupId: string): Promise<GroupMemberWithRole[]> {
        try {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));

            if (!groupDoc.exists()) {
                return [];
            }

            const groupData = groupDoc.data() as GroupWithRoles;
            const members: GroupMemberWithRole[] = [];

            for (const uid of groupData.members || []) {
                const role = await this.getUserRole(groupId, uid);

                // Get user info
                const userDoc = await getDoc(doc(db, 'users', uid));
                const userData = userDoc.exists() ? userDoc.data() : {};

                members.push({
                    uid,
                    role,
                    displayName: userData?.displayName || userData?.username || 'Unknown',
                    photoURL: userData?.photoURL || userData?.profileUrl,
                });
            }

            // Sort by role hierarchy (highest first)
            members.sort((a, b) => ROLE_HIERARCHY[b.role] - ROLE_HIERARCHY[a.role]);

            return members;
        } catch (error) {
            console.error('[GroupPermissionService] Error getting members with roles:', error);
            return [];
        }
    }

    /**
     * Khởi tạo memberRoles khi tạo group mới
     */
    getInitialMemberRoles(creatorId: string, memberIds: string[]): Record<string, GroupRole> {
        const memberRoles: Record<string, GroupRole> = {};

        // Creator is always admin
        memberRoles[creatorId] = GroupRole.ADMIN;

        // Other members are newbies by default
        memberIds.forEach(memberId => {
            if (memberId !== creatorId) {
                memberRoles[memberId] = DEFAULT_MEMBER_ROLE;
            }
        });

        return memberRoles;
    }

    /**
     * Auto-promote newbies to members after certain duration
     */
    async autoPromoteNewbies(groupId: string): Promise<void> {
        try {
            const groupRef = doc(db, 'groups', groupId);
            const groupDoc = await getDoc(groupRef);

            if (!groupDoc.exists()) return;

            const groupData = groupDoc.data() as GroupWithRoles;
            const memberRoles = groupData.memberRoles || {};
            let updated = false;

            const now = Date.now();
            const newbieDuration = NEWBIE_DURATION_DAYS * 24 * 60 * 60 * 1000;

            for (const [uid, role] of Object.entries(memberRoles)) {
                if (role === GroupRole.NEWBIE) {
                    // Check join date (you might need to track this separately)
                    // For now, we'll skip auto-promotion and let admins do it manually
                    // You can implement this by tracking joinedAt timestamp per member
                }
            }

            if (updated) {
                await updateDoc(groupRef, {
                    memberRoles,
                    updatedAt: serverTimestamp(),
                });
            }
        } catch (error) {
            console.error('[GroupPermissionService] Error auto-promoting newbies:', error);
        }
    }

    /**
     * Remove member from group
     */
    async removeMember(
        groupId: string,
        targetUserId: string,
        actorUserId: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            // Check permissions - skip if removing self (leaving)
            if (actorUserId !== targetUserId) {
                const canRemove = await this.hasPermission(groupId, actorUserId, GroupPermission.REMOVE_MEMBERS);

                if (!canRemove.hasPermission) {
                    return { success: false, message: 'Bạn không có quyền xóa thành viên' };
                }
            }

            const groupRef = doc(db, 'groups', groupId);
            const groupDoc = await getDoc(groupRef);

            if (!groupDoc.exists()) {
                return { success: false, message: 'Group không tồn tại' };
            }

            const groupData = groupDoc.data() as GroupWithRoles;

            // Cannot remove group creator
            if (groupData.createdBy === targetUserId) {
                return { success: false, message: 'Không thể xóa người tạo nhóm' };
            }

            // Check hierarchy - skip if removing self
            if (actorUserId !== targetUserId) {
                const actorRole = await this.getUserRole(groupId, actorUserId);
                const targetRole = await this.getUserRole(groupId, targetUserId);

                if (ROLE_HIERARCHY[actorRole] <= ROLE_HIERARCHY[targetRole]) {
                    return {
                        success: false,
                        message: 'Bạn không thể xóa người có cấp bậc cao hơn hoặc bằng bạn'
                    };
                }
            }

            // Remove from members array
            const members = (groupData.members || []).filter(uid => uid !== targetUserId);

            // Remove from memberRoles
            const memberRoles = groupData.memberRoles || {};
            delete memberRoles[targetUserId];

            await updateDoc(groupRef, {
                members,
                memberRoles,
                updatedAt: serverTimestamp(),
            });

            return {
                success: true,
                message: 'Đã xóa thành viên khỏi nhóm'
            };
        } catch (error) {
            console.error('[GroupPermissionService] Error removing member:', error);
            return {
                success: false,
                message: 'Lỗi khi xóa thành viên'
            };
        }
    }
}

// Export singleton instance
export const groupPermissionService = new GroupPermissionService();
