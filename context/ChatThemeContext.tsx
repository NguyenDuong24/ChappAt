import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { EffectType } from '@/components/chat/ChatBackgroundEffects';

export interface ChatTheme {
  id: string;
  name: string;
  backgroundColor: string;
  sentMessageColor: string;
  receivedMessageColor: string;
  textColor: string;
  preview?: string;
  gradientColors?: string[];
  sentMessageGradient?: string[];
  backgroundImage?: string;
}

export interface ChatEffect {
  id: EffectType;
  name: string;
  preview: string;
  description: string;
}

export const CHAT_THEMES: ChatTheme[] = [
  {
    id: 'default',
    name: 'Mặc định',
    backgroundColor: '#FFFFFF',
    sentMessageColor: '#0084FF',
    receivedMessageColor: '#F0F0F0',
    textColor: '#000000',
    preview: '⚪'
  },
  {
    id: 'dark',
    name: 'Tối',
    backgroundColor: '#1A1A1A',
    sentMessageColor: '#0084FF',
    receivedMessageColor: '#2A2A2A',
    textColor: '#FFFFFF',
    preview: '⚫'
  },
  {
    id: 'blue',
    name: 'Xanh dương',
    backgroundColor: '#E3F2FD',
    sentMessageColor: '#1976D2',
    receivedMessageColor: '#FFFFFF',
    textColor: '#0D47A1',
    preview: '🔵',
    backgroundImage: 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'green',
    name: 'Xanh lá',
    backgroundColor: '#E8F5E8',
    sentMessageColor: '#388E3C',
    receivedMessageColor: '#FFFFFF',
    textColor: '#1B5E20',
    preview: '🟢',
    backgroundImage: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'purple',
    name: 'Tím',
    backgroundColor: '#F3E5F5',
    sentMessageColor: '#7B1FA2',
    receivedMessageColor: '#FFFFFF',
    textColor: '#4A148C',
    preview: '🟣',
    backgroundImage: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'orange',
    name: 'Cam',
    backgroundColor: '#FFF3E0',
    sentMessageColor: '#F57C00',
    receivedMessageColor: '#FFFFFF',
    textColor: '#E65100',
    preview: '🟠',
    backgroundImage: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'pink',
    name: 'Hồng',
    backgroundColor: '#FCE4EC',
    sentMessageColor: '#C2185B',
    receivedMessageColor: '#FFFFFF',
    textColor: '#880E4F',
    preview: '🔴',
    backgroundImage: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'teal',
    name: 'Xanh ngọc',
    backgroundColor: '#E0F2F1',
    sentMessageColor: '#00695C',
    receivedMessageColor: '#FFFFFF',
    textColor: '#004D40',
    preview: '🔵',
    backgroundImage: 'https://images.unsplash.com/photo-1502675135487-e971002a6adb?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'indigo',
    name: 'Chàm',
    backgroundColor: '#E8EAF6',
    sentMessageColor: '#303F9F',
    receivedMessageColor: '#FFFFFF',
    textColor: '#1A237E',
    preview: '🟦',
    backgroundImage: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'brown',
    name: 'Nâu',
    backgroundColor: '#EFEBE9',
    sentMessageColor: '#5D4037',
    receivedMessageColor: '#FFFFFF',
    textColor: '#3E2723',
    preview: '🟫',
    backgroundImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'messenger_blue',
    name: 'Messenger',
    backgroundColor: '#FFFFFF',
    sentMessageColor: '#0084FF',
    receivedMessageColor: '#E4E6EB',
    textColor: '#050505',
    preview: '💬',
    sentMessageGradient: ['#0084FF', '#007AFF'],
    backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'messenger_dark',
    name: 'Messenger Tối',
    backgroundColor: '#000000',
    sentMessageColor: '#0084FF',
    receivedMessageColor: '#242526',
    textColor: '#E4E6EB',
    preview: '🌑',
    sentMessageGradient: ['#0084FF', '#007AFF'],
    backgroundImage: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'lavender',
    name: 'Oải hương',
    backgroundColor: '#F3F0FF',
    sentMessageColor: '#845EF7',
    receivedMessageColor: '#FFFFFF',
    textColor: '#3B11AB',
    preview: '🪻',
    backgroundImage: 'https://images.unsplash.com/photo-1499002238440-d264edf146ec?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'ocean',
    name: 'Đại dương',
    backgroundColor: '#E0F7FA',
    sentMessageColor: '#00ACC1',
    receivedMessageColor: '#FFFFFF',
    textColor: '#006064',
    preview: '🌊',
    backgroundImage: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'sunset',
    name: 'Hoàng hôn',
    backgroundColor: '#FFF5F5',
    sentMessageColor: '#FF6B6B',
    receivedMessageColor: '#FFFFFF',
    textColor: '#C92A2A',
    preview: '🌇',
    backgroundImage: 'https://images.unsplash.com/photo-1472120435166-531418224de0?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'forest',
    name: 'Rừng xanh',
    backgroundColor: '#EBFBEE',
    sentMessageColor: '#40C057',
    receivedMessageColor: '#FFFFFF',
    textColor: '#2B8A3E',
    preview: '🌲',
    backgroundImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'sunlight_premium',
    name: 'Nắng vàng cao cấp',
    backgroundColor: '#FF8C00',
    sentMessageColor: 'rgba(255, 236, 139, 0.8)',
    receivedMessageColor: 'rgba(255, 255, 255, 0.7)',
    textColor: '#5D4037',
    preview: '☀️',
    gradientColors: ['#FFD700', '#FF8C00', '#D2691E'],
    backgroundImage: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'messenger_gradient',
    name: 'Messenger Gradient',
    backgroundColor: '#FFFFFF',
    sentMessageColor: '#AF52BF',
    receivedMessageColor: '#E4E6EB',
    textColor: '#050505',
    preview: '🌈',
    gradientColors: ['#FFFFFF', '#F0F2F5'],
    sentMessageGradient: ['#0084FF', '#A033FF', '#FF5280'],
    backgroundImage: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'love',
    name: 'Tình yêu',
    backgroundColor: '#FFF0F3',
    sentMessageColor: '#FF4D6D',
    receivedMessageColor: '#FFFFFF',
    textColor: '#590D22',
    preview: '❤️',
    gradientColors: ['#FFF0F3', '#FFE5EC'],
    sentMessageGradient: ['#FF758F', '#FF4D6D', '#C9184A'],
    backgroundImage: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'galaxy_premium',
    name: 'Thiên hà',
    backgroundColor: '#0B090A',
    sentMessageColor: '#7B2CBF',
    receivedMessageColor: '#161A1D',
    textColor: '#F5F3F4',
    preview: '🌌',
    gradientColors: ['#10002B', '#240046', '#3C096C', '#5A189A'],
    backgroundImage: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'pastel_soft',
    name: 'Pastel Nhẹ nhàng',
    backgroundColor: '#F8F9FA',
    sentMessageColor: '#BDB2FF',
    receivedMessageColor: '#FFFFFF',
    textColor: '#495057',
    preview: '🌸',
    gradientColors: ['#F8F9FA', '#F1F3F5'],
    sentMessageGradient: ['#FFC8DD', '#FFAFCC', '#BDE0FE', '#A2D2FF'],
    backgroundImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    backgroundColor: '#000000',
    sentMessageColor: '#00F5FF',
    receivedMessageColor: '#1A1A1A',
    textColor: '#00F5FF',
    preview: '🔥',
    gradientColors: ['#000000', '#050505'],
    sentMessageGradient: ['#000000', '#1A0033', '#330066', '#FF00FF'],
    backgroundImage: 'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'christmas',
    name: 'Giáng sinh',
    backgroundColor: '#0B3D2E',
    sentMessageColor: '#D42426',
    receivedMessageColor: '#FFFFFF',
    textColor: '#FFFFFF',
    preview: '🎄',
    gradientColors: ['#0B3D2E', '#166534', '#D42426'],
    backgroundImage: 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'halloween',
    name: 'Halloween',
    backgroundColor: '#1A1A1A',
    sentMessageColor: '#FF6700',
    receivedMessageColor: '#333333',
    textColor: '#FF6700',
    preview: '🎃',
    gradientColors: ['#000000', '#1A1A1A', '#FF6700'],
    backgroundImage: 'https://images.unsplash.com/photo-1508361001413-7a9dca21d08a?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'underwater',
    name: 'Dưới đại dương',
    backgroundColor: '#001219',
    sentMessageColor: '#005F73',
    receivedMessageColor: '#0A9396',
    textColor: '#E9D8A6',
    preview: '🧜‍♂️',
    gradientColors: ['#001219', '#005F73', '#0A9396'],
    backgroundImage: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'steampunk',
    name: 'Steampunk',
    backgroundColor: '#2B2118',
    sentMessageColor: '#8B5E34',
    receivedMessageColor: '#BC8A5F',
    textColor: '#E2D1C3',
    preview: '⚙️',
    gradientColors: ['#2B2118', '#604439', '#8B5E34'],
    backgroundImage: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'nature_zen',
    name: 'Thiền định',
    backgroundColor: '#2D3A3A',
    sentMessageColor: '#4A7C59',
    receivedMessageColor: '#8FC0A9',
    textColor: '#FAF9F9',
    preview: '🧘',
    gradientColors: ['#2D3A3A', '#4A7C59', '#8FC0A9'],
    backgroundImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop'
  },
  {
    id: 'neon_night',
    name: 'Đêm Neon',
    backgroundColor: '#000000',
    sentMessageColor: '#FF0054',
    receivedMessageColor: '#390099',
    textColor: '#FFBD00',
    preview: '🌃',
    gradientColors: ['#000000', '#390099', '#9E0059', '#FF0054'],
    backgroundImage: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=1000&auto=format&fit=crop'
  }
];

export const CHAT_EFFECTS: ChatEffect[] = [
  {
    id: 'none',
    name: 'Không có',
    preview: '⭕',
    description: 'Không có hiệu ứng'
  },
  {
    id: 'stars',
    name: 'Bầu trời sao',
    preview: '⭐',
    description: 'Ngôi sao lấp lánh'
  },
  {
    id: 'snow',
    name: 'Tuyết rơi',
    preview: '❄️',
    description: 'Tuyết nhẹ nhàng rơi'
  },
  {
    id: 'hearts',
    name: 'Trái tim',
    preview: '❤️',
    description: 'Trái tim bay lên'
  },
  {
    id: 'confetti',
    name: 'Pháo giấy',
    preview: '🎉',
    description: 'Pháo giấy rơi xuống'
  },
  {
    id: 'bubbles',
    name: 'Bong bóng',
    preview: '🫧',
    description: 'Bong bóng bay lên'
  },
  {
    id: 'fireflies',
    name: 'Đom đóm',
    preview: '✨',
    description: 'Đom đóm bay lượn'
  },
  {
    id: 'sakura',
    name: 'Hoa anh đào',
    preview: '🌸',
    description: 'Cánh hoa rơi nhẹ'
  },
  {
    id: 'sparkles',
    name: 'Kim tuyến',
    preview: '💫',
    description: 'Lấp lánh ánh kim tuyến'
  },
  {
    id: 'rain',
    name: 'Mưa rơi',
    preview: '🌧️',
    description: 'Những giọt mưa lãng mạn'
  },
  {
    id: 'leaves',
    name: 'Lá mùa thu',
    preview: '🍂',
    description: 'Lá vàng bay trong gió'
  },
  {
    id: 'butterflies',
    name: 'Bướm bay',
    preview: '🦋',
    description: 'Bướm bay lượn dịu dàng'
  },
  {
    id: 'neon',
    name: 'Neon',
    preview: '💜',
    description: 'Ánh sáng neon lung linh'
  },
  {
    id: 'galaxy',
    name: 'Thiên hà',
    preview: '🌌',
    description: 'Bầu trời đêm huyền ảo'
  },
  {
    id: 'balloons',
    name: 'Bóng bay',
    preview: '🎈',
    description: 'Bóng bay rực rỡ sắc màu'
  },
  {
    id: 'fireworks',
    name: 'Pháo hoa',
    preview: '🎆',
    description: 'Pháo hoa nổ tung rực rỡ'
  },
  {
    id: 'music',
    name: 'Âm nhạc',
    preview: '🎵',
    description: 'Nốt nhạc bay bổng'
  },
  {
    id: 'sunlight',
    name: 'Nắng vàng',
    preview: '☀️',
    description: 'Tia nắng ấm áp'
  }
];

interface ChatThemeContextType {
  currentTheme: ChatTheme;
  currentEffect: EffectType;
  setTheme: (themeId: string, roomId: string) => Promise<void>;
  setEffect: (effectId: EffectType, roomId: string) => Promise<void>;
  loadTheme: (roomId: string) => () => void;
  loadEffect: (roomId: string) => () => void;
  themes: ChatTheme[];
  effects: ChatEffect[];
}

const ChatThemeContext = createContext<ChatThemeContextType | undefined>(undefined);

export const ChatThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ChatTheme>(CHAT_THEMES[0]);
  const [currentEffect, setCurrentEffect] = useState<EffectType>('none');

  const loadTheme = (roomId: string) => {
    const themeDocRef = doc(db, 'roomThemes', roomId);
    return onSnapshot(themeDocRef, (themeDoc) => {
      if (themeDoc.exists()) {
        const themeData = themeDoc.data();
        const theme = CHAT_THEMES.find(t => t.id === themeData.themeId);
        if (theme) {
          setCurrentTheme(theme);
        }
      } else {
        setCurrentTheme(CHAT_THEMES[0]);
      }
    }, (error) => {
      console.error('Error loading chat theme:', error);
      setCurrentTheme(CHAT_THEMES[0]);
    });
  };

  const loadEffect = (roomId: string) => {
    console.log('🎨 [ChatThemeContext] Subscribing to effect for room:', roomId);
    const themeDocRef = doc(db, 'roomThemes', roomId);
    return onSnapshot(themeDocRef, (themeDoc) => {
      if (themeDoc.exists()) {
        const themeData = themeDoc.data();
        const effectId = themeData.effectId as EffectType;
        console.log('🎨 [ChatThemeContext] Found effectId in Firebase:', effectId);
        if (effectId && CHAT_EFFECTS.find(e => e.id === effectId)) {
          setCurrentEffect(effectId);
          console.log('🎨 [ChatThemeContext] Set currentEffect to:', effectId);
        }
      }
    }, (error) => {
      console.error('❌ [ChatThemeContext] Error loading chat effect:', error);
    });
  };

  const setTheme = async (themeId: string, roomId: string) => {
    try {
      const theme = CHAT_THEMES.find(t => t.id === themeId);
      if (!theme) return;

      // Save to Firebase
      const themeDocRef = doc(db, 'roomThemes', roomId);
      await setDoc(themeDocRef, {
        themeId,
        updatedAt: new Date()
      }, { merge: true });

      // Update local state
      setCurrentTheme(theme);
    } catch (error) {
      console.error('Error setting chat theme:', error);
    }
  };

  const setEffect = async (effectId: EffectType, roomId: string) => {
    try {
      console.log('🎨 [ChatThemeContext] Setting effect:', effectId, 'for room:', roomId);
      // Save to Firebase
      const themeDocRef = doc(db, 'roomThemes', roomId);
      await setDoc(themeDocRef, {
        effectId,
        updatedAt: new Date()
      }, { merge: true });
      console.log('🎨 [ChatThemeContext] Saved effect to Firebase');

      // Update local state
      setCurrentEffect(effectId);
      console.log('🎨 [ChatThemeContext] Updated local state to:', effectId);
    } catch (error) {
      console.error('❌ [ChatThemeContext] Error setting chat effect:', error);
    }
  };

  return (
    <ChatThemeContext.Provider value={{
      currentTheme,
      currentEffect,
      setTheme,
      setEffect,
      loadTheme,
      loadEffect,
      themes: CHAT_THEMES,
      effects: CHAT_EFFECTS
    }}>
      {children}
    </ChatThemeContext.Provider>
  );
};

export const useChatTheme = () => {
  const context = useContext(ChatThemeContext);
  if (context === undefined) {
    throw new Error('useChatTheme must be used within a ChatThemeProvider');
  }
  return context;
};
