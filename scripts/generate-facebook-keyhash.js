const crypto = require('crypto');

console.log('🔑 Tạo Facebook Key Hash từ SHA-1...\n');

// SHA-1 của bạn từ debug keystore
const sha1WithColons = '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25';

// Loại bỏ dấu : 
const sha1Hex = sha1WithColons.replace(/:/g, '');

console.log('📊 Thông tin:');
console.log('   SHA-1 gốc:', sha1WithColons);
console.log('   SHA-1 hex:', sha1Hex);

try {
    // Convert hex string to buffer
    const buffer = Buffer.from(sha1Hex, 'hex');
    
    // Tạo SHA-1 hash từ buffer
    const sha1Hash = crypto.createHash('sha1').update(buffer).digest();
    
    // Convert sang Base64 (Facebook Key Hash format)
    const keyHash = sha1Hash.toString('base64');
    
    console.log('\n🎉 Kết quả:');
    console.log('   Facebook Key Hash:', keyHash);
    console.log('\n📋 Copy key hash này và paste vào Facebook Developer Console:');
    console.log('   Settings → Basic → Add Platform → Android → Key Hashes');
    console.log('\n📝 Thông tin cần nhập vào Facebook:');
    console.log('   Package Name: com.duongnguyen1263.Chat');
    console.log('   Class Name: com.duongnguyen1263.Chat.MainActivity');
    console.log('   Key Hashes:', keyHash);
    
} catch (error) {
    console.error('❌ Lỗi khi tạo key hash:', error.message);
}
