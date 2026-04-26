import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, ScrollView, FlatList, Dimensions, Alert, Modal, TextInput as RNTextInput } from 'react-native';
import { Image } from 'expo-image';
import { Button, Chip } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  addDoc, collection, serverTimestamp, getDoc, setDoc, updateDoc, doc, increment, arrayUnion, query, orderBy, limit, getDocs
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { uploadLocalFileToStorage } from '@/utils/storageUpload';
import { useAuth } from '@/context/authContext';
import { LocationContext } from '@/context/LocationContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import contentModerationService from '@/services/contentModerationService';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { decode as atob } from 'base-64';
import { useTranslation } from 'react-i18next';
import { LiquidSurface, getLiquidPalette } from '@/components/liquid';
import LiquidScreen from '@/components/liquid/LiquidScreen';

const { width: screenWidth } = Dimensions.get('window');

// Extract hashtags from post content
const extractHashtags = (text) => {
  const regex = /#[\p{L}\p{N}_]+/gu;
  return text.match(regex) || [];
};

// Popular hashtag list
const POPULAR_HASHTAGS = [
  '#vietnam', '#saigon', '#hanoi', '#travel', '#food', '#photography',
  '#lifestyle', '#fashion', '#beauty', '#coffee', '#sunset', '#beach',
  '#friends', '#family', '#love', '#happy', '#motivation', '#workout',
  '#nature', '#art', '#music', '#weekend', '#selfie', '#street',
  '#culture', '#adventure', '#memories', '#inspiration', '#goals', '#success'
];

// Location privacy options
const LOCATION_PRIVACY_OPTIONS = [
  { id: 'none', labelKey: 'create_post.location_none', icon: 'eye-off' },
  { id: 'city', labelKey: 'create_post.location_city', icon: 'location' },
  { id: 'district', labelKey: 'create_post.location_district', icon: 'location' },
  { id: 'detailed', labelKey: 'create_post.location_detailed', icon: 'location' }
];

// NSFW model assets
const NSFW_MODEL_JSON = require('@/assets/model/model.json');
const NSFW_MODEL_WEIGHTS = [require('@/assets/model/group1-shard1of1.bin')];
const PIC_INPUT_SHAPE = { width: 224, height: 224 };
const NSFW_CLASSES = { 0: 'Drawing', 1: 'Hentai', 2: 'Neutral', 3: 'Porn', 4: 'Sexy' };

function imageToTensor(rawImageData) {
  try {
    const TO_UINT8ARRAY = true;
    const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY);
    const buffer = new Uint8Array(width * height * 3);
    let offset = 0;
    for (let i = 0; i < buffer.length; i += 3) {
      buffer[i] = data[offset];
      buffer[i + 1] = data[offset + 1];
      buffer[i + 2] = data[offset + 2];
      offset += 4;
    }
    return tf.tidy(() => tf.tensor4d(buffer, [1, height, width, 3]).div(255));
  } catch (error) {
    console.error('Error in imageToTensor:', error);
    throw error;
  }
}

async function getTopKClasses(logits, topK = 5) {
  const values = await logits.data();
  const valuesAndIndices = [];
  for (let i = 0; i < values.length; i++) valuesAndIndices.push({ value: values[i], index: i });
  valuesAndIndices.sort((a, b) => b.value - a.value);
  const top = valuesAndIndices.slice(0, topK);
  return top.map(({ value, index }) => ({ className: NSFW_CLASSES[index], probability: value }));
}

const CreatePostScreen = () => {
  const { t } = useTranslation();
  const [tag, setTag] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [customHashtag, setCustomHashtag] = useState('');
  const [locationPrivacy, setLocationPrivacy] = useState('detailed');
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [nsfwModel, setNsfwModel] = useState(null);
  const router = useRouter();
  const { user } = useAuth();
  const { location, errorMsg, loading: locationLoading, address } = useContext(LocationContext);
  
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const isDark = themeContext?.isDark ?? (theme === 'dark');
  const palette = React.useMemo(() => themeContext?.palette || getLiquidPalette(theme), [theme, themeContext]);

  // Fetch trending hashtags
  useEffect(() => {
    const fetchTrendingHashtags = async () => {
      try {
        const hashtagsQuery = query(
          collection(db, 'hashtags'),
          orderBy('count', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(hashtagsQuery);
        const trending = snapshot.docs.map(doc => doc.id);
        setTrendingHashtags(trending);
      } catch (error) {
        console.error('Error fetching trending hashtags:', error);
        setTrendingHashtags(POPULAR_HASHTAGS.slice(0, 10));
      }
    };
    fetchTrendingHashtags();
  }, []);

  // Load NSFW model
  useEffect(() => {
    let isMounted = true;
    const loadModelWithRetry = async (retries = 3) => {
      try {
        await tf.ready();
        const model = await tf.loadLayersModel(bundleResourceIO(NSFW_MODEL_JSON, NSFW_MODEL_WEIGHTS));
        if (isMounted) setNsfwModel(model);
      } catch (e) {
        console.error('NSFW model load error (attempt ' + (4 - retries) + '):', e);
        if (retries > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await loadModelWithRetry(retries - 1);
        } else {
          Alert.alert(t('common.error'), t('create_post.nsfw_model_load_error'));
        }
      }
    };
    loadModelWithRetry();
    return () => { isMounted = false; };
  }, []);

  const classifyImageNSFW = async (uri) => {
    if (!nsfwModel || !uri) return { isInappropriate: false, scores: {}, reason: 'Model not available' };
    try {
      const resized = await manipulateAsync(
        uri,
        [{ resize: { width: PIC_INPUT_SHAPE.width, height: PIC_INPUT_SHAPE.height } }],
        { format: 'jpeg', base64: true }
      );
      const base64 = resized.base64;
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const input = imageToTensor(bytes);
      const logits = nsfwModel.predict(input);
      const values = await logits.data();
      logits.dispose();
      input.dispose();

      const p = values[3] || 0;
      const h = values[1] || 0;
      const s = values[4] || 0;
      const isInappropriate = p >= 0.5 || h >= 0.5 || s >= 0.7 || (p + h + s >= 0.8);
      
      const reasonParts = [];
      if (p >= 0.45) reasonParts.push(`Porn: ${(p * 100).toFixed(1)}%`);
      if (h >= 0.45) reasonParts.push(`Hentai: ${(h * 100).toFixed(1)}%`);
      if (s >= 0.6) reasonParts.push(`Sexy: ${(s * 100).toFixed(1)}%`);
      const reason = reasonParts.join(', ') || t('create_post.nsfw_safe');

      return { isInappropriate, scores: { p, h, s }, reason };
    } catch (error) {
      console.error('NSFW classify error:', error);
      return { isInappropriate: true, scores: {}, reason: t('create_post.nsfw_process_error') };
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.8,
      selectionLimit: 4,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const selectedImages = result.assets.map((asset) => asset.uri);
      setLoading(true);
      const checks = await Promise.all(selectedImages.map((uri) => classifyImageNSFW(uri)));
      setLoading(false);
      const safeUris = [];
      const blocked = [];
      checks.forEach((res, idx) => {
        if (res.isInappropriate) blocked.push({ idx: idx + 1, reason: res.reason });
        else safeUris.push(selectedImages[idx]);
      });
      if (blocked.length) {
        const reasons = blocked
          .map((b) => t('create_post.image_blocked_item', { index: b.idx, reason: b.reason || t('create_post.not_suitable') }))
          .join('\n');
        Alert.alert(t('create_post.image_not_suitable_title'), t('create_post.image_blocked_message', { reasons }));
      }
      setImage(safeUris);
    }
  };

  const removeImage = (index) => {
    setImage((prev) => prev.filter((_, i) => i !== index));
  };

  const addCustomHashtag = () => {
    const hashtag = customHashtag.trim();
    if (hashtag.length > 1 && !selectedHashtags.includes(hashtag) && selectedHashtags.length < 10) {
      setSelectedHashtags([...selectedHashtags, hashtag]);
      setCustomHashtag('');
      Alert.alert(t('common.success'), t('create_post.hashtag_added', { hashtag }));
    } else {
      let errorMessage = t('create_post.cannot_add_hashtag');
      if (hashtag.length <= 1) errorMessage = t('create_post.hashtag_too_short');
      else if (selectedHashtags.includes(hashtag)) errorMessage = t('create_post.hashtag_exists');
      else if (selectedHashtags.length >= 10) errorMessage = t('create_post.hashtag_limit');
      Alert.alert(t('create_post.notice'), errorMessage);
    }
  };

  const formatAddressForPrivacy = (fullAddress) => {
    if (!fullAddress || locationPrivacy === 'none') return null;
    const addressParts = fullAddress.split(', ');
    switch (locationPrivacy) {
      case 'city': return addressParts.slice(-2).join(', ');
      case 'district': return addressParts.slice(-3).join(', ');
      default: return fullAddress;
    }
  };

  const getCurrentLocationDisplay = () => {
    const formattedAddress = formatAddressForPrivacy(address);
    if (locationPrivacy === 'none') return t('create_post.location_hidden');
    if (locationLoading) return t('create_post.location_loading');
    if (formattedAddress) return formattedAddress;
    if (errorMsg) return errorMsg;
    return t('create_post.location_unavailable');
  };

  const handleSave = async () => {
    if (!content.trim() && image.length === 0) {
      Alert.alert(t('create_post.notice'), t('create_post.empty_content_error'));
      return;
    }

    if (content.trim()) {
      try {
        const moderationResult = await contentModerationService.moderateText(content.trim());
        if (!moderationResult.isClean) {
          const warningMessage = contentModerationService.generateWarningMessage(moderationResult);
          Alert.alert(
            t('create_post.inappropriate_content_title'),
            warningMessage,
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('create_post.edit'), onPress: () => setContent(moderationResult.filteredText || content) },
              { text: t('create_post.post_with_filtered_content'), onPress: () => proceedWithPost(moderationResult.filteredText || content.trim()) }
            ]
          );
          return;
        }
      } catch (error) {
        console.error('Error moderating content:', error);
      }
    }
    await proceedWithPost(content.trim());
  };

  const proceedWithPost = async (finalContent) => {
    setLoading(true);
    try {
      if (image.length > 0) {
        const results = await Promise.all(image.map((uri) => classifyImageNSFW(uri)));
        const bad = results.filter(r => r.isInappropriate);
        if (bad.length > 0) {
          const reasons = bad.map((r, i) => t('create_post.image_blocked_item', { index: i + 1, reason: r.reason })).join('\n');
          Alert.alert(t('create_post.inappropriate_image_title'), t('create_post.cannot_post_images', { reasons }));
          return;
        }
      }
      await uploadAndSave(finalContent);
    } catch (error) {
      console.error('Error in proceedWithPost:', error);
      Alert.alert(t('common.error'), t('create_post.nsfw_check_error'));
    } finally {
      setLoading(false);
    }
  };

  const uploadAndSave = async (finalContent) => {
    let imageUrls = [];
    if (image.length > 0) {
      const uploadPromises = image.map(async (uri, index) => {
        return uploadLocalFileToStorage({
          uri,
          path: `images/${user?.uid}/${Date.now()}_${index}.jpg`,
          contentType: 'image/jpeg',
        });
      });
      imageUrls = await Promise.all(uploadPromises);
    }

    const contentHashtags = extractHashtags(finalContent);
    const allHashtags = [...new Set([...contentHashtags, ...selectedHashtags])];
    const validHashtags = allHashtags.filter(tag => tag && tag.startsWith('#') && tag.length > 1);

    const newPost = {
      content: finalContent,
      hashtags: validHashtags,
      images: imageUrls,
      location: (location && locationPrivacy !== 'none') ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      } : null,
      address: formatAddressForPrivacy(address),
      locationPrivacy,
      likes: [],
      comments: [],
      timestamp: serverTimestamp(),
      userID: user?.uid,
      username: user?.username || user?.displayName || 'Anonymous',
      privacy: 'public',
    };

    const postRef = await addDoc(collection(db, 'posts'), newPost);
    for (const tagItem of validHashtags) {
      const cleanTag = tagItem.toLowerCase();
      const tagDocRef = doc(collection(db, 'hashtags'), cleanTag);
      try {
        const tagDocSnap = await getDoc(tagDocRef);
        if (tagDocSnap.exists()) {
          await updateDoc(tagDocRef, { count: increment(1), posts: arrayUnion(postRef.id), lastUsed: serverTimestamp() });
        } else {
          await setDoc(tagDocRef, { tag: cleanTag, count: 1, posts: [postRef.id], createdAt: serverTimestamp(), lastUsed: serverTimestamp() });
        }
      } catch (error) { console.error(`Error updating hashtag ${cleanTag}:`, error); }
    }

    Alert.alert(t('common.success'), t('create_post.post_success'), [
      { text: t('common.ok'), onPress: () => router.back() }
    ]);
  };

  const isButtonDisabled = (!content.trim() && image.length === 0) || loading;

  return (
    <LiquidScreen themeMode={theme}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textColor }]}>{t('create_post.title')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isButtonDisabled}
          style={[styles.postButton, { opacity: isButtonDisabled ? 0.5 : 1, backgroundColor: palette.sphereGradient[0] }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.postButtonText}>{t('create_post.post_button')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <LiquidSurface themeMode={theme} borderRadius={24} intensity={isDark ? 5 : 10} style={styles.mainSurface}>
          {/* User Info */}
          <View style={styles.userInfoContainer}>
            <View style={[styles.avatar, { backgroundColor: palette.sphereGradient[0] }]}>
              <Text style={styles.avatarText}>
                {user?.username?.charAt(0)?.toUpperCase() || user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.username, { color: palette.textColor }]}>
                {user?.username || user?.displayName || t('create_post.anonymous')}
              </Text>
              <Text style={[styles.privacy, { color: palette.subtitleColor }]}>
                {t('create_post.public')}
              </Text>
            </View>
          </View>

          {/* Content Input */}
          <View style={[styles.contentContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <RNTextInput
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              numberOfLines={6}
              placeholder={t('create_post.placeholder')}
              placeholderTextColor={palette.subtitleColor}
              style={[styles.textArea, { color: palette.textColor, backgroundColor: 'transparent' }]}
            />
          </View>

          {/* Images */}
          {image.length > 0 && (
            <View style={styles.imageContainer}>
              <View style={styles.imageGrid}>
                {image.map((uri, index) => (
                  <View key={index} style={styles.gridItem}>
                    <Image source={{ uri }} style={styles.gridImage} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
              onPress={pickImage}
              disabled={loading || image.length >= 4}
            >
              <LinearGradient
                colors={palette.sphereGradient}
                style={styles.iconGradientBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="images" size={16} color="#fff" />
              </LinearGradient>
              <Text style={[styles.actionButtonText, { color: palette.textColor }]}>
                {t('create_post.add_image')} {image.length > 0 ? `(${image.length}/4)` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </LiquidSurface>

        {/* Hashtags Section */}
        <LiquidSurface themeMode={theme} borderRadius={24} intensity={isDark ? 5 : 10} style={styles.hashtagSurface}>
          <Text style={[styles.sectionTitle, { color: palette.textColor }]}>
            {t('create_post.hashtags')}
          </Text>
          
          <View style={[styles.customHashtagInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 24, paddingLeft: 16, paddingRight: 4, paddingVertical: 4, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <Ionicons name="pricetag-outline" size={18} color={palette.subtitleColor} />
            <RNTextInput
              value={customHashtag}
              onChangeText={(text) => setCustomHashtag(text.startsWith('#') || text === '' ? text : '#' + text)}
              placeholder={t('create_post.hashtag_placeholder')}
              placeholderTextColor={palette.subtitleColor}
              style={[styles.hashtagInput, { color: palette.textColor, marginLeft: 8 }]}
              onSubmitEditing={addCustomHashtag}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={addCustomHashtag} style={[styles.addHashtagButton, { backgroundColor: palette.sphereGradient[0] }]}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {selectedHashtags.length > 0 && (
            <View style={styles.hashtagsRow}>
              {selectedHashtags.map((hashtag, index) => (
                <Chip
                  key={index}
                  onClose={() => setSelectedHashtags(selectedHashtags.filter(h => h !== hashtag))}
                  style={[styles.chip, { backgroundColor: palette.sphereGradient[0] + '20' }]}
                  textStyle={{ color: palette.sphereGradient[0], fontSize: 12 }}
                >
                  {hashtag}
                </Chip>
              ))}
            </View>
          )}

          <Text style={[styles.subSectionTitle, { color: palette.subtitleColor, marginTop: 12 }]}>
            {t('create_post.trending_hashtags')}
          </Text>
          <View style={styles.hashtagsRow}>
            {(trendingHashtags.length > 0 ? trendingHashtags : POPULAR_HASHTAGS.slice(0, 10)).map((hashtag, index) => (
              <TouchableOpacity key={index} onPress={() => !selectedHashtags.includes(hashtag) && setSelectedHashtags([...selectedHashtags, hashtag])}>
                <Chip
                  style={[styles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                  textStyle={{ color: palette.textColor, fontSize: 11 }}
                >
                  {hashtag}
                </Chip>
              </TouchableOpacity>
            ))}
          </View>
        </LiquidSurface>

        {/* Location Section */}
        <LiquidSurface themeMode={theme} borderRadius={24} intensity={isDark ? 5 : 10} style={styles.locationSurface}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { color: palette.textColor, marginBottom: 0 }]}>
              {t('create_post.location_settings')}
            </Text>
            <TouchableOpacity onPress={() => setShowLocationOptions(!showLocationOptions)}>
               <Ionicons name={showLocationOptions ? "chevron-up" : "chevron-down"} size={20} color={palette.subtitleColor} />
            </TouchableOpacity>
          </View>

          <View style={[styles.locationDisplay, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
            <Ionicons
              name={LOCATION_PRIVACY_OPTIONS.find(opt => opt.id === locationPrivacy)?.icon || 'location'}
              size={18}
              color={locationPrivacy === 'none' ? Colors.error : Colors.success}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.textColor, fontWeight: '600', fontSize: 13 }}>
                {t(LOCATION_PRIVACY_OPTIONS.find(opt => opt.id === locationPrivacy)?.labelKey || 'create_post.location_detailed')}
              </Text>
              <Text style={{ color: palette.subtitleColor, fontSize: 11 }} numberOfLines={1}>
                {getCurrentLocationDisplay()}
              </Text>
            </View>
          </View>

          {showLocationOptions && (
            <View style={styles.locationOptions}>
              {LOCATION_PRIVACY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.locationOption, locationPrivacy === option.id && { backgroundColor: palette.sphereGradient[0] + '15' }]}
                  onPress={() => { setLocationPrivacy(option.id); setShowLocationOptions(false); }}
                >
                  <Text style={[styles.locationOptionText, { color: locationPrivacy === option.id ? palette.sphereGradient[0] : palette.textColor }]}>
                    {t(option.labelKey)}
                  </Text>
                  {locationPrivacy === option.id && <Ionicons name="checkmark" size={16} color={palette.sphereGradient[0]} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </LiquidSurface>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LiquidScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  mainSurface: {
    padding: 16,
    marginBottom: 16,
  },
  hashtagSurface: {
    padding: 16,
    marginBottom: 16,
  },
  locationSurface: {
    padding: 16,
    marginBottom: 16,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
  },
  privacy: {
    fontSize: 11,
  },
  contentContainer: {
    marginBottom: 16,
  },
  textArea: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 100,
    paddingHorizontal: 0,
  },
  imageContainer: {
    marginBottom: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: (screenWidth - 72) / 2,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
  },
  actionRow: {
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 8,
    paddingRight: 16,
  },
  iconGradientBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  customHashtagInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hashtagInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
  },
  addHashtagButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    height: 32,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  locationOptions: {
    marginTop: 8,
    gap: 4,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
  },
  locationOptionText: {
    fontSize: 13,
  },
});

export default CreatePostScreen;
