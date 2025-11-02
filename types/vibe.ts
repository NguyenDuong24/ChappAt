// Vibe types and interfaces for dating app
export interface Vibe {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  category:
    | 'mood'
    | 'activity'
    | 'energy'
    | 'romantic'
    | 'sports'
    | 'games'
    | 'outdoor'
    | 'indoor'
    | 'food'
    | 'music'
    | 'fitness'
    | 'study'
    | 'travel'
    | 'social'
    | 'creative'
    | 'relax'
    | 'pets'
    | 'nightlife'
    | 'work';
}

export interface UserVibe {
  id: string;
  userId: string;
  vibeId: string;
  vibe: Vibe;
  customMessage?: string;
  createdAt: any;
  expiresAt: any;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  isActive: boolean;
}

export interface VibeStats {
  totalVibes: number;
  popularVibes: { vibe: Vibe; count: number }[];
  recentActivity: UserVibe[];
}

// Predefined vibes for dating app
export const PREDEFINED_VIBES: Vibe[] = [
  // Mood vibes
  { 
    id: 'happy', 
    name: 'Vui vẻ', 
    emoji: '😊', 
    color: '#FFD700', 
    description: 'Tôi đang rất vui và tích cực!',
    category: 'mood'
  },
  { 
    id: 'romantic', 
    name: 'Lãng mạn', 
    emoji: '💕', 
    color: '#FF69B4', 
    description: 'Cảm thấy lãng mạn và muốn yêu',
    category: 'romantic'
  },
  { 
    id: 'adventurous', 
    name: 'Phiêu lưu', 
    emoji: '🌟', 
    color: '#FF6B35', 
    description: 'Sẵn sàng cho những cuộc phiêu lưu mới!',
    category: 'energy'
  },
  { 
    id: 'chill', 
    name: 'Thư giãn', 
    emoji: '😌', 
    color: '#87CEEB', 
    description: 'Chỉ muốn thư giãn và tận hưởng',
    category: 'mood'
  },
  { 
    id: 'flirty', 
    name: 'Tán tỉnh', 
    emoji: '😏', 
    color: '#E6005C', 
    description: 'Cảm thấy hấp dẫn và muốn flirt',
    category: 'romantic'
  },
  { 
    id: 'coffee', 
    name: 'Cà phê', 
    emoji: '☕', 
    color: '#8B4513', 
    description: 'Muốn đi uống cà phê cùng ai đó',
    category: 'activity'
  },
  { 
    id: 'workout', 
    name: 'Tập gym', 
    emoji: '💪', 
    color: '#32CD32', 
    description: 'Vừa tập xong, năng lượng tràn đầy!',
    category: 'activity'
  },
  { 
    id: 'music', 
    name: 'Âm nhạc', 
    emoji: '🎵', 
    color: '#9932CC', 
    description: 'Đang nghe nhạc và cảm thấy tuyệt vời',
    category: 'activity'
  },
  { 
    id: 'foodie', 
    name: 'Ăn uống', 
    emoji: '🍕', 
    color: '#FF4500', 
    description: 'Muốn khám phá món ăn ngon',
    category: 'activity'
  },
  { 
    id: 'party', 
    name: 'Tiệc tung', 
    emoji: '🎉', 
    color: '#FF1493', 
    description: 'Sẵn sàng cho một đêm vui vẻ!',
    category: 'energy'
  },
  { 
    id: 'study', 
    name: 'Học tập', 
    emoji: '📚', 
    color: '#4169E1', 
    description: 'Đang học hành, cần động lực',
    category: 'activity'
  },
  { 
    id: 'travel', 
    name: 'Du lịch', 
    emoji: '✈️', 
    color: '#00CED1', 
    description: 'Muốn đi du lịch và khám phá',
    category: 'activity'
  },
  { 
    id: 'lonely', 
    name: 'Cô đơn', 
    emoji: '🥺', 
    color: '#708090', 
    description: 'Cảm thấy cô đơn và muốn có ai đó bên cạnh',
    category: 'mood'
  },
  { 
    id: 'excited', 
    name: 'Phấn khích', 
    emoji: '🤩', 
    color: '#FF6347', 
    description: 'Rất phấn khích về điều gì đó!',
    category: 'energy'
  },
  { 
    id: 'netflix', 
    name: 'Xem phim', 
    emoji: '📺', 
    color: '#DC143C', 
    description: 'Muốn xem phim cùng ai đó',
    category: 'activity'
  },
  { 
    id: 'gaming', 
    name: 'Chơi game', 
    emoji: '🎮', 
    color: '#9370DB', 
    description: 'Đang chơi game, ai tham gia không?',
    category: 'activity'
  },
  { 
    id: 'shopping', 
    name: 'Mua sắm', 
    emoji: '🛍️', 
    color: '#FF1493', 
    description: 'Đi shopping và cần người tư vấn',
    category: 'activity'
  },
  { 
    id: 'sunset', 
    name: 'Ngắm hoàng hôn', 
    emoji: '🌅', 
    color: '#FF8C00', 
    description: 'Muốn ngắm hoàng hôn cùng ai đó',
    category: 'romantic'
  },
  { 
    id: 'beach', 
    name: 'Đi biển', 
    emoji: '🏖️', 
    color: '#20B2AA', 
    description: 'Muốn đi biển và tắm nắng',
    category: 'activity'
  },
  { 
    id: 'creative', 
    name: 'Sáng tạo', 
    emoji: '🎨', 
    color: '#DA70D6', 
    description: 'Đang trong trạng thái sáng tạo',
    category: 'mood'
  },
  
  // Additional real-life activity vibes
  { 
    id: 'netflix_chill', 
    name: 'Netflix & Chill', 
    emoji: '🍿', 
    color: '#E50914', 
    description: 'Xem Netflix thư giãn, ai xem cùng không?',
    category: 'activity'
  },
  { 
    id: 'ps5', 
    name: 'Chơi PS5', 
    emoji: '🎮', 
    color: '#5865F2', 
    description: 'Chơi PS5 cùng nhau chứ?',
    category: 'activity'
  },
  { 
    id: 'badminton', 
    name: 'Cầu lông', 
    emoji: '🏸', 
    color: '#00BFA5', 
    description: 'Tìm bạn đánh cầu lông',
    category: 'activity'
  },
  { 
    id: 'walking', 
    name: 'Đi dạo', 
    emoji: '🚶', 
    color: '#4CAF50', 
    description: 'Đi dạo hóng gió, nói chuyện',
    category: 'activity'
  },
  { 
    id: 'jogging', 
    name: 'Chạy bộ', 
    emoji: '🏃', 
    color: '#FF9800', 
    description: 'Chạy bộ buổi sáng/chiều',
    category: 'activity'
  },
  { 
    id: 'boardgames', 
    name: 'Board games', 
    emoji: '🎲', 
    color: '#9C27B0', 
    description: 'Chơi board games cùng nhau',
    category: 'activity'
  },
  { 
    id: 'cinema', 
    name: 'Ra rạp xem phim', 
    emoji: '🎬', 
    color: '#C2185B', 
    description: 'Ra rạp coi phim mới',
    category: 'activity'
  },
  { 
    id: 'hangout', 
    name: 'Đi chơi', 
    emoji: '🧋', 
    color: '#3F51B5', 
    description: 'La cà cà phê/trà sữa',
    category: 'activity'
  },

  // Even more concrete activities
  { id: 'billiards', name: 'Bida/Billiards', emoji: '🎱', color: '#0D47A1', description: 'Đánh bida giao lưu', category: 'activity' },
  { id: 'soccer', name: 'Đá bóng', emoji: '⚽', color: '#1B5E20', description: 'Đá bóng cuối tuần', category: 'activity' },
  { id: 'basketball', name: 'Bóng rổ', emoji: '🏀', color: '#E65100', description: 'Pick-up game bóng rổ', category: 'activity' },
  { id: 'volleyball', name: 'Bóng chuyền', emoji: '🏐', color: '#00838F', description: 'Rủ chơi bóng chuyền', category: 'activity' },
  { id: 'tennis', name: 'Tennis', emoji: '🎾', color: '#7CB342', description: 'Đánh tennis giao hữu', category: 'activity' },
  { id: 'hiking', name: 'Trekking/Hiking', emoji: '🥾', color: '#5D4037', description: 'Leo núi trekking', category: 'activity' },
  { id: 'cycling', name: 'Đạp xe', emoji: '🚴', color: '#1976D2', description: 'Đạp xe ngắm cảnh', category: 'activity' },
  { id: 'swimming', name: 'Bơi lội', emoji: '🏊', color: '#00ACC1', description: 'Bơi thư giãn', category: 'activity' },
  { id: 'karaoke', name: 'Karaoke', emoji: '🎤', color: '#AD1457', description: 'Hát hò xả stress', category: 'activity' },
  { id: 'cooking', name: 'Nấu ăn', emoji: '🍳', color: '#F57C00', description: 'Nấu món ngon/meal prep', category: 'activity' },
  { id: 'coding', name: 'Coding', emoji: '💻', color: '#455A64', description: 'Code/side project', category: 'activity' },
  { id: 'reading', name: 'Đọc sách', emoji: '📖', color: '#8D6E63', description: 'Đọc sách cafe chill', category: 'activity' },
  { id: 'yoga', name: 'Yoga', emoji: '🧘', color: '#8E24AA', description: 'Yoga/thiền thư giãn', category: 'activity' },
  { id: 'pet_walk', name: 'Dắt thú cưng', emoji: '🐕', color: '#6D4C41', description: 'Dắt cún đi dạo', category: 'activity' },

  // Fitness
  { id: 'gym_time', name: 'Gym time', emoji: '🏋️', color: '#7C3AED', description: 'Tập tạ đẩy ngực, tập cùng chứ?', category: 'fitness' },
  { id: 'pilates', name: 'Pilates', emoji: '🤸', color: '#C084FC', description: 'Pilates nhẹ nhàng', category: 'fitness' },
  { id: 'stretching', name: 'Giãn cơ', emoji: '🧘‍♂️', color: '#60A5FA', description: 'Giãn cơ thư giãn', category: 'fitness' },

  // Sports
  { id: 'table_tennis', name: 'Bóng bàn', emoji: '🏓', color: '#0EA5E9', description: 'Đánh bóng bàn giao lưu', category: 'sports' },
  { id: 'badminton_duo', name: 'Cầu lông đôi', emoji: '🏸', color: '#22C55E', description: 'Tìm người đánh đôi', category: 'sports' },
  { id: 'running_5k', name: 'Chạy 5K', emoji: '🏃‍♂️', color: '#F59E0B', description: 'Chạy 5K buổi sáng', category: 'sports' },

  // Games
  { id: 'switch_mario', name: 'Switch Mario', emoji: '🍄', color: '#EF4444', description: 'Nintendo Switch party', category: 'games' },
  { id: 'pc_gaming', name: 'PC gaming', emoji: '🖥️', color: '#3B82F6', description: 'Rank cùng nhau?', category: 'games' },
  { id: 'mobile_games', name: 'Game mobile', emoji: '📱', color: '#10B981', description: 'Game mobile chill', category: 'games' },

  // Outdoor
  { id: 'camping', name: 'Cắm trại', emoji: '🏕️', color: '#16A34A', description: 'Cắm trại qua đêm', category: 'outdoor' },
  { id: 'picnic', name: 'Picnic', emoji: '🧺', color: '#F97316', description: 'Picnic công viên', category: 'outdoor' },
  { id: 'city_walk', name: 'Dạo phố', emoji: '🚶‍♂️', color: '#60A5FA', description: 'Dạo phố, chụp ảnh', category: 'outdoor' },

  // Indoor
  { id: 'boardgame_cafe', name: 'Boardgame cafe', emoji: '🎲', color: '#8B5CF6', description: 'Boardgame tối nay', category: 'indoor' },
  { id: 'escape_room', name: 'Escape room', emoji: '🗝️', color: '#EA580C', description: 'Thoát phòng giải đố', category: 'indoor' },
  { id: 'art_gallery', name: 'Phòng tranh', emoji: '🖼️', color: '#D946EF', description: 'Thăm phòng tranh', category: 'indoor' },

  // Food
  { id: 'bbq', name: 'BBQ nướng', emoji: '🍖', color: '#DC2626', description: 'BBQ cuối tuần', category: 'food' },
  { id: 'hotpot', name: 'Lẩu nóng', emoji: '🍲', color: '#EA580C', description: 'Đi ăn lẩu nhé', category: 'food' },
  { id: 'sushi', name: 'Sushi', emoji: '🍣', color: '#0EA5E9', description: 'Sushi lovers', category: 'food' },
  { id: 'street_food', name: 'Ăn vặt', emoji: '🌮', color: '#22C55E', description: 'Ăn vặt đêm', category: 'food' },
  { id: 'tea_time', name: 'Uống trà', emoji: '🫖', color: '#059669', description: 'Trà chiều tâm sự', category: 'food' },

  // Music
  { id: 'live_music', name: 'Live music', emoji: '🎸', color: '#9333EA', description: 'Nghe nhạc sống', category: 'music' },
  { id: 'concert', name: 'Concert', emoji: '🎤', color: '#E11D48', description: 'Đi concert không?', category: 'music' },
  { id: 'vinyl_bar', name: 'Vinyl bar', emoji: '💿', color: '#2563EB', description: 'Bar nhạc vinyl', category: 'music' },

  // Study / Work
  { id: 'study_cafe', name: 'Study cafe', emoji: '☕', color: '#6B7280', description: 'Học nhóm quán cafe', category: 'study' },
  { id: 'library', name: 'Thư viện', emoji: '🏛️', color: '#4B5563', description: 'Đọc sách thư viện', category: 'study' },
  { id: 'coworking', name: 'Coworking', emoji: '🧑‍💻', color: '#14B8A6', description: 'Làm việc chung', category: 'work' },

  // Travel / Social
  { id: 'short_trip', name: 'Trip ngắn', emoji: '🧳', color: '#0EA5E9', description: 'Trip 1-2 ngày', category: 'travel' },
  { id: 'cafe_hopping', name: 'Cafe hopping', emoji: '🧋', color: '#A855F7', description: 'Đi cà phê nhiều quán', category: 'social' },
  { id: 'night_market', name: 'Chợ đêm', emoji: '🛍️', color: '#F59E0B', description: 'Dạo chợ đêm', category: 'social' },

  // Creative / Relax
  { id: 'photography', name: 'Chụp ảnh', emoji: '📸', color: '#EF4444', description: 'Săn ảnh đẹp', category: 'creative' },
  { id: 'painting', name: 'Vẽ tranh', emoji: '🎨', color: '#F472B6', description: 'Vẽ acrylic/chill', category: 'creative' },
  { id: 'spa', name: 'Spa', emoji: '💆', color: '#06B6D4', description: 'Spa thư giãn', category: 'relax' },
  { id: 'meditation', name: 'Thiền', emoji: '🧘', color: '#22D3EE', description: 'Thiền tĩnh tâm', category: 'relax' },

  // Pets / Nightlife
  { id: 'cat_cafe', name: 'Cat Cafe', emoji: '🐈', color: '#F59E0B', description: 'Cafe mèo dễ thương', category: 'pets' },
  { id: 'dog_park', name: 'Công viên cún', emoji: '🐕', color: '#84CC16', description: 'Dắt cún gặp gỡ', category: 'pets' },
  { id: 'pub', name: 'Pub', emoji: '🍺', color: '#A3E635', description: 'Pub chill nhẹ', category: 'nightlife' },
  { id: 'club', name: 'Club', emoji: '🪩', color: '#8B5CF6', description: 'Club tối nay?', category: 'nightlife' },

  // Additional popular vibes in Vietnam
  // Food and Drink related (very popular in VN)
  { id: 'nhau', name: 'Nhậu', emoji: '🍻', color: '#FF5722', description: 'Nhậu nhẹt với bạn bè, ai tham gia?', category: 'social' },
  { id: 'bia_hoi', name: 'Bia hơi', emoji: '🍺', color: '#FFC107', description: 'Uống bia hơi vỉa hè chill', category: 'nightlife' },
  { id: 'pho', name: 'Ăn phở', emoji: '🍜', color: '#795548', description: 'Ăn phở buổi sáng, ai đi cùng?', category: 'food' },
  { id: 'bun_cha', name: 'Bún chả', emoji: '🍲', color: '#F4511E', description: 'Thưởng thức bún chả Hà Nội', category: 'food' },
  { id: 'hai_san', name: 'Hải sản', emoji: '🦐', color: '#0288D1', description: 'Ăn hải sản tươi sống bên bờ biển', category: 'food' },
  { id: 'tra_sua', name: 'Trà sữa', emoji: '🧋', color: '#FFAB91', description: 'Uống trà sữa tám chuyện', category: 'food' },
  { id: 'an_vat', name: 'Ăn vặt vỉa hè', emoji: '🍢', color: '#FF7043', description: 'Ăn vặt đường phố đêm khuya', category: 'food' },

  // Outdoor and Travel (Phượt culture is big)
  { id: 'phuot', name: 'Phượt xe máy', emoji: '🏍️', color: '#4CAF50', description: 'Phượt khám phá vùng quê', category: 'travel' },
  { id: 'bien_dao', name: 'Đi đảo', emoji: '🏝️', color: '#00BCD4', description: 'Du lịch đảo Phú Quốc hoặc Côn Đảo', category: 'travel' },
  { id: 'leo_nui', name: 'Leo núi', emoji: '⛰️', color: '#3E2723', description: 'Leo Fansipan hoặc Đà Lạt', category: 'outdoor' },
  { id: 'dao_pho_co', name: 'Dạo phố cổ', emoji: '🏮', color: '#D32F2F', description: 'Dạo phố cổ Hà Nội hoặc Hội An', category: 'outdoor' },
  { id: 'ngam_hoa', name: 'Ngắm hoa', emoji: '🌸', color: '#E91E63', description: 'Ngắm hoa anh đào hoặc cúc họa mi', category: 'romantic' },
  { id: 'danh_cau_ca', name: 'Câu cá', emoji: '🎣', color: '#2196F3', description: 'Câu cá thư giãn cuối tuần', category: 'outdoor' },

  // Social and Nightlife
  { id: 'rooftop_bar', name: 'Rooftop bar', emoji: '🍹', color: '#673AB7', description: 'Uống cocktail trên rooftop', category: 'nightlife' },
  { id: 'pub_crawl', name: 'Pub crawl', emoji: '🍸', color: '#FFEB3B', description: 'Đi bar hopping Sài Gòn hoặc Hà Nội', category: 'nightlife' },
  { id: 'dancing_social', name: 'Nhảy múa xã hội', emoji: '💃', color: '#F50057', description: 'Học nhảy salsa hoặc bachata', category: 'social' },
  { id: 'le_hoi', name: 'Lễ hội', emoji: '🎊', color: '#FF4081', description: 'Tham gia lễ hội địa phương', category: 'social' },
  { id: 'watch_football', name: 'Xem bóng đá', emoji: '📺', color: '#388E3C', description: 'Xem bóng đá Việt Nam với bạn bè', category: 'social' },

  // Cultural and Relax
  { id: 'di_chua', name: 'Đi chùa', emoji: '🛕', color: '#FF9800', description: 'Thăm chùa cầu bình an', category: 'relax' },
  { id: 'massage', name: 'Massage', emoji: '💆‍♀️', color: '#4DD0E1', description: 'Massage chân thư giãn', category: 'relax' },
  { id: 'workshop', name: 'Workshop', emoji: '🛠️', color: '#9C27B0', description: 'Tham gia workshop làm đồ handmade', category: 'creative' },
  { id: 'pottery', name: 'Làm gốm', emoji: '🏺', color: '#6D4C41', description: 'Làm gốm sáng tạo', category: 'creative' },
  { id: 'nghe_nhac_trinh', name: 'Nghe nhạc Trịnh', emoji: '🎼', color: '#512DA8', description: 'Nghe nhạc Trịnh Công Sơn chill', category: 'music' },

  // Fitness and Sports (more VN specific)
  { id: 'da_cau', name: 'Đá cầu', emoji: '🪶', color: '#03A9F4', description: 'Chơi đá cầu công viên', category: 'sports' },
  { id: 'vo_co_truyen', name: 'Võ cổ truyền', emoji: '🥋', color: '#F44336', description: 'Tập võ Việt Nam', category: 'fitness' },

  // More Social/Fun
  { id: 'axe_throwing', name: 'Ném rìu', emoji: '🪓', color: '#607D8B', description: 'Thử ném rìu vui vẻ', category: 'indoor' },
  { id: 'cooking_class', name: 'Lớp nấu ăn', emoji: '👩‍🍳', color: '#FF6D00', description: 'Học nấu món Việt cùng nhau', category: 'indoor' },
  { id: 'brunch_river', name: 'Brunch bên sông', emoji: '🥐', color: '#FFEB3B', description: 'Brunch view sông Sài Gòn', category: 'food' },
  { id: 'spontaneous_trip', name: 'Chuyến đi bất chợt', emoji: '🚗', color: '#009688', description: 'Đi chơi bất ngờ cuối tuần', category: 'travel' },
  { id: 'beach_walk_sunset', name: 'Dạo biển hoàng hôn', emoji: '🌅', color: '#FF5722', description: 'Dạo biển ngắm hoàng hôn', category: 'romantic' },
  { id: 'content_creation', name: 'Tạo content', emoji: '📹', color: '#E040FB', description: 'Chụp ảnh, quay video cùng', category: 'creative' },
  { id: 'padel', name: 'Chơi Padel', emoji: '🏓', color: '#4CAF50', description: 'Đánh padel thể thao mới', category: 'sports' },
  { id: 'meetup_group', name: 'Meetup nhóm', emoji: '👥', color: '#2196F3', description: 'Tham gia meetup sự kiện', category: 'social' },
];

export const VIBE_CATEGORIES = [
  { id: 'all', name: 'Tất cả', emoji: '✨' },
  { id: 'mood', name: 'Tâm trạng', emoji: '😊' },
  { id: 'activity', name: 'Hoạt động', emoji: '🎯' },
  { id: 'energy', name: 'Năng lượng', emoji: '⚡' },
  { id: 'romantic', name: 'Lãng mạn', emoji: '💕' },
  { id: 'fitness', name: 'Fitness', emoji: '💪' },
  { id: 'sports', name: 'Thể thao', emoji: '🏀' },
  { id: 'games', name: 'Games', emoji: '🎮' },
  { id: 'outdoor', name: 'Ngoài trời', emoji: '🌿' },
  { id: 'indoor', name: 'Trong nhà', emoji: '🏠' },
  { id: 'food', name: 'Ăn uống', emoji: '🍽️' },
  { id: 'music', name: 'Âm nhạc', emoji: '🎵' },
  { id: 'study', name: 'Học tập', emoji: '📚' },
  { id: 'work', name: 'Làm việc', emoji: '🧑‍💻' },
  { id: 'travel', name: 'Du lịch', emoji: '✈️' },
  { id: 'social', name: 'Gặp gỡ', emoji: '🫶' },
  { id: 'creative', name: 'Sáng tạo', emoji: '🎨' },
  { id: 'relax', name: 'Thư giãn', emoji: '😌' },
  { id: 'pets', name: 'Thú cưng', emoji: '🐾' },
  { id: 'nightlife', name: 'Nightlife', emoji: '🌃' },
];