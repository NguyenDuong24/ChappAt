import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import VietQRPaymentModal from './VietQRPaymentModal';
import {
    vietqrPaymentService,
    COIN_PACKAGES,
    CoinPackage,
    PaymentResult,
    PaymentStatus,
    getPaymentErrorMessage,
} from '../../services/vietqrPaymentService';

interface CoinPurchaseSectionProps {
    onPurchaseSuccess: (newBalance: number) => void;
}

export default function CoinPurchaseSection({ onPurchaseSuccess }: CoinPurchaseSectionProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

    const handleSelectPackage = async (pkg: CoinPackage) => {
        try {
            setLoading(true);
            setSelectedPackage(pkg);

            const result = await vietqrPaymentService.createCoinPurchase(pkg);
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
            'Thành công! 🎉',
            `Bạn đã nhận được ${selectedPackage?.coins}${selectedPackage?.bonus ? ` + ${selectedPackage.bonus} bonus` : ''} coin!`
        );

        // Notify parent to refresh balance
        if (status.coinAmount) {
            onPurchaseSuccess(0);
        }
    };

    const handlePaymentFailed = (error: string) => {
        setShowPaymentModal(false);
        Alert.alert('Thanh toán thất bại', error);
    };

    const handleUpgradePro = () => {
        // @ts-ignore - Dynamic route
        router.push('/(screens)/subscription/ProUpgradeScreen');
    };

    // Helper to format VND
    const formatVND = (value: number): string => {
        return value.toLocaleString('vi-VN');
    };

    return (
        <View style={styles.container}>
            {/* Pro Upgrade Banner */}
            <TouchableOpacity
                style={styles.proBanner}
                onPress={handleUpgradePro}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={['#A50064', '#D82D8B', '#FF6B9D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.proBannerGradient}
                >
                    <View style={styles.proBannerContent}>
                        <View style={styles.proBannerLeft}>
                            <View style={styles.proBadge}>
                                <Ionicons name="diamond" size={20} color="#FFD700" />
                            </View>
                            <View>
                                <Text style={styles.proBannerTitle}>Nâng cấp Pro</Text>
                                <Text style={styles.proBannerSubtitle}>Mở khóa tất cả đặc quyền</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#fff" />
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            {/* Section Title with SMS Banking Badge */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                    <Text style={styles.sectionTitle}>Mua Coin bằng VietQR</Text>
                    <View style={styles.smsBankingBadge}>
                        <Ionicons name="phone-portrait" size={12} color="#fff" />
                        <Text style={styles.smsBankingBadgeText}>SMS Banking</Text>
                    </View>
                </View>
                <View style={styles.vietqrLogo}>
                    <LinearGradient
                        colors={['#1976D2', '#1565C0']}
                        style={styles.vietqrLogoGradient}
                    >
                        <Text style={styles.vietqrLogoText}>QR</Text>
                    </LinearGradient>
                </View>
            </View>

            {/* SMS Banking Info Banner */}
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
                    <Text style={styles.smsBankingInfoTitle}>⚡ Xác nhận tự động qua SMS Banking</Text>
                    <Text style={styles.smsBankingInfoText}>
                        Chuyển khoản để thanh toán. App tự động nhận SMS từ Vietcombank và xác nhận trong &lt;1 phút
                    </Text>
                </View>
            </LinearGradient>

            {/* Coin Packages */}
            <View style={styles.packagesGrid}>
                {COIN_PACKAGES.map((pkg) => (
                    <TouchableOpacity
                        key={pkg.id}
                        style={[
                            styles.packageCard,
                            pkg.discount && pkg.discount >= 20 ? styles.packageCardPopular : null,
                        ]}
                        onPress={() => handleSelectPackage(pkg)}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {pkg.discount && pkg.discount >= 20 && (
                            <View style={styles.popularBadge}>
                                <Text style={styles.popularBadgeText}>Hot</Text>
                            </View>
                        )}

                        <View style={styles.packageCoins}>
                            <Ionicons name="diamond" size={24} color="#FFD700" />
                            <Text style={styles.packageCoinAmount}>{pkg.coins}</Text>
                        </View>

                        {pkg.bonus ? (
                            <Text style={styles.packageBonus}>+{pkg.bonus} bonus</Text>
                        ) : (
                            <Text style={styles.packageBonusPlaceholder}> </Text>
                        )}

                        <Text style={styles.packagePrice}>{formatVND(pkg.price)}</Text>

                        {pkg.discount && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>-{pkg.discount}%</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Loading overlay */}
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#1976D2" />
                    <Text style={styles.loadingText}>Đang tạo đơn hàng...</Text>
                </View>
            )}

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
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    proBanner: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    proBannerGradient: {
        padding: 16,
    },
    proBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    proBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    proBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    proBannerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    proBannerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    smsBankingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#2E7D32',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    smsBankingBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
    },
    smsBankingInfoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#2E7D32',
    },
    smsBankingIconContainer: {
        marginRight: 12,
        marginTop: 2,
    },
    smsBankingTextContainer: {
        flex: 1,
    },
    smsBankingInfoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1B5E20',
        marginBottom: 4,
    },
    smsBankingInfoText: {
        fontSize: 12,
        color: '#2E7D32',
        lineHeight: 18,
        fontWeight: '500',
    },
    vietqrLogo: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    vietqrLogoGradient: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    vietqrLogoText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
    },
    packagesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    packageCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        position: 'relative',
    },
    packageCardPopular: {
        borderColor: '#A50064',
        backgroundColor: '#FFF5FA',
    },
    popularBadge: {
        position: 'absolute',
        top: -8,
        right: 12,
        backgroundColor: '#FF4081',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    popularBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    packageCoins: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    packageCoinAmount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    packageBonus: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '600',
        marginBottom: 8,
    },
    packageBonusPlaceholder: {
        fontSize: 12,
        marginBottom: 8,
    },
    packagePrice: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1976D2',
    },
    discountBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    discountText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
});
