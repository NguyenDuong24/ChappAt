import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const HotSpotFlowDemo: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <LinearGradient
          colors={['#7C3AED', '#EC4899']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.headerTitle}>🔥 HOT SPOT FLOW</Text>
        <Text style={styles.headerSubtitle}>Hẹn tại sự kiện - Full User Flow</Text>
      </View>

      <View style={styles.content}>
        {/* Giai đoạn 1 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: '#EC4899' }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>QUAN TÂM SỰ KIỆN</Text>
          </View>
          <Text style={styles.stepDescription}>
            • User nhấn nút "Quan tâm 💜" tại sự kiện
            {'\n'}• Hệ thống lưu vào danh sách interestedUsers
            {'\n'}• Hiển thị dãy avatar trong card sự kiện
            {'\n'}• Click avatar → mở modal "Những người quan tâm 🎉"
          </Text>
        </View>

        {/* Giai đoạn 2 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: '#8B5CF6' }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>RỦ ĐI CÙNG</Text>
          </View>
          <Text style={styles.stepDescription}>
            • Modal hiển thị danh sách người quan tâm
            {'\n'}• Mỗi người có avatar + thông tin cơ bản
            {'\n'}• User A bấm "Rủ đi cùng" với User B
            {'\n'}• Tạo record invite trong eventInvites
            {'\n'}• Gửi notification: "💌 A mời bạn đi cùng sự kiện!"
          </Text>
        </View>

        {/* Giai đoạn 3 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: '#10B981' }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepTitle}>XÁC NHẬN LỜI MỜI</Text>
          </View>
          <Text style={styles.stepDescription}>
            • B mở app → thấy popup "Lời mời đi cùng"
            {'\n'}• Có 2 lựa chọn: ✅ Đồng ý | ❌ Từ chối
            {'\n'}• Khi đồng ý: Tạo chat riêng eventChat_A_B_eventId
            {'\n'}• Gửi message chào: "🎉 Hai bạn đã match tại sự kiện!"
          </Text>
        </View>

        {/* Giai đoạn 4 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepTitle}>ĐANG LÊN KÈO</Text>
          </View>
          <Text style={styles.stepDescription}>
            • Chat trong khung riêng (giới hạn 24h trước sự kiện)
            {'\n'}• Gửi sticker, hình ảnh, emoji
            {'\n'}• Có nút "🎟 Xác nhận sẽ đi cùng nhau"
            {'\n'}• Cần cả hai cùng xác nhận để chuyển giai đoạn cuối
          </Text>
        </View>

        {/* Giai đoạn 5 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.stepNumberText}>5</Text>
            </View>
            <Text style={styles.stepTitle}>SẼ ĐI CÙNG NHAU</Text>
          </View>
          <Text style={styles.stepDescription}>
            • Cả 2 người bị ẩn khỏi danh sách "quan tâm"
            {'\n'}• Nút "Quan tâm" → đổi thành "💜 Đã có cặp"
            {'\n'}• Không ai khác rủ được nữa
            {'\n'}• Tạo EventMatch record hoàn chỉnh
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>✨ FEATURES CHÍNH</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <MaterialIcons name="notifications" size={16} color="#EC4899" />
              <Text style={styles.featureText}>Real-time notifications</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="chat" size={16} color="#8B5CF6" />
              <Text style={styles.featureText}>Private event chat</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="schedule" size={16} color="#F59E0B" />
              <Text style={styles.featureText}>24h time limit</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="favorite" size={16} color="#EF4444" />
              <Text style={styles.featureText}>Mutual confirmation</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="visibility-off" size={16} color="#10B981" />
              <Text style={styles.featureText}>Hidden when matched</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  stepCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
  featuresCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default HotSpotFlowDemo;
