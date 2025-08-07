-- Create function to update comment reaction counts (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.update_comment_reactions_count()
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

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS trigger_update_comment_reactions_count ON reactions;

-- Create trigger for comment reactions
CREATE TRIGGER trigger_update_comment_reactions_count
    AFTER INSERT OR UPDATE OR DELETE ON reactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_comment_reactions_count();