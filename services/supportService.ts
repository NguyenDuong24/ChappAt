import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export type FeedbackData = {
  rating: number;
  category: string;
  comment: string;
  contactInfo?: string;
};

export type ReportData = {
  targetType: 'user' | 'message' | 'group' | string;
  targetId: string;
  reason: string;
  description: string;
  reporterId?: string;
  images?: string[];
};

export async function submitFeedback(feedback: FeedbackData, user?: { uid?: string; email?: string; username?: string }) {
  const payload = {
    ...feedback,
    contactInfo: feedback.contactInfo || null,
    userId: user?.uid || null,
    userEmail: user?.email || null,
    username: user?.username || null,
    createdAt: serverTimestamp(),
    status: 'new',
    app: 'ChappAt',
    type: 'feedback',
  };
  await addDoc(collection(db, 'app_feedback'), payload);
}

export async function submitReport(report: ReportData, user?: { uid?: string; email?: string; username?: string }) {
  console.log('🔥 submitReport called with:', { report, user });

  // Check Firebase auth state
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  console.log('🔐 Firebase auth currentUser:', auth.currentUser);
  console.log('🔐 Firebase auth user ID:', auth.currentUser?.uid);

  const payload = {
    ...report,
    reporterId: user?.uid || report.reporterId || null,
    reporterEmail: user?.email || null,
    reporterName: user?.username || null,
    createdAt: serverTimestamp(),
    status: 'open',
    app: 'ChappAt',
    type: 'report',
    // Ensure images is always an array
    images: Array.isArray(report.images) ? report.images : [],
  };

  console.log('📝 Payload to save:', payload);

  try {
    const docRef = await addDoc(collection(db, 'app_reports'), payload);
    console.log('✅ Report saved with ID:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('❌ Error saving report:', error);
    throw error;
  }
}

export async function submitSupportRequest(message: string, email?: string | null, images?: string[], type?: 'support' | 'bug' | 'suggestion', user?: { uid?: string; email?: string; username?: string }) {
  console.log('🔥 submitSupportRequest called with:', { message, email, images, type, user });

  // Check Firebase auth state
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  console.log('🔐 Firebase auth currentUser:', auth.currentUser);
  console.log('🔐 Firebase auth user ID:', auth.currentUser?.uid);

  const payload = {
    message,
    contactEmail: email || user?.email || null,
    userId: user?.uid || null,
    username: user?.username || null,
    // Ensure images is always an array
    images: Array.isArray(images) ? images : [],
    type: type || 'support',
    createdAt: serverTimestamp(),
    status: 'new',
    app: 'ChappAt',
    requestType: 'support_request',
  };

  console.log('📝 Payload to save:', payload);

  try {
    const docRef = await addDoc(collection(db, 'app_support_requests'), payload);
    console.log('✅ Support request saved with ID:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('❌ Error saving support request:', error);
    throw error;
  }
}
