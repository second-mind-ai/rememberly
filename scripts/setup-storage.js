#!/usr/bin/env node

/**
 * One-time setup script for creating Supabase storage buckets
 * Run this script once to set up the required storage infrastructure
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (service role key from Supabase dashboard)');
  console.error('\nPlease add these to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStorageBuckets() {
  console.log('🚀 Setting up Supabase storage buckets...\n');

  try {
    // Check if files bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const filesBucketExists = buckets.some(bucket => bucket.name === 'files');

    if (filesBucketExists) {
      console.log('✅ Files bucket already exists');
    } else {
      // Create files bucket
      const { data, error } = await supabase.storage.createBucket('files', {
        public: true,
        allowedMimeTypes: [
          // Images
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/bmp',
          'image/svg+xml',
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/markdown',
          'text/csv',
          'application/json',
          'application/xml'
        ],
        fileSizeLimit: 20 * 1024 * 1024 // 20MB
      });

      if (error) {
        throw new Error(`Failed to create files bucket: ${error.message}`);
      }

      console.log('✅ Files bucket created successfully');
    }

    console.log('\n🎉 Storage setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to Storage > Policies');
    console.log('   3. Create the RLS policies as documented in SUPABASE_SETUP.md');
    console.log('\n   The app is now ready to handle file uploads!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   - Ensure your SUPABASE_SERVICE_ROLE_KEY is correct');
    console.error('   - Check that your Supabase project is active');
    console.error('   - Verify your network connection');
    process.exit(1);
  }
}

// Run the setup
setupStorageBuckets(); 