import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useOptimizedGroupMessages } from '@/hooks/useOptimizedGroupMessages';
import { Ionicons } from '@expo/vector-icons';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

const { width } = Dimensions.get('window');

interface VoiceRoomChatProps {
    groupId: string;
    currentUser: any;
}

export default function VoiceRoomChat({ groupId, currentUser }: VoiceRoomChatProps) {
    const { messages } = useOptimizedGroupMessages({
        groupId,
        currentUserId: currentUser?.uid || '',
        pageSize: 30,
    });

    const [inputText, setInputText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 200);
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || !currentUser) return;

        const text = inputText.trim();
        setInputText('');

        try {
            const messagesRef = collection(doc(db, 'groups', groupId), 'messages');
            await addDoc(messagesRef, {
                text,
                createdAt: serverTimestamp(),
                uid: currentUser.uid,
                profileUrl: currentUser.photoURL || currentUser.profileUrl || '',
                senderName: currentUser.displayName || currentUser.username || 'User',
                status: 'sent',
                type: 'text',
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        // Only show text messages or image messages (as text)
        if (!item.text && !item.imageUrl) return null;

        return (
            <View style={styles.messageContainer}>
                <View style={styles.messageContent}>
                    <Text style={styles.senderName}>{item.senderName}: </Text>
                    <Text style={styles.messageText}>
                        {item.type === 'image' || item.imageUrl ? '📷 [Hình ảnh]' : item.text}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            />

            <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Chat..."
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    messageContainer: {
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    messageContent: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        flexWrap: 'wrap',
        maxWidth: '85%',
        alignItems: 'center',
    },
    senderName: {
        color: '#a3bffa',
        fontWeight: 'bold',
        fontSize: 13,
        marginRight: 4,
    },
    messageText: {
        color: '#fff',
        fontSize: 13,
        lineHeight: 18,
    },
    inputWrapper: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    input: {
        flex: 1,
        color: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 8,
        fontSize: 14,
    },
    sendButton: {
        padding: 8,
    },
});
