import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import ChatList from '../../../components/chat/ChatList';
import { useAuth } from '../../../context/authContext';
import { ThemeContext } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/Colors';

const LoadingView = ({ theme, currentThemeColors }) => (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background, paddingTop: 20 }]}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <View key={i} style={styles.skeletonItem}>
                <View style={[styles.skeletonAvatar, { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E1E1E1' }]} />
                <View style={styles.skeletonTextContainer}>
                    <View style={[styles.skeletonLine, { width: '40%', height: 16, marginBottom: 8, backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E1E1E1' }]} />
                    <View style={[styles.skeletonLine, { width: '70%', height: 12, backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E1E1E1' }]} />
                </View>
                <View style={[styles.skeletonLine, { width: 40, height: 10, alignSelf: 'flex-start', marginTop: 4, backgroundColor: theme === 'dark' ? '#2A2A2A' : '#E1E1E1' }]} />
            </View>
        ))}
    </View>
);

const ChatScreen = () => {
    const { user, isLoading } = useAuth();
    const { theme } = React.useContext(ThemeContext);
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

    if (isLoading) {
        return <LoadingView theme={theme} currentThemeColors={currentThemeColors} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
            <ChatList currenUser={user} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    skeletonItem: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    skeletonAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    skeletonTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    skeletonLine: {
        borderRadius: 4,
    },
});

export default ChatScreen;
