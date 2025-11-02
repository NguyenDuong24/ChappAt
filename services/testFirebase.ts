import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const testFirebaseConnection = async () => {
  try {
    console.log('🔥 Testing Firebase connection...');

    // Check auth state
    const auth = getAuth();
    console.log('🔐 Auth current user:', auth.currentUser);

    // Try to add a test document
    const testData = {
      test: true,
      timestamp: serverTimestamp(),
      message: 'Test report submission'
    };

    console.log('📝 Attempting to add test document...');
    const docRef = await addDoc(collection(db, 'app_reports'), testData);
    console.log('✅ Test document added with ID:', docRef.id);

    return { success: true, docId: docRef.id };
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    return { success: false, error };
  }
};
