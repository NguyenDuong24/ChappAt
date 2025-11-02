import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal as RNModal,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Text, Button, TextInput, Chip } from 'react-native-paper';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebaseConfig';
import { nanoid } from 'nanoid';
import FriendSelectionList from '../friends/FriendSelectionList';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onGroupCreated: (group: any) => void;
  currentUser: any;
}

const CreateGroupModal = ({
  visible,
  onClose,
  onGroupCreated,
  currentUser,
}: CreateGroupModalProps) => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme || 'light';
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<{ name?: string; members?: string }>({});
  const [uidInput, setUidInput] = useState('');
  const [uidAdding, setUidAdding] = useState(false);
  const [uidError, setUidError] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<Record<string, { displayName?: string; photoURL?: string }>>({});

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const validateStep1 = () => {
    const newErrors: { name?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập tên nhóm';
    } else if (name.length < 3) {
      newErrors.name = 'Tên nhóm phải có ít nhất 3 ký tự';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: { members?: string } = {};
    
    if (selectedFriends.length === 0) {
      newErrors.members = 'Vui lòng chọn ít nhất một thành viên';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleCreate = async () => {
    if (!validateStep2()) return;
    
    try {
      setLoading(true);
      
      let photoURL = '';
      if (image) {
        const response = await fetch(image);
        const blob = await response.blob();
        const imageRef = ref(storage, `groups/${nanoid()}`);
        await uploadBytes(imageRef, blob);
        photoURL = await getDownloadURL(imageRef);
      }

      const groupData = {
        name: name.trim(),
        description: description.trim(),
        photoURL,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: [currentUser.uid, ...selectedFriends],
        admins: [currentUser.uid],
      };

      const docRef = await addDoc(collection(db, 'groups'), groupData);
      onGroupCreated({ id: docRef.id, ...groupData });
      
      setName('');
      setDescription('');
      setImage(null);
      setSelectedFriends([]);
      setStep(1);
      setErrors({});
      
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUid = useCallback(async () => {
    const uid = uidInput.trim();
    if (!uid) return;
    if (selectedFriends.includes(uid)) {
      setUidError('UID đã được chọn');
      return;
    }
    try {
      setUidError(null);
      setUidAdding(true);
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        setUidError('Không tìm thấy người dùng với UID này');
        return;
      }
      const data: any = snap.data();
      setSelectedFriends(prev => [...prev, uid]);
      setSelectedDetails(prev => ({
        ...prev,
        [uid]: { displayName: data?.displayName, photoURL: data?.photoURL },
      }));
      setUidInput('');
    } catch (e) {
      console.error('Add by UID failed', e);
      setUidError('Thêm UID thất bại, thử lại');
    } finally {
      setUidAdding(false);
    }
  }, [uidInput, selectedFriends]);

  const removeSelected = useCallback((uid: string) => {
    setSelectedFriends(prev => prev.filter(id => id !== uid));
    setSelectedDetails(prev => {
      const copy = { ...prev };
      delete copy[uid];
      return copy;
    });
  }, []);

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.glassCard, { backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)' }]}>
        <TouchableOpacity style={styles.imageContainer} onPress={pickImage} activeOpacity={0.8}>
          <LinearGradient
            colors={theme === 'dark' ? ['#6366F1', '#8B5CF6', '#EC4899'] : ['#667EEA', '#764BA2', '#F093FB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientRing}
          >
            <View style={[styles.gradientRingInner, { backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF' }]}>
              {image ? (
                <Image source={{ uri: image }} style={styles.groupImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <LinearGradient
                    colors={theme === 'dark' ? ['#334155', '#475569'] : ['#E0E7FF', '#C7D2FE']}
                    style={styles.placeholderGradient}
                  >
                    <MaterialCommunityIcons 
                      name="camera-plus-outline" 
                      size={42} 
                      color={theme === 'dark' ? '#94A3B8' : '#6366F1'} 
                    />
                  </LinearGradient>
                </View>
              )}
            </View>
          </LinearGradient>
          <View style={styles.editBadge}>
            <LinearGradient
              colors={['#667EEA', '#764BA2']}
              style={styles.editBadgeGradient}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#FFFFFF" />
            </LinearGradient>
          </View>
        </TouchableOpacity>
        
        <Text style={[styles.helperText, { color: theme === 'dark' ? '#94A3B8' : '#64748B' }]}>
          Nhấn để thêm ảnh nhóm
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            mode="outlined"
            label="Tên nhóm"
            placeholder="Ví dụ: Nhóm bạn thân"
            value={name}
            onChangeText={setName}
            style={styles.input}
            error={!!errors.name}
            disabled={loading}
            outlineColor={theme === 'dark' ? '#334155' : '#E2E8F0'}
            activeOutlineColor="#667EEA"
            textColor={currentThemeColors.text}
            theme={{ colors: { onSurfaceVariant: theme === 'dark' ? '#94A3B8' : '#64748B' } }}
            left={<TextInput.Icon icon="account-group" color="#667EEA" />}
          />
          {errors.name && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{errors.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            mode="outlined"
            label="Mô tả nhóm"
            placeholder="Mô tả ngắn về nhóm của bạn..."
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={3}
            disabled={loading}
            outlineColor={theme === 'dark' ? '#334155' : '#E2E8F0'}
            activeOutlineColor="#667EEA"
            textColor={currentThemeColors.text}
            theme={{ colors: { onSurfaceVariant: theme === 'dark' ? '#94A3B8' : '#64748B' } }}
            left={<TextInput.Icon icon="text-box-outline" color="#667EEA" />}
          />
        </View>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#667EEA" />
          <Text style={[styles.infoText, { color: theme === 'dark' ? '#94A3B8' : '#64748B' }]}>
            Bạn sẽ là quản trị viên của nhóm này
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.glassCard, { backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.9)' }]}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="account-multiple-plus" size={24} color="#667EEA" />
          <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
            Thêm thành viên
          </Text>
        </View>
        
        {errors.members && (
          <View style={[styles.errorContainer, { marginBottom: 16 }]}>
            <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errors.members}</Text>
          </View>
        )}

        <View style={styles.uidSection}>
          <Text style={[styles.uidLabel, { color: theme === 'dark' ? '#CBD5E1' : '#475569' }]}>
            Thêm bằng UID
          </Text>
          <View style={styles.addUidRow}>
            <TextInput
              mode="outlined"
              style={[styles.uidInput, { flex: 1 }]}
              placeholder="Nhập UID người dùng"
              value={uidInput}
              onChangeText={(t) => {
                setUidError(null);
                setUidInput(t);
              }}
              onSubmitEditing={handleAddUid}
              disabled={uidAdding || loading}
              outlineColor={theme === 'dark' ? '#334155' : '#E2E8F0'}
              activeOutlineColor="#667EEA"
              textColor={currentThemeColors.text}
              left={<TextInput.Icon icon="identifier" color="#8B5CF6" />}
            />
            <TouchableOpacity 
              onPress={handleAddUid}
              disabled={uidAdding || loading}
              style={styles.addButton}
            >
              <LinearGradient
                colors={['#667EEA', '#764BA2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addButtonGradient}
              >
                {uidAdding ? (
                  <MaterialCommunityIcons name="loading" size={20} color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {uidError && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{uidError}</Text>
            </View>
          )}
        </View>

        {selectedFriends.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={[styles.selectedLabel, { color: theme === 'dark' ? '#CBD5E1' : '#475569' }]}>
              Đã chọn ({selectedFriends.length})
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
            >
              {selectedFriends.map((uid) => {
                const displayName = selectedDetails[uid]?.displayName || `User ${uid.slice(0, 6)}`;
                return (
                  <View key={uid} style={styles.chipWrapper}>
                    <LinearGradient
                      colors={theme === 'dark' ? ['#334155', '#475569'] : ['#E0E7FF', '#DDD6FE']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.chipGradient}
                    >
                      <Text style={[styles.chipText, { color: currentThemeColors.text }]} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <TouchableOpacity onPress={() => removeSelected(uid)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialCommunityIcons name="close-circle" size={18} color={theme === 'dark' ? '#94A3B8' : '#6366F1'} />
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.friendListSection}>
          <Text style={[styles.selectedLabel, { color: theme === 'dark' ? '#CBD5E1' : '#475569', marginBottom: 12 }]}>
            Danh sách bạn bè
          </Text>
          <View style={[styles.friendListCard, { 
            backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.8)',
            borderColor: theme === 'dark' ? '#334155' : '#E2E8F0'
          }]}>
            <FriendSelectionList
              currentUser={currentUser}
              selectedFriends={selectedFriends}
              onSelectionChange={setSelectedFriends}
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        <LinearGradient
          colors={theme === 'dark' 
            ? ['#1E293B', '#0F172A', '#020617'] 
            : ['#667EEA', '#764BA2', '#F093FB']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1.5, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>
                {step === 1 ? 'Tạo nhóm mới' : 'Chọn thành viên'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {step === 1 
                  ? 'Thiết lập thông tin cơ bản cho nhóm' 
                  : 'Mời bạn bè tham gia nhóm của bạn'
                }
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.closeButtonInner}>
                <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.stepIndicators}>
              <View style={[styles.stepBubble, step >= 1 && styles.stepBubbleActive]}>
                <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
              </View>
              <View style={[styles.stepConnector, step === 2 && styles.stepConnectorActive]} />
              <View style={[styles.stepBubble, step === 2 && styles.stepBubbleActive]}>
                <Text style={[styles.stepNumber, step === 2 && styles.stepNumberActive]}>2</Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressTrack} />
              <Animated.View 
                style={[
                  styles.progressFill,
                  { width: `${(step / 2) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 1 ? renderStep1() : renderStep2()}
          </ScrollView>

          <View style={[styles.footer, { 
            backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            borderTopColor: theme === 'dark' ? '#334155' : '#E2E8F0'
          }]}>
            {step === 1 ? (
              <TouchableOpacity 
                onPress={handleNext}
                disabled={loading}
                activeOpacity={0.9}
                style={styles.primaryButtonWrapper}
              >
                <LinearGradient
                  colors={['#667EEA', '#764BA2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Tiếp tục</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.footerRow}>
                <TouchableOpacity 
                  onPress={handleBack}
                  disabled={loading}
                  style={[styles.secondaryButton, { borderColor: theme === 'dark' ? '#475569' : '#CBD5E1' }]}
                >
                  <MaterialCommunityIcons name="arrow-left" size={20} color={currentThemeColors.text} />
                  <Text style={[styles.secondaryButtonText, { color: currentThemeColors.text }]}>Quay lại</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleCreate}
                  disabled={loading}
                  activeOpacity={0.9}
                  style={[styles.primaryButtonWrapper, { flex: 1 }]}
                >
                  <LinearGradient
                    colors={['#667EEA', '#764BA2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.primaryButtonGradient}
                  >
                    {loading ? (
                      <>
                        <MaterialCommunityIcons name="loading" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Đang tạo...</Text>
                      </>
                    ) : (
                      <>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Tạo nhóm</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 12,
  },
  closeButtonInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    gap: 12,
  },
  stepIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubbleActive: {
    backgroundColor: '#FFFFFF',
  },
  stepNumber: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '700',
  },
  stepNumberActive: {
    color: '#667EEA',
  },
  stepConnector: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: 8,
    borderRadius: 1.5,
  },
  stepConnectorActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressTrack: {
    ...StyleSheet.absoluteFillObject,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  stepContainer: {
    flex: 1,
  },
  glassCard: {
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageContainer: {
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  gradientRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientRingInner: {
    width: 142,
    height: 142,
    borderRadius: 71,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  editBadgeGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  helperText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 100,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  uidSection: {
    marginBottom: 24,
  },
  uidLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  addUidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uidInput: {
    backgroundColor: 'transparent',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipsContent: {
    paddingRight: 10,
  },
  chipWrapper: {
    marginRight: 8,
  },
  chipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipText: {
    maxWidth: 180,
    fontSize: 13,
    fontWeight: '600',
  },
  friendListSection: {
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButtonWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15.5,
    fontWeight: '700',
  },
});

export default CreateGroupModal;