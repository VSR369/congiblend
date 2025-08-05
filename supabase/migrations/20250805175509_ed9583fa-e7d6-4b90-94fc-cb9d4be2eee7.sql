-- Create posts table for the social media feed
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  visibility TEXT NOT NULL DEFAULT 'public',
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  reactions_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policies for posts
CREATE POLICY "Users can view public posts" 
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
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_visibility_created ON posts(visibility, created_at DESC);
CREATE INDEX idx_posts_hashtags ON posts USING GIN(hashtags);

-- Create trigger to update updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update comments table to reference posts
ALTER TABLE public.comments 
ADD CONSTRAINT fk_comments_post_id 
FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;