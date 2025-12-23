# Hệ Thống Quản Lý Quyền Nhóm (Group Permissions System)

## Tổng Quan

Hệ thống quản lý quyền nhóm đã được triển khai đầy đủ với 4 cấp độ role:
- **Admin** - Toàn quyền quản lý nhóm
- **Moderator** - Quyền điều hành và quản lý hạn chế
- **Member** - Thành viên thường
- **Newbie** - Người mới tham gia (hạn chế quyền)

## Files Đã Tạo

### 1. `/types/groupPermissions.ts`
Định nghĩa đầy đủ:
- `GroupRole` enum - 4 loại role
- `GroupPermission` enum - Các quyền cụ thể (18 permissions)
- `ROLE_PERMISSIONS` - Mapping role → permissions
- `ROLE_HIERARCHY` - Cấp bậc role
- `ROLE_LABELS` - Nhãn và màu sắc hiển thị
- Interfaces: `GroupMemberWithRole`, `GroupWithRoles`

### 2. `/services/groupPermissionService.ts`
Service xử lý logic permissions:
- `getUserRole()` - Lấy role của user
- `hasPermission()` - Kiểm tra permission
- `changeMemberRole()` - Thay đổi role (với kiểm tra hierarchy)
- `getMembersWithRoles()` - Lấy danh sách members kèm role
- `removeMember()` - Xóa thành viên
- `getInitialMemberRoles()` - Setup role ban đầu khi tạo group

### 3. `/app/(screens)/groups/GroupManagementScreen.tsx`
Màn hình quản lý nhóm hoàn chỉnh với:
- Hiển thị thông tin nhóm và avatar
- Chỉnh sửa tên, mô tả nhóm
- Danh sách members với role badge
- Menu quản lý member (thay đổi role, xóa member)
- Thêm member mới
- Rời nhóm
- Permission checking tự động

## Quyền Của Từng Role

### 👑 Admin (Quản trị viên)
✅ **TẤT CẢ QUY ỀN**:
- Gửi/xóa/sửa tin nhắn (kể cả tin nhắn người khác)
- Ghim tin nhắn
- Gửi media (ảnh, video, file)
- Mời/xóa thành viên
- Quản lý roles
- Chỉnh sửa thông tin nhóm
- Xóa nhóm
- Thay đổi cài đặt nhóm
- Mute/ban members
- Bắt đầu voice/video call

### 🛡️ Moderator (Điều hành viên)
✅ **Hầu hết quyền trừ những quyền quan trọng**:
- Gửi/xóa/sửa tin nhắn (có thể xóa tin nhắn người khác)
- Ghim tin nhắn
- Gửi media
- Mời thành viên
- Mute members
- Bắ đầu voice/video call

❌ **KHÔNG có quyền**:
- Quản lý roles
- Xóa members
- Thay đổi cài đặt nhóm
- Xóa nhóm

### 👥 Member (Thành viên)
✅ **Quyền cơ bản**:
- Gửi/xóa/sửa tin nhắn của mình
- Gửi media
- Mời thành viên
- Xem danh sách members
- Báo cáo nội dung
- Bắt đầu voice/video call

❌ **KHÔNG có quyền**:
- Xóa tin nhắn người khác
- Ghim tin nhắn
- Quản lý members/roles
- Chỉnh sửa thông tin nhóm

### 🆕 Newbie (Người mới)
✅ **Quyền tối thiểu**:
- Gửi tin nhắn
- Xóa tin nhắn của mình
- Xem danh sách members
- Báo cáo nội dung

❌ **KHÔNG có quyền**:
- Gửi media
- Mời thành viên
- Bắt đầu calls

## Sử Dụng

### 1. Kiểm tra permission
```typescript
import { groupPermissionService } from '@/services/groupPermissionService';
import { GroupPermission } from '@/types/groupPermissions';

// Kiểm tra permission cụ thể
const result = await groupPermissionService.hasPermission(
  groupId,
  userId,
  GroupPermission.DELETE_ANY_MESSAGE
);

if (result.hasPermission) {
  // Cho phép xóa tin nhắn
} else {
  Alert.alert('Lỗi', result.reason);
}
```

### 2. Thay đổi role của member
```typescript
import { GroupRole } from '@/types/groupPermissions';

const result = await groupPermissionService.changeMemberRole(
  groupId,
  targetUserId,
  GroupRole.MODERATOR,
  currentUserId
);

if (result.success) {
  Alert.alert('Thành công', result.message);
} else {
  Alert.alert('Lỗi', result.message);
}
```

### 3. Xóa member
```typescript
const result = await groupPermissionService.removeMember(
  groupId,
  targetUserId,
  currentUserId
);
```

### 4. Setup khi tạo group mới
```typescript
import { groupPermissionService } from '@/services/groupPermissionService';

// Trong EnhancedCreateGroupModal
const memberRoles = groupPermissionService.getInitialMemberRoles(
  currentUser.uid,
  selectedFriends
);

const groupData = {
  // ... other fields
  members: [currentUser.uid, ...selectedFriends],
  memberRoles, // ← Thêm field này
  admins: [currentUser.uid], // Backward compatibility
};
```

## Firestore Data Structure

### Groups Collection
```javascript
{
  id: "groupId",
  name: "Tên nhóm",
  description: "Mô tả",
  photoURL: "url",
  createdBy: "userId",
  createdAt: timestamp,
  updatedAt: timestamp,
  members: ["uid1", "uid2", ...],
  
  // NEW: Role mapping
  memberRoles: {
    "uid1": "admin",    // Creator
    "uid2": "newbie",   // New member
    "uid3": "moderator",
    "uid4": "member",
  },
  
  // Old field (for backward compatibility)
  admins: ["uid1"],
  
  type: "public" | "private",
  isSearchable: boolean
}
```

## Apply Vào Existing Features

### Chat Messages
Trong `GroupMessageItem` hoặc `GroupMessageList`:
```typescript
// Kiểm tra quyền xóa tin nhắn
const canDelete = await groupPermissionService.hasPermission(
  groupId,
  currentUserId,
  GroupPermission.DELETE_ANY_MESSAGE
);

// Hoặc chỉ xóa tin nhắn của mình
const canDeleteOwn = message.uid === currentUserId &&
  (await groupPermissionService.hasPermission(
    groupId,
    currentUserId,
    GroupPermission.DELETE_OWN_MESSAGE
  )).hasPermission;
```

### Invite Members
```typescript
const canInvite = await groupPermissionService.hasPermission(
  groupId,
  currentUserId,
  GroupPermission.INVITE_MEMBERS
);

if (!canInvite.hasPermission) {
  Alert.alert('Lỗi', 'Bạn không có quyền mời thành viên');
  return;
}
```

### Edit Group Info
```typescript
const canEdit = await groupPermissionService.hasPermission(
  groupId,
  currentUserId,
  GroupPermission.EDIT_GROUP_INFO
);
```

## Màn Hình Quản Lý

### Truy cập GroupManagementScreen
Từ `GroupChatHeader`:
```typescript
router.push(`/(screens)/groups/GroupManagementScreen?id=${group.id}`);
```

### Features Có Sẵn
1. **Xem thông tin nhóm** - Avatar, tên, mô tả, số members
2. **Chỉnh sửa** - Đổi avatar, tên, mô tả (chỉ Admin)
3. **Quản lý members**:
   - Xem danh sách + role badge
   - Menu 3 chấm để thay đổi role
   - Xóa member
   - Hierarchy checking tự động
4. **Thêm member mới** - Nhập UID
5. **Rời nhóm** - Tất cả members (trừ creator)

## Role Hierarchy & Safety

Hệ thống đảm bảo:
- **Không ai có thể thay đổi role của người có cấp cao hơn**
- **Không thể gán role cao hơn role của mình**
- **Creator luôn là Admin** (không thể thay đổi hoặc xóa)
- **Hierarchy**: Admin (4) > Moderator (3) > Member (2) > Newbie (1)

## Migration Path

### Chuyển đổi groups hiện có
```typescript
// Script để migrate old groups
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { groupPermissionService } from '@/services/groupPermissionService';

async function migrateGroup(groupId: string) {
  const groupDoc = await getDoc(doc(db, 'groups', groupId));
  const groupData = groupDoc.data();
  
  const memberRoles = groupPermissionService.getInitialMemberRoles(
    groupData.createdBy,
    groupData.members.filter(uid => uid !== groupData.createdBy)
  );
  
  // Set existing admins as Admin role
  if (groupData.admins) {
    groupData.admins.forEach(adminId => {
      memberRoles[adminId] = GroupRole.ADMIN;
    });
  }
  
  await updateDoc(doc(db, 'groups', groupId), {
    memberRoles
  });
}
```

## Next Steps - TODO

### 1. Cập nhật EnhancedCreateGroupModal
```typescript
// File: components/groups/EnhancedCreateGroupModal.tsx
// Dòng 105-133

import { groupPermissionService } from '@/services/groupPermissionService';

const handleCreate = async () => {
  // ... existing code ...
  
  // Tạo memberRoles
  const memberRoles = groupPermissionService.getInitialMemberRoles(
    currentUser.uid,
    selectedFriends
  );
  
  const groupData = {
    name: name.trim(),
    description: description.trim(),
    photoURL,
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    members: [currentUser.uid, ...selectedFriends],
    memberRoles, // ← ADD THIS
    admins: [currentUser.uid],
    type: groupType,
    isSearchable: groupType === 'private' ? false : isSearchable,
  };
  
  // ...rest of code
};
```

### 2. Apply Permissions vào Group Chat
```typescript
// File: app/groups/[id].tsx

// Thêm state
const [userRole, setUserRole] = useState<GroupRole>(GroupRole.NEWBIE);
const [canSendMedia, setCanSendMedia] = useState(false);

// Load permissions
useEffect(() => {
  const loadPermissions = async () => {
    const role = await groupPermissionService.getUserRole(id, user.uid);
    setUserRole(role);
    
    const mediaPermission = await groupPermissionService.hasPermission(
      id,
      user.uid,
      GroupPermission.SEND_IMAGE
    );
    setCanSendMedia(mediaPermission.hasPermission);
  };
  
  loadPermissions();
}, [id, user.uid]);

// Disable image button nếu không có quyền
<TextInput.Icon 
  icon="image" 
  onPress={canSendMedia ? handlePickImage : () => Alert.alert('Lỗi', 'Bạn không có quyền gửi ảnh')}
  disabled={!canSendMedia}
/>
```

### 3. GroupMessageItem - Delete Permission
```typescript
// components/groups/GroupMessageItem.tsx

const [canDelete, setCanDelete] = useState(false);

useEffect(() => {
  const checkPermission = async () => {
    const isOwn = message.uid === currentUser.uid;
    
    if (isOwn) {
      const result = await groupPermissionService.hasPermission(
        groupId,
        currentUser.uid,
        GroupPermission.DELETE_OWN_MESSAGE
      );
      setCanDelete(result.hasPermission);
    } else {
      const result = await groupPermissionService.hasPermission(
        groupId,
        currentUser.uid,
        GroupPermission.DELETE_ANY_MESSAGE
      );
      setCanDelete(result.hasPermission);
    }
  };
  
  checkPermission();
}, [message, groupId, currentUser.uid]);

// Chỉ hiển thị delete button nếu có quyền
{canDelete && (
  <Menu.Item onPress={handleDelete} title="Xóa" />
)}
```

### 4. Auto-promote Newbies
Implement logic tự động nâng Newbie → Member sau 7 ngày:
- Track `joinedAt` timestamp cho mỗi member
- Chạy cloud function hoặc client-side check
- Gọi `groupPermissionService.changeMemberRole()` khi đủ điều kiện

## UI Components Customization

### Role Badge Component
```typescript
import { ROLE_LABELS } from '@/types/groupPermissions';

const RoleBadge = ({ role }: { role: GroupRole }) => {
  const roleInfo = ROLE_LABELS[role];
  
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: roleInfo.color + '20',
    }}>
      <MaterialCommunityIcons
        name={roleInfo.icon}
        size={14}
        color={roleInfo.color}
      />
      <Text style={{ color: roleInfo.color, fontSize: 12, fontWeight: '600' }}>
        {roleInfo.vi}
      </Text>
    </View>
  );
};
```

## Testing Checklist

- [ ] Tạo group mới → Creator được role Admin tự động
- [ ] Members khác được role Newbie mặc định
- [ ] Admin có thể thay đổi role của Member/Newbie
- [ ] Moderator KHÔNG thể thay đổi role
- [ ] Member/Newbie KHÔNG thể thay đổi role
- [ ] Không thể thay đổi role của người có cấp cao hơn
- [ ] Không thể thay đổi role của Creator
- [ ] Admin có thể xóa Member/Moderator
- [ ] Moderator KHÔNG thể xóa Member
- [ ] Permissions được áp dụng đúng cho các action (send media, delete message, etc.)
- [ ] UI hiển thị role badges chính xác
- [ ] Navigation tới GroupManagementScreen hoạt động

## Support & Debug

### Kiểm tra role hiện tại
```typescript
const role = await groupPermissionService.getUserRole(groupId, userId);
console.log(`User role:`, role);
```

### Kiểm tra tất cả permissions của  user
```typescript
import { ROLE_PERMISSIONS } from '@/types/groupPermissions';

const role = await groupPermissionService.getUserRole(groupId, userId);
const permissions = ROLE_PERMISSIONS[role];
console.log(`Permissions:`, permissions);
```

### Debug permission check
```typescript
const result = await groupPermissionService.hasPermission(
  groupId,
  userId,
  groupPermission
);
console.log(`Permission check:`, result);
// { hasPermission: false, reason: "Role member không có quyền delete_any_message", userRole: "member" }
```

## Kết Luận

Hệ thống role-based permissions đã được implement hoàn chỉnh với:
✅ 4 cấp độ role rõ ràng
✅ 18 permissions chi tiết
✅ Service xử lý logic an toàn
✅ UI quản lý members đầy đủ
✅ Hierarchy checking tự động
✅ Backward compatibility với groups cũ

**Next**: Apply permissions vào các chức năng chat, media, và notifications.
