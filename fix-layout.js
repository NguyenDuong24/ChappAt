const fs = require('fs');

const filePath = 'app/_layout.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add UserProvider wrapper
content = content.replace(
    /(\s+)<GestureHandlerRootView style=\{\{ flex: 1 \}\}>\r?\n(\s+)\{\/\* Đặt AuthContextProvider/,
    '$1<GestureHandlerRootView style={{ flex: 1 }}>\n      <UserProvider>$2{/* Đặt AuthContextProvider'
);

// Add VideoCallProvider wrapper  
content = content.replace(
    /(\s+)<AudioProvider>\r?\n(\s+)<NotificationProvider>/,
    '$1<AudioProvider>\n          <VideoCallProvider>$2<NotificationProvider>'
);

// Close VideoCallProvider
content = content.replace(
    /(\s+)<\/NotificationProvider>\r?\n(\s+)<\/AudioProvider>\r?\n(\s+)<\/AuthContextProvider>/,
    '$1</NotificationProvider>\n          </VideoCallProvider>\n        </AudioProvider>\n        </AuthContextProvider>\n      </UserProvider>'
);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed app/_layout.jsx!');
