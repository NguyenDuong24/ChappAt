import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { AccessToken, LoginManager } from 'react-native-fbsdk-next';
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { FacebookAuthProvider, GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from 'firebase/auth';

const GOOGLE_SIGNIN_TROUBLESHOOTING = [
  'Google Sign-In DEVELOPER_ERROR/code 10 usually means Android package name, SHA-1/SHA-256, or OAuth client mismatch.',
  'Current app.json android.package is saigonmatch.com.vn, but google-services.json must contain an Android OAuth client for that exact package.',
  'Add debug/release SHA-1 and SHA-256 in Firebase Console > Project settings > Android app, download the new google-services.json, then rebuild the native app.',
  'Do not expect this to be fixed by JS reload; it requires a new dev/release build with the updated native config.',
].join(' ');
// Google Sign-In Configuration
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '256923005911-70tma6mbfguvjmpota9ia5adm457dinf.apps.googleusercontent.com', // Web client ID tá»« google-services.json
    iosClientId: '256923005911-m2j0sqfikfi21dor3mjo0rlnehe7p4a1.apps.googleusercontent.com', // iOS client ID tá»« file báº¡n vá»«a gá»­i
    offlineAccess: true,
    hostedDomain: '',
    forceCodeForRefreshToken: true,
  });
};

// Google Sign-In
export const signInWithGoogle = async (onSuccessNavigate, options = {}) => {
  const { forceAccountSelection = false, forceChooseAccount } = options;
  const forceChooser = forceAccountSelection || forceChooseAccount === true;
  try {
    console.log('ðŸ” Starting Google Sign-In... forceChooser=', forceChooser);

    configureGoogleSignIn();

    // Force choose account: clear any cached Google session so chooser appears
    if (forceChooser) {
      try {
        // Clear Google session regardless of current state
        try { await GoogleSignin.signOut(); } catch (_e) {}
        try { await GoogleSignin.revokeAccess(); } catch (_e) {}
        // Ensure Firebase is signed out
        if (auth.currentUser) {
          console.log('ðŸ”„ Signing out Firebase user to force fresh auth state');
          await firebaseSignOut(auth);
        }
      } catch (preErr) {
        console.log('âš ï¸ Pre sign-out error (can ignore):', preErr?.message || preErr);
      }
    }

    console.log('ðŸ” Checking Google Play Services...');
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    console.log('ðŸ” Attempting Google Sign-In...');
    const signInResult = await GoogleSignin.signIn();
    console.log('ðŸ” Raw Google signIn result keys:', Object.keys(signInResult || {}));
    console.log('ðŸ” signInResult.user:', signInResult?.user);
    console.log('ðŸ” signInResult.idToken present?', !!signInResult?.idToken);

    let { user } = signInResult || {};
    let idToken = signInResult?.idToken;

    // Fallback: try to explicitly fetch tokens if idToken missing
    if (!idToken) {
      console.log('âš ï¸ idToken missing from signInResult, attempting GoogleSignin.getTokens() fallback...');
      try {
        const tokens = await GoogleSignin.getTokens();
        console.log('ðŸ” getTokens() keys:', Object.keys(tokens || {}));
        if (tokens?.idToken) {
          idToken = tokens.idToken;
          console.log('âœ… Retrieved idToken via getTokens()');
        } else {
          console.log('âŒ getTokens() did not return idToken');
        }
      } catch (tokenErr) {
        console.log('âŒ Error calling getTokens():', tokenErr?.message || tokenErr);
      }
    }

    // Final guard
    if (!idToken) {
      throw new Error('No ID token received from Google Sign-In (after fallback). Check webClientId & SHA-1.');
    }

    console.log('âœ… Google Sign-In successful, user:', user?.name || user?.email || 'Unknown');
    console.log('ðŸ” Creating Google credential (modular SDK)...');
    const googleCredential = GoogleAuthProvider.credential(idToken);
    console.log('ðŸ” Signing in with Firebase (modular auth)...');
    const userCredential = await signInWithCredential(auth, googleCredential);
    console.log('ðŸ” Saving user to Firestore...');
    await saveUserToFirestore(userCredential.user, {
      displayName: user?.name || user?.givenName || userCredential.user.displayName,
      email: user?.email || userCredential.user.email,
      photoURL: user?.photo || userCredential.user.photoURL,
      provider: 'google'
    });
    // Explicit post-login navigation trigger
    if (typeof onSuccessNavigate === 'function') {
      try { onSuccessNavigate(userCredential.user); } catch (navErr) { console.log('Navigation callback error', navErr); }
    }
    console.log('âœ… Google Sign-In complete!');
    return {
      success: true,
      user: userCredential.user,
      message: 'ÄÄƒng nháº­p Google thÃ nh cÃ´ng!'
    };
  } catch (error) {
    // Handle cancel explicitly BEFORE other logic
    if (error?.code === statusCodes.SIGN_IN_CANCELLED || error?.code === 'sign_in_cancelled' || error?.code === '-5') {
      console.log('ðŸš« User cancelled Google Sign-In');
      return {
        success: false,
        cancelled: true,
        message: 'ÄÄƒng nháº­p Ä‘Ã£ bá»‹ há»§y'
      };
    }
    console.error('Google Sign-In Error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    
    let errorMessage = 'ÄÄƒng nháº­p Google tháº¥t báº¡i';
    
    // Kiá»ƒm tra náº¿u error cÃ³ thuá»™c tÃ­nh code
    if (error && error.code) {
      switch (error.code) {
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'TÃ i khoáº£n Ä‘Ã£ tá»“n táº¡i vá»›i phÆ°Æ¡ng thá»©c Ä‘Äƒng nháº­p khÃ¡c';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'ThÃ´ng tin Ä‘Äƒng nháº­p khÃ´ng há»£p lá»‡';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'ÄÄƒng nháº­p Google chÆ°a Ä‘Æ°á»£c kÃ­ch hoáº¡t';
          break;
        case 'auth/user-disabled':
          errorMessage = 'TÃ i khoáº£n Ä‘Ã£ bá»‹ vÃ´ hiá»‡u hÃ³a';
          break;
        case 'auth/user-not-found':
          errorMessage = 'KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Máº­t kháº©u khÃ´ng Ä‘Ãºng';
          break;
        case 'sign_in_required':
          errorMessage = 'Cáº§n Ä‘Äƒng nháº­p láº¡i';
          break;
        case 'network_error':
          errorMessage = 'Lá»—i káº¿t ná»‘i máº¡ng';
          break;
        case '12501': // Google Sign-In error (usually config issue)
          errorMessage = 'Lá»—i cáº¥u hÃ¬nh Google Sign-In. Kiá»ƒm tra SHA-1 fingerprint';
          break;
        case '10': // Developer error
          console.error('[GoogleSignIn] Developer configuration error:', GOOGLE_SIGNIN_TROUBLESHOOTING);
          errorMessage = 'Lỗi cấu hình Google Sign-In (code 10). Cần cập nhật package name + SHA-1/SHA-256 trong Firebase rồi rebuild app.';
          break;
        default:
          errorMessage = `Lá»—i Google Sign-In: ${error.code}`;
      }
    } else if (error && error.message) {
      if (error.message.includes('DEVELOPER_ERROR')) {
        console.error('[GoogleSignIn] Developer configuration error:', GOOGLE_SIGNIN_TROUBLESHOOTING);
        errorMessage = 'Lỗi cấu hình Google Sign-In. Cần cập nhật package name + SHA-1/SHA-256 trong Firebase rồi rebuild app.';
      } else if (error.message.includes('No ID token')) {
        errorMessage = 'KhÃ´ng nháº­n Ä‘Æ°á»£c token tá»« Google. Kiá»ƒm tra webClientId (type 3) & SHA-1';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      message: errorMessage,
      error: error
    };
  }
};

// Facebook Sign-In
export const signInWithFacebook = async (onSuccessNavigate) => {
  try {
    console.log('ðŸ” Starting Facebook Sign-In...');
    
    // Check current access token
    const currentToken = await AccessToken.getCurrentAccessToken();
    console.log('ðŸ” Current Facebook token:', currentToken ? 'exists' : 'none');
    
    // Attempt login with permissions
    console.log('ðŸ” Requesting Facebook permissions...');
    const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
    console.log('ðŸ” Facebook login result:', result);
    
    if (result.isCancelled) {
      console.log('âŒ Facebook login cancelled by user');
      return {
        success: false,
        message: 'ÄÄƒng nháº­p Facebook Ä‘Ã£ bá»‹ há»§y'
      };
    }
    
    // Once signed in, get the users AccessToken
    console.log('ðŸ” Getting Facebook access token...');
    const data = await AccessToken.getCurrentAccessToken();
    console.log('ðŸ” Facebook access token:', data ? 'obtained' : 'failed');
    
    if (!data) {
      console.log('âŒ No Facebook access token');
      return {
        success: false,
        message: 'KhÃ´ng thá»ƒ láº¥y token Facebook'
      };
    }
    
    // Create a Facebook credential with the AccessToken (modular SDK)
    console.log('ðŸ” Creating Facebook credential (modular SDK)...');
    const facebookCredential = FacebookAuthProvider.credential(data.accessToken);
    
    // Sign-in the user with the credential (modular SDK)
    console.log('ðŸ” Signing in with Firebase (modular auth)...');
    const userCredential = await signInWithCredential(auth, facebookCredential);
    
    // Get additional user info from Facebook Graph API
    console.log('ðŸ” Getting Facebook user info...');
    const userInfo = await getUserInfoFromFacebook(data.accessToken);
    
    // Save user data to Firestore
    console.log('ðŸ” Saving user to Firestore...');
    await saveUserToFirestore(userCredential.user, {
      displayName: userInfo.name || userCredential.user.displayName,
      email: userInfo.email || userCredential.user.email,
      photoURL: userInfo.picture?.data?.url || userCredential.user.photoURL,
      provider: 'facebook'
    });
    
    // Explicit post-login navigation trigger
    if (typeof onSuccessNavigate === 'function') {
      try { onSuccessNavigate(userCredential.user); } catch (navErr) { console.log('Navigation callback error', navErr); }
    }
    console.log('âœ… Facebook Sign-In complete!');
    return {
      success: true,
      user: userCredential.user,
      message: 'ÄÄƒng nháº­p Facebook thÃ nh cÃ´ng!'
    };
  } catch (error) {
    console.error('Facebook Sign-In Error:', error);
    
    let errorMessage = 'ÄÄƒng nháº­p Facebook tháº¥t báº¡i';
    
    // Kiá»ƒm tra náº¿u error cÃ³ thuá»™c tÃ­nh code
    if (error && error.code) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'TÃ i khoáº£n Ä‘Ã£ tá»“n táº¡i vá»›i phÆ°Æ¡ng thá»©c Ä‘Äƒng nháº­p khÃ¡c';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'ThÃ´ng tin Ä‘Äƒng nháº­p Facebook khÃ´ng há»£p lá»‡';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'ÄÄƒng nháº­p Facebook chÆ°a Ä‘Æ°á»£c kÃ­ch hoáº¡t';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'TÃ i khoáº£n Ä‘Ã£ bá»‹ vÃ´ hiá»‡u hÃ³a';
      }
    } else if (error && error.message) {
      if (error.message.includes('not available')) {
        errorMessage = 'Facebook Login chÆ°a Ä‘Æ°á»£c cáº¥u hÃ¬nh Ä‘Ãºng';
      } else if (error.message.includes('cancelled')) {
        errorMessage = 'ÄÄƒng nháº­p Facebook Ä‘Ã£ bá»‹ há»§y';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      message: errorMessage,
      error: error
    };
  }
};

// Get user info from Facebook Graph API
const getUserInfoFromFacebook = async (accessToken) => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );
    const userInfo = await response.json();
    return userInfo;
  } catch (error) {
    console.error('Error fetching Facebook user info:', error);
    return {};
  }
};

// Save user data to Firestore
const saveUserToFirestore = async (user, additionalData) => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    const isNew = !userSnap.exists();
    const existingData = userSnap.exists() ? userSnap.data() : {};

    // Prefer existing username if present (do not overwrite custom username with provider name)
    const resolvedUsername = existingData.username && existingData.username.trim().length > 0
      ? existingData.username
      : (additionalData.displayName || user.displayName || 'User');

    const userData = {
      uid: user.uid,
      email: additionalData.email || user.email || existingData.email || '',
      username: resolvedUsername,
      profileUrl: additionalData.photoURL || user.photoURL || existingData.profileUrl || '',
      provider: additionalData.provider || existingData.provider || 'unknown',
      isOnline: true,
      lastSeen: new Date(),
      createdAt: existingData.createdAt || new Date(),
      updatedAt: new Date(),
      age: existingData.age || '',
      gender: existingData.gender || '',
      bio: existingData.bio || '',
      location: existingData.location || '',
      interests: existingData.interests || [],
      verified: existingData.verified || false,
      // Keep the existing completion flag
      profileCompleted: existingData.profileCompleted === true ? true : false,
    };

    if (isNew) {
      console.log('ðŸ†• New social user detected -> profileCompleted = false');
      await setDoc(userRef, userData);
    } else {
      // Merge while preserving existing custom fields
      await setDoc(userRef, { ...existingData, ...userData });
    }

    console.log('User data saved to Firestore successfully');
  } catch (error) {
    console.error('Error saving user to Firestore:', error);
    throw error;
  }
};

// Sign out from social providers
export const signOutFromSocial = async () => {
  try {
    // 1) Clear Google session first so next login shows chooser
    try { await GoogleSignin.signOut(); } catch (_e) {}
    try { await GoogleSignin.revokeAccess(); console.log('ðŸ” Google access revoked'); } catch (_e) {}
    
    // 2) Log out from Facebook session
    try { await LoginManager.logOut(); } catch (_e) {}

    // 3) Finally sign out from Firebase
    try { await firebaseSignOut(auth); } catch (_e) {}
    
    return {
      success: true,
      message: 'ÄÄƒng xuáº¥t thÃ nh cÃ´ng!'
    };
  } catch (error) {
    console.error('Social sign out error:', error);
    return {
      success: false,
      message: 'Lá»—i khi Ä‘Äƒng xuáº¥t',
      error: error
    };
  }
};

