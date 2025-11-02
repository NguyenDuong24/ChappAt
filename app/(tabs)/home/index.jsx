import React, { useContext } from 'react';
import { View, StatusBar, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ListUser from '@/components/home/ListUser';
import { useAuth } from '@/context/authContext';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import useHome from './useHome';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function Home() {
  const { user } = useAuth();
  const { getUsers, users, loading, refreshing, handleRefresh, error } = useHome();
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent"
        translucent
      />
      
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: currentThemeColors.surface }]}
        >
          <MaterialIcons name="error-outline" size={24} color="#ff4757" />
          <Text style={[styles.errorText, { color: currentThemeColors.text }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => getUsers(true)}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Main Content */}
      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <LinearGradient
              colors={theme === 'dark' 
                ? ['#1a1a2e', '#16213e'] 
                : ['#f8fafc', '#e2e8f0']
              }
              style={styles.loadingGradient}
            >
              <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={[styles.loadingText, { color: currentThemeColors.text }]}>
                  Đang tìm kiếm người dùng...
                </Text>
                <View style={styles.loadingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </LinearGradient>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={80} color={currentThemeColors.subtleText} />
            <Text style={[styles.emptyTitle, { color: currentThemeColors.text }]}>
              Không tìm thấy người dùng
            </Text>
            <Text style={[styles.emptySubtitle, { color: currentThemeColors.subtleText }]}>
              Thử điều chỉnh bộ lọc hoặc kéo xuống để làm mới
            </Text>
          </View>
        ) : (
          <ListUser users={users} refreshing={refreshing} onRefresh={handleRefresh} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea',
    marginHorizontal: 3,
  },
  dot1: {
    animationDelay: '0s',
  },
  dot2: {
    animationDelay: '0.1s',
  },
  dot3: {
    animationDelay: '0.2s',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4757',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#667eea',
    borderRadius: 6,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  socialDemoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
