-- 1) Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  metadata JSONB NOT NULL DEFAULT '{}',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  reactions_count INTEGER NOT NULL DEFAULT 0,
  replies_count INTEGER NOT NULL DEFAULT 0,
  edit_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policies
-- Public can read non-deleted comments
CREATE POLICY IF NOT EXISTS "Public can read non-deleted comments"
ON public.comments FOR SELECT
USING (is_deleted = false);

-- Authors can insert their own comments
CREATE POLICY IF NOT EXISTS "Users can insert their own comments"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Authors can update their own comments
CREATE POLICY IF NOT EXISTS "Users can update their own comments"
ON public.comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Disallow DELETE via RLS by not creating a DELETE policy

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_created_at ON public.comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_created_at ON public.comments(parent_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_user_created_at ON public.comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_not_deleted ON public.comments(post_id) WHERE is_deleted = false;

-- Triggers for timestamps
CREATE OR REPLACE FUNCTION public.update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comments_set_updated_at ON public.comments;
CREATE TRIGGER trg_comments_set_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_comments_updated_at();

-- Edit history trigger (append entry when content changes)
CREATE OR REPLACE FUNCTION public.append_comment_edit_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edit_history = COALESCE(OLD.edit_history, '[]'::jsonb) || jsonb_build_object(
      'edited_at', now(),
      'editor_id', auth.uid(),
      'prev_length', COALESCE(length(OLD.content), 0),
      'new_length', COALESCE(length(NEW.content), 0)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comments_edit_history ON public.comments;
CREATE TRIGGER trg_comments_edit_history
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.append_comment_edit_history();

-- Restrict non-authors to only toggle is_deleted (post owners may moderate)
CREATE OR REPLACE FUNCTION public.restrict_comment_updates()
RETURNS TRIGGER AS $$
DECLARE
  is_post_owner BOOLEAN;
BEGIN
  IF auth.uid() = NEW.user_id THEN
    RETURN NEW; -- authors can update freely (already limited by RLS)
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = NEW.post_id AND p.user_id = auth.uid()
  ) INTO is_post_owner;

  IF is_post_owner THEN
    -- Allow only changing is_deleted; lock other fields
    IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
       AND NEW.content = OLD.content
       AND NEW.content_type = OLD.content_type
       AND NEW.metadata = OLD.metadata
       AND NEW.parent_id IS NOT DISTINCT FROM OLD.parent_id
       AND NEW.user_id = OLD.user_id
       AND NEW.post_id = OLD.post_id THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Post owners may only toggle is_deleted on comments under their posts.';
    END IF;
  END IF;

  -- Otherwise, deny
  RAISE EXCEPTION 'Not authorized to update this comment';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_comments_restrict_updates ON public.comments;
CREATE TRIGGER trg_comments_restrict_updates
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.restrict_comment_updates();

-- Hook existing counters: update_comment_counts and update_comment_reactions_count already exist
DROP TRIGGER IF EXISTS trg_comments_update_counts ON public.comments;
CREATE TRIGGER trg_comments_update_counts
AFTER INSERT OR UPDATE OR DELETE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_counts();

-- Ensure reaction triggers update comment reaction counts (function already attached to reactions table)
-- No change needed here unless missing.

-- Realtime support
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- 2) Mentions table (optional, for @mentions)
CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public can read mentions" ON public.comment_mentions FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Authors can insert mentions" ON public.comment_mentions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id AND c.user_id = auth.uid())
);
CREATE POLICY IF NOT EXISTS "Authors can delete mentions" ON public.comment_mentions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id AND c.user_id = auth.uid())
);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON public.comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON public.comment_mentions(mentioned_user_id);

-- 3) Attachments table (structure only)
CREATE TABLE IF NOT EXISTS public.comment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comment_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Public can read comment attachments" ON public.comment_attachments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Authors can manage their comment attachments" ON public.comment_attachments FOR ALL
USING (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_id AND c.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment ON public.comment_attachments(comment_id);
