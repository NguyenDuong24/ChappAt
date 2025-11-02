/**
 * Node.js script để import sample HotSpots data vào Firebase
 * 
 * Cách chạy:
 * 1. npm install firebase
 * 2. node scripts/importHotSpotsDataNode.js
 * 3. Để xóa data cũ trước khi import: node scripts/importHotSpotsDataNode.js --clear
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, deleteDoc } = require('firebase/firestore');

// Firebase config - giống với config trong app
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

// Sample HotSpots data với hình ảnh đẹp từ Unsplash
const sampleHotSpots = [
  {
    title: 'Lễ hội Âm nhạc EDM Festival 2025',
    description: 'Đêm nhạc EDM hoành tráng nhất Sài Gòn với các DJ hàng đầu thế giới. Tham gia cùng hàng nghìn người yêu nhạc điện tử trong không gian âm thanh đỉnh cao.',
    category: 'music',
    type: 'event',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
    location: 'Landmark 81, Quận 1, TP.HCM',
    participants: 1250,
    maxParticipants: 5000,
    startTime: '2025-10-15T20:00:00Z',
    endTime: '2025-10-16T02:00:00Z',
    price: 500000,
    rating: 4.8,
    tags: ['EDM', 'DJ', 'Nightlife', 'Party', 'Music Festival'],
    isPopular: true,
    isNew: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Food Court Cao cấp Saigon Premium',
    description: 'Khu ẩm thực tập hợp các món ngon từ khắp thế giới. Từ sushi Nhật Bản đến pasta Ý, từ dimsum Trung Hoa đến bánh mì Việt Nam.',
    category: 'food',
    type: 'place',
    imageUrl: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=800&q=80',
    location: 'Vincom Center, Quận 1, TP.HCM',
    participants: 850,
    startTime: '2025-09-25T10:00:00Z',
    rating: 4.6,
    tags: ['Food', 'Restaurant', 'Luxury', 'International Cuisine'],
    isPopular: false,
    isNew: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Triển lãm Nghệ thuật Đương đại',
    description: 'Trưng bày các tác phẩm nghệ thuật hiện đại của các họa sĩ nổi tiếng trong nước và quốc tế. Khám phá những xu hướng nghệ thuật mới nhất.',
    category: 'art',
    type: 'event',
    imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
    location: 'Thảo Điền, Quận 2, TP.HCM',
    participants: 320,
    maxParticipants: 500,
    startTime: '2025-9-01T09:00:00Z',
    endTime: '2025-10-31T18:00:00Z',
    rating: 4.9,
    tags: ['Art', 'Exhibition', 'Culture', 'Contemporary Art'],
    isPopular: false,
    isNew: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Tech Meetup - AI & Blockchain Summit',
    description: 'Gặp gỡ các chuyên gia công nghệ, thảo luận về AI và Blockchain. Cơ hội tuyệt vời để networking và học hỏi từ những người dẫn đầu trong ngành.',
    category: 'technology',
    type: 'event',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    location: 'Bitexco Tower, Quận 1, TP.HCM',
    participants: 180,
    maxParticipants: 300,
    startTime: '2025-09-30T14:00:00Z',
    endTime: '2025-09-30T18:00:00Z',
    rating: 4.7,
    tags: ['Technology', 'AI', 'Blockchain', 'Networking', 'Innovation'],
    isPopular: false,
    isNew: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Saigon Rooftop Bar & Lounge',
    description: 'Bar trên tầng thượng với view toàn cảnh thành phố. Thưởng thức cocktail cao cấp trong không gian sang trọng và lãng mạn với view 360 độ.',
    category: 'nightlife',
    type: 'place',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    location: 'Lotte Tower, Quận 1, TP.HCM',
    participants: 420,
    startTime: '2025-09-23T18:00:00Z',
    rating: 4.5,
    tags: ['Bar', 'Cocktail', 'Rooftop', 'City View', 'Nightlife'],
    isPopular: true,
    isNew: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Giải Bóng đá Mini Cup 2025',
    description: 'Giải đấu bóng đá mini dành cho các đội nghiệp dư. Tham gia cùng bạn bè trong không khí sôi động và thể thao. Giải thưởng hấp dẫn cho các đội thắng cuộc.',
    category: 'sports',
    type: 'event',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
    location: 'Sân vận động Thống Nhất, Quận 1, TP.HCM',
    participants: 64,
    maxParticipants: 128,
    startTime: '2025-10-05T08:00:00Z',
    endTime: '2025-10-05T18:00:00Z',
    price: 200000,
    rating: 4.4,
    tags: ['Football', 'Sports', 'Tournament', 'Team Building'],
    isPopular: false,
    isNew: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Barista Coffee Workshop - Latte Art Masterclass',
    description: 'Học cách pha chế coffee chuyên nghiệp và vẽ latte art đẹp mắt. Workshop dành cho những người yêu thích coffee và muốn trở thành barista.',
    category: 'food',
    type: 'event',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    location: 'The Coffee House, Quận 3, TP.HCM',
    participants: 15,
    maxParticipants: 20,
    startTime: '2025-09-28T14:00:00Z',
    endTime: '2025-09-28T17:00:00Z',
    price: 350000,
    rating: 4.8,
    tags: ['Coffee', 'Workshop', 'Latte Art', 'Skill Learning', 'Barista'],
    isPopular: false,
    isNew: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Sunrise Yoga & Fitness Morning Session',
    description: 'Buổi tập yoga và fitness buổi sáng tại công viên. Bắt đầu ngày mới với năng lượng tích cực cùng cộng đồng yêu thể thao và cuộc sống healthy.',
    category: 'sports',
    type: 'event',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    location: 'Công viên Tao Đàn, Quận 1, TP.HCM',
    participants: 45,
    maxParticipants: 60,
    startTime: '2025-09-26T06:00:00Z',
    endTime: '2025-09-26T08:00:00Z',
    rating: 4.6,
    tags: ['Yoga', 'Fitness', 'Morning', 'Health', 'Outdoor'],
    isPopular: true,
    isNew: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Elite Gaming Lounge VIP Experience',
    description: 'Phòng game cao cấp với setup PC gaming đỉnh cao. Trải nghiệm gaming tuyệt vời với bạn bè trong không gian hiện đại với RTX 4090 và màn hình 4K.',
    category: 'technology',
    type: 'place',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
    location: 'Diamond Plaza, Quận 1, TP.HCM',
    participants: 95,
    startTime: '2025-09-23T12:00:00Z',
    rating: 4.3,
    tags: ['Gaming', 'PC', 'VIP', 'Entertainment', 'Technology', 'Esports'],
    isPopular: false,
    isNew: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Saigon Street Art Walking Discovery Tour',
    description: 'Tour khám phá nghệ thuật đường phố Sài Gòn. Tìm hiểu câu chuyện đằng sau những bức tranh tường nghệ thuật và gặp gỡ các street artist.',
    category: 'art',
    type: 'event',
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80',
    location: 'Quận 1 - Quận 3, TP.HCM',
    participants: 25,
    maxParticipants: 30,
    startTime: '2025-09-29T16:00:00Z',
    endTime: '2025-09-29T19:00:00Z',
    price: 150000,
    rating: 4.7,
    tags: ['Street Art', 'Walking Tour', 'Culture', 'Photography'],
    isPopular: true,
    isNew: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Michelin Star Dining Experience',
    description: 'Trải nghiệm ẩm thực đẳng cấp Michelin với set menu 7 món do chef nổi tiếng thế giới chế biến. Không gian sang trọng, dịch vụ hoàn hảo.',
    category: 'food',
    type: 'place',
    imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    location: 'EON Restaurant, Quận 1, TP.HCM',
    participants: 120,
    startTime: '2025-09-24T19:00:00Z',
    price: 2500000,
    rating: 4.9,
    tags: ['Fine Dining', 'Michelin', 'Luxury', 'Chef Special', 'Premium'],
    isPopular: true,
    isNew: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    title: 'Blockchain & Crypto Trading Workshop',
    description: 'Học cách đầu tư và trading cryptocurrency một cách an toàn. Workshop được dẫn dắt bởi các chuyên gia tài chính và blockchain developers.',
    category: 'technology',
    type: 'event',
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80',
    location: 'Saigon Innovation Hub, Quận 2, TP.HCM',
    participants: 85,
    maxParticipants: 100,
    startTime: '2025-10-08T13:00:00Z',
    endTime: '2025-10-08T17:00:00Z',
    price: 800000,
    rating: 4.5,
    tags: ['Blockchain', 'Cryptocurrency', 'Trading', 'Investment', 'Finance'],
    isPopular: false,
    isNew: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
].map((h, idx) => {
  const now = new Date().toISOString();
  const base = {
    ...h,
    isActive: true,
    isFeatured: Boolean(h.isPopular),
    createdAt: h.createdAt || now,
    updatedAt: h.updatedAt || now,
    images: h.imageUrl ? [h.imageUrl] : (h.images || []),
    thumbnail: h.imageUrl || h.thumbnail || (h.images && h.images[0]) || '',
    stats: {
      interested: 0,
      joined: h.participants || 0,
      checkedIn: 0,
      rating: typeof h.rating === 'number' ? h.rating : 0,
      reviewCount: 0,
    },
    location: typeof h.location === 'string' ? {
      address: h.location,
      city: 'HCM',
      coordinates: { latitude: 10.776, longitude: 106.700 }
    } : h.location,
  };

  if (h.type === 'event') {
    // Ensure we always have both start and end times
    const startISO = h.startTime || now;
    let endISO = h.endTime || startISO;
    if (!h.endTime) {
      try {
        const start = new Date(startISO);
        endISO = new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString(); // default +4h
      } catch {
        endISO = startISO;
      }
    }

    const eventInfo = {
      startDate: startISO,
      endDate: endISO,
      organizer: 'system',
      currentParticipants: h.participants || 0,
    };
    if (typeof h.price === 'number') eventInfo.price = h.price;
    if (typeof h.maxParticipants === 'number') eventInfo.maxParticipants = h.maxParticipants;

    // Also expose at top-level for easy querying/consumption
    return { ...base, eventInfo, endDate: endISO, endsAt: endISO };
  }

  return base;
});

// Function để clear existing data (optional)
async function clearExistingData() {
  try {
    console.log('🗑️ Clearing existing HotSpots data...');
    const querySnapshot = await getDocs(collection(db, 'hotSpots'));
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`✅ Cleared ${querySnapshot.docs.length} existing records`);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
}

// Function để import data
async function importHotSpotsData() {
  try {
    console.log('🔥 HOTSPOTS DATA IMPORT TOOL 🔥');
    console.log('===================================');
    console.log('📦 Starting HotSpots data import...');
    
    // Optional: Clear existing data first
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      await clearExistingData();
    }
    
    console.log(`📥 Importing ${sampleHotSpots.length} HotSpots...`);
    console.log('');
    
    // Import all hotspots with progress tracking
    for (let i = 0; i < sampleHotSpots.length; i++) {
      const hotspot = sampleHotSpots[i];
      try {
        const docRef = await addDoc(collection(db, 'hotSpots'), hotspot);
        const progress = Math.round(((i + 1) / sampleHotSpots.length) * 100);
        console.log(`✅ [${i + 1}/${sampleHotSpots.length}] (${progress}%) Added: ${hotspot.title}`);
        console.log(`   📍 Location: ${hotspot.location}`);
        console.log(`   🏷️  Category: ${hotspot.category} | Type: ${hotspot.type}`);
        console.log(`   👥 Participants: ${hotspot.participants}${hotspot.maxParticipants ? `/${hotspot.maxParticipants}` : ''}`);
        console.log(`   ⭐ Rating: ${hotspot.rating} | Tags: ${hotspot.tags.slice(0, 3).join(', ')}`);
        if (hotspot.price) {
          console.log(`   💰 Price: ${hotspot.price.toLocaleString()} VND`);
        }
        console.log('   ---');
      } catch (error) {
        console.error(`❌ [${i + 1}/${sampleHotSpots.length}] Failed to add ${hotspot.title}:`, error);
        throw error;
      }
    }
    
    console.log('\n🎉 IMPORT COMPLETED SUCCESSFULLY! 🎉');
    console.log('====================================');
    console.log(`📊 Total imported: ${sampleHotSpots.length} HotSpots`);
    console.log('');
    console.log('📋 Import Summary:');
    console.log(`   🎪 Events: ${sampleHotSpots.filter(h => h.type === 'event').length}`);
    console.log(`   🏢 Places: ${sampleHotSpots.filter(h => h.type === 'place').length}`);
    console.log(`   🔥 Popular: ${sampleHotSpots.filter(h => h.isPopular).length}`);
    console.log(`   🆕 New: ${sampleHotSpots.filter(h => h.isNew).length}`);
    console.log(`   💰 Paid events: ${sampleHotSpots.filter(h => h.price).length}`);
    
    // Group by category
    const categorySummary = sampleHotSpots.reduce((acc, h) => {
      acc[h.category] = (acc[h.category] || 0) + 1;
      return acc;
    }, {});
    
    console.log('');
    console.log('📊 Categories Distribution:');
    Object.entries(categorySummary).forEach(([category, count]) => {
      const emoji = {
        'music': '🎵',
        'food': '🍴',
        'art': '🎨',
        'technology': '💻',
        'nightlife': '🍸',
        'sports': '⚽'
      }[category] || '📂';
      console.log(`   ${emoji} ${category}: ${count} items`);
    });
    
    console.log('');
    console.log('🔥 Data is ready to use in your ChappAt app!');
    console.log('🚀 Run your app and navigate to HotSpots to see the results');
    console.log('');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  console.log('');
  console.log('🔥🔥🔥 CHAPAPAT HOTSPOTS IMPORTER 🔥🔥🔥');
  console.log('');
  
  await importHotSpotsData();
  
  console.log('👋 Import script finished successfully!');
  console.log('💡 Tip: Use --clear flag to remove existing data before import');
  process.exit(0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

// Run the script
main().catch((error) => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
