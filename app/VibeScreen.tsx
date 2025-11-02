import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors, PRIMARY_COLOR } from '@/constants/Colors';
import { useAuth } from '@/context/authContext';
import VibeAvatar from '@/components/vibe/VibeAvatar';
import VibePickerModal from '@/components/vibe/VibePickerModal';
import { PREDEFINED_VIBES, UserVibe } from '@/types/vibe';

const { width, height } = Dimensions.get('window');

const VibeScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const themeContext = useContext(ThemeContext);
  const theme = themeContext?.theme || 'light';
  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  const { 
    currentVibe, 
    setUserVibe, 
    removeUserVibe, 
    settingVibe, 
    vibeError 
  } = useAuth();

  // Local states for nearby vibes and history
  const [nearbyVibes, setNearbyVibes] = useState([]);
  const [vibeHistory, setVibeHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isVibePickerVisible, setIsVibePickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; address?: string } | undefined>();

  // Mock location for demo (you should get real location from user)
  useEffect(() => {
    setUserLocation({
      latitude: 10.7769,
      longitude: 106.7009,
      address: 'Quận 1, TP.HCM'
    });
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Just refresh the current state - vibe is managed by authContext
      console.log('Refreshing vibe data...');
    } catch (error) {
      console.error('Error refreshing:', error);
    }
    setRefreshing(false);
  };

  const handleRemoveVibe = async () => {
    if (!currentVibe) return;

    Alert.alert(
      'Xóa Vibe',
      'Bạn có chắc muốn xóa vibe hiện tại?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeUserVibe();
              Alert.alert('Thành công', 'Đã xóa vibe của bạn!');
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa vibe. Vui lòng thử lại!');
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={styles.backButton}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        Vibe của tôi
      </Text>
      <TouchableOpacity 
        onPress={onRefresh} 
        style={styles.refreshButton}
        disabled={refreshing}
      >
        <MaterialIcons 
          name="refresh" 
          size={24} 
          color={refreshing ? colors.text + '50' : colors.text} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderCurrentVibeSection = () => (
    <View style={[styles.currentVibeSection, { backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Vibe hiện tại của bạn
      </Text>
      
      <View style={styles.currentVibeContainer}>
        <VibeAvatar
          avatarUrl={user?.photoURL}
          size={80}
          currentVibe={currentVibe}
          showAddButton={true}
          userLocation={userLocation}
          onVibePress={() => setIsVibePickerVisible(true)}
        />
        
        <View style={styles.currentVibeInfo}>
          {currentVibe ? (
            <>
              <Text style={[styles.currentVibeName, { color: colors.text }]}>
                {currentVibe.vibe.name} {currentVibe.vibe.emoji}
              </Text>
              {currentVibe.customMessage && (
                <Text style={[styles.currentVibeMessage, { color: colors.subtleText }]}>
                  "{currentVibe.customMessage}"
                </Text>
              )}
              <Text style={[styles.currentVibeTime, { color: colors.mutedText }]}>
                Đã chia sẻ {formatTimeAgo(currentVibe.createdAt)}
              </Text>
            </>
          ) : (
            <View style={styles.noVibeContainer}>
              <Text style={[styles.noVibeText, { color: colors.subtleText }]}>
                Chưa có vibe nào được chọn
              </Text>
              <TouchableOpacity
                style={[styles.addVibeButton, { backgroundColor: PRIMARY_COLOR }]}
                onPress={() => setIsVibePickerVisible(true)}
              >
                <MaterialIcons name="add" size={20} color="white" />
                <Text style={styles.addVibeButtonText}>Thêm Vibe</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {currentVibe && (
        <View style={styles.vibeActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: PRIMARY_COLOR }]}
            onPress={() => setIsVibePickerVisible(true)}
          >
            <MaterialIcons name="edit" size={20} color="white" />
            <Text style={styles.actionButtonText}>Thay đổi</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.border }]}
            onPress={handleRemoveVibe}
          >
            <MaterialIcons name="delete" size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Xóa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderVibeCategories = () => (
    <View style={[styles.categoriesSection, { backgroundColor: colors.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Chọn vibe phù hợp
      </Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.categoriesRow}>
          {PREDEFINED_VIBES.slice(0, 8).map((vibe) => (
            <TouchableOpacity
              key={vibe.id}
              style={[
                styles.categoryVibeItem,
                { 
                  backgroundColor: colors.background,
                  borderColor: currentVibe?.vibeId === vibe.id ? vibe.color : colors.border
                }
              ]}
              onPress={() => handleQuickVibeSelect(vibe)}
            >
              <LinearGradient
                colors={[vibe.color + '20', vibe.color + '40']}
                style={styles.categoryVibeBackground}
              >
                <Text style={styles.categoryVibeEmoji}>{vibe.emoji}</Text>
                <Text style={[styles.categoryVibeName, { color: colors.text }]}>
                  {vibe.name}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={[styles.categoryVibeItem, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setIsVibePickerVisible(true)}
          >
            <View style={[styles.categoryVibeBackground, { backgroundColor: colors.border + '20' }]}>
              <MaterialIcons name="more-horiz" size={32} color={colors.text} />
              <Text style={[styles.categoryVibeName, { color: colors.text }]}>
                Thêm
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const renderNearbyVibes = () => (
    <View style={[styles.nearbySection, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Vibe xung quanh
        </Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialIcons name="refresh" size={20} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>
      
      {nearbyVibes.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.nearbyVibesRow}>
            {/* Demo nearby vibes - in real app this would be loaded from Firebase */}
            <View style={styles.nearbyVibeItem}>
              <View style={[styles.nearbyVibeContent, { backgroundColor: colors.background }]}>
                <Text style={styles.nearbyVibeEmoji}>😊</Text>
                <Text style={[styles.nearbyVibeName, { color: colors.text }]}>
                  Vui vẻ
                </Text>
                <Text style={[styles.nearbyVibeMessage, { color: colors.subtleText }]} numberOfLines={2}>
                  "Hôm nay tâm trạng tốt!"
                </Text>
                <Text style={[styles.nearbyVibeDistance, { color: colors.mutedText }]}>
                  ~200m
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyNearbyContainer}>
          <MaterialIcons name="location-off" size={48} color={colors.mutedText} />
          <Text style={[styles.emptyNearbyText, { color: colors.subtleText }]}>
            Không có vibe nào xung quanh bạn
          </Text>
        </View>
      )}
    </View>
  );

  const handleQuickVibeSelect = async (vibe: any) => {
    try {
      await setUserVibe(vibe.id, '', userLocation);
      Alert.alert('Thành công!', `Đã chọn vibe: ${vibe.name}`);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn vibe. Vui lòng thử lại!');
    }
  };

  const formatTimeAgo = (createdAt: any) => {
    if (!createdAt) return 'vừa xong';
    
    const now = new Date();
    const time = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) {
      return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else {
      return `${Math.floor(diffHours / 24)} ngày trước`;
    }
  };

  if (vibeError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        {renderHeader()}
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.mutedText} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {vibeError}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: PRIMARY_COLOR }]}
            onPress={onRefresh}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {renderHeader()}
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentVibeSection()}
        {renderVibeCategories()}
        {renderNearbyVibes()}
      </ScrollView>

      <VibePickerModal
        visible={isVibePickerVisible}
        onClose={() => setIsVibePickerVisible(false)}
        userLocation={userLocation}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentVibeSection: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  currentVibeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentVibeInfo: {
    flex: 1,
    marginLeft: 16,
  },
  currentVibeName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  currentVibeMessage: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  currentVibeTime: {
    fontSize: 14,
  },
  noVibeContainer: {
    alignItems: 'flex-start',
  },
  noVibeText: {
    fontSize: 16,
    marginBottom: 12,
  },
  addVibeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addVibeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  vibeActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    flex: 0.45,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  categoriesSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  categoryVibeItem: {
    width: 90,
    marginHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  categoryVibeBackground: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryVibeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  categoryVibeName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  nearbySection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  nearbyVibesRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  nearbyVibeItem: {
    width: 140,
    marginHorizontal: 6,
  },
  nearbyVibeContent: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  nearbyVibeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  nearbyVibeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  nearbyVibeMessage: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  nearbyVibeDistance: {
    fontSize: 11,
    textAlign: 'center',
  },
  emptyNearbyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyNearbyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default VibeScreen;
