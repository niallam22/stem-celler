import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for backend operations
// This bypasses RLS policies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const BUCKET_NAME = 'documents';

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType: string = 'application/pdf',
) {
  // Convert Buffer to Blob with proper content type
  const fileBody = body instanceof Buffer 
    ? new Blob([body], { type: contentType }) 
    : body instanceof Blob 
    ? body 
    : new Blob([body], { type: contentType });
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(key, fileBody, {
      contentType,
      upsert: true, // Overwrite if exists
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Return the file path, not a URL
  return key; // Just return the key/path for later retrieval
}
