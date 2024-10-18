import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import {AuthContextProvider, useAuth} from '../context/authContext';


const MainLayout = ()=>{
    const {isAuthenticated} = useAuth();
    const segments = useSegments();
    const router = useRouter();
    
    useEffect(()=>{
      if(typeof(isAuthenticated) == 'undefined') return;
      const inApp = segments[0] == '(app)';
      if(isAuthenticated && !inApp)
      {
        router.replace('/home');
      }
      else if(isAuthenticated==false){
        router.replace('signin');
      }
    },[isAuthenticated])
    return <Stack>
      <Stack.Screen name="(tabs)" options={{
        headerShown: false
      }}/>
    </Stack>
}


export default function RootLayout() {
  return (
    <AuthContextProvider>
      <MainLayout></MainLayout>
    </AuthContextProvider>
  );
}
