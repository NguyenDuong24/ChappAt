// Debug utility để kiểm tra user authentication và Firebase connection
import { useAuth } from '../context/authContext';
import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const useDebugUserInfo = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      console.log('🔍 DEBUG USER INFO:');
      console.log('  - User ID:', user.uid);
      console.log('  - User email:', user.email);
      console.log('  - User object:', user);
      
      // Test Firebase connection
      console.log('🔍 Testing Firebase connection...');
      const testQuery = query(
        collection(db, 'calls'),
        where('receiverId', '==', user.uid)
      );
      
      const unsubscribe = onSnapshot(testQuery, (snapshot) => {
        console.log('🔍 Firebase query result:', snapshot.docs.length, 'documents');
        snapshot.docs.forEach(doc => {
          console.log('🔍 Call document:', doc.id, doc.data());
        });
      }, (error) => {
        console.error('🔍 Firebase query error:', error);
      });
      
      return unsubscribe;
    }
  }, [user?.uid]);

  return { user };
};
