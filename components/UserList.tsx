import React, { useCallback } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useOptimizedUsers } from '@/hooks/useOptimizedUsers';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

interface UserListProps {
    currentUserId: string;
}

const UserList: React.FC<UserListProps> = ({ currentUserId }) => {
    const { users, loadMoreUsers, hasMore, loading, refreshData } = useOptimizedUsers(currentUserId);
    const router = useRouter();

    const renderItem = useCallback(({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => router.push({ pathname: '/(screens)/user/UserProfileScreen', params: { userId: item.uid } })}
        >
            <Image
                source={{ uri: item.profileUrl || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
            />
            <View style={styles.userInfo}>
                <Text style={styles.username}>{item.username}</Text>
                {item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
            </View>
        </TouchableOpacity>
    ), [router]);

    const renderFooter = () => {
        if (!loading) return null;
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="small" color={Colors.primary} />
            </View>
        );
    };

    return (
        <FlatList
            data={users}
            renderItem={renderItem}
            keyExtractor={(item) => item.uid}
            onEndReached={() => {
                if (hasMore && !loading) {
                    loadMoreUsers();
                }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            refreshing={loading && users.length === 0}
            onRefresh={refreshData}
            contentContainerStyle={styles.listContainer}
        />
    );
};

const styles = StyleSheet.create({
    listContainer: {
        padding: 16,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    userInfo: {
        marginLeft: 12,
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    bio: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    loader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});

export default UserList;
