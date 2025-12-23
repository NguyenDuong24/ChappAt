// ============================================
// IMPORTS
// ============================================
let BadWordsFilter: any;
try {
  BadWordsFilter = require('bad-words');
  console.log('BadWordsFilter loaded:', typeof BadWordsFilter);
} catch (error) {
  console.error('Error loading bad-words:', error);
}

import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES & INTERFACES
// ============================================
interface ModerationResult {
  isClean: boolean;
  filteredText?: string;
  violationType?: 'profanity' | 'nsfw' | 'custom';
  confidence?: number;
  blockedWords?: string[];
}

export interface BadWordDocument {
  id: string;
  word: string;
  category: 'profanity' | 'custom' | 'spam' | 'adult' | 'violence' | 'other';
  language: 'vi' | 'en' | 'both';
  severity: 'low' | 'medium' | 'high';
  createdAt: any;
  isActive: boolean;
}

// ============================================
// CONTENT MODERATION SERVICE
// ============================================
class ContentModerationService {
  // ========== PROPERTIES ==========
  private filter: any;
  private firebaseBadWords: BadWordDocument[] = [];
  private isInitialized: boolean = false;
  private firestoreUnsubscribe?: () => void;
  
  private static readonly ENABLE_REALTIME_BADWORDS = false;
  
  private localCustomWords: string[] = [];
  private readonly LOCAL_WORDS_KEY = 'badWords_user_custom';
  
  private readonly CACHE_KEY = 'badWords_cache';
  private readonly CACHE_TIMESTAMP_KEY = 'badWords_cache_timestamp';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;
  private lastSyncTime: number = 0;
  private pendingSync: boolean = false;

  private defaultVietnameseBadWords: Array<{
    word: string;
    category: 'profanity' | 'custom' | 'spam' | 'adult' | 'violence' | 'other';
    severity: 'low' | 'medium' | 'high';
  }> = [
    // Profanity
    { word: 'súc vật', category: 'profanity', severity: 'medium' },
    { word: 'con chó', category: 'profanity', severity: 'medium' },
    { word: 'đồ khốn', category: 'profanity', severity: 'medium' },
    { word: 'mẹ kiếp', category: 'profanity', severity: 'high' },
    { word: 'đồ ngu', category: 'profanity', severity: 'low' },
    { word: 'ngu ngốc', category: 'profanity', severity: 'low' },
    { word: 'thằng ngu', category: 'profanity', severity: 'medium' },
    { word: 'con điên', category: 'profanity', severity: 'medium' },
    { word: 'đồ điên', category: 'profanity', severity: 'medium' },
    { word: 'khốn nạn', category: 'profanity', severity: 'medium' },
    { word: 'đồ chó', category: 'profanity', severity: 'medium' },
    { word: 'chó má', category: 'profanity', severity: 'medium' },
    { word: 'cút đi', category: 'profanity', severity: 'low' },
    { word: 'đi chết đi', category: 'violence', severity: 'high' },
    { word: 'tao', category: 'profanity', severity: 'low' },
    { word: 'mày', category: 'profanity', severity: 'low' },
    // Drugs
    { word: 'ma túy', category: 'other', severity: 'high' },
    { word: 'heroin', category: 'other', severity: 'high' },
    { word: 'cocaine', category: 'other', severity: 'high' },
    { word: 'cần sa', category: 'other', severity: 'high' },
    { word: 'thuốc lắc', category: 'other', severity: 'high' },
    { word: 'weed', category: 'other', severity: 'high' },
    { word: 'meth', category: 'other', severity: 'high' },
    // Violence
    { word: 'tự tử', category: 'violence', severity: 'high' },
    { word: 'giết', category: 'violence', severity: 'high' },
    { word: 'bom', category: 'violence', severity: 'high' },
    { word: 'khủng bố', category: 'violence', severity: 'high' },
    { word: 'bạo lực', category: 'violence', severity: 'high' },
    { word: 'kill', category: 'violence', severity: 'high' },
    { word: 'die', category: 'violence', severity: 'medium' },
    { word: 'suicide', category: 'violence', severity: 'high' },
    // Hate speech
    { word: 'phân biệt chủng tộc', category: 'other', severity: 'high' },
    { word: 'kỳ thị', category: 'other', severity: 'high' },
    { word: 'hitler', category: 'other', severity: 'high' },
    { word: 'nazi', category: 'other', severity: 'high' },
    { word: 'racism', category: 'other', severity: 'high' },
    // Spam
    { word: 'spam', category: 'spam', severity: 'medium' },
    { word: 'scam', category: 'spam', severity: 'high' },
    { word: 'fake', category: 'spam', severity: 'medium' },
    { word: 'hack', category: 'spam', severity: 'high' },
    { word: 'virus', category: 'spam', severity: 'high' },
    { word: 'bitcoin', category: 'spam', severity: 'low' },
    { word: 'cryptocurrency', category: 'spam', severity: 'low' },
    { word: 'investment scam', category: 'spam', severity: 'high' },
  ];

  // ========== CONSTRUCTOR ==========
  constructor() {
    try {
      const instance = this.createFilterInstance();
      if (!instance) {
        console.error('BadWordsFilter not available, using fallback');
        this.filter = null;
        this.isInitialized = true;
        this.initializeFilter();
        return;
      }

      this.filter = instance;
      console.log('Filter created successfully');
      
      const basicBadWords = ['fuck', 'shit', 'damn', 'cặc', 'đĩ', 'đụ', 'địt', 'lồn', 'buồi', 'vcl', 'dm'];
      this.filter.addWords(...basicBadWords);
      console.log(`Added ${basicBadWords.length} basic bad words to filter`);
      
      this.isInitialized = true;
      
      this.initializeFilter().catch(error => {
        console.error('Background initialization failed:', error);
      });

      return;
    } catch (e) {
      console.error('ContentModerationService constructor error:', e);
      this.filter = null;
      this.isInitialized = true;
    }
  }

  // ============================================
  // INITIALIZATION & SETUP
  // ============================================
  
  private async initializeFilter() {
    try {
      const inst = this.createFilterInstance();
      this.filter = inst;

      await this.loadLocalCustomWords();
      
      const cachedData = await this.loadFromCache();
      if (cachedData && this.isCacheValid(cachedData.timestamp)) {
        console.log('Using cached bad words data');
        this.firebaseBadWords = cachedData.words;
        this.updateFilter();
        this.isInitialized = true;
        
        this.syncWithFirebaseBackground();
      } else {
        console.log('Cache expired or empty, loading from Firestore');
        await this.loadBadWordsFromFirestore();
        
        if (ContentModerationService.ENABLE_REALTIME_BADWORDS) {
          this.setupFirestoreListener();
        }
      }
      
      console.log('Content moderation service initialized successfully');
    } catch (error) {
      console.error('Error initializing content moderation service:', error);
      
      const cachedData = await this.loadFromCache();
      if (cachedData) {
        console.log('Using cached data as fallback');
        this.firebaseBadWords = cachedData.words;
        this.updateFilter();
      } else {
        console.log('Using default words as fallback');
        this.setupDefaultFilter();
      }
    }
  }

  private setupDefaultFilter() {
    try {
      const inst = this.createFilterInstance();
      if (!inst) {
        console.warn('BadWordsFilter not available, using manual filtering');
        this.filter = null;
        return;
      }
      this.filter = inst;
      const defaultWords = this.defaultVietnameseBadWords.map(item => item.word);
      this.filter.addWords(...defaultWords);
      console.log(`Setup default filter with ${defaultWords.length} words`);
    } catch (error) {
      console.error('Error setting up default filter:', error);
      this.filter = null;
    }
  }

  private updateFilter(): void {
    try {
      const inst = this.createFilterInstance();
      this.filter = inst;
      const activeWords = this.firebaseBadWords
        .filter(word => word.isActive)
        .map(word => word.word);
      
      const combined = [...activeWords, ...(this.localCustomWords || [])];

      if (inst && combined.length > 0) {
        this.filter.addWords(...combined);
      }
      
      console.log(`Filter updated with ${combined.length} words (active + local)`);
    } catch (error) {
      console.error('Error updating filter:', error);
    }
  }

  // ============================================
  // BAD WORDS FILTER MANAGEMENT
  // ============================================

  private resolveBadWordsCtor(): any | null {
    try {
      if (!BadWordsFilter) return null;
      if (typeof BadWordsFilter === 'function') return BadWordsFilter;
      if (BadWordsFilter && typeof BadWordsFilter.default === 'function') {
        return BadWordsFilter.default;
      }
      if (BadWordsFilter && typeof BadWordsFilter.Filter === 'function') {
        return BadWordsFilter.Filter;
      }
      if (
        BadWordsFilter &&
        BadWordsFilter.default &&
        typeof BadWordsFilter.default.Filter === 'function'
      ) {
        return BadWordsFilter.default.Filter;
      }
      return null;
    } catch (e) {
      console.error('resolveBadWordsCtor error:', e);
      return null;
    }
  }

  private createFilterInstance(): any | null {
    const Ctor = this.resolveBadWordsCtor();
    if (!Ctor) return null;
    try {
      const inst = new Ctor();
      if (
        inst &&
        typeof inst.isProfane === 'function' &&
        typeof inst.clean === 'function' &&
        typeof inst.addWords === 'function'
      ) {
        return inst;
      }
      return null;
    } catch (e) {
      console.error('createFilterInstance error:', e);
      return null;
    }
  }

  // ============================================
  // TEXT MODERATION
  // ============================================

  private isProfane(text: string): boolean {
    const variants = this.normalizeTextVariants(text);

    if (this.filter && typeof this.filter.isProfane === 'function') {
      try {
        if (variants.some(v => this.filter.isProfane(v))) return true;
      } catch (error) {
        console.error('Error using bad-words filter:', error);
      }
    }

    return this.manualProfanityCheck(text);
  }

  private cleanText(text: string): string {
    if (this.filter && typeof this.filter.clean === 'function') {
      try {
        const cleaned = this.filter.clean(text);
        if (cleaned !== text) return cleaned;
      } catch (error) {
        console.error('Error using bad-words filter clean:', error);
      }
    }

    return this.manualCleanText(text);
  }

  private manualProfanityCheck(text: string): boolean {
    const lowerText = (text || '').toLowerCase();
    const variants = this.normalizeTextVariants(lowerText);
    const badWords = [
      'fuck', 'shit', 'damn', 'bitch', 'ass', 'crap',
      'cặc', 'đĩ', 'đụ', 'địt', 'lồn', 'buồi', 'vcl', 'dm', 'mẹ kiếp', 'chó má',
      'đồ ngu', 'con chó', 'súc vật', 'đồ khốn'
    ];

    if (badWords.some(w => variants.some(v => v.includes(w)))) return true;

    return badWords.some(w => this.buildObfuscationRegex(w).test(lowerText));
  }

  private manualCleanText(text: string): string {
    let cleanedText = text;
    const badWords = [
      'fuck', 'shit', 'damn', 'bitch', 'ass', 'crap',
      'cặc', 'đĩ', 'đụ', 'địt', 'lồn', 'buồi', 'vcl', 'dm', 'mẹ kiếp', 'chó má',
      'đồ ngu', 'con chó', 'súc vật', 'đồ khốn'
    ];

    badWords.forEach(badWord => {
      const direct = new RegExp(badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleanedText = cleanedText.replace(direct, '*'.repeat(badWord.length));
    });

    badWords.forEach(badWord => {
      const regex = this.buildObfuscationRegex(badWord);
      cleanedText = cleanedText.replace(regex, (m) => '*'.repeat(m.length));
    });

    return cleanedText;
  }

  async moderateText(text: string): Promise<ModerationResult> {
    if (!text || typeof text !== 'string') {
      return { isClean: true };
    }

    const normalizedText = text.toLowerCase().trim();
    
    if (this.isProfane(normalizedText)) {
      const filteredText = this.cleanText(text);
      const blockedWords = this.findBlockedWords(normalizedText);
      
      return {
        isClean: false,
        filteredText,
        violationType: 'profanity',
        blockedWords
      };
    }

    const customViolation = this.checkCustomRules(normalizedText);
    if (customViolation) {
      return {
        isClean: false,
        violationType: 'custom',
        blockedWords: customViolation
      };
    }

    return { isClean: true };
  }

  private findBlockedWords(text: string): string[] {
    const blockedWords: string[] = [];
    
    if (!this.isInitialized || !this.firebaseBadWords) {
      return blockedWords;
    }
    
    const normalizedText = text.toLowerCase();
    
    this.firebaseBadWords.forEach(badWordDoc => {
      if (badWordDoc.isActive && normalizedText.includes(badWordDoc.word.toLowerCase())) {
        blockedWords.push(badWordDoc.word);
      }
    });

    return blockedWords;
  }

  private checkCustomRules(text: string): string[] | null {
    const blockedPatterns = [
      /\b\d{10,11}\b/g,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      /https?:\/\/[^\s]+/g,
      /\b\d+[\.,]?\d*\s*(usd|dollar|bitcoin|btc|eth|usdt)\b/gi
    ];

    const violations: string[] = [];

    blockedPatterns.forEach((pattern, index) => {
      if (pattern.test(text)) {
        switch (index) {
          case 0:
            violations.push('Chứa số điện thoại');
            break;
          case 1:
            violations.push('Chứa email');
            break;
          case 2:
            violations.push('Chứa đường link');
            break;
          case 3:
            violations.push('Chứa thông tin tiền tệ nghi vấn');
            break;
        }
      }
    });

    return violations.length > 0 ? violations : null;
  }

  // ============================================
  // TEXT NORMALIZATION HELPERS
  // ============================================

  private normalizeTextVariants(text: string): string[] {
    const lower = (text || '').toLowerCase();
    const noZeroWidth = lower.replace(/[\u200B-\u200D\uFEFF]/g, '');
    const collapsed = noZeroWidth.replace(/[^\p{L}\p{N}]+/gu, '');

    const LEET_MAP: Record<string, string> = { 
      '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' 
    };
    const deLeet = noZeroWidth.replace(/[013457@\$!]/g, (ch) => LEET_MAP[ch] || ch);
    const deLeetCollapsed = deLeet.replace(/[^\p{L}\p{N}]+/gu, '');

    const dedup = noZeroWidth.replace(/(\p{L})\1{2,}/gu, '$1');
    const dedupCollapsed = dedup.replace(/[^\p{L}\p{N}]+/gu, '');

    const variants = Array.from(new Set([lower, noZeroWidth, collapsed, deLeet, deLeetCollapsed, dedup, dedupCollapsed]));
    return variants.filter(Boolean);
  }

  private buildObfuscationRegex(word: string): RegExp {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.split('').join('[^\p{L}\p{N}]?');
    return new RegExp(pattern, 'giu');
  }

  // ============================================
  // COMBINED MODERATION
  // ============================================

  async moderateContent(
    text?: string
  ): Promise<{
    textResult?: ModerationResult;
    isContentClean: boolean;
  }> {
    const results: any = {};

    if (text) {
      results.textResult = await this.moderateText(text);
    }

    const isContentClean = (
      (!results.textResult || results.textResult.isClean)
    );

    return {
      ...results,
      isContentClean
    };
  }

  generateWarningMessage(result: ModerationResult): string {
    if ('violationType' in result) {
      switch (result.violationType) {
        case 'profanity':
          return '⚠️ Tin nhắn chứa từ ngữ không phù hợp. Vui lòng sử dụng ngôn từ lịch sự.';
        case 'custom':
          return '⚠️ Tin nhắn chứa nội dung không được phép. Vui lòng kiểm tra lại.';
        default:
          return '⚠️ Tin nhắn không phù hợp với quy định cộng đồng.';
      }
    } else {
      return '⚠️ Nội dung không phù hợp.';
    }
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  private async loadFromCache(): Promise<{ words: BadWordDocument[]; timestamp: number } | null> {
    try {
      const cachedWords = await AsyncStorage.getItem(this.CACHE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(this.CACHE_TIMESTAMP_KEY);
      
      if (cachedWords && cachedTimestamp) {
        return {
          words: JSON.parse(cachedWords),
          timestamp: parseInt(cachedTimestamp)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return null;
    }
  }

  private async saveToCache(words: BadWordDocument[]): Promise<void> {
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(words));
      await AsyncStorage.setItem(this.CACHE_TIMESTAMP_KEY, timestamp.toString());
      this.lastSyncTime = timestamp;
      console.log('Bad words cached successfully');
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  private isCacheValid(timestamp: number): boolean {
    const now = Date.now();
    return (now - timestamp) < this.CACHE_DURATION;
  }

  async clearModerationCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.CACHE_KEY,
        this.CACHE_TIMESTAMP_KEY,
        this.LOCAL_WORDS_KEY,
      ]);
      this.firebaseBadWords = [];
      this.localCustomWords = [];
      this.filter = this.createFilterInstance();
      console.log('Cleared moderation caches and reinitialized filter');
      this.updateFilter();
    } catch (e) {
      console.error('clearModerationCache error:', e);
    }
  }

  // ============================================
  // FIRESTORE INTEGRATION
  // ============================================

  private async loadBadWordsFromFirestore(): Promise<void> {
    try {
      const badWordsRef = collection(db, 'badWords');
      const q = query(badWordsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      this.firebaseBadWords = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<BadWordDocument, 'id'>;
        const badWordDoc: BadWordDocument = {
          id: doc.id,
          ...data
        };
        
        this.firebaseBadWords.push(badWordDoc);
      });
      
      if (this.firebaseBadWords.length === 0) {
        await this.initializeDefaultWords();
      } else {
        this.updateFilter();
        await this.saveToCache(this.firebaseBadWords);
      }
      
      console.log(`Loaded ${this.firebaseBadWords.length} bad words from Firestore`);
    } catch (error) {
      console.error('Error loading bad words from Firestore:', error);
      throw error;
    }
  }

  private async initializeDefaultWords(): Promise<void> {
    try {
      const badWordsRef = collection(db, 'badWords');
      const batch = [];
      
      for (const defaultWord of this.defaultVietnameseBadWords) {
        const docData = {
          word: defaultWord.word,
          category: defaultWord.category,
          language: 'vi' as const,
          severity: defaultWord.severity,
          createdAt: serverTimestamp(),
          isActive: true
        };
        
        batch.push(addDoc(badWordsRef, docData));
      }
      
      await Promise.all(batch);
      console.log('Initialized default bad words in Firestore');
      
      await this.loadBadWordsFromFirestore();
    } catch (error) {
      console.error('Error initializing default words:', error);
      throw error;
    }
  }

  private setupFirestoreListener(): void {
    try {
      const badWordsRef = collection(db, 'badWords');
      const q = query(badWordsRef, orderBy('createdAt', 'desc'));
      
      this.firestoreUnsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Bad words collection updated, reloading...');
        
        this.firebaseBadWords = [];
        const wordsToAdd: string[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data() as Omit<BadWordDocument, 'id'>;
          const badWordDoc: BadWordDocument = {
            id: doc.id,
            ...data
          };
          
          this.firebaseBadWords.push(badWordDoc);
          
          if (badWordDoc.isActive) {
            wordsToAdd.push(badWordDoc.word);
          }
        });
        
        const inst = this.createFilterInstance();
        this.filter = inst;
        if (inst && wordsToAdd.length > 0) {
          this.filter.addWords(...wordsToAdd);
        }
        
        console.log(`Updated filter with ${wordsToAdd.length} active bad words`);
      });
    } catch (error) {
      console.error('Error setting up Firestore listener:', error);
    }
  }

  private async syncWithFirebaseBackground(): Promise<void> {
    if (this.pendingSync) return;
    
    this.pendingSync = true;
    
    try {
      console.log('Background sync with Firebase started...');
      
      const badWordsRef = collection(db, 'badWords');
      const q = query(badWordsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const freshWords: BadWordDocument[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<BadWordDocument, 'id'>;
        freshWords.push({
          id: doc.id,
          ...data
        });
      });
      
      if (JSON.stringify(freshWords) !== JSON.stringify(this.firebaseBadWords)) {
        console.log('Firebase data differs from cache, updating...');
        this.firebaseBadWords = freshWords;
        this.updateFilter();
        await this.saveToCache(freshWords);
      } else {
        console.log('Firebase data matches cache, no update needed');
        await AsyncStorage.setItem(this.CACHE_TIMESTAMP_KEY, Date.now().toString());
      }
      
    } catch (error) {
      console.error('Background sync failed:', error);
    } finally {
      this.pendingSync = false;
    }
  }

  // ============================================
  // CUSTOM BAD WORDS MANAGEMENT
  // ============================================

  async addCustomBadWords(
    words: string[], 
    category: 'profanity' | 'custom' | 'spam' | 'adult' | 'violence' | 'other' = 'custom', 
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    try {
      const badWordsRef = collection(db, 'badWords');
      const batch = [];
      
      for (const word of words) {
        const existingWord = this.firebaseBadWords.find(
          item => item.word.toLowerCase() === word.toLowerCase()
        );
        if (existingWord) {
          console.log(`Word "${word}" already exists, skipping...`);
          continue;
        }
        
        const docData = {
          word: word.trim().toLowerCase(),
          category,
          language: 'vi' as const,
          severity,
          createdAt: serverTimestamp(),
          isActive: true
        };
        
        batch.push(addDoc(badWordsRef, docData));
      }
      
      await Promise.all(batch);
      console.log(`Added ${batch.length} new bad words to Firestore`);
    } catch (error) {
      console.error('Error adding custom bad words:', error);
      throw error;
    }
  }

  async removeCustomBadWords(words: string[]): Promise<void> {
    try {
      const batch = [];
      
      for (const word of words) {
        const existingWord = this.firebaseBadWords.find(
          item => item.word.toLowerCase() === word.toLowerCase()
        );
        if (existingWord) {
          const docRef = doc(db, 'badWords', existingWord.id);
          batch.push(deleteDoc(docRef));
        }
      }
      
      await Promise.all(batch);
      console.log(`Removed ${batch.length} bad words from Firestore`);
    } catch (error) {
      console.error('Error removing bad words:', error);
      throw error;
    }
  }

  async toggleBadWordStatus(wordId: string, isActive: boolean): Promise<void> {
    try {
      const docRef = doc(db, 'badWords', wordId);
      await updateDoc(docRef, { isActive });
      console.log(`Updated word status: ${wordId} -> ${isActive}`);
    } catch (error) {
      console.error('Error toggling word status:', error);
      throw error;
    }
  }

  getCustomBadWords(): BadWordDocument[] {
    return [...this.firebaseBadWords];
  }

  getBadWordsByCategory(
    category: 'profanity' | 'custom' | 'spam' | 'adult' | 'violence' | 'other'
  ): BadWordDocument[] {
    return this.firebaseBadWords.filter(item => item.category === category);
  }

  getBadWordsBySeverity(severity: 'low' | 'medium' | 'high'): BadWordDocument[] {
    return this.firebaseBadWords.filter(item => item.severity === severity);
  }

  searchBadWords(searchTerm: string): BadWordDocument[] {
    const term = searchTerm.toLowerCase();
    return this.firebaseBadWords.filter(item => 
      item.word.toLowerCase().includes(term)
    );
  }

  // ============================================
  // LOCAL CUSTOM WORDS (USER-SPECIFIC)
  // ============================================

  private async loadLocalCustomWords(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(this.LOCAL_WORDS_KEY);
      this.localCustomWords = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('loadLocalCustomWords error:', e);
      this.localCustomWords = [];
    }
  }

  private async saveLocalCustomWords(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.LOCAL_WORDS_KEY, 
        JSON.stringify(this.localCustomWords)
      );
    } catch (e) {
      console.warn('saveLocalCustomWords error:', e);
    }
  }

  async addLocalWords(words: string[]): Promise<void> {
    const set = new Set([...(this.localCustomWords || [])]);
    words
      .map(w => w.trim().toLowerCase())
      .filter(Boolean)
      .forEach(w => set.add(w));
    this.localCustomWords = Array.from(set);
    await this.saveLocalCustomWords();
    this.updateFilter();
  }

  async removeLocalWords(words: string[]): Promise<void> {
    const blacklist = new Set(words.map(w => w.trim().toLowerCase()));
    this.localCustomWords = (this.localCustomWords || []).filter(
      w => !blacklist.has(w)
    );
    await this.saveLocalCustomWords();
    this.updateFilter();
  }

  // ============================================
  // UTILITY & DEBUG
  // ============================================

  debug(): void {
    console.log('=== Content Moderation Service Debug ===');
    console.log('BadWordsFilter available:', !!BadWordsFilter);
    console.log('isInitialized:', this.isInitialized);
    console.log('filter exists:', !!this.filter);
    console.log('filter type:', typeof this.filter);
    console.log('firebaseBadWords count:', this.firebaseBadWords.length);
    
    const testWords = ['fuck', 'cặc', 'đĩ', 'hello'];
    testWords.forEach(word => {
      try {
        const isProfane = this.isProfane(word);
        const cleaned = this.cleanText(word);
        console.log(`Test "${word}": isProfane=${isProfane}, cleaned="${cleaned}"`);
      } catch (error) {
        console.error(`Error testing "${word}":`, error);
      }
    });
    
    console.log('=== End Debug ===');
  }

  /**
   * Getter để kiểm tra service đã ready chưa
   */
  isReady(): boolean {
    return this.isInitialized && !!this.filter;
  }

  /**
   * Resolve constructor của bad-words theo mọi kiểu export có thể
   */
  private resolveBadWordsCtor(): any | null {
    try {
      if (!BadWordsFilter) return null;
      // CJS: export trực tiếp là constructor
      if (typeof BadWordsFilter === 'function') return BadWordsFilter;
      // ESM default export là constructor
      if (BadWordsFilter && typeof BadWordsFilter.default === 'function') {
        return BadWordsFilter.default;
      }
      // Một số bundler export dưới dạng { Filter }
      if (BadWordsFilter && typeof BadWordsFilter.Filter === 'function') {
        return BadWordsFilter.Filter;
      }
      // nested default.Filter
      if (
        BadWordsFilter &&
        BadWordsFilter.default &&
        typeof BadWordsFilter.default.Filter === 'function'
      ) {
        return BadWordsFilter.default.Filter;
      }
      return null;
    } catch (e) {
      console.error('resolveBadWordsCtor error:', e);
      return null;
    }
  }

  /**
   * Tạo instance filter một cách an toàn
   */
  private createFilterInstance(): any | null {
    const Ctor = this.resolveBadWordsCtor();
    if (!Ctor) return null;
    try {
      const inst = new Ctor();
      // Validate methods
      if (
        inst &&
        typeof inst.isProfane === 'function' &&
        typeof inst.clean === 'function' &&
        typeof inst.addWords === 'function'
      ) {
        return inst;
      }
      return null;
    } catch (e) {
      console.error('createFilterInstance error:', e);
      return null;
    }
  }

  private async loadLocalCustomWords(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(this.LOCAL_WORDS_KEY);
      this.localCustomWords = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('loadLocalCustomWords error:', e);
      this.localCustomWords = [];
    }
  }

  private async saveLocalCustomWords(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.LOCAL_WORDS_KEY, JSON.stringify(this.localCustomWords));
    } catch (e) {
      console.warn('saveLocalCustomWords error:', e);
    }
  }

  async addLocalWords(words: string[]): Promise<void> {
    const set = new Set([...(this.localCustomWords || [])]);
    words.map(w => w.trim().toLowerCase()).filter(Boolean).forEach(w => set.add(w));
    this.localCustomWords = Array.from(set);
    await this.saveLocalCustomWords();
    this.updateFilter();
  }

  async removeLocalWords(words: string[]): Promise<void> {
    const blacklist = new Set(words.map(w => w.trim().toLowerCase()));
    this.localCustomWords = (this.localCustomWords || []).filter(w => !blacklist.has(w));
    await this.saveLocalCustomWords();
    this.updateFilter();
  }

  /**
   * Xóa mọi cache/bộ nhớ cục bộ của moderation để reset lại hoàn toàn
   */
  async clearModerationCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.CACHE_KEY,
        this.CACHE_TIMESTAMP_KEY,
        this.LOCAL_WORDS_KEY,
      ]);
      this.firebaseBadWords = [];
      this.localCustomWords = [];
      this.filter = this.createFilterInstance();
      console.log('Cleared moderation caches and reinitialized filter');
      this.updateFilter();
    } catch (e) {
      console.error('clearModerationCache error:', e);
    }
  }

  /**
   * Chuẩn hóa và tạo các biến thể để phát hiện nội dung bị che giấu
   */
  private normalizeTextVariants(text: string): string[] {
    const lower = (text || '').toLowerCase();

    // Loại bỏ ký tự vô hình (zero-width)
    const noZeroWidth = lower.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Bản loại bỏ khoảng trắng và ký tự không phải chữ/số
    const collapsed = noZeroWidth.replace(/[^\p{L}\p{N}]+/gu, '');

    // Thay thế leet-speak phổ biến
    const LEET_MAP: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
    const deLeet = noZeroWidth.replace(/[013457@\$!]/g, (ch) => LEET_MAP[ch] || ch);
    const deLeetCollapsed = deLeet.replace(/[^\p{L}\p{N}]+/gu, '');

    // Rút gọn ký tự lặp (fuuuuck -> fuck)
    const dedup = noZeroWidth.replace(/(\p{L})\1{2,}/gu, '$1');
    const dedupCollapsed = dedup.replace(/[^\p{L}\p{N}]+/gu, '');

    const variants = Array.from(new Set([lower, noZeroWidth, collapsed, deLeet, deLeetCollapsed, dedup, dedupCollapsed]));
    return variants.filter(Boolean);
  }

  /**
   * Tạo regex để bắt biến thể có ký tự chen giữa các chữ (f.u-c k, f u c k, f**ck)
   */
  private buildObfuscationRegex(word: string): RegExp {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.split('').join('[^\p{L}\p{N}]?');
    return new RegExp(pattern, 'giu');
  }
}

// Export singleton instance
export default new ContentModerationService();
export { ContentModerationService, ModerationResult };