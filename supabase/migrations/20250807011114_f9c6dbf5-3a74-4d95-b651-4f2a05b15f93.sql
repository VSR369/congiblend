-- Create posts table with proper foreign key relationship to profiles
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'text',
    visibility TEXT NOT NULL DEFAULT 'public',
    media_urls TEXT[],
    thumbnail_url TEXT,
    poll_data JSONB,
    event_data JSONB,
    metadata JSONB DEFAULT '{}',
    reactions_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for posts
CREATE POLICY "Public posts are viewable by everyone" 
ON public.posts FOR SELECT 
USING (visibility = 'public');

CREATE POLICY "Users can view their own posts" 
ON public.posts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create posts" 
ON public.posts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON public.posts FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.posts FOR DELETE 
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_posts_updated_at();

-- Create users table if it doesn't exist (for backward compatibility)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    title TEXT,
    company TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS policies for users (read-only for everyone, users can update their own)
CREATE POLICY "Users are viewable by everyone" 
ON public.users FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own record" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own record" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);