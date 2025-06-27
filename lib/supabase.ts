import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Provide fallback values for development to prevent crashes
const defaultUrl = 'https://placeholder.supabase.co';
const defaultKey = 'placeholder-key';

export const supabase = createClient(
  supabaseUrl || defaultUrl, 
  supabaseAnonKey || defaultKey
);

// Check if we have valid configuration
export const hasValidSupabaseConfig = () => {
  return supabaseUrl && 
         supabaseAnonKey && 
         supabaseUrl !== defaultUrl && 
         supabaseAnonKey !== defaultKey &&
         !supabaseUrl.includes('your-project') &&
         !supabaseAnonKey.includes('your-anon-key');
};

export type Database = {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          original_content: string;
          summary: string;
          type: 'text' | 'url' | 'file' | 'image';
          tags: string[];
          source_url: string | null;
          file_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          original_content: string;
          summary?: string;
          type?: 'text' | 'url' | 'file' | 'image';
          tags?: string[];
          source_url?: string | null;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          original_content?: string;
          summary?: string;
          type?: 'text' | 'url' | 'file' | 'image';
          tags?: string[];
          source_url?: string | null;
          file_url?: string | null;
          updated_at?: string;
        };
      };
      reminders: {
        Row: {
          id: string;
          note_id: string;
          user_id: string;
          remind_at: string;
          natural_input: string;
          is_completed: boolean;
          created_at: string;
          title: string;
          description: string;
          priority: string;
          notification_id: string | null;
        };
        Insert: {
          id?: string;
          note_id?: string;
          user_id: string;
          remind_at: string;
          natural_input: string;
          is_completed?: boolean;
          created_at?: string;
          title?: string;
          description?: string;
          priority?: string;
          notification_id?: string | null;
        };
        Update: {
          remind_at?: string;
          natural_input?: string;
          is_completed?: boolean;
          title?: string;
          description?: string;
          priority?: string;
          notification_id?: string | null;
        };
      };
    };
  };
};

// Test Supabase connection - for debugging
export const testSupabaseConnection = async () => {
  try {
    console.log('🧪 Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Has valid config:', hasValidSupabaseConfig());
    
    if (!hasValidSupabaseConfig()) {
      throw new Error('Invalid Supabase configuration');
    }
    
    // Simple connection test
    const { data, error } = await supabase.from('reminders').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Supabase connection successful');
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};