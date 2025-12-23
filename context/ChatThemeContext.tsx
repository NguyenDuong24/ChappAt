import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
    preview: '🔵'
  },
  {
    id: 'green',
    name: 'Xanh lá',
    backgroundColor: '#E8F5E8',
    sentMessageColor: '#388E3C',
    receivedMessageColor: '#FFFFFF',
    textColor: '#1B5E20',
    preview: '🟢'
  },
  {
    id: 'purple',
    name: 'Tím',
    backgroundColor: '#F3E5F5',
    sentMessageColor: '#7B1FA2',
    receivedMessageColor: '#FFFFFF',
    textColor: '#4A148C',
    preview: '🟣'
  },
  {
    id: 'orange',
    name: 'Cam',
    backgroundColor: '#FFF3E0',
    sentMessageColor: '#F57C00',
    receivedMessageColor: '#FFFFFF',
    textColor: '#E65100',
    preview: '🟠'
  },
  {
    id: 'pink',
    name: 'Hồng',
    backgroundColor: '#FCE4EC',
    sentMessageColor: '#C2185B',
    receivedMessageColor: '#FFFFFF',
    textColor: '#880E4F',
    preview: '🔴'
  },
  {
    id: 'teal',
    name: 'Xanh ngọc',
    backgroundColor: '#E0F2F1',
    sentMessageColor: '#00695C',
    receivedMessageColor: '#FFFFFF',
    textColor: '#004D40',
    preview: '🔵'
  },
  {
    id: 'indigo',
    name: 'Chàm',
    backgroundColor: '#E8EAF6',
    sentMessageColor: '#303F9F',
    receivedMessageColor: '#FFFFFF',
    textColor: '#1A237E',
    preview: '🟦'
  },
  {
    id: 'brown',
    name: 'Nâu',
    backgroundColor: '#EFEBE9',
    sentMessageColor: '#5D4037',
    receivedMessageColor: '#FFFFFF',
    textColor: '#3E2723',
    preview: '🟫'
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
  }
];

interface ChatThemeContextType {
  currentTheme: ChatTheme;
  currentEffect: EffectType;
  setTheme: (themeId: string, roomId: string) => Promise<void>;
  setEffect: (effectId: EffectType, roomId: string) => Promise<void>;
  loadTheme: (roomId: string) => Promise<void>;
  loadEffect: (roomId: string) => Promise<void>;
  themes: ChatTheme[];
  effects: ChatEffect[];
}

const ChatThemeContext = createContext<ChatThemeContextType | undefined>(undefined);

export const ChatThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ChatTheme>(CHAT_THEMES[0]);
  const [currentEffect, setCurrentEffect] = useState<EffectType>('none');

  const loadTheme = async (roomId: string) => {
    try {
      const themeDocRef = doc(db, 'roomThemes', roomId);
      const themeDoc = await getDoc(themeDocRef);

      if (themeDoc.exists()) {
        const themeData = themeDoc.data();
        const theme = CHAT_THEMES.find(t => t.id === themeData.themeId);
        if (theme) {
          setCurrentTheme(theme);
        }
      } else {
        // Set default theme
        setCurrentTheme(CHAT_THEMES[0]);
      }
    } catch (error) {
      console.error('Error loading chat theme:', error);
      setCurrentTheme(CHAT_THEMES[0]);
    }
  };

  const loadEffect = async (roomId: string) => {
    try {
      console.log('🎨 [ChatThemeContext] Loading effect for room:', roomId);
      const themeDocRef = doc(db, 'roomThemes', roomId);
      const themeDoc = await getDoc(themeDocRef);

      if (themeDoc.exists()) {
        const themeData = themeDoc.data();
        const effectId = themeData.effectId as EffectType;
        console.log('🎨 [ChatThemeContext] Found effectId in Firebase:', effectId);
        if (effectId && CHAT_EFFECTS.find(e => e.id === effectId)) {
          setCurrentEffect(effectId);
          console.log('🎨 [ChatThemeContext] Set currentEffect to:', effectId);
        } else {
          console.log('🎨 [ChatThemeContext] Invalid or no effect, staying with:', currentEffect);
        }
      } else {
        console.log('🎨 [ChatThemeContext] No theme doc, staying with:', currentEffect);
      }
    } catch (error) {
      console.error('❌ [ChatThemeContext] Error loading chat effect:', error);
    }
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
