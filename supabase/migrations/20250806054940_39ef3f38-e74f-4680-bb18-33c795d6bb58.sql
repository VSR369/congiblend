-- Create RLS policies for post-media storage bucket to allow file uploads

-- Policy to allow authenticated users to upload files to post-media bucket
CREATE POLICY "Users can upload to post-media bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'post-media' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow public access to read files from post-media bucket (since bucket is public)
CREATE POLICY "Public access to post-media files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'post-media');

-- Policy to allow users to update their own files in post-media bucket
CREATE POLICY "Users can update their own files in post-media" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'post-media' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to delete their own files in post-media bucket
CREATE POLICY "Users can delete their own files in post-media" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'post-media' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);