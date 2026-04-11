import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, ScrollView, FlatList, Dimensions, Alert, Modal } from 'react-native';
import { Image } from 'expo-image';
import { TextInput, Button, Chip } from 'react-native-paper';
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

// NSFW model assets (relative to this file)
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
  const [locationPrivacy, setLocationPrivacy] = useState('detailed'); // Default to detailed
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [nsfwModel, setNsfwModel] = useState(null);
  const router = useRouter();
  const { user } = useAuth();
  const { location, errorMsg, loading: locationLoading, address } = useContext(LocationContext);
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

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

  // Load NSFW model once with retry
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
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
          await loadModelWithRetry(retries - 1);
        } else {
          Alert.alert(t('common.error'), t('create_post.nsfw_model_load_error'));
        }
      }
    };
    loadModelWithRetry();
    return () => { isMounted = false; };
  }, []);

  // Updated classifyImageNSFW function
  const classifyImageNSFW = async (uri) => {
    if (!nsfwModel || !uri) {
      console.warn('NSFW model not loaded or invalid URI');
      return { isInappropriate: false, scores: {}, reason: 'Model not available' };
    }

    console.group(`NSFW check for: ${uri}`);
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

      const p = values[3] || 0; // Porn
      const h = values[1] || 0; // Hentai
      const s = values[4] || 0; // Sexy
      const n = values[2] || 0; // Neutral
      const d = values[0] || 0; // Drawing

      // New thresholds: more sensitive
      const isInappropriate =
        p >= 0.5 ||
        h >= 0.5 ||
        s >= 0.7 ||
        (p + h + s >= 0.8);

      // Detailed reason, show if above warning threshold
      const reasonParts = [];
      if (p >= 0.45) reasonParts.push(`Porn: ${(p * 100).toFixed(1)}%`);
      if (h >= 0.45) reasonParts.push(`Hentai: ${(h * 100).toFixed(1)}%`);
      if (s >= 0.6) reasonParts.push(`Sexy: ${(s * 100).toFixed(1)}%`);
      const reason = reasonParts.join(', ') || t('create_post.nsfw_safe');

      const scores = { p, h, s, n, d };
      console.log('Scores:', scores);
      console.log('Is inappropriate:', isInappropriate);
      console.log('Reason:', reason);

      return { isInappropriate, scores, reason };
    } catch (error) {
      console.error('NSFW classify error:', error);
      return { isInappropriate: true, scores: {}, reason: t('create_post.nsfw_process_error') }; // Fallback: block if error
    } finally {
      console.groupEnd();
    }
  };

  // Pick image and filter inappropriate images immediately
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
        if (res.isInappropriate) blocked.push({ idx: idx + 1, uri: selectedImages[idx], reason: res.reason });
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

  // Xóa ảnh khỏi danh sách
  const removeImage = (index) => {
    setImage((prev) => prev.filter((_, i) => i !== index));
  };

  const addCustomHashtag = () => {
    const hashtag = customHashtag.trim();
    if (hashtag.length > 1 && !selectedHashtags.includes(hashtag) && selectedHashtags.length < 10) {
      const newHashtags = [...selectedHashtags, hashtag];
      setSelectedHashtags(newHashtags);
      setCustomHashtag('');
      console.log('Successfully added hashtag:', hashtag);
      console.log('Updated hashtags array:', newHashtags);
      Alert.alert(t('common.success'), t('create_post.hashtag_added', { hashtag }));
    } else {
      console.log('Failed to add hashtag - conditions check:');
      console.log('- Length check (>1):', hashtag.length > 1);
      console.log('- Duplicate check:', !selectedHashtags.includes(hashtag));
      console.log('- Limit check (<10):', selectedHashtags.length < 10);

      let errorMessage = t('create_post.cannot_add_hashtag');
      if (hashtag.length <= 1) errorMessage = t('create_post.hashtag_too_short');
      else if (selectedHashtags.includes(hashtag)) errorMessage = t('create_post.hashtag_exists');
      else if (selectedHashtags.length >= 10) errorMessage = t('create_post.hashtag_limit');

      Alert.alert(t('create_post.notice'), errorMessage);
    }
  };

  // Function to format address based on privacy setting
  const formatAddressForPrivacy = (fullAddress) => {
    if (!fullAddress || locationPrivacy === 'none') return null;

    const addressParts = fullAddress.split(', ');

    switch (locationPrivacy) {
      case 'city':
        // Keep last two parts (city/province + country)
        return addressParts.slice(-2).join(', ');
      case 'district':
        // Keep last three parts (district + city/province + country)
        return addressParts.slice(-3).join(', ');
      case 'detailed':
        return fullAddress;
      default:
        return fullAddress;
    }
  };

  const getCurrentLocationDisplay = () => {
    const formattedAddress = formatAddressForPrivacy(address);

    if (locationPrivacy === 'none') {
      return t('create_post.location_hidden');
    }

    if (locationLoading) {
      return t('create_post.location_loading');
    }

    if (formattedAddress) {
      return formattedAddress;
    }

    if (errorMsg) {
      return errorMsg;
    }

    return t('create_post.location_unavailable');
  };

  const handleSave = async () => {
    if (!content.trim() && image.length === 0) {
      Alert.alert(t('create_post.notice'), t('create_post.empty_content_error'));
      return;
    }

    // Kiá»ƒm tra ná»™i dung (text)
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

    // Ná»™i dung sáº¡ch, tiáº¿p tá»¥c Ä‘Äƒng
    await proceedWithPost(content.trim());
  };

  const proceedWithPost = async (finalContent) => {
    setLoading(true);
    try {
      if (image.length > 0) {
        const results = await Promise.all(image.map((uri) => classifyImageNSFW(uri)));
        const bad = results
          .map((r, i) => ({ idx: i + 1, ...r }))
          .filter(r => r.isInappropriate);
        const warnings = results
          .map((r, i) => ({ idx: i + 1, ...r }))
          .filter((r) => !r.isInappropriate && r.reason !== t('create_post.nsfw_safe'));

        if (bad.length > 0) {
          const reasons = bad
            .map((r) => t('create_post.image_blocked_item', { index: r.idx, reason: r.reason }))
            .join('\n');
          Alert.alert(t('create_post.inappropriate_image_title'), t('create_post.cannot_post_images', { reasons }));
          return;
        }

        if (warnings.length > 0) {
          const warnReasons = warnings
            .map((r) => t('create_post.image_blocked_item', { index: r.idx, reason: r.reason }))
            .join('\n');
          Alert.alert(
            t('create_post.nsfw_warning_title'),
            t('create_post.nsfw_warning_message', { reasons: warnReasons }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('create_post.post_anyway'), onPress: () => uploadAndSave(finalContent) }
            ]
          );
          return;
        }
      }

      // Continue upload when no blocking issue exists
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

    // Merge hashtags extracted from content and selected chips
    const contentHashtags = extractHashtags(finalContent);
    const allHashtags = [...new Set([...contentHashtags, ...selectedHashtags])];

    console.log('Hashtag processing details:', {
      contentText: finalContent,
      extractedFromContent: contentHashtags,
      selectedHashtags: selectedHashtags,
      combinedHashtags: allHashtags,
      totalCount: allHashtags.length,
      selectedCount: selectedHashtags.length,
      contentCount: contentHashtags.length
    });

    // Create new post payload
    const formattedAddress = formatAddressForPrivacy(address);

    const newPost = {
      content: finalContent,
      hashtags: allHashtags,
      images: imageUrls,
      location: (location && locationPrivacy !== 'none') ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      } : null,
      address: formattedAddress,
      locationPrivacy: locationPrivacy,
      likes: [],
      comments: [],
      timestamp: serverTimestamp(),
      userID: user?.uid,
      username: user?.username || user?.displayName || 'Anonymous',
      privacy: 'public',
    };

    // Validate hashtags before save
    const validHashtags = allHashtags.filter(tag =>
      tag &&
      typeof tag === 'string' &&
      tag.startsWith('#') &&
      tag.length > 1
    );

    console.log('Creating post with data:', {
      content: newPost.content,
      originalHashtags: allHashtags,
      validHashtags: validHashtags,
      hashtagsCount: validHashtags.length,
      hashtagsType: typeof validHashtags,
      hashtagsIsArray: Array.isArray(validHashtags),
      address: newPost.address,
      locationPrivacy: newPost.locationPrivacy
    });

    // Keep only validated hashtags
    newPost.hashtags = validHashtags;

    // Thêm bài viết vào collection 'posts'
    const postRef = await addDoc(collection(db, 'posts'), newPost);

    // Update or create hashtag docs
    console.log('Updating hashtag documents for:', validHashtags);
    for (const tagItem of validHashtags) {
      const cleanTag = tagItem.toLowerCase();
      const tagDocRef = doc(collection(db, 'hashtags'), cleanTag);
      console.log(`Processing hashtag: ${tagItem} -> ${cleanTag}`);

      try {
        const tagDocSnap = await getDoc(tagDocRef);

        if (tagDocSnap.exists()) {
          await updateDoc(tagDocRef, {
            count: increment(1),
            posts: arrayUnion(postRef.id),
            lastUsed: serverTimestamp(),
          });
        } else {
          await setDoc(tagDocRef, {
            tag: cleanTag,
            count: 1,
            posts: [postRef.id],
            createdAt: serverTimestamp(),
            lastUsed: serverTimestamp(),
          });
        }
      } catch (error) {
        console.error(`Error updating hashtag ${cleanTag}:`, error);
      }
    }

    console.log('Post created successfully with ID:', postRef.id);
    console.log('Final hashtag stats updated for:', validHashtags);

    // Verify the post was saved correctly by reading it back
    try {
      const savedPostDoc = await getDoc(postRef);
      if (savedPostDoc.exists()) {
        const savedData = savedPostDoc.data();
        console.log('Post verification - saved data:', {
          id: savedPostDoc.id,
          hashtags: savedData.hashtags,
          hashtagsType: typeof savedData.hashtags,
          hashtagsIsArray: Array.isArray(savedData.hashtags),
          hashtagsLength: savedData.hashtags?.length
        });
      }
    } catch (verifyError) {
      console.error('Error verifying saved post:', verifyError);
    }

    Alert.alert(t('common.success'), t('create_post.post_success'), [
      { text: t('common.ok'), onPress: () => router.back() }
    ]);
  };

  const isButtonDisabled = (!content.trim() && image.length === 0) || loading;

  const removeHashtag = (hashtag) => {
    setSelectedHashtags((prev) => prev.filter((h) => h !== hashtag));
  };

  const addHashtag = (hashtag) => {
    if (!selectedHashtags.includes(hashtag) && selectedHashtags.length < 10) {
      setSelectedHashtags([...selectedHashtags, hashtag]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.secondary]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('create_post.title')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isButtonDisabled}
          style={[styles.postButton, { opacity: isButtonDisabled ? 0.5 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.postButtonText}>{t('create_post.post_button')}</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userInfoContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0)?.toUpperCase() || user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: currentThemeColors.text }]}>
              {user?.username || user?.displayName || t('create_post.anonymous')}
            </Text>
            <Text style={[styles.privacy, { color: currentThemeColors.subtleText }]}>
              {t('create_post.public')}
            </Text>
          </View>
        </View>

        {/* Content Input */}
        <View style={styles.contentContainer}>
          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            textColor={currentThemeColors.text}
            placeholder={t('create_post.placeholder')}
            placeholderTextColor={currentThemeColors.subtleText}
            activeUnderlineColor="transparent"
            underlineColor="transparent"
            style={[styles.textArea, { backgroundColor: currentThemeColors.background }]}
          />
        </View>

        {/* Selected Hashtags */}
        {selectedHashtags.length > 0 && (
          <View style={styles.selectedHashtagsContainer}>
            <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
              {t('create_post.selected_hashtags_count', { count: selectedHashtags.length })}
            </Text>
            <View style={styles.hashtagsRow}>
              {selectedHashtags.map((hashtag, index) => (
                <Chip
                  key={index}
                  onClose={() => removeHashtag(hashtag)}
                  style={[styles.selectedChip, { backgroundColor: Colors.primary + '20' }]}
                  textStyle={{ color: Colors.primary, fontSize: 12 }}
                >
                  {hashtag}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {/* Add Custom Hashtag */}
        <View style={styles.customHashtagContainer}>
          <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
            {t('create_post.add_custom_hashtag')}
          </Text>
          <View style={styles.customHashtagInput}>
            <TextInput
              value={customHashtag}
              onChangeText={(text) => {
                console.log('Input changed:', { from: customHashtag, to: text });
                // Xử lý input hashtag
                if (text === '') {
                  setCustomHashtag('');
                } else if (text.startsWith('#')) {
                  setCustomHashtag(text);
                } else {
                  // Auto-add # if user input does not include it
                  setCustomHashtag('#' + text);
                }
              }}
              placeholder={t('create_post.hashtag_placeholder')}
              placeholderTextColor={currentThemeColors.subtleText}
              textColor={currentThemeColors.text}
              activeUnderlineColor="transparent"
              underlineColor="transparent"
              style={[styles.hashtagInput, { backgroundColor: currentThemeColors.cardBackground }]}
              onSubmitEditing={addCustomHashtag}
              returnKeyType="done"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => {
                console.log('Adding custom hashtag:', customHashtag);
                addCustomHashtag();
              }}
              style={[
                styles.addHashtagButton,
                {
                  backgroundColor: (!customHashtag.trim() || selectedHashtags.length >= 10)
                    ? Colors.primary + '50'
                    : Colors.primary
                }
              ]}
              disabled={!customHashtag.trim() || selectedHashtags.length >= 10}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trending Hashtags */}
        <View style={styles.trendingContainer}>
          <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
            {t('create_post.trending_hashtags')}
          </Text>
          <View style={styles.hashtagsRow}>
            {(trendingHashtags.length > 0 ? trendingHashtags : POPULAR_HASHTAGS.slice(0, 10)).map((hashtag, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => addHashtag(hashtag)}
                disabled={selectedHashtags.includes(hashtag) || selectedHashtags.length >= 10}
              >
                <Chip
                  style={[
                    styles.trendingChip,
                    {
                      backgroundColor: selectedHashtags.includes(hashtag)
                        ? Colors.success + '30'
                        : currentThemeColors.cardBackground
                    }
                  ]}
                  textStyle={{
                    color: selectedHashtags.includes(hashtag)
                      ? Colors.success
                      : currentThemeColors.text,
                    fontSize: 12
                  }}
                >
                  {hashtag}
                </Chip>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Images */}
        {image.length > 0 && (
          <View style={styles.imageContainer}>
            <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
              {t('create_post.selected_images_count', { count: image.length })}
            </Text>
            {image.length === 1 ? (
              <View style={styles.singleImageContainer}>
                <Image source={{ uri: image[0] }} style={styles.singleImage} contentFit="cover" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(0)}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageGrid}>
                {image.slice(0, 4).map((uri, index) => (
                  <View key={index} style={styles.gridItem}>
                    <Image source={{ uri }} style={styles.gridImage} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={20} color={Colors.error} />
                    </TouchableOpacity>
                    {index === 3 && image.length > 4 && (
                      <View style={styles.overlay}>
                        <Text style={styles.overlayText}>+{image.length - 4}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentThemeColors.cardBackground }]}
            onPress={pickImage}
            disabled={loading || image.length >= 4}
          >
            <Ionicons name="camera" size={24} color={Colors.primary} />
            <Text style={[styles.actionButtonText, { color: currentThemeColors.text }]}>
              {image.length > 0
                ? t('create_post.images_count_button', { count: image.length })
                : t('create_post.add_image')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: currentThemeColors.cardBackground }]}
            onPress={() => setShowHashtagSuggestions(!showHashtagSuggestions)}
          >
          </TouchableOpacity>
        </View>

        {/* Location Privacy Settings */}
        <View style={styles.locationContainer}>
          <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
            {t('create_post.location_settings')}
          </Text>

          {/* Current Location Display */}
          <TouchableOpacity
            style={[styles.locationDisplay, { backgroundColor: currentThemeColors.cardBackground }]}
            onPress={() => setShowLocationOptions(!showLocationOptions)}
          >
            <Ionicons
              name={LOCATION_PRIVACY_OPTIONS.find(opt => opt.id === locationPrivacy)?.icon || 'location'}
              size={20}
              color={locationPrivacy === 'none' ? Colors.error : Colors.success}
            />
            <View style={styles.locationInfo}>
              <Text style={[styles.locationPrivacyLabel, { color: currentThemeColors.text }]}>
                {t(LOCATION_PRIVACY_OPTIONS.find(opt => opt.id === locationPrivacy)?.labelKey || 'create_post.location_detailed')}
              </Text>
              <Text style={[styles.locationPreview, { color: currentThemeColors.subtleText }]}>
                {locationLoading ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  getCurrentLocationDisplay()
                )}
              </Text>
            </View>
            <Ionicons
              name={showLocationOptions ? "chevron-up" : "chevron-down"}
              size={20}
              color={currentThemeColors.icon}
            />
          </TouchableOpacity>

          {/* Location Options */}
          {showLocationOptions && (
            <View style={[styles.locationOptionsContainer, { backgroundColor: currentThemeColors.cardBackground }]}>
              {LOCATION_PRIVACY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.locationOption,
                    locationPrivacy === option.id && { backgroundColor: Colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setLocationPrivacy(option.id);
                    setShowLocationOptions(false);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={locationPrivacy === option.id ? Colors.primary : currentThemeColors.icon}
                  />
                  <Text style={[
                    styles.locationOptionText,
                    {
                      color: locationPrivacy === option.id ? Colors.primary : currentThemeColors.text,
                      fontWeight: locationPrivacy === option.id ? '600' : '400'
                    }
                  ]}>
                    {t(option.labelKey)}
                  </Text>
                  {locationPrivacy === option.id && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  postButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  privacy: {
    fontSize: 12,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textArea: {
    fontSize: 18,
    lineHeight: 24,
    minHeight: 120,
    paddingHorizontal: 0,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedHashtagsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    marginBottom: 8,
  },
  customHashtagContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  customHashtagInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hashtagInput: {
    flex: 1,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  addHashtagButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  trendingChip: {
    marginBottom: 8,
  },
  imageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  singleImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  singleImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  gridItem: {
    width: (screenWidth - 40) / 2,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  overlayText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  locationInfo: {
    flex: 1,
  },
  locationPrivacyLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  locationPreview: {
    fontSize: 12,
    lineHeight: 16,
  },
  locationOptionsContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  locationOptionText: {
    fontSize: 14,
    flex: 1,
  },
});

export default CreatePostScreen;
