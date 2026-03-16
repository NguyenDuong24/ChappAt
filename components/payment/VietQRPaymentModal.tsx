import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    ScrollView,
    Alert,
    TextInput,
    Clipboard,
    Linking,
    Share,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getAuth } from 'firebase/auth';
import { PaymentResult, PaymentStatus, vietqrPaymentService, startPaymentPolling, startRealTimePaymentListener } from '../../services/vietqrPaymentService';
import { diagnosticService } from '../../services/diagnosticService';

interface VietQRPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    paymentResult: PaymentResult | null;
    onPaymentSuccess: (status: PaymentStatus) => void;
    onPaymentFailed: (error: string) => void;
}

export default function VietQRPaymentModal({
    visible,
    onClose,
    paymentResult,
    onPaymentSuccess,
    onPaymentFailed,
}: VietQRPaymentModalProps) {
    const [status, setStatus] = useState<'waiting' | 'polling' | 'verifying' | 'success' | 'failed'>('waiting');
    const [message, setMessage] = useState('Đang chờ xác nhận thanh toán...');
    const [confirmDescription, setConfirmDescription] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [pollCounter, setPollCounter] = useState(0);
    const [pollingController, setPollingController] = useState<any>(null);
    const [autoMode, setAutoMode] = useState(true);
    const [verificationMethod, setVerificationMethod] = useState<'sms_banking' | 'manual' | 'polling' | null>(null);

    useEffect(() => {
        if (visible && paymentResult) {
            setStatus('waiting');
            setMessage('Quét mã QR hoặc chuyển khoản...');
            setConfirmDescription('');
            setIsVerifying(false);
            setPollCounter(0);
            setAutoMode(true);

            // Auto-start real-time listener after 2 seconds
            const autoStartTimer = setTimeout(() => {
                startAutoConfirmation();
            }, 2000);

            return () => clearTimeout(autoStartTimer);
        }
    }, [visible, paymentResult]);

    const startAutoConfirmation = () => {
        if (!paymentResult?.orderId) {
            console.warn('[VietQRModal] No orderId found');
            return;
        }

        const auth = getAuth();
        const uid = auth.currentUser?.uid;
        if (!uid) {
            setStatus('failed');
            setMessage('Lỗi: Không xác định được người dùng. Vui lòng đăng nhập lại');
            console.warn('[VietQRModal] No uid found');
            return;
        }

        console.log('[VietQRModal] Starting real-time listener for SMS Banking, orderId:', paymentResult.orderId);
        setStatus('polling');
        setMessage('⏳ Chờ xác nhận từ SMS Banking...');
        setVerificationMethod('sms_banking');

        try {
            // Start real-time listener (listens for SMS Banking confirmation)
            const listeningController = startRealTimePaymentListener(
                paymentResult.orderId,
                uid,
                (newStatus) => {
                    // Status changed (but not completed yet)
                    console.log('[VietQRModal] Status update:', newStatus.status);
                },
                (completedStatus) => {
                    // Payment completed!
                    const method = completedStatus.verificationMethod || 'polling';
                    setVerificationMethod(method as any);

                    if (method === 'sms_banking') {
                        setMessage('✅ Thanh toán thành công (SMS Banking)!');
                        console.log('[VietQRModal] ✅ SMS Banking confirmed!');
                    } else if (method === 'manual') {
                        setMessage('✅ Thanh toán thành công (Xác nhận thủ công)!');
                    } else {
                        setMessage('✅ Thanh toán thành công!');
                    }

                    setStatus('success');
                    setPollingController(null);
                    onPaymentSuccess(completedStatus);
                },
                (error) => {
                    console.log('[VietQRModal] Real-time listener error:', error);
                    // If real-time fails, fallback to polling
                    startFallbackPolling();
                },
                10 * 60 * 1000
            );

            setPollingController(listeningController);
        } catch (error) {
            console.error('[VietQRModal] Error starting real-time listener:', error);
            // Fallback to polling on error
            startFallbackPolling();
        }
    };

    const startFallbackPolling = () => {
        if (!paymentResult?.orderId) {
            console.warn('[VietQRModal] No orderId for fallback polling');
            return;
        }

        console.log('[VietQRModal] Starting fallback polling');
        setMessage('⏳ Chờ xác nhận (Polling mode)...');

        try {
            const pollingController = startPaymentPolling(
                paymentResult.orderId,
                (newStatus) => {
                    setPollCounter((prev) => prev + 1);
                    console.log('[VietQRModal] Poll attempt:', newStatus.status);
                },
                (completedStatus) => {
                    const method = completedStatus.verificationMethod || 'polling';
                    setVerificationMethod(method as any);

                    if (method === 'sms_banking') {
                        setMessage('✅ Thanh toán thành công (SMS Banking)!');
                    } else if (method === 'manual') {
                        setMessage('✅ Thanh toán thành công (Xác nhận thủ công)!');
                    } else {
                        setMessage('✅ Thanh toán thành công!');
                    }

                    setStatus('success');
                    setPollingController(null);
                    onPaymentSuccess(completedStatus);
                },
                (error) => {
                    console.error('[VietQRModal] Polling failed:', error);
                    setStatus('failed');
                    setMessage(error);
                    setPollingController(null);
                    onPaymentFailed(error);
                },
                3000,
                10 * 60 * 1000
            );

            setPollingController(pollingController);
        } catch (error: any) {
            console.error('[VietQRModal] Error starting fallback polling:', error);
            setStatus('failed');
            setMessage(error?.message || 'Lỗi khi khởi động polling');
            onPaymentFailed(error?.message || 'Polling initialization failed');
        }
    };

    useEffect(() => {
        return () => {
            // Cleanup: Stop listening/polling when component unmounts or modal closes
            if (pollingController) {
                try {
                    pollingController.stop();
                    console.log('[VietQRModal] Cleanup: Stopped polling/listening');
                } catch (error) {
                    console.warn('[VietQRModal] Cleanup error:', error);
                }
            }
        };
    }, [pollingController]);

    const handleCopyDescription = async () => {
        if (!paymentResult?.description) {
            Alert.alert('Lỗi', 'Không có nội dung để copy');
            return;
        }

        try {
            await Clipboard.setString(paymentResult.description);
            console.log('[VietQRModal] Copied to clipboard:', paymentResult.description);
            // Show feedback with actual content
            Alert.alert(
                '✅ Đã copy',
                paymentResult.description,
                [{ text: 'OK', onPress: () => { } }],
                { cancelable: true }
            );
        } catch (error) {
            console.warn('[VietQRModal] Copy error:', error);
            Alert.alert('Lỗi', 'Không thể copy. Vui lòng thử lại');
        }
    };

    const handleDirectPayment = () => {
        if (!paymentResult) {
            Alert.alert('Lỗi', 'Không có thông tin thanh toán');
            return;
        }

        const { amount, description, accountNumber } = paymentResult;

        if (!amount || !description || !accountNumber) {
            Alert.alert('Lỗi', 'Thông tin thanh toán không đầy đủ');
            return;
        }

        // Deep link to Vietcombank app with pre-filled payment info
        const bankingLink = `vietcombank://pay?amount=${amount}&account=${accountNumber}&description=${encodeURIComponent(description)}`;

        console.log('[VietQRModal] Opening banking link:', bankingLink);

        Linking.canOpenURL(bankingLink)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(bankingLink);
                } else {
                    // Fallback: Show error and keep modal open
                    console.warn('[VietQRModal] Banking link not supported');
                    Alert.alert('Lỗi', 'Vui lòng quét mã QR hoặc chuyển khoản thủ công');
                }
            })
            .catch((error) => {
                console.error('[VietQRModal] Banking link error:', error);
                Alert.alert('Lỗi', 'Không thể mở app ngân hàng. Vui lòng quét mã QR.');
            });
    };

    const handleVerifyPayment = async () => {
        if (!paymentResult) {
            Alert.alert('Lỗi', 'Không có thông tin thanh toán. Vui lòng thử lại');
            return;
        }

        // ✅ Use pre-filled description from modal (no user input needed)
        const descriptionToVerify = paymentResult.description;

        if (!descriptionToVerify?.trim()) {
            Alert.alert('Lỗi', 'Không có nội dung thanh toán. Vui lòng liên hệ hỗ trợ');
            return;
        }

        setIsVerifying(true);
        setStatus('verifying');
        setMessage('Đang xác nhận thanh toán...');

        try {
            console.log('[VietQRModal] Verifying payment with description:', descriptionToVerify);
            const result = await vietqrPaymentService.verifyPayment(
                paymentResult.orderId,
                descriptionToVerify,
                paymentResult.amount
            );

            setStatus('success');
            setVerificationMethod('manual');
            setMessage('✅ Thanh toán đã xác nhận!');
            console.log('[VietQRModal] Manual verification success:', result);
            onPaymentSuccess(result as PaymentStatus);
        } catch (error: any) {
            // ⚠️ IMPORTANT: Keep modal open on failure - user can retry
            setStatus('failed');
            const errorMsg = error?.message || 'Xác nhận thanh toán thất bại. Vui lòng thử lại hoặc liên hệ hỗ trợ';
            setMessage(errorMsg);
            console.error('[VietQRModal] Manual verification failed:', error);
            // Don't call onPaymentFailed - let user retry within modal
        } finally {
            setIsVerifying(false);
        }
    };

    // Debug: Run diagnostic
    const handleRunDiagnostic = async () => {
        if (!paymentResult?.orderId) {
            Alert.alert('Lỗi', 'Không có orderId');
            return;
        }

        Alert.alert('🔍 Running Diagnostic', 'Đang kiểm tra...');
        const results = await diagnosticService.runFullDiagnostic(paymentResult.orderId);
        await diagnosticService.analyzeProblem(paymentResult.orderId);

        const summaryText = `
Firestore: ${results.checks.firestore ? '✅' : '❌'}
Status: ${results.checks.firestoreStatus || 'N/A'}
Server: ${results.checks.server ? '✅' : '❌'}
Backend: ${results.checks.backend ? '✅' : '❌'}

Chi tiết xem logs ở console (F12)
        `;

        Alert.alert('📊 Diagnostic Results', summaryText.trim());
    };

    const handleReportIssue = async () => {
        if (!paymentResult) return;

        Alert.alert(
            'Báo cáo vấn đề',
            'Sử dụng tính năng này nếu bạn đã chuyển khoản thành công nhưng hệ thống chưa cộng xu sau 5-10 phút. Đội ngũ kỹ thuật sẽ kiểm tra ngay lập tức.',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Gửi báo cáo',
                    onPress: async () => {
                        try {
                            const result = await vietqrPaymentService.reportIssue(
                                paymentResult.orderId,
                                paymentResult.amount,
                                paymentResult.description
                            );

                            if (result?.success) {
                                Alert.alert('✅ Đã gửi', 'Báo cáo của bạn đã được gửi. Chúng tôi sẽ xử lý sớm nhất có thể.');
                            } else {
                                throw new Error(result?.message || 'Server error');
                            }
                        } catch (err: any) {
                            console.error('[VIETQR] Report Error:', err);
                            Alert.alert('Lỗi', `Không thể gửi báo cáo: ${err.message || 'Vui lòng thử lại sau.'}`);
                        }
                    }
                }
            ]
        );
    };

    const handleSaveQR = async () => {
        if (!paymentResult?.qrImageUrl) return;

        try {
            // Step 1: Download the image to a local temp file
            const filename = `VietQR_${paymentResult.orderId}.png`;
            const localUri = FileSystem.cacheDirectory + filename;

            const downloadResult = await FileSystem.downloadAsync(
                paymentResult.qrImageUrl,
                localUri
            );

            if (downloadResult.status !== 200) {
                throw new Error(`Download failed: HTTP ${downloadResult.status}`);
            }

            // Step 2: Share the file - user can save to gallery from share sheet
            await Share.share({
                title: 'Mã QR Thanh Toán VietQR',
                message: `Quét mã QR để thanh toán ${paymentResult.amount.toLocaleString('vi-VN')}đ - Nội dung: ${paymentResult.description}`,
                url: downloadResult.uri, // local file URI for iOS
            });

        } catch (err: any) {
            console.error('[VIETQR] Save QR error:', err);
            // Fallback: open in browser
            try {
                await Linking.openURL(paymentResult.qrImageUrl);
            } catch {
                Alert.alert(
                    'Lưu mã QR',
                    'Vui lòng chụp màn hình để lưu mã QR.'
                );
            }
        }
    };

    const renderContent = () => {
        if (status === 'success') {
            return (
                <View style={styles.statusContainer}>
                    <LinearGradient
                        colors={['#4CAF50', '#2E7D32']}
                        style={styles.statusIcon}
                    >
                        <Ionicons name="checkmark-sharp" size={48} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.statusTitle}>Giao dịch thành công!</Text>
                    <Text style={styles.statusMessage}>
                        Tài khoản của bạn đã được cộng xu thành công.
                    </Text>

                    {verificationMethod === 'sms_banking' && (
                        <View style={styles.successBadge}>
                            <Ionicons name="flash" size={16} color="#4CAF50" />
                            <Text style={styles.successBadgeText}>Xác nhận bởi SMS Banking</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={onClose}
                    >
                        <Text style={styles.primaryButtonText}>Xong</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (status === 'failed') {
            // ... similar to success but show retry/report
        }

        return (
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header Status */}
                <View style={styles.minimalHeader}>
                    <ActivityIndicator size="small" color="#00A8E8" />
                    <Text style={styles.minimalHeaderText}>Đang chờ bạn thanh toán...</Text>
                </View>

                {/* QR Section */}
                <View style={styles.qrSection}>
                    <Text style={styles.qrText}>Quét mã QR để chuyển khoản</Text>
                    <View style={styles.qrWrapper}>
                        {paymentResult?.qrImageUrl && (
                            <Image
                                source={{ uri: paymentResult.qrImageUrl }}
                                style={styles.qrImage}
                                resizeMode="contain"
                            />
                        )}
                        <View style={[styles.qrOverlay, { backgroundColor: '#E1F5FE' }]}>
                            <Text style={styles.qrOverlayText}>Số tiền đã bao gồm trong mã</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.saveQrButton} onPress={handleSaveQR}>
                        <Ionicons name="download-outline" size={18} color="#00A8E8" />
                        <Text style={styles.saveQrButtonText}>Lưu mã QR vào máy</Text>
                    </TouchableOpacity>
                </View>

                {/* Info Card */}
                <View style={styles.premiumCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Số tiền</Text>
                        <Text style={styles.infoValue}>
                            {paymentResult?.amount.toLocaleString('vi-VN')} đ
                        </Text>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Nội dung</Text>
                        <View style={styles.memoWrapper}>
                            <Text style={styles.memoText} numberOfLines={1}>{paymentResult?.description}</Text>
                            <TouchableOpacity onPress={handleCopyDescription} style={styles.copyIconButton}>
                                <Ionicons name="copy-outline" size={18} color="#00A8E8" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Ngân hàng</Text>
                        <Text style={[styles.infoValue, { fontSize: 13, color: '#666' }]}>
                            Vietcombank - {paymentResult?.accountNumber}
                        </Text>
                    </View>
                </View>

                {/* Automation Info */}
                <View style={styles.automationBox}>
                    <Ionicons name="sunny-outline" size={20} color="#00A8E8" />
                    <Text style={styles.automationText}>
                        Hệ thống sẽ tự động xác nhận ngay sau khi bạn nhận được thông báo biến động số dư.
                    </Text>
                </View>

                {/* Help / Report Section */}
                <View style={styles.helpSection}>
                    <TouchableOpacity onPress={handleReportIssue} style={styles.reportButton}>
                        <Text style={styles.reportButtonText}>Đã nạp tiền nhưng chưa được cộng xu?</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={styles.modalBody}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <Text style={styles.title}>Thanh toán VietQR</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#999" />
                        </TouchableOpacity>
                    </View>
                    {renderContent()}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalBody: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '90%',
        width: '100%',
        paddingBottom: 20,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1A1A1A',
        letterSpacing: -0.5,
    },
    closeBtn: {
        padding: 4,
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    minimalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: '#F0F9FF',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 50,
        alignSelf: 'center',
    },
    minimalHeaderText: {
        marginLeft: 10,
        fontSize: 13,
        color: '#00A8E8',
        fontWeight: '600',
    },
    qrSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    qrText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
        marginBottom: 16,
    },
    qrWrapper: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 8,
        alignItems: 'center',
    },
    qrImage: {
        width: 240,
        height: 240,
    },
    qrOverlay: {
        marginTop: 12,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    qrOverlayText: {
        fontSize: 11,
        color: '#00A8E8',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    saveQrButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    saveQrButtonText: {
        marginLeft: 8,
        fontSize: 13,
        color: '#00A8E8',
        fontWeight: '600',
    },
    premiumCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 16,
    },
    memoWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'flex-end',
        marginLeft: 16,
    },
    memoText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#00A8E8',
        marginRight: 8,
    },
    copyIconButton: {
        padding: 4,
    },
    automationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDFF',
        padding: 16,
        borderRadius: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    automationText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 12,
        color: '#0369A1',
        lineHeight: 18,
        fontWeight: '500',
    },
    helpSection: {
        alignItems: 'center',
    },
    reportButton: {
        paddingVertical: 12,
    },
    reportButtonText: {
        fontSize: 13,
        color: '#94A3B8',
        textDecorationLine: 'underline',
        fontWeight: '500',
    },
    statusContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    statusIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    statusTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A1A1A',
        marginBottom: 12,
    },
    statusMessage: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 40,
    },
    primaryButton: {
        backgroundColor: '#00A8E8',
        paddingVertical: 16,
        paddingHorizontal: 60,
        borderRadius: 100,
        shadowColor: '#00A8E8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 5,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    successBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 50,
        marginBottom: 32,
    },
    successBadgeText: {
        marginLeft: 6,
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '700',
    }
});