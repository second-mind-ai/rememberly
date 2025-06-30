#!/usr/bin/env node

/**
 * Script to set up Row Level Security policies for Supabase Storage
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupRLSPolicies() {
  console.log('🔐 Setting up Row Level Security policies for storage...\n');

  const sqlStatements = `
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload files to their own folder
CREATE POLICY "Users can upload files to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
  `.trim();

  console.log('❌ Automatic RLS setup is not available via the JavaScript client.');
  console.log('\n🛠️  Manual Setup Required:');
  console.log('Please copy and paste the following SQL into your Supabase SQL Editor:');
  console.log('\n' + '='.repeat(60));
  console.log(sqlStatements);
  console.log('='.repeat(60));
  
  console.log('\n📋 Steps:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Paste the SQL above');
  console.log('4. Click "Run"');
  console.log('\n📱 After running the SQL, your app will be able to upload files!');
}

// Run the setup
setupRLSPolicies(); 