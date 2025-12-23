const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', '(screens)', 'social', 'NotificationsScreen.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find the position to insert (before default case in handleNotificationPress)
const searchPattern = /(\s+case 'hot_spot':[\s\S]+?break;\s+)(default:\s+console\.log\('⚠️ Unknown notification type:', notification\.type\);[\s\S]+?break;)/;

const newCases = `case 'call':
          // Navigate to caller profile
          if (notification.senderId) {
            console.log('🧭 Navigating to caller:', notification.senderId);
            router.push(\`/(screens)/user/UserProfileScreen?userId=\${notification.senderId}\` as any);
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
            router.push(\`/groups/\${notification.data.groupId}\` as any);
          } else if (notification.senderId) {
            router.push(\`/(screens)/user/UserProfileScreen?userId=\${notification.senderId}\` as any);
          } else {
            Alert.alert(notification.title, notification.message);
          }
          break;

        case 'system':
          // Show system notification
          console.log('📢 System notification');
          Alert.alert(notification.title, notification.message);
          break;

        `;

// Replace - insert new cases before default
content = content.replace(searchPattern, `$1${newCases}$2`);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully added missing notification cases!');
