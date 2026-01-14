import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { PaymentResult, PaymentStatus, momoPaymentService, formatVND } from '../../services/momoPaymentService';

interface MoMoPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    paymentResult: PaymentResult | null;
    onPaymentSuccess: (status: PaymentStatus) => void;
    onPaymentFailed: (error: string) => void;
}

export default function MoMoPaymentModal({
    visible,
    onClose,
    paymentResult,
    onPaymentSuccess,
    onPaymentFailed,
}: MoMoPaymentModalProps) {
    const [status, setStatus] = useState<'waiting' | 'checking' | 'success' | 'failed'>('waiting');
    const [message, setMessage] = useState('Đang chờ thanh toán...');
    const [pollCount, setPollCount] = useState(0);

    // Poll for payment status
    useEffect(() => {
        if (!visible || !paymentResult?.orderId) return;

        const pollInterval = setInterval(async () => {
            try {
                setStatus('checking');
                const result = await momoPaymentService.checkPaymentStatus(paymentResult.orderId);

                if (result.status === 'success') {
                    setStatus('success');
                    setMessage('Thanh toán thành công!');
                    clearInterval(pollInterval);
                    onPaymentSuccess(result);
                } else if (result.status === 'failed' || result.status === 'cancelled') {
                    setStatus('failed');
                    setMessage(result.message || 'Thanh toán thất bại');
                    clearInterval(pollInterval);
                    onPaymentFailed(result.message || 'Thanh toán thất bại');
                } else {
                    setStatus('waiting');
                    setPollCount(prev => prev + 1);
                }
            } catch (error) {
                console.error('Error checking payment status:', error);
                // Don't stop polling on error, just continue
                setStatus('waiting');
            }
        }, 3000); // Poll every 3 seconds

        // Stop polling after 5 minutes
        const timeout = setTimeout(() => {
            clearInterval(pollInterval);
            if (status === 'waiting' || status === 'checking') {
                setStatus('failed');
                setMessage('Hết thời gian chờ thanh toán');
                onPaymentFailed('Hết thời gian chờ thanh toán');
            }
        }, 5 * 60 * 1000);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
        };
    }, [visible, paymentResult?.orderId]);

    const handleOpenMoMo = async () => {
        if (!paymentResult) return;

        try {
            await momoPaymentService.openPayment(paymentResult);
        } catch (error) {
            console.error('Error opening MoMo:', error);
        }
    };

    const handleOpenWebPayment = async () => {
        if (!paymentResult?.payUrl) return;

        try {
            await Linking.openURL(paymentResult.payUrl);
        } catch (error) {
            console.error('Error opening web payment:', error);
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
                    <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                        <Text style={styles.doneButtonText}>Hoàn tất</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (status === 'failed') {
            return (
                <View style={styles.statusContainer}>
                    <View style={[styles.statusIcon, { backgroundColor: '#F44336' }]}>
                        <Ionicons name="close" size={48} color="#fff" />
                    </View>
                    <Text style={styles.statusTitle}>Thanh toán thất bại</Text>
                    <Text style={styles.statusMessage}>{message}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={onClose}>
                        <Text style={styles.retryButtonText}>Đóng</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.waitingContainer}>
                {/* MoMo Logo */}
                <View style={styles.momoLogo}>
                    <LinearGradient
                        colors={['#A50064', '#D82D8B']}
                        style={styles.momoLogoGradient}
                    >
                        <Text style={styles.momoLogoText}>MoMo</Text>
                    </LinearGradient>
                </View>

                {/* Payment Instructions */}
                <View style={styles.instructionContainer}>
                    <Ionicons name="phone-portrait-outline" size={48} color="#A50064" />
                    <Text style={styles.instructionText}>
                        Nhấn nút bên dưới để mở ứng dụng MoMo và hoàn tất thanh toán
                    </Text>
                </View>

                {/* Waiting indicator */}
                <View style={styles.waitingIndicator}>
                    <ActivityIndicator size="small" color="#A50064" />
                    <Text style={styles.waitingText}>
                        {status === 'checking' ? 'Đang kiểm tra...' : 'Đang chờ thanh toán...'}
                    </Text>
                </View>

                {/* Action buttons */}
                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={styles.momoButton}
                        onPress={handleOpenMoMo}
                    >
                        <LinearGradient
                            colors={['#A50064', '#D82D8B']}
                            style={styles.momoButtonGradient}
                        >
                            <Ionicons name="wallet" size={20} color="#fff" />
                            <Text style={styles.momoButtonText}>Mở App MoMo</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {paymentResult?.payUrl && (
                        <TouchableOpacity
                            style={styles.webButton}
                            onPress={handleOpenWebPayment}
                        >
                            <Ionicons name="globe-outline" size={20} color="#666" />
                            <Text style={styles.webButtonText}>Thanh toán trên web</Text>
                        </TouchableOpacity>
                    )}

                    {/* DEV ONLY: Simulate Success Button */}
                    {__DEV__ && (
                        <TouchableOpacity
                            style={[styles.webButton, { borderColor: '#4CAF50', marginTop: 8 }]}
                            onPress={() => {
                                // Simulate success
                                setStatus('success');
                                setMessage('Thanh toán thành công (Mô phỏng)!');
                                onPaymentSuccess({
                                    orderId: paymentResult?.orderId || 'simulated_order',
                                    status: 'success',
                                    message: 'Thanh toán thành công (Mô phỏng)',
                                    amount: 0,
                                    coinAmount: 0
                                });
                            }}
                        >
                            <Ionicons name="bug-outline" size={20} color="#4CAF50" />
                            <Text style={[styles.webButtonText, { color: '#4CAF50' }]}>Giả lập thành công (DEV)</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Cancel button */}
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelButtonText}>Hủy thanh toán</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={20} style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Thanh toán MoMo</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            disabled={status === 'checking'}
                        >
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    {renderContent()}
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    waitingContainer: {
        padding: 24,
        alignItems: 'center',
    },
    momoLogo: {
        marginBottom: 20,
    },
    momoLogoGradient: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    momoLogoText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    instructionContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#FFF5FA',
        borderRadius: 12,
        marginBottom: 16,
    },
    instructionText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    waitingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    waitingText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
    },
    buttonGroup: {
        width: '100%',
        gap: 12,
    },
    momoButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    momoButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        gap: 8,
    },
    momoButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    webButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        gap: 8,
    },
    webButtonText: {
        fontSize: 16,
        color: '#666',
    },
    cancelButton: {
        marginTop: 16,
        padding: 12,
    },
    cancelButtonText: {
        fontSize: 14,
        color: '#999',
    },
    statusContainer: {
        padding: 32,
        alignItems: 'center',
    },
    statusIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    statusMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    doneButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 14,
        paddingHorizontal: 48,
        borderRadius: 12,
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    retryButton: {
        backgroundColor: '#F44336',
        paddingVertical: 14,
        paddingHorizontal: 48,
        borderRadius: 12,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
