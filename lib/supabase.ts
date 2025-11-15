import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Get public URL for a file in Supabase Storage
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload file to Supabase Storage
 * Auto-creates bucket if it doesn't exist
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | File,
  contentType?: string
): Promise<string> {
  try {
    // First, try to upload
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`❌ Upload error for ${bucket}/${path}:`, error);
      
      // If bucket doesn't exist, try to create it
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log(`📦 Bucket '${bucket}' not found, creating...`);
        
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
        
        if (createError) {
          console.error(`❌ Failed to create bucket:`, createError);
        } else {
          console.log(`✅ Bucket '${bucket}' created, retrying upload...`);
          
          // Retry upload
          const { data: retryData, error: retryError } = await supabaseAdmin.storage
            .from(bucket)
            .upload(path, file, {
              contentType,
              upsert: true,
            });
          
          if (retryError) {
            throw new Error(`Failed to upload file after bucket creation: ${retryError.message}`);
          }
          
          return retryData!.path;
        }
      }
      
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    console.log(`✅ Uploaded to ${bucket}/${data.path}`);
    return data.path;
  } catch (err) {
    console.error(`❌ Upload exception:`, err);
    throw err;
  }
}

/**
 * Download file from Supabase Storage
 */
export async function downloadFile(bucket: string, path: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

