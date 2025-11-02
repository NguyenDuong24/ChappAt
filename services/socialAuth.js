import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
// Removed Facebook SDK - no longer needed
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from 'firebase/auth';

// Google Sign-In Configuration
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '256923005911-70tma6mbfguvjmpota9ia5adm457dinf.apps.googleusercontent.com', // Web client ID từ google-services.json
    iosClientId: '256923005911-m2j0sqfikfi21dor3mjo0rlnehe7p4a1.apps.googleusercontent.com', // iOS client ID từ file bạn vừa gửi
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
    console.log('🔍 Starting Google Sign-In... forceChooser=', forceChooser);

    configureGoogleSignIn();

    // Force choose account: clear any cached Google session so chooser appears
    if (forceChooser) {
      try {
        // Clear Google session regardless of current state
        try { await GoogleSignin.signOut(); } catch (_e) {}
        try { await GoogleSignin.revokeAccess(); } catch (_e) {}
        // Ensure Firebase is signed out
        if (auth.currentUser) {
          console.log('🔄 Signing out Firebase user to force fresh auth state');
          await firebaseSignOut(auth);
        }
      } catch (preErr) {
        console.log('⚠️ Pre sign-out error (can ignore):', preErr?.message || preErr);
      }
    }

    console.log('🔍 Checking Google Play Services...');
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    console.log('🔍 Attempting Google Sign-In...');
    const signInResult = await GoogleSignin.signIn();
    console.log('🔍 Raw Google signIn result keys:', Object.keys(signInResult || {}));
    console.log('🔍 signInResult.user:', signInResult?.user);
    console.log('🔍 signInResult.idToken present?', !!signInResult?.idToken);

    let { user } = signInResult || {};
    let idToken = signInResult?.idToken;

    // Fallback: try to explicitly fetch tokens if idToken missing
    if (!idToken) {
      console.log('⚠️ idToken missing from signInResult, attempting GoogleSignin.getTokens() fallback...');
      try {
        const tokens = await GoogleSignin.getTokens();
        console.log('🔍 getTokens() keys:', Object.keys(tokens || {}));
        if (tokens?.idToken) {
          idToken = tokens.idToken;
          console.log('✅ Retrieved idToken via getTokens()');
        } else {
          console.log('❌ getTokens() did not return idToken');
        }
      } catch (tokenErr) {
        console.log('❌ Error calling getTokens():', tokenErr?.message || tokenErr);
      }
    }

    // Final guard
    if (!idToken) {
      throw new Error('No ID token received from Google Sign-In (after fallback). Check webClientId & SHA-1.');
    }

    console.log('✅ Google Sign-In successful, user:', user?.name || user?.email || 'Unknown');
    console.log('🔍 Creating Google credential (modular SDK)...');
    const googleCredential = GoogleAuthProvider.credential(idToken);
    console.log('🔍 Signing in with Firebase (modular auth)...');
    const userCredential = await signInWithCredential(auth, googleCredential);
    console.log('🔍 Saving user to Firestore...');
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
    console.log('✅ Google Sign-In complete!');
    return {
      success: true,
      user: userCredential.user,
      message: 'Đăng nhập Google thành công!'
    };
  } catch (error) {
    // Handle cancel explicitly BEFORE other logic
    if (error?.code === statusCodes.SIGN_IN_CANCELLED || error?.code === 'sign_in_cancelled' || error?.code === '-5') {
      console.log('🚫 User cancelled Google Sign-In');
      return {
        success: false,
        cancelled: true,
        message: 'Đăng nhập đã bị hủy'
      };
    }
    console.error('Google Sign-In Error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    
    let errorMessage = 'Đăng nhập Google thất bại';
    
    // Kiểm tra nếu error có thuộc tính code
    if (error && error.code) {
      switch (error.code) {
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'Tài khoản đã tồn tại với phương thức đăng nhập khác';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Thông tin đăng nhập không hợp lệ';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Đăng nhập Google chưa được kích hoạt';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Tài khoản đã bị vô hiệu hóa';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Không tìm thấy tài khoản';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Mật khẩu không đúng';
          break;
        case 'sign_in_required':
          errorMessage = 'Cần đăng nhập lại';
          break;
        case 'network_error':
          errorMessage = 'Lỗi kết nối mạng';
          break;
        case '12501': // Google Sign-In error (usually config issue)
          errorMessage = 'Lỗi cấu hình Google Sign-In. Kiểm tra SHA-1 fingerprint';
          break;
        case '10': // Developer error
          errorMessage = 'Lỗi cấu hình developer. Kiểm tra Client ID';
          break;
        default:
          errorMessage = `Lỗi Google Sign-In: ${error.code}`;
      }
    } else if (error && error.message) {
      if (error.message.includes('DEVELOPER_ERROR')) {
        errorMessage = 'Lỗi cấu hình Google Sign-In. Kiểm tra Client ID và SHA-1';
      } else if (error.message.includes('No ID token')) {
        errorMessage = 'Không nhận được token từ Google. Kiểm tra webClientId (type 3) & SHA-1';
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
    console.log('🔍 Starting Facebook Sign-In...');
    
    // Check current access token
    const currentToken = await AccessToken.getCurrentAccessToken();
    console.log('🔍 Current Facebook token:', currentToken ? 'exists' : 'none');
    
    // Attempt login with permissions
    console.log('🔍 Requesting Facebook permissions...');
    const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
    console.log('🔍 Facebook login result:', result);
    
    if (result.isCancelled) {
      console.log('❌ Facebook login cancelled by user');
      return {
        success: false,
        message: 'Đăng nhập Facebook đã bị hủy'
      };
    }
    
    // Once signed in, get the users AccessToken
    console.log('🔍 Getting Facebook access token...');
    const data = await AccessToken.getCurrentAccessToken();
    console.log('🔍 Facebook access token:', data ? 'obtained' : 'failed');
    
    if (!data) {
      console.log('❌ No Facebook access token');
      return {
        success: false,
        message: 'Không thể lấy token Facebook'
      };
    }
    
    // Create a Facebook credential with the AccessToken (modular SDK)
    console.log('🔍 Creating Facebook credential (modular SDK)...');
    const facebookCredential = FacebookAuthProvider.credential(data.accessToken);
    
    // Sign-in the user with the credential (modular SDK)
    console.log('🔍 Signing in with Firebase (modular auth)...');
    const userCredential = await signInWithCredential(auth, facebookCredential);
    
    // Get additional user info from Facebook Graph API
    console.log('🔍 Getting Facebook user info...');
    const userInfo = await getUserInfoFromFacebook(data.accessToken);
    
    // Save user data to Firestore
    console.log('🔍 Saving user to Firestore...');
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
    console.log('✅ Facebook Sign-In complete!');
    return {
      success: true,
      user: userCredential.user,
      message: 'Đăng nhập Facebook thành công!'
    };
  } catch (error) {
    console.error('Facebook Sign-In Error:', error);
    
    let errorMessage = 'Đăng nhập Facebook thất bại';
    
    // Kiểm tra nếu error có thuộc tính code
    if (error && error.code) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'Tài khoản đã tồn tại với phương thức đăng nhập khác';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Thông tin đăng nhập Facebook không hợp lệ';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Đăng nhập Facebook chưa được kích hoạt';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Tài khoản đã bị vô hiệu hóa';
      }
    } else if (error && error.message) {
      if (error.message.includes('not available')) {
        errorMessage = 'Facebook Login chưa được cấu hình đúng';
      } else if (error.message.includes('cancelled')) {
        errorMessage = 'Đăng nhập Facebook đã bị hủy';
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
      console.log('🆕 New social user detected -> profileCompleted = false');
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
    try { await GoogleSignin.revokeAccess(); console.log('🔐 Google access revoked'); } catch (_e) {}
    
    // 2) Log out from Facebook session
    try { await LoginManager.logOut(); } catch (_e) {}

    // 3) Finally sign out from Firebase
    try { await firebaseSignOut(auth); } catch (_e) {}
    
    return {
      success: true,
      message: 'Đăng xuất thành công!'
    };
  } catch (error) {
    console.error('Social sign out error:', error);
    return {
      success: false,
      message: 'Lỗi khi đăng xuất',
      error: error
    };
  }
};
