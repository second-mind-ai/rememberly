import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}

// Additional validation to ensure proper URLs
if (!supabaseUrl.startsWith('https://') || supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project')) {
  throw new Error('Invalid Supabase URL. Please check your environment configuration.');
}

if (supabaseAnonKey.includes('placeholder') || supabaseAnonKey.includes('your-anon-key')) {
  throw new Error('Invalid Supabase anon key. Please check your environment configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Check if we have valid configuration
export const hasValidSupabaseConfig = () => {
  return true; // If we reach this point, config is valid
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