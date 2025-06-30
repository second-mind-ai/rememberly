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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    // Using system fonts since SpaceMono font file doesn't exist
  });

  const frameworkReady = useFrameworkReady();

  useEffect(() => {
    let initCompleted = false;

    async function setupApp() {
      try {
        if (loaded && frameworkReady && !initCompleted) {
          initCompleted = true;

          // Initialize notification listeners
          initializeNotificationListeners();

          // Hide splash screen
          await SplashScreen.hideAsync();
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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}