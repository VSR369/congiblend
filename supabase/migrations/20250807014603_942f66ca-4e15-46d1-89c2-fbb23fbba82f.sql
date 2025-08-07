-- Fix the missing foreign key relationship between posts and profiles tables
-- First, create the posts table with proper foreign key to profiles
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'text',
  media_urls TEXT[] DEFAULT '{}',
  media_types TEXT[] DEFAULT '{}',
  poll_options JSONB DEFAULT NULL,
  poll_votes JSONB DEFAULT '{}',
  event_details JSONB DEFAULT NULL,
  article_url TEXT,
  article_title TEXT,
  article_description TEXT,
  article_image TEXT,
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  location TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  is_active BOOLEAN NOT NULL DEFAULT true,
  engagement_stats JSONB DEFAULT '{"likes": 0, "comments": 0, "shares": 0, "views": 0}',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policies for posts table
CREATE POLICY "Users can view public posts and posts from connections" 
ON public.posts 
FOR SELECT 
USING (
  visibility = 'public' OR
  (visibility = 'connections' AND (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM connections c 
      WHERE ((c.user1_id = auth.uid() AND c.user2_id = posts.user_id) OR 
             (c.user2_id = auth.uid() AND c.user1_id = posts.user_id)) 
      AND c.status = 'accepted'
    )
  )) OR
  (visibility = 'private' AND user_id = auth.uid())
);

CREATE POLICY "Users can create their own posts" 
ON public.posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON public.posts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON public.posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON public.posts USING GIN(hashtags);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_posts_updated_at();