import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { initializeNotificationListeners } from '@/lib/notifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkStatus } from '@/components/NetworkStatus';
import { GuestProvider } from '@/lib/guestContext';
import { AuthGuard } from '@/components/AuthGuard';
import {
  Poppins_100Thin,
  Poppins_200ExtraLight,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Poppins-Light': Poppins_300Light,
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-ExtraBold': Poppins_800ExtraBold,
  });

  const frameworkReady = useFrameworkReady();

  useEffect(() => {
    let initCompleted = false;

    async function setupApp() {
      try {
        if (loaded && frameworkReady && !initCompleted) {
          initCompleted = true;
          console.log('🚀 App initialization started');

          // Initialize notification listeners
          console.log('🔔 Setting up notification listeners');
          initializeNotificationListeners();

          // Hide splash screen
          await SplashScreen.hideAsync();
          console.log('✅ App initialization completed');
        }
      } catch (error) {
        console.error('❌ App setup error:', error);
        // Still hide splash screen even if setup fails
        await SplashScreen.hideAsync();
      }
    }

    setupApp();
  }, [loaded, frameworkReady]);

  if (!loaded || !frameworkReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NetworkStatus />
          <GuestProvider>
            <AuthGuard>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </AuthGuard>
          </GuestProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}