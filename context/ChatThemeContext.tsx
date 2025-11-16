import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export interface ChatTheme {
  id: string;
  name: string;
  backgroundColor: string;
  sentMessageColor: string;
  receivedMessageColor: string;
  textColor: string;
  preview?: string;
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

interface ChatThemeContextType {
  currentTheme: ChatTheme;
  setTheme: (themeId: string, roomId: string) => Promise<void>;
  loadTheme: (roomId: string) => Promise<void>;
  themes: ChatTheme[];
}

const ChatThemeContext = createContext<ChatThemeContextType | undefined>(undefined);

export const ChatThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ChatTheme>(CHAT_THEMES[0]);

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

  return (
    <ChatThemeContext.Provider value={{
      currentTheme,
      setTheme,
      loadTheme,
      themes: CHAT_THEMES
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
