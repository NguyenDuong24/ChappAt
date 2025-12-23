import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import ChatList from '../../../components/chat/ChatList';
import { useAuth } from '../../../context/authContext';
import { ThemeContext } from '../../../context/ThemeContext';
import { Colors } from '../../../constants/Colors';

const ChatScreen = () => {
    const { user, isLoading } = useAuth();
    const { theme } = React.useContext(ThemeContext);
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

    console.log('ChatScreen: user:', user?.uid, 'isLoading:', isLoading);

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: currentThemeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
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
});

export default ChatScreen;
