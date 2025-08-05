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

// Helper function to determine media type
const getMediaType = (mimeType: string): 'image' | 'video' | 'invalid' => {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
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
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    const action = pathParts[pathParts.length - 1];

    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token and get user
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser(token);
    
    if (sessionError || !sessionData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = sessionData.user.id;

    // UPLOAD ENDPOINT
    if (req.method === 'POST' && (action === 'upload' || pathParts.includes('upload'))) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const mediaTypeOverride = formData.get('type') as string;

      if (!file) {
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const mediaType = getMediaType(file.type);
      
      if (mediaType === 'invalid') {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid file type. Only images and videos are allowed.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate file size based on type
      const maxSize = mediaType === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        return new Response(
          JSON.stringify({ error: `File too large. Maximum size is ${maxSizeMB}MB.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || (mediaType === 'video' ? 'mp4' : 'jpg');
      const fileName = `${userId}/${timestamp}-${randomString}.${fileExtension}`;

      try {
        // Convert File to ArrayBuffer for upload
        const fileBuffer = await file.arrayBuffer();
        
        // Upload main file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(fileName, fileBuffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          return new Response(
            JSON.stringify({ error: 'Failed to upload file' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get public URL for main file
        const { data: publicUrlData } = supabase.storage
          .from('post-media')
          .getPublicUrl(fileName);

        let thumbnailUrl = null;
        
        // For videos, generate thumbnail and create processing record
        if (mediaType === 'video') {
          try {
            thumbnailUrl = await generateVideoThumbnail(userId, fileName);
          } catch (error) {
            console.error('Thumbnail generation failed:', error);
            // Continue without thumbnail
          }

          // Create processing record
          await supabase.from('media_processing').insert({
            user_id: userId,
            original_filename: file.name,
            media_type: mediaType,
            storage_path: fileName,
            video_url: publicUrlData.publicUrl,
            thumbnail_url: thumbnailUrl,
            processing_status: 'completed', // For demo, mark as completed
            processing_progress: 100,
            metadata: {
              size: file.size,
              duration: null, // Would be extracted from video in production
              resolution: null
            }
          });
        }

        // Build response based on media type
        const response = {
          success: true,
          url: publicUrlData.publicUrl,
          filename: fileName,
          size: file.size,
          type: file.type,
          media_type: mediaType
        };

        if (mediaType === 'video') {
          response.video_url = publicUrlData.publicUrl;
          response.thumbnail_url = thumbnailUrl;
        }

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
          JSON.stringify({ error: 'Failed to process file' }),
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