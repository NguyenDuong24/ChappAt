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
import MoMoPaymentModal from './MoMoPaymentModal';
import {
    momoPaymentService,
    COIN_PACKAGES,
    CoinPackage,
    PaymentResult,
    PaymentStatus,
    formatVND,
    getPaymentErrorMessage,
} from '../../services/momoPaymentService';

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

            const result = await momoPaymentService.createCoinPurchase(pkg);
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

            {/* Section Title */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Mua Coin bằng MoMo</Text>
                <View style={styles.momoLogo}>
                    <LinearGradient
                        colors={['#A50064', '#D82D8B']}
                        style={styles.momoLogoGradient}
                    >
                        <Text style={styles.momoLogoText}>MoMo</Text>
                    </LinearGradient>
                </View>
            </View>

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
                    <ActivityIndicator size="large" color="#A50064" />
                    <Text style={styles.loadingText}>Đang tạo đơn hàng...</Text>
                </View>
            )}

            {/* Payment Modal */}
            <MoMoPaymentModal
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
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    momoLogo: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    momoLogoGradient: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    momoLogoText: {
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
        color: '#A50064',
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
