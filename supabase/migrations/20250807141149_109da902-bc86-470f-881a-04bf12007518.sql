-- Enable comment reactions by updating existing reactions system to support comments
-- No table changes needed as reactions table already exists with target_type and target_id

-- Add index for better performance on comment reactions
CREATE INDEX IF NOT EXISTS idx_reactions_comment_target 
ON reactions (target_type, target_id) 
WHERE target_type = 'comment';

-- Update RLS policies to ensure comment reactions work properly
-- The existing policies should already work, but let's verify they handle comments

-- Add a function to update comment reaction counts (similar to posts)
CREATE OR REPLACE FUNCTION update_comment_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment reaction count for comment
    UPDATE comments 
    SET reactions_count = COALESCE(reactions_count, 0) + 1
    WHERE id = NEW.target_id AND NEW.target_type = 'comment';
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement reaction count for comment
    UPDATE comments 
    SET reactions_count = GREATEST(COALESCE(reactions_count, 1) - 1, 0)
    WHERE id = OLD.target_id AND OLD.target_type = 'comment';
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
  WHEN (NEW.target_type = 'comment' OR OLD.target_type = 'comment')
  EXECUTE FUNCTION update_comment_reactions_count();

-- Add reactions_count column to comments table if it doesn't exist
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS reactions_count INTEGER DEFAULT 0;