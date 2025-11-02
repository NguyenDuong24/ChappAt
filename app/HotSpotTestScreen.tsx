import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import HotSpotFlowDemo from '@/components/hotspots/HotSpotFlowDemo';

const HotSpotTestScreen: React.FC = () => {
  const router = useRouter();

  const handleTestFlow = (step: number) => {
    const steps = [
      'Test quan tâm sự kiện',
      'Test modal danh sách người quan tâm', 
      'Test gửi lời mời',
      'Test xác nhận lời mời',
      'Test chat và xác nhận đi cùng',
      'Test trạng thái "Đã có cặp"'
    ];
    
    Alert.alert(
      `Giai đoạn ${step}`,
      steps[step - 1],
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Đi tới Hot Spots', onPress: () => router.push('/HotSpotsScreen') }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#7C3AED', '#EC4899', '#F59E0B']}
          style={StyleSheet.absoluteFill}
        />
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>🔥 HOT SPOTS TEST</Text>
        <Text style={styles.headerSubtitle}>Test full user flow</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Test Buttons */}
        <View style={styles.testSection}>
          <Text style={styles.sectionTitle}>🧪 QUICK TESTS</Text>
          
          <TouchableOpacity 
            style={styles.testButton}
            onPress={() => router.push('/HotSpotsScreen')}
          >
            <LinearGradient
              colors={['#EC4899', '#8B5CF6']}
              style={styles.testButtonGradient}
            >
              <MaterialIcons name="whatshot" size={20} color="white" />
              <Text style={styles.testButtonText}>Đi tới Hot Spots Screen</Text>
            </LinearGradient>
          </TouchableOpacity>

          {[1, 2, 3, 4, 5, 6].map(step => (
            <TouchableOpacity 
              key={step}
              style={styles.testButton}
              onPress={() => handleTestFlow(step)}
            >
              <View style={styles.testButtonContent}>
                <View style={[styles.stepBadge, { backgroundColor: getStepColor(step) }]}>
                  <Text style={styles.stepBadgeText}>{step}</Text>
                </View>
                <Text style={styles.testButtonTextDark}>Test Giai đoạn {step}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Flow Documentation */}
        <HotSpotFlowDemo />
      </ScrollView>
    </View>
  );
};

const getStepColor = (step: number): string => {
  const colors = ['#EC4899', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
  return colors[step - 1] || '#666';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  testSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  testButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  testButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  testButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  testButtonTextDark: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default HotSpotTestScreen;
