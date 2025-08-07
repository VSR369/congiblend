-- Remove 'job' from the post_type check constraint
-- First drop the existing constraint
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_post_type_check;

-- Add new constraint without 'job' post type
ALTER TABLE public.posts 
ADD CONSTRAINT posts_post_type_check 
CHECK (post_type IN ('text', 'image', 'video', 'audio', 'poll', 'event'));