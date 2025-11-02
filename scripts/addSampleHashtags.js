// Script để thêm hashtags mẫu vào Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// Firebase config từ project của bạn
const firebaseConfig = {
  // Thay đổi config này theo project của bạn
  apiKey: "your-api-key",
  authDomain: "dating-app-1bb49.firebaseapp.com",
  projectId: "dating-app-1bb49",
  storageBucket: "dating-app-1bb49.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addSampleHashtags() {
  console.log('🚀 Adding sample hashtags to Firestore...');
  
  const sampleHashtags = [
    { tag: '#Dating', count: 2150, posts: ['post1', 'post2', 'post3'] },
    { tag: '#Love', count: 1890, posts: ['post4', 'post5'] },
    { tag: '#Romance', count: 1234, posts: ['post6', 'post7', 'post8', 'post9'] },
    { tag: '#Weekend', count: 987, posts: ['post10', 'post11'] },
    { tag: '#Coffee', count: 756, posts: ['post12'] },
    { tag: '#Music', count: 654, posts: ['post13', 'post14', 'post15'] },
    { tag: '#Travel', count: 543, posts: ['post16', 'post17'] },
    { tag: '#Food', count: 432, posts: ['post18'] },
    { tag: '#Fitness', count: 321, posts: ['post19', 'post20'] },
    { tag: '#Photography', count: 210, posts: ['post21'] },
  ];

  try {
    const hashtagsRef = collection(db, 'hashtags');
    
    for (const hashtag of sampleHashtags) {
      const docData = {
        ...hashtag,
        lastUsed: Timestamp.now(),
        createdAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(hashtagsRef, docData);
      console.log(`✅ Added hashtag ${hashtag.tag} with ID: ${docRef.id}`);
    }
    
    console.log('🎉 All sample hashtags added successfully!');
  } catch (error) {
    console.error('❌ Error adding hashtags:', error);
  }
}

// Uncomment dòng dưới để chạy script
// addSampleHashtags();
