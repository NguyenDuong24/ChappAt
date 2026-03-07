import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../context/authContext';
import VietQRPaymentModal from '../../../components/payment/VietQRPaymentModal';
import {
    vietqrPaymentService,
    PRO_PACKAGE,
    PaymentResult,
    PaymentStatus,
    getPaymentErrorMessage,
} from '../../../services/vietqrPaymentService';

export default function ProUpgradeScreen() {
    const router = useRouter();
    const { user, refreshUser } = useAuth();

    const [loading, setLoading] = useState(false);
    const [proStatus, setProStatus] = useState<{
        isPro: boolean;
        proExpiresAt: Date | null;
        daysRemaining: number;
    } | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

    useEffect(() => {
        loadProStatus();
    }, []);

    const loadProStatus = async () => {
        try {
            const status = await vietqrPaymentService.getProStatus();
            setProStatus(status);
        } catch (error) {
            console.error('Error loading pro status:', error);
        }
    };

    const handleUpgrade = async () => {
        if (proStatus?.isPro) {
            Alert.alert('Thông báo', 'Bạn đã là thành viên Pro!');
            return;
        }

        try {
            setLoading(true);
            const result = await vietqrPaymentService.createProUpgrade();
            setPaymentResult(result);
            setShowPaymentModal(true);
        } catch (error) {
            Alert.alert('Lỗi', getPaymentErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = async (status: PaymentStatus) => {
        setShowPaymentModal(false);
        Alert.alert(
            'Chúc mừng! 🎉',
            'Bạn đã nâng cấp lên Pro thành công!',
            [{ text: 'OK', onPress: () => router.back() }]
        );
        await loadProStatus();
        refreshUser?.();
    };

    const handlePaymentFailed = (error: string) => {
        setShowPaymentModal(false);
        Alert.alert('Thanh toán thất bại', error);
    };

    const renderFeature = (icon: string, title: string, description: string) => (
        <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
                <Ionicons name={icon as any} size={24} color="#A50064" />
            </View>
            <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDescription}>{description}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={['#A50064', '#D82D8B', '#FF6B9D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                    <View style={styles.proBadge}>
                        <Ionicons name="diamond" size={32} color="#FFD700" />
                    </View>
                    <Text style={styles.headerTitle}>ChappAt Pro</Text>
                    <Text style={styles.headerSubtitle}>
                        Mở khóa trải nghiệm tốt nhất
                    </Text>
                </View>

                {proStatus?.isPro && (
                    <View style={styles.currentProBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.currentProText}>
                            Còn {proStatus.daysRemaining} ngày
                        </Text>
                    </View>
                )}
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Features */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Đặc quyền Pro</Text>

                    {renderFeature(
                        'chatbubbles',
                        'Tin nhắn không giới hạn',
                        'Tăng giới hạn từ 50 lên 500 tin nhắn/ngày'
                    )}

                    {renderFeature(
                        'diamond',
                        'Badge Pro độc quyền',
                        'Nổi bật với badge Pro bên cạnh tên của bạn'
                    )}

                    {renderFeature(
                        'eye',
                        'Xem ai đã thích bạn',
                        'Biết ngay ai quan tâm đến bạn'
                    )}

                    {renderFeature(
                        'rocket',
                        'Ưu tiên hiển thị',
                        'Profile của bạn được ưu tiên trong tìm kiếm'
                    )}

                    {renderFeature(
                        'ban',
                        'Không quảng cáo',
                        'Trải nghiệm mượt mà không bị gián đoạn'
                    )}
                </View>

                {/* Pricing */}
                <View style={styles.pricingSection}>
                    <View style={styles.pricingCard}>
                        <View style={styles.pricingHeader}>
                            <Text style={styles.pricingName}>{PRO_PACKAGE.name}</Text>
                            <View style={styles.pricingBadge}>
                                <Text style={styles.pricingBadgeText}>Phổ biến</Text>
                            </View>
                        </View>

                        <View style={styles.pricingAmount}>
                            <Text style={styles.pricingPrice}>{formatVND(PRO_PACKAGE.price)}</Text>
                            <Text style={styles.pricingDuration}>/tháng</Text>
                        </View>

                        <View style={styles.pricingFeatures}>
                            <View style={styles.pricingFeature}>
                                <Ionicons name="checkmark" size={16} color="#4CAF50" />
                                <Text style={styles.pricingFeatureText}>Tất cả đặc quyền Pro</Text>
                            </View>
                            <View style={styles.pricingFeature}>
                                <Ionicons name="checkmark" size={16} color="#4CAF50" />
                                <Text style={styles.pricingFeatureText}>Hủy bất cứ lúc nào</Text>
                            </View>
                            <View style={styles.pricingFeature}>
                                <Ionicons name="checkmark" size={16} color="#4CAF50" />
                                <Text style={styles.pricingFeatureText}>Thanh toán an toàn qua MoMo</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* VietQR info */}
                <View style={styles.vietqrInfo}>
                    <LinearGradient
                        colors={['#1976D2', '#1565C0']}
                        style={styles.vietqrLogo}
                    >
                        <Text style={styles.vietqrLogoText}>QR</Text>
                    </LinearGradient>
                    <Text style={styles.vietqrInfoText}>
                        Thanh toán an toàn qua chuyển khoản VietQR
                    </Text>
                </View>

                {/* SMS Banking Auto-Confirmation Info */}
                <LinearGradient
                    colors={['#E8F5E9', '#C8E6C9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.smsBankingInfoBanner}
                >
                    <View style={styles.smsBankingIconContainer}>
                        <Ionicons name="phone-portrait" size={20} color="#2E7D32" />
                    </View>
                    <View style={styles.smsBankingTextContainer}>
                        <Text style={styles.smsBankingInfoTitle}>📱 Xác nhận tự động qua SMS Banking</Text>
                        <Text style={styles.smsBankingInfoText}>
                            Chuyển khoản để nâng cấp Pro. App tự động nhận SMS từ Vietcombank và xác nhận trong &lt;1 phút. Không cần xác nhận thủ công!
                        </Text>
                    </View>
                </LinearGradient>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* CTA Button */}
            <View style={styles.ctaContainer}>
                <TouchableOpacity
                    style={[styles.ctaButton, proStatus?.isPro && styles.ctaButtonDisabled]}
                    onPress={handleUpgrade}
                    disabled={loading || proStatus?.isPro}
                >
                    <LinearGradient
                        colors={proStatus?.isPro ? ['#ccc', '#aaa'] : ['#A50064', '#D82D8B']}
                        style={styles.ctaGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons
                                    name={proStatus?.isPro ? 'checkmark-circle' : 'diamond'}
                                    size={24}
                                    color="#fff"
                                />
                                <Text style={styles.ctaText}>
                                    {proStatus?.isPro ? 'Đã là Pro' : 'Nâng cấp ngay'}
                                </Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Payment Modal */}
            <VietQRPaymentModal
                visible={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                paymentResult={paymentResult}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentFailed={handlePaymentFailed}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        alignItems: 'center',
        marginTop: 20,
    },
    proBadge: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.9)',
    },
    currentProBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 16,
        alignSelf: 'center',
        gap: 4,
    },
    currentProText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4CAF50',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF0F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    featureDescription: {
        fontSize: 13,
        color: '#666',
    },
    pricingSection: {
        marginBottom: 20,
    },
    pricingCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#A50064',
        shadowColor: '#A50064',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    pricingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    pricingName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    pricingBadge: {
        backgroundColor: '#A50064',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pricingBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
    },
    pricingAmount: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    pricingPrice: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#A50064',
    },
    pricingDuration: {
        fontSize: 14,
        color: '#666',
        marginLeft: 4,
    },
    pricingFeatures: {
        gap: 8,
    },
    pricingFeature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pricingFeatureText: {
        fontSize: 14,
        color: '#555',
    },
    vietqrInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    vietqrLogo: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    vietqrLogoText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
    },
    vietqrInfoText: {
        flex: 1,
        fontSize: 13,
        color: '#666',
    },
    ctaContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    ctaButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    ctaButtonDisabled: {
        opacity: 0.7,
    },
    ctaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    ctaText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    smsBankingInfoBanner: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        marginHorizontal: 0,
        borderLeftWidth: 4,
        borderLeftColor: '#2E7D32',
        alignItems: 'flex-start',
        gap: 12,
    },
    smsBankingIconContainer: {
        marginTop: 2,
    },
    smsBankingTextContainer: {
        flex: 1,
        gap: 4,
    },
    smsBankingInfoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1B5E20',
    },
    smsBankingInfoText: {
        fontSize: 12,
        color: '#2E7D32',
        lineHeight: 18,
    },
});
