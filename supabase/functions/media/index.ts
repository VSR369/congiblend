import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Client for authentication
const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Service client for storage operations (bypasses RLS)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

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

serve(async (req) => {
  try {
    console.log(`${req.method} request to ${req.url}`);
    
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        headers: corsHeaders,
        status: 200 
      });
    }

    // Authenticate user using Bearer token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Authenticated user:', user.id);

    // UPLOAD ENDPOINT - Handle all POST requests as uploads
    if (req.method === 'POST') {
      console.log('Processing file upload');
      
      try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
          console.log('No file in form data');
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
          console.log('Invalid file type:', file.type);
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
          console.log('File too large:', file.size, 'max:', maxSize);
          return new Response(
            JSON.stringify({ error: `File too large. Maximum size is ${maxSizeMB}MB.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate unique filename with user folder structure
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `${user.id}/${timestamp}-${randomString}.${fileExtension}`;

        console.log('Generated filename:', filename);

        // Convert File to ArrayBuffer for upload
        const fileBuffer = await file.arrayBuffer();
        console.log('File buffer size:', fileBuffer.byteLength);

        // Upload to Supabase Storage using service client (bypasses RLS)
        const { data: uploadData, error: uploadError } = await supabaseService.storage
          .from('post-media')
          .upload(filename, fileBuffer, {
            contentType: file.type,
            upsert: true
          });

        if (uploadError) {
          console.log('Storage upload error:', uploadError);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to upload file', 
              details: uploadError.message,
              code: uploadError.statusCode || 'UPLOAD_ERROR'
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Generate public URL for the uploaded file
        const { data: urlData } = supabaseService.storage
          .from('post-media')
          .getPublicUrl(filename);

        if (!urlData?.publicUrl) {
          console.log('Failed to generate public URL');
          return new Response(
            JSON.stringify({ error: 'Failed to generate file URL' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        if (mediaType === 'video') {
          // For videos, insert into media_processing table for thumbnail generation using service client
          const { error: dbError } = await supabaseService
            .from('media_processing')
            .insert({
              user_id: user.id,
              original_filename: file.name,
              media_type: mediaType,
              storage_path: filename,
              video_url: urlData.publicUrl,
              processing_status: 'pending'
            });

          if (dbError) {
            console.log('Database insert error:', dbError);
            // Don't fail the upload, just log the error
          }
        }

        console.log('Upload successful, returning response');
        return new Response(
          JSON.stringify({
            success: true,
            url: urlData.publicUrl,
            filename: filename,
            size: file.size,
            type: file.type,
            media_type: mediaType
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.log('File processing error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to process file',
            details: error.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'GET') {
      // Handle status check requests
      const url = new URL(req.url);
      const mediaId = url.searchParams.get('id');
      
      if (!mediaId) {
        return new Response(
          JSON.stringify({ error: 'Media ID required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { data, error } = await supabaseService
        .from('media_processing')
        .select('*')
        .eq('id', mediaId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('Database query error:', error);
        return new Response(
          JSON.stringify({ error: 'Media not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method === 'DELETE') {
      // Handle file deletion requests
      const url = new URL(req.url);
      const filePath = url.searchParams.get('path');
      
      if (!filePath) {
        return new Response(
          JSON.stringify({ error: 'File path required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check if the file belongs to the authenticated user
      if (!filePath.startsWith(`${user.id}/`)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized file access' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { error: deleteError } = await supabaseService.storage
        .from('post-media')
        .remove([filePath]);

      if (deleteError) {
        console.log('Storage delete error:', deleteError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to delete file', 
            details: deleteError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ message: 'File deleted successfully' }),
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
    console.log('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});