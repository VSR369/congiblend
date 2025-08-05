-- Update storage bucket to allow video files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/mov', 'video/avi'
],
file_size_limit = 104857600 -- 100MB for videos
WHERE id = 'post-media';

-- Add video processing tracking table
CREATE TABLE IF NOT EXISTS public.media_processing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  original_filename text NOT NULL,
  media_type text NOT NULL, -- 'image' or 'video'
  storage_path text NOT NULL,
  video_url text,
  thumbnail_url text,
  processing_status text DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processing_progress integer DEFAULT 0,
  processing_error text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add thumbnail_url column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Enable RLS on media_processing table
ALTER TABLE public.media_processing ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for media_processing
CREATE POLICY "Users can view their own media processing records" 
ON public.media_processing FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own media processing records" 
ON public.media_processing FOR ALL 
USING (auth.uid() = user_id);

-- Create function to update processing timestamps
CREATE OR REPLACE FUNCTION public.update_media_processing_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_media_processing_updated_at
  BEFORE UPDATE ON public.media_processing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_media_processing_updated_at();