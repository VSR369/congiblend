-- Add columns to posts table for shared post tracking
ALTER TABLE public.posts ADD COLUMN shared_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN quote_content TEXT;