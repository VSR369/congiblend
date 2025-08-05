-- Create storage bucket for post media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media', 
  'post-media', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for post media
INSERT INTO storage.policies (id, bucket_id, operation, target, policy_definition)
VALUES 
  (
    'post-media-select',
    'post-media',
    'SELECT',
    'authenticated',
    'true'
  ),
  (
    'post-media-insert', 
    'post-media',
    'INSERT',
    'authenticated',
    'auth.uid()::text = (storage.foldername(name))[1]'
  ),
  (
    'post-media-update',
    'post-media', 
    'UPDATE',
    'authenticated',
    'auth.uid()::text = (storage.foldername(name))[1]'
  ),
  (
    'post-media-delete',
    'post-media',
    'DELETE', 
    'authenticated',
    'auth.uid()::text = (storage.foldername(name))[1]'
  )
ON CONFLICT (id) DO NOTHING;

-- Update posts table to handle media URLs
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_urls text[];