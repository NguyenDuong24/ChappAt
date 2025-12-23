import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    ActivityIndicator,
    Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '@/context/authContext';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

interface EventPass {
    id: string;
    eventName: string;
    eventImage: string;
    location: string;
    date: string;
    time: string;
    seat?: string;
    price?: string;
    status: 'active' | 'used' | 'expired';
    description: string;
    organizer: string;
}

const EventPassDetailScreen = () => {
    const { eventPassId } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [pass, setPass] = useState<EventPass | null>(null);

    useEffect(() => {
        // Simulate fetching data
        const fetchPass = async () => {
            setLoading(true);
            // Mock data delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data
            setPass({
                id: eventPassId as string || '123',
                eventName: 'Summer Music Festival 2025',
                eventImage: 'https://images.unsplash.com/photo-1459749411177-2a2965f7852f?q=80&w=2070&auto=format&fit=crop',
                location: 'Sân vận động Quốc gia Mỹ Đình, Hà Nội',
                date: '20/07/2025',
                time: '19:00 - 23:00',
                seat: 'VIP - Row A - Seat 12',
                price: '2.500.000 VNĐ',
                status: 'active',
                description: 'Lễ hội âm nhạc lớn nhất mùa hè với sự tham gia của các nghệ sĩ hàng đầu trong nước và quốc tế. Trải nghiệm âm thanh ánh sáng đỉnh cao.',
                organizer: 'ChappAt Events'
            });
            setLoading(false);
        };

        fetchPass();
    }, [eventPassId]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Đang tải vé...</Text>
            </View>
        );
    }

    if (!pass) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Không tìm thấy vé</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Background Image */}
            <Image source={{ uri: pass.eventImage }} style={styles.backgroundImage} blurRadius={10} />
            <View style={styles.overlay} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Vé Sự Kiện</Text>
                <TouchableOpacity style={styles.headerButton}>
                    <Ionicons name="share-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Ticket Card */}
                <View style={styles.ticketContainer}>
                    {/* Ticket Header (Image) */}
                    <View style={styles.ticketHeader}>
                        <Image source={{ uri: pass.eventImage }} style={styles.eventImage} />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.8)']}
                            style={styles.imageGradient}
                        >
                            <Text style={styles.eventName}>{pass.eventName}</Text>
                            <View style={styles.organizerRow}>
                                <MaterialIcons name="verified" size={16} color={Colors.primary} />
                                <Text style={styles.organizerText}>{pass.organizer}</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Ticket Body */}
                    <View style={styles.ticketBody}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Text style={styles.label}>NGÀY</Text>
                                <Text style={styles.value}>{pass.date}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.label}>GIỜ</Text>
                                <Text style={styles.value}>{pass.time}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Text style={styles.label}>ĐỊA ĐIỂM</Text>
                                <Text style={styles.value} numberOfLines={2}>{pass.location}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Text style={styles.label}>VỊ TRÍ</Text>
                                <Text style={styles.value}>{pass.seat}</Text>
                            </View>
                            <View style={styles.infoItem}>
                                <Text style={styles.label}>GIÁ VÉ</Text>
                                <Text style={[styles.value, { color: Colors.primary }]}>{pass.price}</Text>
                            </View>
                        </View>

                        {/* QR Code Section */}
                        <View style={styles.qrSection}>
                            <View style={styles.qrBorder}>
                                <QRCode
                                    value={pass.id}
                                    size={150}
                                    color="black"
                                    backgroundColor="white"
                                />
                            </View>
                            <Text style={styles.qrText}>Quét mã này tại cổng soát vé</Text>
                            <Text style={styles.ticketId}>ID: {pass.id}</Text>
                        </View>
                    </View>

                    {/* Ticket Footer (Tear-off effect) */}
                    <View style={styles.ticketFooter}>
                        <View style={styles.circleLeft} />
                        <View style={styles.dashedLine} />
                        <View style={styles.circleRight} />
                    </View>

                    {/* Status Badge */}
                    <View style={[styles.statusBadge,
                    pass.status === 'active' ? styles.statusActive :
                        pass.status === 'used' ? styles.statusUsed : styles.statusExpired
                    ]}>
                        <Text style={styles.statusText}>
                            {pass.status === 'active' ? 'CÓ HIỆU LỰC' :
                                pass.status === 'used' ? 'ĐÃ SỬ DỤNG' : 'HẾT HẠN'}
                        </Text>
                    </View>
                </View>

                {/* Description */}
                <View style={styles.descriptionContainer}>
                    <Text style={styles.sectionTitle}>Thông tin sự kiện</Text>
                    <Text style={styles.descriptionText}>{pass.description}</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton}>
                        <MaterialCommunityIcons name="calendar-export" size={24} color="white" />
                        <Text style={styles.actionButtonText}>Thêm vào lịch</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]}>
                        <MaterialCommunityIcons name="map-marker-radius" size={24} color="white" />
                        <Text style={styles.actionButtonText}>Chỉ đường</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    loadingText: {
        color: 'white',
        marginTop: 10,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
    },
    errorText: {
        color: 'white',
        fontSize: 18,
        marginBottom: 20,
    },
    backgroundImage: {
        position: 'absolute',
        width: width,
        height: height,
        resizeMode: 'cover',
    },
    overlay: {
        position: 'absolute',
        width: width,
        height: height,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight! + 10,
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    ticketContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    ticketHeader: {
        height: 200,
        position: 'relative',
    },
    eventImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
        justifyContent: 'flex-end',
        padding: 20,
    },
    eventName: {
        color: 'white',
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 5,
    },
    organizerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    organizerText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
    },
    ticketBody: {
        padding: 24,
        backgroundColor: 'white',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    infoItem: {
        flex: 1,
    },
    label: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: 1,
    },
    value: {
        color: '#222',
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 16,
    },
    qrSection: {
        alignItems: 'center',
        marginTop: 10,
    },
    qrBorder: {
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#222',
        marginBottom: 12,
    },
    qrText: {
        color: '#666',
        fontSize: 12,
        marginBottom: 4,
    },
    ticketId: {
        color: '#AAA',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    ticketFooter: {
        height: 20,
        backgroundColor: 'white',
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -10,
        zIndex: 1,
    },
    circleLeft: {
        position: 'absolute',
        left: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#121212',
    },
    circleRight: {
        position: 'absolute',
        right: -10,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#121212',
    },
    dashedLine: {
        width: '80%',
        height: 1,
        borderWidth: 1,
        borderColor: '#DDD',
        borderStyle: 'dashed',
        borderRadius: 1,
    },
    statusBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusActive: {
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
        borderColor: '#4CAF50',
    },
    statusUsed: {
        backgroundColor: 'rgba(158, 158, 158, 0.9)',
        borderColor: '#9E9E9E',
    },
    statusExpired: {
        backgroundColor: 'rgba(244, 67, 54, 0.9)',
        borderColor: '#F44336',
    },
    statusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '700',
    },
    descriptionContainer: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    descriptionText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        lineHeight: 22,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    secondaryAction: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: Colors.primary,
        borderRadius: 8,
    },
    backButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});

export default EventPassDetailScreen;
