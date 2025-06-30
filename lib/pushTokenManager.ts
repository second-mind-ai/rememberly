import { supabase } from './supabase';
import { registerForPushNotificationsAsync } from './notifications';

/**
 * Manages Expo push tokens for the current user
 */
export class PushTokenManager {
  private static instance: PushTokenManager;
  private currentToken: string | null = null;

  static getInstance(): PushTokenManager {
    if (!PushTokenManager.instance) {
      PushTokenManager.instance = new PushTokenManager();
    }
    return PushTokenManager.instance;
  }

  /**
   * Initialize push token management for the current user
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔔 Initializing push token manager...');

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.log('❌ No authenticated user, skipping push token setup');
        return;
      }

      // Register for push notifications and get token
      const { token, permission } = await registerForPushNotificationsAsync();
      
      if (!permission.granted) {
        console.log('❌ Push notification permission not granted');
        return;
      }

      if (!token) {
        console.log('❌ No push token received');
        return;
      }

      console.log('✅ Push token received:', token.substring(0, 20) + '...');
      this.currentToken = token;

      // Save token to user profile
      await this.saveTokenToProfile(user.id, token);

    } catch (error) {
      console.error('❌ Error initializing push token manager:', error);
    }
  }

  /**
   * Save push token to user profile
   */
  private async saveTokenToProfile(userId: string, token: string): Promise<void> {
    try {
      // First, try to update existing profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          expo_push_token: token,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        // If update fails, try to insert new profile
        console.log('Profile update failed, attempting insert...');
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            expo_push_token: token,
          });

        if (insertError) {
          console.error('❌ Error inserting profile:', insertError);
          throw insertError;
        }

        console.log('✅ Created new profile with push token');
      } else {
        console.log('✅ Updated existing profile with push token');
      }

    } catch (error) {
      console.error('❌ Error saving push token to profile:', error);
      throw error;
    }
  }

  /**
   * Update push token for current user
   */
  async updateToken(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { token } = await registerForPushNotificationsAsync();
      if (token && token !== this.currentToken) {
        this.currentToken = token;
        await this.saveTokenToProfile(user.id, token);
        console.log('✅ Push token updated');
      }
    } catch (error) {
      console.error('❌ Error updating push token:', error);
    }
  }

  /**
   * Remove push token for current user (on logout)
   */
  async removeToken(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ 
          expo_push_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      this.currentToken = null;
      console.log('✅ Push token removed from profile');
    } catch (error) {
      console.error('❌ Error removing push token:', error);
    }
  }

  /**
   * Get current push token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(preferences: {
    daily_summary?: boolean;
    reminders?: boolean;
    mentions?: boolean;
  }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      console.log('✅ Notification preferences updated');
    } catch (error) {
      console.error('❌ Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      return data?.notification_preferences || {
        daily_summary: true,
        reminders: true,
        mentions: true
      };
    } catch (error) {
      console.error('❌ Error getting notification preferences:', error);
      return {
        daily_summary: true,
        reminders: true,
        mentions: true
      };
    }
  }
}

export const pushTokenManager = PushTokenManager.getInstance();