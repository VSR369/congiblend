-- Create storage bucket for post media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media', 
  'post-media', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for post media using CREATE POLICY syntax
CREATE POLICY "Public read access for post media" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'post-media');

CREATE POLICY "Users can upload their own post media" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'post-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own post media" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'post-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own post media" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'post-media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Update posts table to handle media URLs
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_urls text[];