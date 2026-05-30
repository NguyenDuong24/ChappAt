const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('production smoke contracts', () => {
  test('auth context wires core Firebase auth lifecycle', () => {
    const source = read('context/authContext.jsx');

    expect(source).toMatch(/onAuthStateChanged/);
    expect(source).toMatch(/createUserWithEmailAndPassword/);
    expect(source).toMatch(/signInWithEmailAndPassword/);
    expect(source).toMatch(/signOut/);
    expect(source).toMatch(/sendProductionEmailVerification/);
  });

  test('chat send path keeps moderation and Firestore write hooks', () => {
    const chatScreen = read('app/chat/[id].tsx');
    const messageService = read('services/messageService.ts');

    expect(chatScreen).toMatch(/useContentModeration/);
    expect(chatScreen).toMatch(/handleSend/);
    expect(messageService).toMatch(/addDoc|setDoc/);
    expect(messageService).toMatch(/serverTimestamp/);
  });

  test('call backend mints VideoSDK tokens server-side only', () => {
    const route = read('saigondating-server/src/routes/videosdk.js');
    const envExample = read('saigondating-server/.env.example');

    expect(route).toMatch(/VIDEOSDK_API_KEY/);
    expect(route).toMatch(/VIDEOSDK_SECRET_KEY/);
    expect(route).toMatch(/jwt\.sign/);
    expect(route).toMatch(/router\.post\('\/rooms'/);
    expect(envExample).not.toMatch(new RegExp(['EXPO_PUBLIC', 'VIDEOSDK_TOKEN'].join('_')));
  });

  test('VietQR flow has create, webhook, SMS verification, and push notification paths', () => {
    const route = read('saigondating-server/src/routes/vietqr.js');

    expect(route).toMatch(/router\.post\('\/create-payment'/);
    expect(route).toMatch(/router\.post\('\/webhook\/banking'/);
    expect(route).toMatch(/router\.post\('\/sms-received'/);
    expect(route).toMatch(/verifyWebhookSignature/);
    expect(route).toMatch(/sendPushNotification/);
    expect(route).not.toMatch(/sendNotification\(/);
  });

  test('notification service still registers token and realtime listeners', () => {
    const source = read('services/expoPushNotificationService.ts');

    expect(source).toMatch(/getExpoPushToken/);
    expect(source).toMatch(/initializeWithRealtimeListeners/);
    expect(source).toMatch(/registerForPushNotifications/);
    expect(source).toMatch(/onSnapshot/);
  });

  test('Firestore and Storage rules are not publicly open', () => {
    const firestoreRules = read('firestore.rules');
    const storageRules = read('storage.rules');

    expect(firestoreRules).toMatch(/rules_version = '2'/);
    expect(firestoreRules).toMatch(/request\.auth != null/);
    expect(firestoreRules).not.toMatch(/allow\s+read,\s*write:\s*if\s+true/);
    expect(storageRules).toMatch(/rules_version = '2'/);
    expect(storageRules).toMatch(/request\.auth != null/);
    expect(storageRules).not.toMatch(/allow\s+read,\s*write:\s*if\s+true/);
  });
});
