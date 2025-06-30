import React, { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useGuestMode } from '@/lib/guestContext';
import { getCurrentUser } from '@/lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isGuestMode, loading } = useGuestMode();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return; // Wait for guest context to initialize

      try {
        const { user } = await getCurrentUser();
        const isAuthGroup = segments[0] === '(tabs)';
        const isAuthScreen = segments[0] === 'auth';

        console.log('AuthGuard check:', { 
          hasUser: !!user, 
          isGuestMode, 
          isAuthGroup, 
          isAuthScreen, 
          segments: segments.join('/') 
        });

        if (user) {
          // User is authenticated
          if (isAuthScreen) {
            // Redirect to main app if on auth screen
            console.log('Authenticated user on auth screen, redirecting to tabs');
            router.replace('/(tabs)');
          }
        } else {
          // User is not authenticated
          if (isAuthGroup) {
            if (isGuestMode) {
              // Allow access to tabs in guest mode
              console.log('Guest mode access to tabs allowed');
            } else {
              // Redirect to auth if not in guest mode and trying to access protected routes
              console.log('No auth and no guest mode, redirecting to login');
              router.replace('/auth/login');
            }
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Auth guard error:', error);
        // On error, only redirect if we're trying to access protected routes and not in guest mode
        if (segments[0] === '(tabs)' && !isGuestMode) {
          router.replace('/auth/login');
        }
        setIsInitialized(true);
      }
    };

    checkAuth();
  }, [segments, loading, isGuestMode, router]);

  // Show nothing while initializing to prevent flashing
  if (!isInitialized || loading) {
    return null;
  }

  return <>{children}</>;
}