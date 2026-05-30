import { sendEmailVerification } from 'firebase/auth';

const ANDROID_PACKAGE = process.env.EXPO_PUBLIC_ANDROID_PACKAGE_NAME || 'saigondating.com.vn';
const IOS_BUNDLE_ID = process.env.EXPO_PUBLIC_IOS_BUNDLE_ID || 'saigondating.com.vn';

function isHttpsUrl(value) {
  return typeof value === 'string' && /^https:\/\//i.test(value.trim());
}

export function getEmailVerificationActionCodeSettings() {
  const continueUrl = process.env.EXPO_PUBLIC_EMAIL_VERIFY_CONTINUE_URL;

  if (!isHttpsUrl(continueUrl)) {
    return undefined;
  }

  return {
    url: continueUrl.trim(),
    handleCodeInApp: false,
    android: {
      packageName: ANDROID_PACKAGE,
      installApp: true,
    },
    iOS: {
      bundleId: IOS_BUNDLE_ID,
    },
  };
}

export async function sendProductionEmailVerification(user) {
  if (!user) {
    throw new Error('Missing Firebase user for email verification');
  }

  const auth = user.auth;
  if (auth) {
    auth.languageCode = 'vi';
  }

  return sendEmailVerification(user, getEmailVerificationActionCodeSettings());
}
