const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', '(screens)', 'social', 'NotificationsScreen.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix default case to include Alert
content = content.replace(
    /default:\r\n\s+console\.log\('⚠️ Unknown notification type:', notification\.type\);\r\n\s+break;/,
    `default:\r\n          console.log('⚠️ Unknown notification type:', notification.type);\r\n          Alert.alert('Thông báo', notification.message);\r\n          break;`
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully updated default case!');
