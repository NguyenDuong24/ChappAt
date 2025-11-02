// Script để tạo data mẫu Hot Spots trong Firebase
// Chạy script này để thêm dữ liệu mẫu vào Firestore

import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const sampleHotSpots = [
  {
    title: "Lễ hội âm nhạc EDM 2025",
    description: "Đêm nhạc điện tử hoành tráng với những DJ hàng đầu thế giới. Không gian âm nhạc đỉnh cao với hệ thống âm thanh và ánh sáng chuyên nghiệp.",
    type: "event",
    category: "music",
    location: {
      address: "Công viên Tao Đàn, Quận 1, TP.HCM",
      coordinates: {
        latitude: 10.7831,
        longitude: 106.6934
      },
      city: "Hồ Chí Minh",
      district: "Quận 1"
    },
    eventInfo: {
      startDate: "2025-12-15T19:00:00.000Z",
      endDate: "2025-12-15T23:30:00.000Z",
      organizer: "EDM Entertainment",
      price: 500000,
      maxParticipants: 5000,
      currentParticipants: 1250
    },
    images: [
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400",
    stats: {
      interested: 1250,
      joined: 850,
      checkedIn: 0,
      rating: 4.8,
      reviewCount: 245
    },
    tags: ["EDM", "nhạc điện tử", "DJ", "đêm nhạc", "vui chơi"],
    isActive: true,
    isFeatured: true,
    createdBy: "admin_001"
  },
  
  {
    title: "Food Court Nguyễn Huệ",
    description: "Khu ẩm thực đường phố nổi tiếng với hơn 50 món ăn đặc sắc từ khắp miền. Không gian thoáng mát, phục vụ 24/7.",
    type: "place",
    category: "food",
    location: {
      address: "Đường Nguyễn Huệ, Quận 1, TP.HCM",
      coordinates: {
        latitude: 10.7743,
        longitude: 106.7042
      },
      city: "Hồ Chí Minh",
      district: "Quận 1"
    },
    images: [
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
    stats: {
      interested: 850,
      joined: 1200,
      checkedIn: 2150,
      rating: 4.5,
      reviewCount: 892
    },
    tags: ["ăn uống", "street food", "24h", "đa dạng", "phố đi bộ"],
    isActive: true,
    isFeatured: true,
    createdBy: "admin_001"
  },

  {
    title: "Giải bóng đá phong trào Sài Gòn Cup",
    description: "Giải đấu bóng đá phong trào lớn nhất thành phố với sự tham gia của 64 đội. Cơ hội kết nối và thể hiện tài năng.",
    type: "event",
    category: "sports",
    location: {
      address: "Sân vận động Thống Nhất, Quận 10, TP.HCM",
      coordinates: {
        latitude: 10.7692,
        longitude: 106.6639
      },
      city: "Hồ Chí Minh",
      district: "Quận 10"
    },
    eventInfo: {
      startDate: "2025-10-01T07:00:00.000Z",
      endDate: "2025-10-31T18:00:00.000Z",
      organizer: "Sài Gòn Sports Club",
      price: 0,
      maxParticipants: 1500,
      currentParticipants: 1280
    },
    images: [
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400",
    stats: {
      interested: 980,
      joined: 1280,
      checkedIn: 450,
      rating: 4.7,
      reviewCount: 156
    },
    tags: ["bóng đá", "phong trào", "thể thao", "kết nối", "miễn phí"],
    isActive: true,
    isFeatured: false,
    createdBy: "admin_002"
  },

  {
    title: "Triển lãm nghệ thuật đương đại",
    description: "Không gian trưng bày tác phẩm của 30 họa sĩ trẻ Việt Nam. Khám phá xu hướng nghệ thuật mới và độc đáo.",
    type: "event",
    category: "art",
    location: {
      address: "Nhà Văn hóa Thanh niên, Quận 1, TP.HCM",
      coordinates: {
        latitude: 10.7756,
        longitude: 106.7019
      },
      city: "Hồ Chí Minh",
      district: "Quận 1"
    },
    eventInfo: {
      startDate: "2025-11-05T09:00:00.000Z",
      endDate: "2025-11-25T21:00:00.000Z",
      organizer: "Art Space Vietnam",
      price: 50000,
      maxParticipants: 200,
      currentParticipants: 89
    },
    images: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800",
      "https://images.unsplash.com/photo-1577720643272-265f5d809ae0?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
    stats: {
      interested: 450,
      joined: 89,
      checkedIn: 12,
      rating: 4.9,
      reviewCount: 67
    },
    tags: ["nghệ thuật", "triển lãm", "đương đại", "văn hóa", "sáng tạo"],
    isActive: true,
    isFeatured: false,
    createdBy: "admin_001"
  },

  {
    title: "Sky Bar Rooftop Bitexco",
    description: "Quầy bar trên cao với view toàn cảnh thành phố tuyệt đẹp. Thưởng thức cocktail và âm nhạc chill trong không gian sang trọng.",
    type: "place",
    category: "nightlife",
    location: {
      address: "Tầng 50, Bitexco Financial Tower, Quận 1, TP.HCM",
      coordinates: {
        latitude: 10.7718,
        longitude: 106.7045
      },
      city: "Hồ Chí Minh",
      district: "Quận 1"
    },
    images: [
      "https://images.unsplash.com/photo-1574484284002-952d92456975?w=800",
      "https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400",
    stats: {
      interested: 1150,
      joined: 890,
      checkedIn: 1200,
      rating: 4.6,
      reviewCount: 456
    },
    tags: ["rooftop", "view đẹp", "cocktail", "sang trọng", "chill"],
    isActive: true,
    isFeatured: true,
    createdBy: "admin_003"
  },

  {
    title: "Workshop nhiếp ảnh đường phố",
    description: "Khóa học nhiếp ảnh street photography với photographer chuyên nghiệp. Học cách bắt trọn khoảnh khắc cuộc sống.",
    type: "event",
    category: "art",
    location: {
      address: "Quận 1, TP.HCM (Di chuyển nhiều địa điểm)",
      coordinates: {
        latitude: 10.7769,
        longitude: 106.7009
      },
      city: "Hồ Chí Minh",
      district: "Quận 1"
    },
    eventInfo: {
      startDate: "2025-10-20T08:00:00.000Z",
      endDate: "2025-10-20T17:00:00.000Z",
      organizer: "Saigon Photography Club",
      price: 300000,
      maxParticipants: 20,
      currentParticipants: 15
    },
    images: [
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800",
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"
    ],
    thumbnail: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400",
    stats: {
      interested: 185,
      joined: 15,
      checkedIn: 0,
      rating: 4.8,
      reviewCount: 23
    },
    tags: ["nhiếp ảnh", "street photography", "workshop", "học hỏi", "sáng tạo"],
    isActive: true,
    isFeatured: false,
    createdBy: "admin_002"
  }
];

export const createSampleHotSpots = async () => {
  try {
    console.log('🔥 Creating sample Hot Spots data...');
    
    const hotSpotsCollection = collection(db, 'hotSpots');
    
    for (const hotSpot of sampleHotSpots) {
      const docData = {
        ...hotSpot,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(hotSpotsCollection, docData);
      console.log(`✅ Created Hot Spot: ${hotSpot.title} (ID: ${docRef.id})`);
    }
    
    console.log('🎉 All sample Hot Spots created successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error creating sample Hot Spots:', error);
    return false;
  }
};

// Uncomment the line below to run the script
// createSampleHotSpots();
