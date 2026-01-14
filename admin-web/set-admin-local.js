const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(email) {
    try {
        console.log(`🔍 Looking for user: ${email}`);
        const user = await admin.auth().getUserByEmail(email);
        console.log(`✅ Found user: ${user.uid}`);

        await admin.auth().setCustomUserClaims(user.uid, { admin: true });
        console.log(`✅ Admin claim set successfully!`);

        // Verify
        const updatedUser = await admin.auth().getUser(user.uid);
        console.log(`📋 Custom claims:`, updatedUser.customClaims);

        console.log(`\n🎉 Success! User ${email} is now an admin.`);
        console.log(`⚠️  Note: User must sign out and sign in again for the claim to take effect.`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);

        if (error.code === 'auth/user-not-found') {
            console.log(`\n💡 User ${email} does not exist.`);
            console.log(`   Please create the user first in Firebase Console.`);
        }

        process.exit(1);
    }
}

setAdminClaim('admin@chappat.com');
