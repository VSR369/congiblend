-- Create function to update comment reaction counts (if not exists)
CREATE OR REPLACE FUNCTION update_comment_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.target_type = 'comment' THEN
      UPDATE comments 
      SET reactions_count = (
        SELECT COUNT(*) FROM reactions 
        WHERE target_type = 'comment' AND target_id = NEW.target_id
      )
      WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'comment' THEN
      UPDATE comments 
      SET reactions_count = (
        SELECT COUNT(*) FROM reactions 
        WHERE target_type = 'comment' AND target_id = OLD.target_id
      )
      WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_update_comment_reactions_count ON reactions;

CREATE TRIGGER trigger_update_comment_reactions_count
  AFTER INSERT OR UPDATE OR DELETE ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reactions_count();