import re

# Read the file
with open(r'c:\Users\Admin\Desktop\Chat\ChappAt\app\(screens)\social\NotificationsScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the default case with all missing cases
old_default = """        default:
          console.log('⚠️ Unknown notification type:', notification.type);
          break;"""

new_cases = """        case 'call':
          // Navigate to caller profile
          if (notification.senderId) {
            console.log('🧭 Navigating to caller:', notification.senderId);
            router.push(`/(screens)/user/UserProfileScreen?userId=${notification.senderId}` as any);
          } else {
            Alert.alert('Cuộc gọi', notification.message);
          }
          break;

        case 'event_pass':
          // Show event pass details
          console.log('🎫 Event pass:', notification.data?.eventPassId);
          Alert.alert(notification.title, notification.message);
          break;

        case 'accepted_invite':
          // Navigate to group or show message
          if (notification.data?.groupId) {
            console.log('🧭 Navigating to group:', notification.data.groupId);
            router.push(`/groups/${notification.data.groupId}` as any);
          } else if (notification.senderId) {
            router.push(`/(screens)/user/UserProfileScreen?userId=${notification.senderId}` as any);
          } else {
            Alert.alert(notification.title, notification.message);
          }
          break;

        case 'system':
          // Show system notification
          console.log('📢 System notification');
          Alert.alert(notification.title, notification.message);
          break;

        default:
          console.log('⚠️ Unknown notification type:', notification.type);
          Alert.alert('Thông báo', notification.message);
          break;"""

# Replace
content = content.replace(old_default, new_cases)

# Write back
with open(r'c:\Users\Admin\Desktop\Chat\ChappAt\app\(screens)\social\NotificationsScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully updated NotificationsScreen.tsx with all notification cases!")
