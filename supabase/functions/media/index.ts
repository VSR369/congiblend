import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

// File size limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/mov',
  'video/avi'
];

const ALLOWED_AUDIO_TYPES = [
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/m4a'
];

// Helper function to determine media type
const getMediaType = (mimeType: string): 'image' | 'video' | 'audio' | 'invalid' => {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
  if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return 'audio';
  return 'invalid';
};

// Helper function to generate thumbnail for video (simplified)
const generateVideoThumbnail = async (userId: string, videoFileName: string): Promise<string> => {
  // For this demo, we'll create a placeholder thumbnail
  // In production, you would use FFmpeg or a video processing service
  const thumbnailFileName = videoFileName.replace(/\.[^/.]+$/, '-thumbnail.jpg');
  
  // Create a simple placeholder thumbnail (1x1 pixel image)
  const placeholderThumbnail = new Uint8Array([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x11,
    0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
    0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,
    0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F,
    0x00, 0x80, 0xFF, 0xD9
  ]);

  // Upload thumbnail
  const { data: thumbnailUpload, error: thumbnailError } = await supabase.storage
    .from('post-media')
    .upload(thumbnailFileName, placeholderThumbnail, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    });

  if (thumbnailError) {
    console.error('Thumbnail upload error:', thumbnailError);
    throw new Error('Failed to generate thumbnail');
  }

  const { data: thumbnailUrl } = supabase.storage
    .from('post-media')
    .getPublicUrl(thumbnailFileName);

  return thumbnailUrl.publicUrl;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`${req.method} request to ${req.url}`);
    
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    
    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token and get user
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser(token);
    
    if (sessionError || !sessionData.user) {
      console.error('Authentication failed:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = sessionData.user.id;
    console.log('Authenticated user:', userId);

    // UPLOAD ENDPOINT - Handle all POST requests as uploads
    if (req.method === 'POST') {
      console.log('Processing file upload');
      
      try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
          console.error('No file in form data');
          return new Response(
            JSON.stringify({ error: 'No file provided' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('File details:', {
          name: file.name,
          type: file.type,
          size: file.size
        });

        const mediaType = getMediaType(file.type);
        
        if (mediaType === 'invalid') {
          console.error('Invalid file type:', file.type);
          return new Response(
            JSON.stringify({ 
              error: `Invalid file type: ${file.type}. Only images, videos, and audio files are allowed.` 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate file size based on type
        const maxSize = mediaType === 'video' ? MAX_VIDEO_SIZE : 
                       mediaType === 'audio' ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;
        if (file.size > maxSize) {
          const maxSizeMB = maxSize / (1024 * 1024);
          console.error('File too large:', file.size, 'max:', maxSize);
          return new Response(
            JSON.stringify({ error: `File too large. Maximum size is ${maxSizeMB}MB.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${userId}/${timestamp}-${randomString}.${fileExtension}`;

        console.log('Generated filename:', fileName);

        // Convert File to ArrayBuffer for upload
        const fileBuffer = await file.arrayBuffer();
        console.log('File buffer size:', fileBuffer.byteLength);
        
        // Upload main file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(fileName, fileBuffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to upload file to storage',
              details: uploadError.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Upload successful:', uploadData);

        // Get public URL for main file
        const { data: publicUrlData } = supabase.storage
          .from('post-media')
          .getPublicUrl(fileName);

        console.log('Public URL:', publicUrlData.publicUrl);

        // Simple response for all media types
        const response = {
          success: true,
          url: publicUrlData.publicUrl,
          filename: fileName,
          size: file.size,
          type: file.type,
          media_type: mediaType
        };

        // For videos, try to create processing record (optional, don't fail if it errors)
        if (mediaType === 'video') {
          try {
            await supabase.from('media_processing').insert({
              user_id: userId,
              original_filename: file.name,
              media_type: mediaType,
              storage_path: fileName,
              video_url: publicUrlData.publicUrl,
              thumbnail_url: null,
              processing_status: 'completed',
              processing_progress: 100,
              metadata: {
                size: file.size,
                duration: null,
                resolution: null
              }
            });
            console.log('Video processing record created');
          } catch (dbError) {
            console.error('Failed to create processing record (non-critical):', dbError);
            // Don't fail the upload for this
          }
        }

        console.log('Returning success response');
        return new Response(
          JSON.stringify(response),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('File processing error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to process file',
            details: error.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // STATUS ENDPOINT
    if (req.method === 'GET' && action === 'status' && pathParts.length >= 2) {
      const mediaId = pathParts[pathParts.length - 1];
      
      // For post ID, get processing status from media_processing table
      const { data: processingData, error: processingError } = await supabase
        .from('media_processing')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (processingError || !processingData) {
        return new Response(
          JSON.stringify({ error: 'Processing record not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          processing_status: processingData.processing_status,
          processing_progress: processingData.processing_progress,
          video_url: processingData.video_url,
          thumbnail_url: processingData.thumbnail_url,
          error: processingData.processing_error
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // DELETE file
    if (req.method === 'DELETE') {
      const filename = url.searchParams.get('filename');

      if (!filename) {
        return new Response(
          JSON.stringify({ error: 'Filename required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user owns the file
      if (!filename.startsWith(`${userId}/`)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase.storage
        .from('post-media')
        .remove([filename]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete file' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'File deleted successfully' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})