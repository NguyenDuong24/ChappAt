/**
 * Group Roles and Permissions System
 */

// Group roles
export enum GroupRole {
    ADMIN = 'admin',
    MODERATOR = 'moderator',
    MEMBER = 'member',
    NEWBIE = 'newbie',
}

// Specific permissions
export enum GroupPermission {
    // Message Permissions
    SEND_MESSAGE = 'send_message',
    DELETE_OWN_MESSAGE = 'delete_own_message',
    DELETE_ANY_MESSAGE = 'delete_any_message',
    EDIT_OWN_MESSAGE = 'edit_own_message',
    PIN_MESSAGE = 'pin_message',

    // Media Permissions
    SEND_IMAGE = 'send_image',
    SEND_VIDEO = 'send_video',
    SEND_FILE = 'send_file',

    // Member Management
    INVITE_MEMBERS = 'invite_members',
    REMOVE_MEMBERS = 'remove_members',
    MANAGE_ROLES = 'manage_roles',
    VIEW_MEMBERS = 'view_members',

    // Group Settings
    EDIT_GROUP_INFO = 'edit_group_info',
    DELETE_GROUP = 'delete_group',
    CHANGE_GROUP_SETTINGS = 'change_group_settings',

    // Moderation
    MUTE_MEMBERS = 'mute_members',
    BAN_MEMBERS = 'ban_members',
    REPORT_CONTENT = 'report_content',

    // Voice/Video
    START_VOICE_CALL = 'start_voice_call',
    START_VIDEO_CALL = 'start_video_call',
}

// Mapping role -> permissions
export const ROLE_PERMISSIONS: Record<GroupRole, GroupPermission[]> = {
    [GroupRole.ADMIN]: [
        GroupPermission.SEND_MESSAGE,
        GroupPermission.DELETE_OWN_MESSAGE,
        GroupPermission.DELETE_ANY_MESSAGE,
        GroupPermission.EDIT_OWN_MESSAGE,
        GroupPermission.PIN_MESSAGE,
        GroupPermission.SEND_IMAGE,
        GroupPermission.SEND_VIDEO,
        GroupPermission.SEND_FILE,
        GroupPermission.INVITE_MEMBERS,
        GroupPermission.REMOVE_MEMBERS,
        GroupPermission.MANAGE_ROLES,
        GroupPermission.VIEW_MEMBERS,
        GroupPermission.EDIT_GROUP_INFO,
        GroupPermission.DELETE_GROUP,
        GroupPermission.CHANGE_GROUP_SETTINGS,
        GroupPermission.MUTE_MEMBERS,
        GroupPermission.BAN_MEMBERS,
        GroupPermission.REPORT_CONTENT,
        GroupPermission.START_VOICE_CALL,
        GroupPermission.START_VIDEO_CALL,
    ],

    [GroupRole.MODERATOR]: [
        GroupPermission.SEND_MESSAGE,
        GroupPermission.DELETE_OWN_MESSAGE,
        GroupPermission.DELETE_ANY_MESSAGE,
        GroupPermission.EDIT_OWN_MESSAGE,
        GroupPermission.PIN_MESSAGE,
        GroupPermission.SEND_IMAGE,
        GroupPermission.SEND_VIDEO,
        GroupPermission.SEND_FILE,
        GroupPermission.INVITE_MEMBERS,
        GroupPermission.VIEW_MEMBERS,
        GroupPermission.MUTE_MEMBERS,
        GroupPermission.REPORT_CONTENT,
        GroupPermission.START_VOICE_CALL,
        GroupPermission.START_VIDEO_CALL,
    ],

    [GroupRole.MEMBER]: [
        GroupPermission.SEND_MESSAGE,
        GroupPermission.DELETE_OWN_MESSAGE,
        GroupPermission.EDIT_OWN_MESSAGE,
        GroupPermission.SEND_IMAGE,
        GroupPermission.SEND_VIDEO,
        GroupPermission.SEND_FILE,
        GroupPermission.INVITE_MEMBERS,
        GroupPermission.VIEW_MEMBERS,
        GroupPermission.REPORT_CONTENT,
        GroupPermission.START_VOICE_CALL,
        GroupPermission.START_VIDEO_CALL,
    ],

    [GroupRole.NEWBIE]: [
        GroupPermission.SEND_MESSAGE,
        GroupPermission.DELETE_OWN_MESSAGE,
        GroupPermission.VIEW_MEMBERS,
        GroupPermission.REPORT_CONTENT,
    ],
};

// Role hierarchy (for role management)
export const ROLE_HIERARCHY: Record<GroupRole, number> = {
    [GroupRole.ADMIN]: 4,
    [GroupRole.MODERATOR]: 3,
    [GroupRole.MEMBER]: 2,
    [GroupRole.NEWBIE]: 1,
};

// Role labels for UI
export const ROLE_LABELS: Record<GroupRole, { label: string; color: string; icon: string }> = {
    [GroupRole.ADMIN]: {
        label: 'Admin',
        color: '#EF4444',
        icon: 'shield-crown',
    },
    [GroupRole.MODERATOR]: {
        label: 'Moderator',
        color: '#3B82F6',
        icon: 'shield-check',
    },
    [GroupRole.MEMBER]: {
        label: 'Member',
        color: '#10B981',
        icon: 'account',
    },
    [GroupRole.NEWBIE]: {
        label: 'Newbie',
        color: '#6B7280',
        icon: 'account-outline',
    },
};

// Member with role
export interface GroupMemberWithRole {
    uid: string;
    role: GroupRole;
    displayName?: string;
    photoURL?: string;
    joinedAt?: any;
    mutedUntil?: any;
    isBanned?: boolean;
}

// Group data with roles
export interface GroupWithRoles {
    id: string;
    name: string;
    description?: string;
    photoURL?: string;
    avatarUrl?: string;
    createdBy: string;
    createdAt: any;
    updatedAt: any;
    members: string[];
    memberRoles?: Record<string, GroupRole>; // uid -> role mapping
    type: 'public' | 'private';
    isSearchable?: boolean;

    // Deprecated field (backward compatibility)
    admins?: string[];
}

// Permission check result
export interface PermissionCheckResult {
    hasPermission: boolean;
    reason?: string;
    userRole?: GroupRole;
}

// Default role for new members
export const DEFAULT_MEMBER_ROLE = GroupRole.NEWBIE;

// Time window to auto-upgrade Newbie -> Member
export const NEWBIE_DURATION_DAYS = 7;
