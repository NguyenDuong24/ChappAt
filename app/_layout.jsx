import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useContext } from 'react';
import 'react-native-reanimated';
import { AuthContextProvider, useAuth } from '../context/authContext';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppState, Text, View } from 'react-native';
import { AppStateProvider } from '../context/AppStateContext';
import { LogoStateProvider } from '../context/LogoStateContext';
import { LocationProvider } from '../context/LocationContext';
import { ThemeProvider } from '../context/ThemeContext'; 
import { StateCommonProvider } from '../context/stateCommon';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

const MainLayout = () => {
    const { isAuthenticated } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const { theme } = useContext(ThemeContext);
    const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;

    useEffect(() => {
        if (typeof (isAuthenticated) === 'undefined') return;
        const inApp = segments[0] === '(app)';
        if (isAuthenticated && !inApp) {
            router.replace('/home');
        } else if (isAuthenticated === false) {
            router.replace('signin');
        }
    }, [isAuthenticated]);

    return (
        <Stack>
            <Stack.Screen name="(tabs)" options={{
                headerShown: false
            }} />
            <Stack.Screen name="signin" options={{
                headerShown: false
            }} />
            <Stack.Screen name="signup" options={{
                headerShown: false
            }} />
            <Stack.Screen 
            name="UserProfileScreen" 
            options={{
                headerShown: true,
                headerStyle: {
                backgroundColor: currentThemeColors.backgroundHeader,
                },
                headerTintColor: currentThemeColors.text,
                headerTitleStyle: {
                fontWeight: 'bold', 
                },
                title: 'Hồ Sơ',
            }} 
            />
        </Stack>
    );
};

export default function RootLayout() {
    const [appState, setAppState] = useState(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", nextAppState => {
            setAppState(nextAppState);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    return (
        <AuthContextProvider>
            <StateCommonProvider>
            <ThemeProvider>
          <AppStateProvider>
            
            <LogoStateProvider>
            <LocationProvider>
            <PaperProvider>
                <MainLayout />
            </PaperProvider>
            </LocationProvider>
            </LogoStateProvider>
            
          </AppStateProvider>
          </ThemeProvider>
          </StateCommonProvider>
        </AuthContextProvider>
    );
}
