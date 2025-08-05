-- Create posts table with proper foreign keys
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('text', 'image', 'video', 'article', 'poll', 'event', 'job', 'document', 'link', 'carousel')) DEFAULT 'text' NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  hashtags TEXT[] DEFAULT '{}',
  mentions UUID[] DEFAULT '{}',
  visibility TEXT CHECK (visibility IN ('public', 'connections', 'private')) DEFAULT 'public' NOT NULL,
  reactions_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Update comments table to add proper foreign keys
ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_post_id_fkey;

ALTER TABLE public.comments 
ADD CONSTRAINT comments_post_id_fkey 
FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE public.comments 
DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

ALTER TABLE public.comments 
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update reactions table foreign keys
ALTER TABLE public.reactions 
DROP CONSTRAINT IF EXISTS reactions_user_id_fkey;

ALTER TABLE public.reactions 
ADD CONSTRAINT reactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update shares table foreign keys
ALTER TABLE public.shares 
DROP CONSTRAINT IF EXISTS shares_user_id_fkey;

ALTER TABLE public.shares 
ADD CONSTRAINT shares_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Enable RLS on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
CREATE POLICY "Posts are viewable based on visibility" ON public.posts
FOR SELECT USING (
  visibility = 'public' OR 
  (visibility = 'connections' AND (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.connections 
      WHERE ((user1_id = auth.uid() AND user2_id = posts.user_id) OR 
             (user2_id = auth.uid() AND user1_id = posts.user_id)) 
      AND status = 'accepted'
    )
  )) OR
  (visibility = 'private' AND user_id = auth.uid())
);

CREATE POLICY "Users can create their own posts" ON public.posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON public.posts(visibility);

-- Add updated_at trigger for posts
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shares;