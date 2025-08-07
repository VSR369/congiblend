-- Fix storage RLS policies for post-media bucket
-- First, drop existing conflicting policies
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to post-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to post-media" ON storage.objects;

-- Create clean, simple RLS policies for post-media bucket
-- Allow public read access to all files in post-media bucket
CREATE POLICY "Public read access for post-media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'post-media');

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Authenticated upload to post-media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'post-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own files
CREATE POLICY "Users update own files in post-media" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'post-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users delete own files in post-media" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'post-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);