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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getAuth } from 'firebase/auth';
import { PaymentResult, PaymentStatus, vietqrPaymentService, startPaymentPolling, startRealTimePaymentListener } from '../../services/vietqrPaymentService';

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
                [{ text: 'OK', onPress: () => {} }],
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

    const renderContent = () => {
        if (status === 'success') {
            return (
                <View style={styles.statusContainer}>
                    <View style={[styles.statusIcon, { backgroundColor: '#4CAF50' }]}>
                        <Ionicons name="checkmark" size={48} color="#fff" />
                    </View>
                    <Text style={styles.statusTitle}>Thanh toán thành công!</Text>
                    <Text style={styles.statusMessage}>
                        Cảm ơn bạn đã sử dụng dịch vụ
                    </Text>
                    
                    {/* SMS Banking Badge - PROMINENT */}
                    {verificationMethod === 'sms_banking' && (
                        <LinearGradient
                            colors={['#E3F2FD', '#BBDEFB']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.smsBankingBadge}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="phone-portrait" size={24} color="#1976D2" />
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={{ fontSize: 12, color: '#0D47A1', fontWeight: '500' }}>Xác nhận qua</Text>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1976D2' }}>SMS Banking</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    )}
                    
                    {/* Verification method badge - ALTERNATIVE */}
                    {verificationMethod && verificationMethod !== 'sms_banking' && (
                        <View style={styles.verificationBadge}>
                            {verificationMethod === 'manual' ? (
                                <>
                                    <Ionicons name="checkmark-done" size={14} color="#00A8E8" />
                                    <Text style={styles.verificationText}>
                                        ✓ Xác nhận thủ công
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="tap" size={14} color="#00A8E8" />
                                    <Text style={styles.verificationText}>
                                        ⚡ Xác nhận tự động
                                    </Text>
                                </>
                            )}
                        </View>
                    )}
                    
                    <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                        <Text style={styles.doneButtonText}>Hoàn tất</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (status === 'failed') {
            return (
                <ScrollView style={styles.waitingContainer}>
                    {/* Error banner */}
                    <View style={[styles.autoCheckBanner, { backgroundColor: '#FFEBEE', borderLeftColor: '#F44336' }]}>
                        <View style={styles.autoCheckIcon}>
                            <Ionicons name="alert-circle" size={20} color="#F44336" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.autoCheckTitle, { color: '#F44336' }]}>⚠️ Xác nhận thất bại</Text>
                            <Text style={styles.autoCheckText}>{message}</Text>
                        </View>
                    </View>

                    {/* Retry options */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Bạn có thể:</Text>
                        
                        {/* Option 1: Retry real-time listener */}
                        <TouchableOpacity
                            style={[styles.retryButton, { marginBottom: 12, borderColor: '#00A8E8', borderWidth: 2, backgroundColor: '#fff' }]}
                            onPress={() => {
                                setPollCounter(0);
                                startAutoConfirmation();
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="sync" size={16} color="#00A8E8" />
                                <Text style={[styles.retryButtonText, { color: '#00A8E8', marginLeft: 8 }]}>↻ Kiểm tra lại SMS Banking</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Option 2: Direct payment */}
                        <TouchableOpacity
                            style={[styles.retryButton, { marginBottom: 12, backgroundColor: '#00A8E8', borderWidth: 0 }]}
                            onPress={handleDirectPayment}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="card" size={16} color="#fff" />
                                <Text style={[styles.retryButtonText, { color: '#fff', marginLeft: 8 }]}>
                                    💳 Thanh toán {paymentResult?.amount.toLocaleString('vi-VN')}đ
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Option 3: Manual confirmation (fallback) */}
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' }]}
                            onPress={handleVerifyPayment}
                            disabled={isVerifying}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="checkmark-circle" size={16} color="#666" />
                                <Text style={[styles.retryButtonText, { color: '#666', marginLeft: 8 }]}>
                                    ✓ Xác nhận thủ công
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Close option */}
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#eee' }}
                            onPress={onClose}
                        >
                            <Text style={{ textAlign: 'center', color: '#666', fontSize: 14, fontWeight: '600' }}>
                                Đóng
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            );
        }

        return (
            <ScrollView style={styles.waitingContainer}>
                {/* Real-time SMS Banking listener banner (PROMINENTLY DISPLAYED) */}
                {status === 'polling' && (
                    <LinearGradient
                        colors={['#E8F5E9', '#C8E6C9']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.autoCheckBanner, { backgroundColor: 'transparent', borderLeftColor: '#4CAF50' }]}
                    >
                        <View style={styles.autoCheckIcon}>
                            <Ionicons name="phone-portrait" size={20} color="#2E7D32" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.autoCheckTitle, { color: '#2E7D32' }]}>📱 Lắng nghe SMS Banking</Text>
                            <Text style={[styles.autoCheckText, { color: '#558B2F' }]}>
                                App đang chờ xác nhận từ SMS Banking. Vui lòng quét QR hoặc chuyển khoản...
                            </Text>
                        </View>
                    </LinearGradient>
                )}

                {/* Fallback banner when waiting before polling starts */}
                {status === 'waiting' && (
                    <View style={[styles.autoCheckBanner, { borderLeftColor: '#FF9800' }]}>
                        <View style={styles.autoCheckIcon}>
                            <Ionicons name="information-circle" size={20} color="#F57C00" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.autoCheckTitle, { color: '#F57C00' }]}>⚡ Thanh toán tự động</Text>
                            <Text style={styles.autoCheckText}>
                                Quét mã QR hoặc chuyển khoản để bắt đầu. Hệ thống sẽ tự động xác nhận...
                            </Text>
                        </View>
                    </View>
                )}

                {/* Step 1: QR Code */}
                <View style={styles.section}>
                    <View style={styles.stepBadge}>
                        <Text style={styles.stepText}>Bước 1</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Quét mã QR hoặc chuyển khoản</Text>

                    {/* QR Code Image */}
                    {paymentResult?.qrImageUrl && (
                        <View style={styles.qrContainer}>
                            <Image
                                source={{ uri: paymentResult.qrImageUrl }}
                                style={styles.qrImage}
                                onError={() => console.log('QR Image failed to load')}
                            />
                        </View>
                    )}

                    {/* Bank Details */}
                    <View style={styles.bankDetailsCard}>
                        <View style={styles.bankInfo}>
                            <MaterialCommunityIcons name="bank" size={24} color="#1976D2" />
                            <View style={styles.bankInfoText}>
                                <Text style={styles.bankName}>{paymentResult?.accountName}</Text>
                                <Text style={styles.bankAccount}>{paymentResult?.accountNumber}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Amount */}
                        <View style={styles.amountInfo}>
                            <Text style={styles.amountLabel}>Số tiền</Text>
                            <Text style={styles.amountValue}>
                                {paymentResult?.amount.toLocaleString('vi-VN')} ₫
                            </Text>
                        </View>

                        {/* Description */}
                        <View style={[styles.amountInfo, { marginTop: 12 }]}>
                            <Text style={styles.amountLabel}>Nội dung chuyển khoản</Text>
                            <View style={styles.descriptionBox}>
                                <Text style={styles.descriptionText}>
                                    {paymentResult?.description}
                                </Text>
                                <TouchableOpacity
                                    style={styles.copyButton}
                                    onPress={handleCopyDescription}
                                >
                                    <Ionicons name="copy" size={16} color="#1976D2" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Instructions */}
                    {paymentResult?.instructions && (
                        <View style={styles.instructionBox}>
                            <Ionicons name="information-circle" size={20} color="#FF6F00" />
                            <View style={styles.instructionText}>
                                <Text style={styles.instructionTitle}>Hướng dẫn:</Text>
                                <Text style={styles.instructionItem}>
                                    • {paymentResult.instructions.method1}
                                </Text>
                                <Text style={styles.instructionItem}>
                                    • {paymentResult.instructions.method2}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Step 2: Direct Payment Options */}
                {status === 'polling' && (
                    <View style={styles.section}>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepText}>Bước 2</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Cách thanh toán nhanh</Text>

                        {/* Direct Payment Button */}
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: '#00A8E8', marginBottom: 12, borderWidth: 0 }]}
                            onPress={handleDirectPayment}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="card" size={18} color="#fff" />
                                <Text style={[styles.retryButtonText, { color: '#fff', marginLeft: 8, fontWeight: '700' }]}>
                                    💳 {paymentResult?.amount.toLocaleString('vi-VN')}đ
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* OR divider */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12 }}>
                            <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
                            <Text style={{ marginHorizontal: 8, color: '#999', fontSize: 12 }}>Hoặc</Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: '#ddd' }} />
                        </View>

                        {/* Manual confirmation - OPTIONAL FALLBACK */}
                        <View style={styles.confirmBox}>
                            <Text style={styles.confirmLabel}>
                                Nếu muốn xác nhận thủ công:
                            </Text>
                            <LinearGradient
                                colors={['#F5F5F5', '#EEEEEE']}
                                style={[styles.verifyButton, { marginTop: 12 }]}
                            >
                                <TouchableOpacity
                                    onPress={handleVerifyPayment}
                                    disabled={isVerifying}
                                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                                >
                                    {isVerifying ? (
                                        <View style={styles.verifyButtonContent}>
                                            <ActivityIndicator size="small" color="#1976D2" />
                                            <Text style={[styles.verifyButtonText, { color: '#1976D2' }]}>Đang xác nhận...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.verifyButtonContent}>
                                            <Ionicons name="checkmark-circle" size={18} color="#1976D2" />
                                            <Text style={[styles.verifyButtonText, { color: '#1976D2' }]}>✓ Xác nhận tôi đã thanh toán</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </LinearGradient>
                        </View>
                    </View>
                )}

                {/* Timeout Info */}
                {status === 'polling' && (
                    <View style={{ backgroundColor: '#FFF3E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#FF6F00' }}>
                        <Text style={{ fontSize: 12, color: '#E65100', lineHeight: 18, fontWeight: '500' }}>
                            ⏱️ Đơn hàng sẽ hủy sau <Text style={{ fontWeight: '700', color: '#D84315' }}>10 phút</Text>. Quét mã QR hoặc chuyển khoản để thanh toán.
                        </Text>
                    </View>
                )}
            </ScrollView>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <BlurView intensity={90} style={styles.blurContainer}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            {status === 'success' ? 'Thanh toán thành công' : 'Thanh toán bằng VietQR'}
                        </Text>
                        {status !== 'success' && status !== 'failed' && (
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Content */}
                    {renderContent()}
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    waitingContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    autoCheckBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        borderLeftWidth: 4,
        borderLeftColor: '#00A8E8',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 10,
        marginBottom: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    autoCheckIcon: {
        marginRight: 12,
        fontSize: 20,
    },
    autoCheckTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#00A8E8',
        marginBottom: 4,
    },
    autoCheckText: {
        fontSize: 12,
        color: '#555',
        lineHeight: 18,
        fontWeight: '500',
    },
    section: {
        marginBottom: 20,
    },
    stepBadge: {
        backgroundColor: '#00A8E8',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        alignSelf: 'flex-start',
        marginBottom: 10,
        shadowColor: '#00A8E8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    stepText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#222',
        marginBottom: 12,
        letterSpacing: 0.3,
    },
    qrContainer: {
        alignItems: 'center',
        backgroundColor: '#FAFBFC',
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#E8F0F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    qrImage: {
        width: 220,
        height: 220,
        borderRadius: 8,
    },
    bankDetailsCard: {
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
    },
    bankInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    bankInfoText: {
        marginLeft: 12,
        flex: 1,
    },
    bankName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#00A8E8',
    },
    bankAccount: {
        fontSize: 13,
        color: '#555',
        marginTop: 4,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#E8EEF5',
        marginVertical: 14,
    },
    amountInfo: {
        marginBottom: 14,
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 12,
    },
    amountLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 6,
        fontWeight: '600',
    },
    amountValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#00A8E8',
    },
    descriptionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E0E8F0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
    },
    descriptionText: {
        flex: 1,
        fontSize: 14,
        color: '#222',
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    copyButton: {
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#00A8E8',
        opacity: 0.1,
    },
    instructionBox: {
        flexDirection: 'row',
        backgroundColor: '#FEF5F0',
        borderLeftWidth: 4,
        borderLeftColor: '#FF6F00',
        borderRadius: 10,
        padding: 14,
        marginBottom: 16,
    },
    instructionText: {
        flex: 1,
        marginLeft: 12,
    },
    instructionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FF6F00',
        marginBottom: 6,
    },
    instructionItem: {
        fontSize: 12,
        color: '#555',
        marginBottom: 4,
        lineHeight: 18,
        fontWeight: '500',
    },
    confirmBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E0E8F0',
        marginBottom: 16,
    },
    confirmLabel: {
        fontSize: 14,
        color: '#222',
        marginBottom: 10,
        fontWeight: '700',
    },
    confirmInput: {
        borderWidth: 1.5,
        borderColor: '#E0E8F0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#222',
        marginBottom: 10,
        fontWeight: '500',
        backgroundColor: '#FFF',
    },
    confirmHint: {
        fontSize: 12,
        color: '#888',
        fontStyle: 'italic',
        fontWeight: '500',
    },
    verifyButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
        shadowColor: '#00A8E8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    verifyButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 10,
    },
    statusContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
        backgroundColor: '#FFF',
    },
    statusIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 5,
    },
    statusTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#222',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    statusMessage: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
        fontWeight: '500',
    },
    doneButton: {
        backgroundColor: '#00A8E8',
        borderRadius: 12,
        paddingHorizontal: 40,
        paddingVertical: 14,
        shadowColor: '#00A8E8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    retryButton: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
    },
    retryButtonText: {
        color: '#222',
        fontSize: 16,
        fontWeight: '700',
    },
    verificationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E0F7FF',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 24,
        borderLeftWidth: 3,
        borderLeftColor: '#00A8E8',
        gap: 8,
    },
    verificationText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#00A8E8',
    },
    smsBankingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 28,
        marginTop: -8,
        shadowColor: '#1976D2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#90CAF9',
    },
});