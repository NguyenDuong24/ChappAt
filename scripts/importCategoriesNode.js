/**
 * Node.js script to import categories into Firebase Firestore
 * Usage:
 *  - npm --prefix scripts run import:categories
 *  - npm --prefix scripts run import:categories:clear
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  setDoc, 
  doc 
} = require('firebase/firestore');

// Firebase config - same as in app
const firebaseConfig = {
  apiKey: "AIzaSyB6_mW_v1F-KD8CpNOVgb03RIxxxmFsgJM",
  authDomain: "dating-app-1bb49.firebaseapp.com",
  projectId: "dating-app-1bb49",
  storageBucket: "dating-app-1bb49.appspot.com",
  messagingSenderId: "256923005911",
  appId: "1:256923005911:web:2d5db10af299cf70315192"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Categories to import (ids must match hotspot.category values)
const categories = [
  { id: 'music', name: 'Âm nhạc', icon: 'musical-notes', color: '#8B5CF6' },
  { id: 'food', name: 'Ẩm thực', icon: 'restaurant', color: '#10B981' },
  { id: 'sports', name: 'Thể thao', icon: 'fitness', color: '#EF4444' },
  { id: 'art', name: 'Nghệ thuật', icon: 'color-palette', color: '#F59E0B' },
  { id: 'nightlife', name: 'Giải trí', icon: 'wine', color: '#EC4899' },
  { id: 'technology', name: 'Công nghệ', icon: 'hardware-chip', color: '#3B82F6' },
  { id: 'travel', name: 'Du lịch', icon: 'airplane', color: '#06B6D4' },
  { id: 'outdoor', name: 'Ngoài trời', icon: 'leaf', color: '#22C55E' },
  { id: 'education', name: 'Giáo dục', icon: 'school', color: '#6366F1' },
];

async function clearExistingCategories() {
  console.log('🗑️ Clearing existing categories...');
  const snapshot = await getDocs(collection(db, 'categories'));
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  console.log(`✅ Cleared ${snapshot.docs.length} categories`);
}

async function importCategories() {
  console.log('🎯 Importing categories...');
  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    const now = new Date().toISOString();
    await setDoc(doc(db, 'categories', c.id), {
      name: c.name,
      icon: c.icon,
      color: c.color,
      order: i,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    });
    console.log(`✅ [${i + 1}/${categories.length}] Upserted: ${c.id} - ${c.name}`);
  }
  console.log('🎉 Categories import completed!');
}

async function main() {
  const shouldClear = process.argv.includes('--clear');
  console.log('🔥 CHAPAPAT CATEGORIES IMPORTER');
  if (shouldClear) {
    await clearExistingCategories();
  }
  await importCategories();
  console.log('🚀 Done');
}

process.on('unhandledRejection', (err) => {
  console.error('💥 UnhandledRejection:', err);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('💥 UncaughtException:', err);
  process.exit(1);
});

main();
