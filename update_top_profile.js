const fs = require('fs');
const path = 'c:\\Users\\Admin\\Desktop\\Chat\\ChappAt\\components\\profile\\TopProfile.tsx';

let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    "onLongPress={() => { }}",
    "onLongPress={() => router.push('/(tabs)/profile/EditProfile')}"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated TopProfile.tsx');
