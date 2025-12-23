import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import vi from './vi.json';

const LANGUAGE_KEY = 'user-language';

const languageDetector = {
    type: 'languageDetector',
    async: true,
    detect: async (callback) => {
        try {
            const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
            if (savedLanguage) {
                return callback(savedLanguage);
            }

            let locale = 'vi';
            try {
                // Use require to avoid top-level native module issues
                const Localization = require('expo-localization');
                if (Localization && typeof Localization.getLocales === 'function') {
                    const locales = Localization.getLocales();
                    if (locales && locales.length > 0 && locales[0].languageCode) {
                        locale = locales[0].languageCode;
                    }
                }
            } catch (e) {
                console.log('Error getting locales', e);
            }
            callback(locale === 'vi' ? 'vi' : 'en');
        } catch (error) {
            console.log('Error reading language', error);
            callback('vi');
        }
    },
    init: () => { },
    cacheUserLanguage: async (language) => {
        try {
            await AsyncStorage.setItem(LANGUAGE_KEY, language);
        } catch (error) {
            console.log('Error saving language', error);
        }
    },
};

i18next
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            vi: { translation: vi },
        },
        fallbackLng: 'vi',
        compatibilityJSON: 'v3',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18next;
