import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

/**
 * Upload a file to Supabase Storage
 * @param fileUri - Local file URI from device
 * @param fileName - Name for the file in storage
 * @param bucket - Storage bucket name (default: 'files')
 * @param folder - Optional folder path within bucket
 * @returns Promise with upload result containing public URL
 */
export async function uploadFile(
  fileUri: string,
  fileName: string,
  bucket: string = 'files',
  folder?: string
): Promise<UploadResult> {
  try {
    console.log('📁 Starting file upload:', { fileUri, fileName, bucket, folder });

    // Validate inputs
    if (!fileUri || !fileName) {
      throw new Error('File URI and name are required');
    }

    // Check if file exists locally
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist at the specified URI');
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Create unique file path
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileExtension = sanitizedFileName.split('.').pop() || '';
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
    
    // Construct full path
    const folderPath = folder ? `${folder}/` : '';
    const userPath = `${user.id}/`;
    const fullPath = `${userPath}${folderPath}${uniqueFileName}`;

    console.log('📁 Upload path:', fullPath);

    // Read file as base64
    const base64Data = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64Data);

    // Determine content type
    const contentType = getContentType(fileExtension);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, arrayBuffer, {
        contentType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log('✅ Upload successful:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fullPath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log('🔗 Public URL:', urlData.publicUrl);

    return {
      success: true,
      url: urlData.publicUrl,
      path: fullPath,
    };

  } catch (error) {
    console.error('❌ File upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload an image file to Supabase Storage
 * @param imageUri - Local image URI
 * @param imageName - Name for the image
 * @returns Promise with upload result
 */
export async function uploadImage(
  imageUri: string,
  imageName: string
): Promise<UploadResult> {
  return uploadFile(imageUri, imageName, 'files', 'images');
}

/**
 * Upload a document file to Supabase Storage
 * @param documentUri - Local document URI
 * @param documentName - Name for the document
 * @returns Promise with upload result
 */
export async function uploadDocument(
  documentUri: string,
  documentName: string
): Promise<UploadResult> {
  return uploadFile(documentUri, documentName, 'files', 'documents');
}

/**
 * Delete a file from Supabase Storage
 * @param filePath - Path to the file in storage
 * @param bucket - Storage bucket name
 * @returns Promise with deletion result
 */
export async function deleteFile(
  filePath: string,
  bucket: string = 'files'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ File deletion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    };
  }
}

/**
 * Get the appropriate content type for a file extension
 * @param extension - File extension
 * @returns MIME type string
 */
function getContentType(extension: string): string {
  const ext = extension.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Text files
    'txt': 'text/plain',
    'md': 'text/markdown',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'ts': 'application/typescript',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    
    // Video
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Get file size in human readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file size and type
 * @param fileInfo - File information
 * @param maxSizeBytes - Maximum allowed size in bytes (default: 10MB)
 * @param allowedTypes - Array of allowed file extensions
 * @returns Validation result
 */
export function validateFile(
  fileInfo: { name: string; size?: number },
  maxSizeBytes: number = 10 * 1024 * 1024, // 10MB default
  allowedTypes?: string[]
): { valid: boolean; error?: string } {
  
  // Check file size
  if (fileInfo.size && fileInfo.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxSizeBytes)} limit`,
    };
  }

  // Check file type if specified
  if (allowedTypes && allowedTypes.length > 0) {
    const extension = fileInfo.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedTypes.includes(extension)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Create a Supabase storage bucket if it doesn't exist
 * @param bucketName - Name of the bucket to create
 * @param isPublic - Whether the bucket should be public (default: true)
 * @returns Promise with creation result
 */
export async function createBucketIfNotExists(
  bucketName: string,
  isPublic: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${bucketName}' already exists`);
      return { success: true };
    }

    // Create bucket
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: isPublic,
    });

    if (createError) {
      throw new Error(`Failed to create bucket: ${createError.message}`);
    }

    console.log(`✅ Created bucket '${bucketName}'`);
    return { success: true };

  } catch (error) {
    console.error(`❌ Bucket creation failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bucket creation failed',
    };
  }
} 