import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
    ToastAndroid,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import VietQRPaymentModal from './VietQRPaymentModal';
import {
    vietqrPaymentService,
    COIN_PACKAGES,
    CoinPackage,
    PaymentResult,
    PaymentStatus,
    getPaymentErrorMessage,
} from '../../services/vietqrPaymentService';
import { unifiedPaymentService, UnifiedProduct, UNIFIED_PRODUCTS } from '../../services/unifiedPaymentService';
interface CoinPurchaseSectionProps {
    onPurchaseSuccess: (newBalance: number, localTx?: any) => void;
}

export default function CoinPurchaseSection({ onPurchaseSuccess }: CoinPurchaseSectionProps) {
    const router = useRouter();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
    const [iapPurchasing, setIapPurchasing] = useState<string | null>(null);

    const isNativeStore = unifiedPaymentService.usesInAppPurchases();

    // ── IAP Purchase (Google Play / App Store) ─────────────
    const handleIAPPurchase = async (product: UnifiedProduct) => {
        try {
            setIapPurchasing(product.packageId);

            const result = await unifiedPaymentService.purchaseCoins(product, '');

            if (!result.success) {
                if (result.error === 'cancelled') {
                    // User cancelled — no alert needed
                    return;
                }
                Alert.alert('Lỗi thanh toán', result.error || 'Không thể hoàn tất giao dịch.');
                return;
            }

            const purchasedCoins = result.coinsAwarded;
            const purchasedBonus = result.bonusAwarded;

            const localTx = {
                id: `local_${result.transactionId || Date.now()}`,
                type: 'topup',
                amount: purchasedCoins + purchasedBonus,
                currencyType: 'coins',
                createdAt: new Date(),
                metadata: {
                    transactionId: result.transactionId,
                    source: result.provider,
                    packageId: product.packageId,
                },
            };

            onPurchaseSuccess(purchasedCoins, localTx);

            router.push({
                pathname: '/(screens)/wallet/PaymentSuccessScreen',
                params: {
                    transactionId: result.transactionId || '',
                    amount: String(purchasedCoins),
                    bonus: String(purchasedBonus),
                    packageId: product.packageId,
                    provider: result.provider,
                },
            });
        } catch (error) {
            Alert.alert('Lỗi', getPaymentErrorMessage(error));
        } finally {
            setIapPurchasing(null);
        }
    };

    // ── VietQR Purchase (web / fallback) ───────────────────
    const handleSelectPackage = async (pkg: CoinPackage) => {
        // On Android: use Google Play Billing directly
        if (isNativeStore) {
            const product = UNIFIED_PRODUCTS.find((p) => p.packageId === pkg.id);
            if (product) {
                await handleIAPPurchase(product);
            }
            return;
        }
        try {
            setLoading(true);
            setSelectedPackage(pkg);

            const result = await vietqrPaymentService.createCoinPurchase(pkg);
            setPaymentResult(result);
            setShowPaymentModal(true);
        } catch (error) {
            Alert.alert('Lá»—i', getPaymentErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = async (status: PaymentStatus) => {
        setShowPaymentModal(false);

        const purchasedCoins = status.coinAmount || selectedPackage?.coins || 0;
        const purchasedBonus = selectedPackage?.bonus || 0;
        const orderId = status.orderId || paymentResult?.orderId || '';

        const localTx = {
            id: `local_${orderId}`,
            type: 'topup',
            amount: purchasedCoins + purchasedBonus,
            currencyType: 'coins',
            createdAt: new Date(),
            metadata: {
                orderId: orderId,
                source: 'vietqr',
                packageId: selectedPackage?.id || '',
            }
        };

        onPurchaseSuccess(purchasedCoins, localTx);

        router.push({
            pathname: '/(screens)/wallet/PaymentSuccessScreen',
            params: {
                orderId: orderId,
                amount: String(purchasedCoins),
                bonus: String(purchasedBonus),
                packageId: selectedPackage?.id || '',
            },
        });
    };
    const handlePaymentFailed = (error: string) => {
        setShowPaymentModal(false);
        const title = t('vietqr_modal.payment_failed_title', 'Thanh toán thất bại');
        const message = error || t('common.error', 'Có lỗi xảy ra');
        const stackError = new Error(`[VietQRPayment] ${message}`);
        console.error('[VietQRPayment] Payment failed:', message);
        console.error('[VietQRPayment] Call Stack:', stackError.stack);
        if (Platform.OS === 'android') {
            ToastAndroid.show(`${title}: ${message}`, ToastAndroid.LONG);
        } else {
            Alert.alert(title, message);
        }
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
                                <Text style={styles.proBannerTitle}>{t('wallet.upgrade_pro', 'Nï¿½ng c?p Pro')}</Text>
                                <Text style={styles.proBannerSubtitle}>{t('wallet.unlock_pro_benefits', 'M? khï¿½a t?t c? d?c quy?n')}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#fff" />
                    </View>
                </LinearGradient>
            </TouchableOpacity>

            {/* Section Title — platform-aware */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                    <Text style={styles.sectionTitle}>
                        {isNativeStore
                            ? t('wallet.buy_coins', 'Mua Coin')
                            : t('wallet.buy_coins_vietqr', 'Mua Coin b?ng VietQR')
                        }
                    </Text>
                    {isNativeStore ? (
                        <View style={[styles.smsBankingBadge, { backgroundColor: '#4285F4' }]}>
                            <Ionicons name="logo-google-playstore" size={12} color="#fff" />
                            <Text style={styles.smsBankingBadgeText}>Google Play</Text>
                        </View>
                    ) : (
                        <View style={styles.smsBankingBadge}>
                            <Ionicons name="phone-portrait" size={12} color="#fff" />
                            <Text style={styles.smsBankingBadgeText}>{t('wallet.sms_banking', 'SMS Banking')}</Text>
                        </View>
                    )}
                </View>
                {isNativeStore ? (
                    <View style={styles.vietqrLogo}>
                        <LinearGradient
                            colors={['#4285F4', '#34A853']}
                            style={styles.vietqrLogoGradient}
                        >
                            <Text style={styles.vietqrLogoText}>GP</Text>
                        </LinearGradient>
                    </View>
                ) : (
                    <View style={styles.vietqrLogo}>
                        <LinearGradient
                            colors={['#1976D2', '#1565C0']}
                            style={styles.vietqrLogoGradient}
                        >
                            <Text style={styles.vietqrLogoText}>QR</Text>
                        </LinearGradient>
                    </View>
                )}
            </View>


            {/* Coin Packages */}
            <View style={styles.packagesGrid}>
                {COIN_PACKAGES.map((pkg) => (
                    <TouchableOpacity
                        key={pkg.id}
                        style={[
                            styles.packageCard,
                            pkg.discount && pkg.discount >= 20 ? styles.packageCardPopular : null,
                            iapPurchasing === pkg.id && styles.packageCardPurchasing,
                        ]}
                        onPress={() => handleSelectPackage(pkg)}
                        disabled={loading || !!iapPurchasing}
                        activeOpacity={0.8}
                    >
                        {pkg.discount && pkg.discount >= 20 && (
                            <View style={styles.popularBadge}>
                                <Text style={styles.popularBadgeText}>{t('wallet.hot', 'Hot')}</Text>
                            </View>
                        )}

                        <View style={styles.packageCoins}>
                            <Ionicons name="diamond" size={24} color="#FFD700" />
                            <Text style={styles.packageCoinAmount}>{pkg.coins}</Text>
                        </View>

                        {pkg.bonus ? (
                            <Text style={styles.packageBonus}>+{pkg.bonus} {t('wallet.bonus', 'bonus')}</Text>
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
            {(loading || iapPurchasing) && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={isNativeStore ? '#4285F4' : '#1976D2'} />
                    <Text style={styles.loadingText}>
                        {iapPurchasing
                            ? 'Đang kết nối Google Play...'
                            : t('wallet.creating_order', 'Đang tạo đơn hàng...')
                        }
                    </Text>
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
    packageCardPurchasing: {
        opacity: 0.6,
        borderColor: '#4285F4',
    },
});





