// Test Firebase connection
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  console.log('🧪 Testing Firebase connection...');
  
  try {
    // Test write
    console.log('🧪 Testing write to test collection...');
    const testDoc = await addDoc(collection(db, 'test'), {
      message: 'Hello from test',
      timestamp: serverTimestamp(),
    });
    console.log('✅ Test document written with ID:', testDoc.id);
    
    // Test read
    console.log('🧪 Testing read from test collection...');
    const snapshot = await getDocs(collection(db, 'test'));
    console.log('✅ Test documents read, count:', snapshot.size);
    
    snapshot.forEach(doc => {
      console.log('📄 Test doc:', doc.id, doc.data());
    });
    
    return true;
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    return false;
  }
};
