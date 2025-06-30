import { supabase } from './supabase';
import { pushTokenManager } from './pushTokenManager';

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  // If signup is successful, initialize push token
  if (data.user && !error) {
    console.log('👤 User signed up successfully, initializing push token');
    try {
      await pushTokenManager.initialize();
    } catch (tokenError) {
      console.error('⚠️ Push token initialization failed after signup:', tokenError);
      // Don't block signup if token initialization fails
    }
  }
  
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  // If login is successful, initialize push token
  if (data.user && !error) {
    console.log('👤 User signed in successfully, initializing push token');
    try {
      await pushTokenManager.initialize();
    } catch (tokenError) {
      console.error('⚠️ Push token initialization failed after login:', tokenError);
      // Don't block login if token initialization fails
    }
  }
  
  return { data, error };
}

export async function signOut() {
  // Remove push token before signing out
  try {
    await pushTokenManager.removeToken();
  } catch (error) {
    console.error('⚠️ Error removing push token during sign out:', error);
    // Continue with sign out even if token removal fails
  }
  
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  // Handle stale JWT session error
  if (error && error.message === 'Session from session_id claim in JWT does not exist') {
    // Clear the invalid session
    await supabase.auth.signOut();
    return { user: null, error: null };
  }
  
  return { user, error };
}