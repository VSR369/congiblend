-- Fix the trigger to properly handle comment reactions
-- Add reactions_count column to comments table if it doesn't exist
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS reactions_count INTEGER DEFAULT 0;

-- Create proper trigger for comment reaction counts
CREATE OR REPLACE FUNCTION update_comment_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment reaction count for comment
    IF NEW.target_type = 'comment' THEN
      UPDATE comments 
      SET reactions_count = COALESCE(reactions_count, 0) + 1
      WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement reaction count for comment
    IF OLD.target_type = 'comment' THEN
      UPDATE comments 
      SET reactions_count = GREATEST(COALESCE(reactions_count, 1) - 1, 0)
      WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment reaction counts
DROP TRIGGER IF EXISTS trigger_update_comment_reactions_count ON reactions;
CREATE TRIGGER trigger_update_comment_reactions_count
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reactions_count();

-- Add index for better performance on comment reactions
CREATE INDEX IF NOT EXISTS idx_reactions_comment_target 
ON reactions (target_type, target_id) 
WHERE target_type = 'comment';