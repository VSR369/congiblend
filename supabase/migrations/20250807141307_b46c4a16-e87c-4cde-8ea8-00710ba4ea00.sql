-- Add reactions_count column to comments table if it doesn't exist
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS reactions_count INTEGER DEFAULT 0;

-- Create index for comment reactions if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_reactions_comments ON public.reactions(target_id, target_type) WHERE target_type = 'comment';

-- Create or replace function to update comment reaction counts
CREATE OR REPLACE FUNCTION public.update_comment_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment reaction count
    IF NEW.target_type = 'comment' THEN
      UPDATE public.comments 
      SET reactions_count = reactions_count + 1 
      WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement reaction count
    IF OLD.target_type = 'comment' THEN
      UPDATE public.comments 
      SET reactions_count = GREATEST(reactions_count - 1, 0) 
      WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_comment_reactions_count_trigger ON public.reactions;

CREATE TRIGGER update_comment_reactions_count_trigger
  AFTER INSERT OR DELETE ON public.reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_reactions_count();