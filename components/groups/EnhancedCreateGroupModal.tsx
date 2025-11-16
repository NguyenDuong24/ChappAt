import React, { useState, useContext, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { Text, TextInput, Switch } from 'react-native-paper';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebaseConfig';
import { nanoid } from 'nanoid';
import FriendSelectionList from '../friends/FriendSelectionList';

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
  const theme = (themeCtx && typeof themeCtx === 'object' && 'theme' in themeCtx) ? themeCtx.theme : 'light';
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
  const [groupType, setGroupType] = useState<'public' | 'private'>('private');
  const [isSearchable, setIsSearchable] = useState(true);

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
        type: groupType,
        isSearchable: groupType === 'private' ? false : isSearchable,
      };

      const docRef = await addDoc(collection(db, 'groups'), groupData);
      onGroupCreated({ id: docRef.id, ...groupData });
      
      setName('');
      setDescription('');
      setImage(null);
      setSelectedFriends([]);
      setStep(1);
      setErrors({});
      setGroupType('private');
      setIsSearchable(true);
      
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

  useEffect(() => {
    if (groupType === 'private') {
      setIsSearchable(false);
    } else {
      setIsSearchable(true);
    }
  }, [groupType]);

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {/* Image Picker */}
      <TouchableOpacity 
        style={styles.imagePickerContainer} 
        onPress={pickImage} 
        activeOpacity={0.7}
      >
        {image ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: image }} style={styles.groupImage} />
            <View style={styles.imageOverlay}>
              <MaterialCommunityIcons name="camera" size={24} color="#FFF" />
            </View>
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { 
            backgroundColor: theme === 'dark' ? '#1F2937' : '#F3F4F6',
            borderColor: theme === 'dark' ? '#374151' : '#E5E7EB'
          }]}>
            <MaterialCommunityIcons 
              name="camera-plus" 
              size={40} 
              color={theme === 'dark' ? '#6B7280' : '#9CA3AF'} 
            />
            <Text style={[styles.placeholderText, { color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }]}>
              Thêm ảnh nhóm
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Group Name */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: currentThemeColors.text }]}>
          Tên nhóm <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          mode="outlined"
          placeholder="Ví dụ: Nhóm bạn thân"
          value={name}
          onChangeText={setName}
          style={[styles.input, { backgroundColor: 'transparent' }]}
          error={!!errors.name}
          disabled={loading}
          outlineColor={theme === 'dark' ? '#374151' : '#E5E7EB'}
          activeOutlineColor="#0084FF"
          textColor={currentThemeColors.text}
          placeholderTextColor={theme === 'dark' ? '#6B7280' : '#9CA3AF'}
          dense
        />
        {errors.name && (
          <View style={styles.errorRow}>
            <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errors.name}</Text>
          </View>
        )}
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: currentThemeColors.text }]}>
          Mô tả
        </Text>
        <TextInput
          mode="outlined"
          placeholder="Thêm mô tả cho nhóm..."
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.textArea, { backgroundColor: 'transparent' }]}
          multiline
          numberOfLines={3}
          disabled={loading}
          outlineColor={theme === 'dark' ? '#374151' : '#E5E7EB'}
          activeOutlineColor="#0084FF"
          textColor={currentThemeColors.text}
          placeholderTextColor={theme === 'dark' ? '#6B7280' : '#9CA3AF'}
          dense
        />
      </View>

      {/* Group Type */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: currentThemeColors.text }]}>
          Quyền riêng tư
        </Text>
        <View style={styles.typeOptions}>
          <TouchableOpacity
            style={[
              styles.typeCard,
              { 
                backgroundColor: theme === 'dark' ? '#1F2937' : '#F9FAFB',
                borderColor: groupType === 'private' ? '#0084FF' : (theme === 'dark' ? '#374151' : '#E5E7EB')
              },
              groupType === 'private' && styles.typeCardSelected
            ]}
            onPress={() => setGroupType('private')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.typeIconContainer,
              { backgroundColor: groupType === 'private' ? '#0084FF' : (theme === 'dark' ? '#374151' : '#E5E7EB') }
            ]}>
              <MaterialCommunityIcons 
                name="lock" 
                size={20} 
                color={groupType === 'private' ? '#FFF' : (theme === 'dark' ? '#9CA3AF' : '#6B7280')} 
              />
            </View>
            <View style={styles.typeContent}>
              <Text style={[styles.typeTitle, { color: currentThemeColors.text }]}>
                Riêng tư
              </Text>
              <Text style={[styles.typeDescription, { color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }]}>
                Chỉ thành viên được mời
              </Text>
            </View>
            {groupType === 'private' && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#0084FF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeCard,
              { 
                backgroundColor: theme === 'dark' ? '#1F2937' : '#F9FAFB',
                borderColor: groupType === 'public' ? '#0084FF' : (theme === 'dark' ? '#374151' : '#E5E7EB')
              },
              groupType === 'public' && styles.typeCardSelected
            ]}
            onPress={() => setGroupType('public')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.typeIconContainer,
              { backgroundColor: groupType === 'public' ? '#0084FF' : (theme === 'dark' ? '#374151' : '#E5E7EB') }
            ]}>
              <MaterialCommunityIcons 
                name="earth" 
                size={20} 
                color={groupType === 'public' ? '#FFF' : (theme === 'dark' ? '#9CA3AF' : '#6B7280')} 
              />
            </View>
            <View style={styles.typeContent}>
              <Text style={[styles.typeTitle, { color: currentThemeColors.text }]}>
                Công khai
              </Text>
              <Text style={[styles.typeDescription, { color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }]}>
                Ai cũng có thể tham gia
              </Text>
            </View>
            {groupType === 'public' && (
              <MaterialCommunityIcons name="check-circle" size={20} color="#0084FF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Searchable Option */}
      {groupType === 'public' && (
        <View style={[styles.switchCard, { 
          backgroundColor: theme === 'dark' ? '#1F2937' : '#F9FAFB',
          borderColor: theme === 'dark' ? '#374151' : '#E5E7EB'
        }]}>
          <View style={styles.switchContent}>
            <View style={styles.switchTextContainer}>
              <Text style={[styles.switchTitle, { color: currentThemeColors.text }]}>
                Cho phép tìm kiếm
              </Text>
              <Text style={[styles.switchDescription, { color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }]}>
                Hiển thị nhóm trong kết quả tìm kiếm
              </Text>
            </View>
            <Switch
              value={isSearchable}
              onValueChange={setIsSearchable}
              color="#0084FF"
            />
          </View>
        </View>
      )}

      {/* Info Box */}
      <View style={[styles.infoBox, { 
        backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 132, 255, 0.05)',
        borderColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 132, 255, 0.1)'
      }]}>
        <MaterialCommunityIcons name="information" size={18} color="#0084FF" />
        <Text style={[styles.infoText, { color: theme === 'dark' ? '#93C5FD' : '#0084FF' }]}>
          Bạn sẽ là quản trị viên của nhóm này
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {/* Add by UID */}
      <View style={styles.uidSection}>
        <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
          Thêm bằng UID
        </Text>
        <View style={styles.uidInputRow}>
          <TextInput
            mode="outlined"
            placeholder="Nhập UID người dùng"
            value={uidInput}
            onChangeText={(t) => {
              setUidError(null);
              setUidInput(t);
            }}
            onSubmitEditing={handleAddUid}
            disabled={uidAdding || loading}
            style={[styles.input, styles.uidInput, { backgroundColor: 'transparent' }]}
            outlineColor={theme === 'dark' ? '#374151' : '#E5E7EB'}
            activeOutlineColor="#0084FF"
            textColor={currentThemeColors.text}
            placeholderTextColor={theme === 'dark' ? '#6B7280' : '#9CA3AF'}
            dense
          />
          <TouchableOpacity
            style={[styles.uidAddButton, { backgroundColor: '#0084FF' }]}
            onPress={handleAddUid}
            disabled={uidAdding || loading}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={uidAdding ? "loading" : "plus"} 
              size={22} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>
        {uidError && (
          <View style={styles.errorRow}>
            <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{uidError}</Text>
          </View>
        )}
      </View>

      {/* Selected Members */}
      {selectedFriends.length > 0 && (
        <View style={styles.selectedSection}>
          <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
            Đã chọn ({selectedFriends.length})
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedList}
          >
            {selectedFriends.map((uid) => {
              const displayName = selectedDetails[uid]?.displayName || `User ${uid.slice(0, 6)}`;
              return (
                <View 
                  key={uid} 
                  style={[styles.selectedChip, { 
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#F3F4F6',
                    borderColor: theme === 'dark' ? '#374151' : '#E5E7EB'
                  }]}
                >
                  <Text 
                    style={[styles.selectedChipText, { color: currentThemeColors.text }]} 
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => removeSelected(uid)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons 
                      name="close-circle" 
                      size={18} 
                      color={theme === 'dark' ? '#6B7280' : '#9CA3AF'} 
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Friend List */}
      <View style={styles.friendSection}>
        <Text style={[styles.sectionTitle, { color: currentThemeColors.text }]}>
          Chọn từ danh sách bạn bè
        </Text>
        {errors.members && (
          <View style={[styles.errorRow, { marginBottom: 12 }]}>
            <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errors.members}</Text>
          </View>
        )}
        <View style={[styles.friendListContainer, { 
          backgroundColor: theme === 'dark' ? '#1F2937' : '#F9FAFB',
          borderColor: theme === 'dark' ? '#374151' : '#E5E7EB'
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
  );

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme === 'dark' ? '#374151' : '#E5E7EB' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={currentThemeColors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>
              {step === 1 ? 'Tạo nhóm mới' : 'Thêm thành viên'}
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Step Indicator */}
        <View style={[styles.stepIndicator, { borderBottomColor: theme === 'dark' ? '#374151' : '#E5E7EB' }]}>
          <View style={styles.stepDots}>
            <View style={[styles.stepDot, step === 1 && styles.stepDotActive, { 
              backgroundColor: step === 1 ? '#0084FF' : (theme === 'dark' ? '#374151' : '#E5E7EB')
            }]} />
            <View style={[styles.stepDot, step === 2 && styles.stepDotActive, { 
              backgroundColor: step === 2 ? '#0084FF' : (theme === 'dark' ? '#374151' : '#E5E7EB')
            }]} />
          </View>
          <Text style={[styles.stepText, { color: theme === 'dark' ? '#9CA3AF' : '#6B7280' }]}>
            Bước {step}/2
          </Text>
        </View>

        {/* Content */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.content}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 1 ? renderStep1() : renderStep2()}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { 
            backgroundColor: currentThemeColors.background,
            borderTopColor: theme === 'dark' ? '#374151' : '#E5E7EB'
          }]}>
            {step === 1 ? (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#0084FF' }]}
                onPress={handleNext}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Tiếp tục</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { 
                    borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#F9FAFB'
                  }]}
                  onPress={handleBack}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.secondaryButtonText, { color: currentThemeColors.text }]}>
                    Quay lại
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#0084FF', flex: 1 }]}
                  onPress={handleCreate}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <MaterialCommunityIcons name="loading" size={20} color="#FFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Tạo nhóm</Text>
                  )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotActive: {
    width: 24,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  stepContainer: {
    gap: 24,
  },
  imagePickerContainer: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  imageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    position: 'relative',
  },
  groupImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  required: {
    color: '#EF4444',
  },
  input: {
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  typeOptions: {
    gap: 12,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  typeCardSelected: {
    backgroundColor: 'rgba(0, 132, 255, 0.05)',
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeContent: {
    flex: 1,
    gap: 2,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  typeDescription: {
    fontSize: 13,
  },
  switchCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchTextContainer: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  switchDescription: {
    fontSize: 13,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  uidSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  uidInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  uidInput: {
    flex: 1,
  },
  uidAddButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSection: {
    gap: 12,
  },
  selectedList: {
    paddingRight: 20,
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedChipText: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 150,
  },
  friendSection: {
    gap: 12,
  },
  friendListContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateGroupModal;