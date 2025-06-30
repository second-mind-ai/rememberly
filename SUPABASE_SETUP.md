# Supabase Storage Setup for File Uploads

This document explains how to set up Supabase Storage for file uploads in the Rememberly app.

## 🚀 Quick Setup

You need to run a one-time setup script to create the storage bucket, then set up the storage policies manually in your Supabase dashboard.

### Step 1: Get Your Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to Settings > API  
3. Copy the "service_role" key (not the anon key)
4. Add it to your `.env` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 2: Run the Setup Script

```bash
npm run setup:storage
```

This will create the required storage bucket with proper configuration.

## 📁 Storage Bucket

The app uses a bucket called `files` with the following structure:
```
files/
├── {user_id}/
│   ├── images/
│   │   ├── {timestamp}_{filename}
│   └── documents/
│       ├── {timestamp}_{filename}
```

## 🔐 Required Storage Policies

Run the following SQL in your Supabase SQL Editor to set up the necessary Row Level Security policies:

```sql
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

-- Make the bucket public for reading (optional - for public file access)
UPDATE storage.buckets SET public = true WHERE id = 'files';
```

## 🔧 Manual Bucket Creation (if needed)

If the automatic bucket creation fails, you can create it manually:

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Click "New bucket"
4. Name it `files`
5. Make it public (recommended for easier file access)
6. Apply the RLS policies above

## 📋 File Upload Features

### Supported File Types

**Images:**
- JPG, JPEG, PNG, GIF, WebP, BMP
- Max size: 20MB

**Documents:**
- PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- TXT, MD, CSV, JSON, XML, HTML
- ZIP, RAR, 7Z archives
- Max size: 20MB

### File Organization

- Files are organized by user ID for security
- Images go to `images/` subfolder
- Documents go to `documents/` subfolder
- Files are renamed with timestamp prefix to avoid conflicts

### Upload Process

1. **Select File**: User picks file from device
2. **Validate**: Check file size and type
3. **Upload**: File uploaded to Supabase Storage
4. **AI Analysis**: File content analyzed by AI
5. **Store Note**: Note created with file URL reference

## 🛠️ Troubleshooting

### Upload Fails

1. **Check Authentication**: User must be logged in
2. **Check Policies**: Ensure RLS policies are correctly set up
3. **Check File Size**: Must be under 20MB
4. **Check Network**: Ensure stable internet connection

### Files Not Accessible

1. **Check Bucket Permissions**: Ensure bucket is public or user has access
2. **Check File Path**: Verify the file URL is correct
3. **Check RLS Policies**: Ensure user can read their own files

### Common Errors

- `"User not authenticated"`: User needs to log in
- `"Upload failed: ..."`: Check Supabase connection and policies
- `"File size exceeds limit"`: File is too large (>20MB)
- `"File type not allowed"`: File extension not supported

## 🔍 Testing

To test file uploads:

1. Log in to the app
2. Go to Create Note screen
3. Tap upload button or camera icon
4. Select a file
5. Verify upload status shows "Uploaded"
6. Create the note
7. Check that file URL is stored in database

## 📊 Monitoring

Monitor your storage usage in the Supabase dashboard:
- Storage > Settings > Usage
- Set up alerts for storage limits
- Monitor file upload patterns

## 🔄 Cleanup

To clean up old files, you can run periodic cleanup jobs:

```sql
-- Delete files older than 1 year (example)
DELETE FROM storage.objects 
WHERE bucket_id = 'files' 
AND created_at < NOW() - INTERVAL '1 year';
```

## 🚨 Security Notes

- Files are private by default (user can only access their own files)
- File URLs are public if bucket is public
- Consider implementing file scanning for malware
- Monitor storage usage to prevent abuse
- Implement rate limiting for uploads if needed 