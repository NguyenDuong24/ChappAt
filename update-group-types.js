const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase/firestore');

// Firebase config - copy from your firebaseConfig.js
const firebaseConfig = {
  apiKey: "AIzaSyB6_mW_v1F-KD8CpNOVgb03RIxxxmFsgJM",
  authDomain: "dating-app-1bb49.firebaseapp.com",
  projectId: "dating-app-1bb49",
  storageBucket: "dating-app-1bb49.appspot.com",
  messagingSenderId: "256923005911",
  appId: "1:256923005911:web:2d5db10af299cf70315192"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateGroupTypes() {
  try {
    console.log('Starting to update group types...');

    const groupsRef = collection(db, 'groups');
    const snapshot = await getDocs(groupsRef);

    let updatedCount = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      // If type is not set, default to 'private'
      if (!data.type) {
        console.log(`Updating group ${docSnap.id} (${data.name}) to type: private`);

        await updateDoc(doc(db, 'groups', docSnap.id), {
          type: 'private',
          isSearchable: false // private groups shouldn't be searchable
        });

        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} groups with default type 'private'`);

  } catch (error) {
    console.error('Error updating groups:', error);
  }
}

updateGroupTypes();
