-- Create table for post bookmarks
CREATE TABLE IF NOT EXISTS public.post_bookmarks (
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_bookmarks_pkey PRIMARY KEY (user_id, post_id)
);

-- Useful index for queries by post_id
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_post_id ON public.post_bookmarks (post_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_user_id ON public.post_bookmarks (user_id);

-- Enable RLS
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies: only the owner can read/insert/delete their bookmarks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'post_bookmarks' AND policyname = 'Users can view their own bookmarks'
  ) THEN
    CREATE POLICY "Users can view their own bookmarks"
    ON public.post_bookmarks
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'post_bookmarks' AND policyname = 'Users can create their own bookmarks'
  ) THEN
    CREATE POLICY "Users can create their own bookmarks"
    ON public.post_bookmarks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'post_bookmarks' AND policyname = 'Users can delete their own bookmarks'
  ) THEN
    CREATE POLICY "Users can delete their own bookmarks"
    ON public.post_bookmarks
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;