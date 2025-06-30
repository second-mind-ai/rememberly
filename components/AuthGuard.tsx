import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useGuestMode } from '@/lib/guestContext';
import { getCurrentUser } from '@/lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isGuestMode, loading } = useGuestMode();

  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return; // Wait for guest context to initialize

      try {
        const { user } = await getCurrentUser();
        const isAuthGroup = segments[0] === '(tabs)';
        const isAuthScreen = segments[0] === 'auth';

        if (user) {
          // User is authenticated
          if (isAuthScreen) {
            // Redirect to main app if on auth screen
            router.replace('/(tabs)');
          }
        } else {
          // User is not authenticated
          if (isAuthGroup && !isGuestMode) {
            // Redirect to auth if not in guest mode and trying to access protected routes
            router.replace('/auth/login');
          }
        }
      } catch (error) {
        console.error('Auth guard error:', error);
        // On error, redirect to login
        if (segments[0] === '(tabs)') {
          router.replace('/auth/login');
        }
      }
    };

    checkAuth();
  }, [segments, loading, isGuestMode, router]);

  return <>{children}</>;
} 