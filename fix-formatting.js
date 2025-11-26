const fs = require('fs');

const filePath = 'app/_layout.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix line 246 - comment on same line
content = content.replace(
    /<UserProvider>      \{\/\* Đặt AuthContextProvider/,
    '<UserProvider>\n        {/* Đặt AuthContextProvider'
);

// Fix line 249 - tags on same line  
content = content.replace(
    /<VideoCallProvider>          <NotificationProvider>/,
    '<VideoCallProvider>\n              <NotificationProvider>'
);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed formatting!');
