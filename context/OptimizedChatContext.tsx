import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useAuth } from './authContext';
import userCacheService from '@/services/userCacheService';
import messageBatchService from '@/services/messageBatchService';

interface ChatState {
  activeChats: Set<string>;
  messageCache: Map<string, any[]>;
  userCache: Map<string, any>;
  unreadCounts: Map<string, number>;
  typingUsers: Map<string, Set<string>>;
}

type ChatAction = 
  | { type: 'SET_ACTIVE_CHAT'; payload: string }
  | { type: 'REMOVE_ACTIVE_CHAT'; payload: string }
  | { type: 'UPDATE_MESSAGES'; payload: { roomId: string; messages: any[] } }
  | { type: 'ADD_MESSAGE'; payload: { roomId: string; message: any } }
  | { type: 'UPDATE_UNREAD_COUNT'; payload: { roomId: string; count: number } }
  | { type: 'SET_TYPING'; payload: { roomId: string; userId: string; isTyping: boolean } }
  | { type: 'CLEAR_CACHE' };

const initialState: ChatState = {
  activeChats: new Set(),
  messageCache: new Map(),
  userCache: new Map(),
  unreadCounts: new Map(),
  typingUsers: new Map()
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_ACTIVE_CHAT':
      return {
        ...state,
        activeChats: new Set([...state.activeChats, action.payload])
      };
    
    case 'REMOVE_ACTIVE_CHAT':
      const newActiveChats = new Set(state.activeChats);
      newActiveChats.delete(action.payload);
      return {
        ...state,
        activeChats: newActiveChats
      };
    
    case 'UPDATE_MESSAGES':
      const newMessageCache = new Map(state.messageCache);
      newMessageCache.set(action.payload.roomId, action.payload.messages);
      return {
        ...state,
        messageCache: newMessageCache
      };
    
    case 'ADD_MESSAGE':
      const currentMessages = state.messageCache.get(action.payload.roomId) || [];
      const updatedMessages = [...currentMessages, action.payload.message];
      const updatedMessageCache = new Map(state.messageCache);
      updatedMessageCache.set(action.payload.roomId, updatedMessages);
      return {
        ...state,
        messageCache: updatedMessageCache
      };
    
    case 'UPDATE_UNREAD_COUNT':
      const newUnreadCounts = new Map(state.unreadCounts);
      newUnreadCounts.set(action.payload.roomId, action.payload.count);
      return {
        ...state,
        unreadCounts: newUnreadCounts
      };
    
    case 'SET_TYPING':
      const newTypingUsers = new Map(state.typingUsers);
      const roomTyping = newTypingUsers.get(action.payload.roomId) || new Set();
      
      if (action.payload.isTyping) {
        roomTyping.add(action.payload.userId);
      } else {
        roomTyping.delete(action.payload.userId);
      }
      
      newTypingUsers.set(action.payload.roomId, roomTyping);
      return {
        ...state,
        typingUsers: newTypingUsers
      };
    
    case 'CLEAR_CACHE':
      return initialState;
    
    default:
      return state;
  }
}

interface ChatContextValue {
  state: ChatState;
  setActiveChat: (roomId: string) => void;
  removeActiveChat: (roomId: string) => void;
  getCachedMessages: (roomId: string) => any[] | null;
  updateMessages: (roomId: string, messages: any[]) => void;
  addMessage: (roomId: string, message: any) => void;
  getUnreadCount: (roomId: string) => number;
  updateUnreadCount: (roomId: string, count: number) => void;
  setTyping: (roomId: string, userId: string, isTyping: boolean) => void;
  getTypingUsers: (roomId: string) => string[];
  batchMarkAsRead: (roomId: string, messageIds: string[]) => void;
  getCachedUser: (userId: string) => Promise<any>;
  preloadUsers: (userIds: string[]) => Promise<void>;
  clearCache: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { user } = useAuth();

  // Auto cleanup when user changes
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'CLEAR_CACHE' });
      userCacheService.clearCache();
    }
  }, [user?.uid]);

  const setActiveChat = useCallback((roomId: string) => {
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: roomId });
  }, []);

  const removeActiveChat = useCallback((roomId: string) => {
    dispatch({ type: 'REMOVE_ACTIVE_CHAT', payload: roomId });
  }, []);

  const getCachedMessages = useCallback((roomId: string): any[] | null => {
    return state.messageCache.get(roomId) || null;
  }, [state.messageCache]);

  const updateMessages = useCallback((roomId: string, messages: any[]) => {
    dispatch({ type: 'UPDATE_MESSAGES', payload: { roomId, messages } });
  }, []);

  const addMessage = useCallback((roomId: string, message: any) => {
    dispatch({ type: 'ADD_MESSAGE', payload: { roomId, message } });
  }, []);

  const getUnreadCount = useCallback((roomId: string): number => {
    return state.unreadCounts.get(roomId) || 0;
  }, [state.unreadCounts]);

  const updateUnreadCount = useCallback((roomId: string, count: number) => {
    dispatch({ type: 'UPDATE_UNREAD_COUNT', payload: { roomId, count } });
  }, []);

  const setTyping = useCallback((roomId: string, userId: string, isTyping: boolean) => {
    dispatch({ type: 'SET_TYPING', payload: { roomId, userId, isTyping } });
  }, []);

  const getTypingUsers = useCallback((roomId: string): string[] => {
    const typingSet = state.typingUsers.get(roomId);
    return typingSet ? Array.from(typingSet) : [];
  }, [state.typingUsers]);

  const batchMarkAsRead = useCallback((roomId: string, messageIds: string[]) => {
    if (!user?.uid) return;
    messageBatchService.batchMarkAsRead(roomId, messageIds, user.uid);
  }, [user?.uid]);

  const getCachedUser = useCallback(async (userId: string) => {
    return await userCacheService.getUser(userId);
  }, []);

  const preloadUsers = useCallback(async (userIds: string[]) => {
    await userCacheService.preloadUsers(userIds);
  }, []);

  const clearCache = useCallback(() => {
    dispatch({ type: 'CLEAR_CACHE' });
    userCacheService.clearCache();
    messageBatchService.flush();
  }, []);

  const value: ChatContextValue = {
    state,
    setActiveChat,
    removeActiveChat,
    getCachedMessages,
    updateMessages,
    addMessage,
    getUnreadCount,
    updateUnreadCount,
    setTyping,
    getTypingUsers,
    batchMarkAsRead,
    getCachedUser,
    preloadUsers,
    clearCache
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
