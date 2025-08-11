-- Create likes table and add likes_count to posts, with RLS and triggers

-- 1) Add likes_count to posts if not exists
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- 2) Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 3) Enable RLS
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policies
-- Allow anyone to read likes (to display counts/avatars if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_likes' AND policyname = 'Anyone can read post likes'
  ) THEN
    CREATE POLICY "Anyone can read post likes"
    ON public.post_likes
    FOR SELECT
    USING (true);
  END IF;
END$$;

-- Allow authenticated users to like (insert their own row)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_likes' AND policyname = 'Users can like posts'
  ) THEN
    CREATE POLICY "Users can like posts"
    ON public.post_likes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Allow users to unlike (delete their own like)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_likes' AND policyname = 'Users can unlike their own likes'
  ) THEN
    CREATE POLICY "Users can unlike their own likes"
    ON public.post_likes
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- 5) Triggers to keep posts.likes_count in sync
CREATE OR REPLACE FUNCTION public.update_posts_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
      SET likes_count = COALESCE(likes_count, 0) + 1
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
      SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_likes_count_ins ON public.post_likes;
CREATE TRIGGER trg_post_likes_count_ins
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_posts_likes_count();

DROP TRIGGER IF EXISTS trg_post_likes_count_del ON public.post_likes;
CREATE TRIGGER trg_post_likes_count_del
AFTER DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_posts_likes_count();