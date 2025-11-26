// Script để tạo admin user trong Firebase
// Chạy: node create-admin.js

const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account-key.json'); // Bạn cần download service account key từ Firebase Console

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function createAdminUser() {
    const email = 'admin@chappat.com';
    const password = 'Admin@123';

    try {
        // Tạo user
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            emailVerified: true,
            disabled: false
        });

        console.log('✅ Admin user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('UID:', userRecord.uid);

        // Set custom claims để đánh dấu là admin
        await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
        console.log('✅ Admin claims set successfully!');

        process.exit(0);
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            console.log('⚠️  Admin user already exists');
            // Lấy user và set custom claims
            const user = await admin.auth().getUserByEmail(email);
            await admin.auth().setCustomUserClaims(user.uid, { admin: true });
            console.log('✅ Admin claims updated for existing user');
            console.log('Email:', email);
            console.log('Password: (already set, use', password, 'if you set it before)');
        } else {
            console.error('❌ Error:', error);
        }
        process.exit(0);
    }
}

createAdminUser();
