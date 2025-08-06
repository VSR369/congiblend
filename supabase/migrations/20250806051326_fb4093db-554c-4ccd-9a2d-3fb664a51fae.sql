-- Phase 1: Database optimization - Add proper indexes and triggers for poll synchronization

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_user_visibility ON posts(user_id, visibility);
CREATE INDEX IF NOT EXISTS idx_posts_type_visibility ON posts(post_type, visibility);
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_post_user ON votes(post_id, user_id);

-- Create function to update poll vote counts automatically
CREATE OR REPLACE FUNCTION update_poll_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    poll_options JSONB;
    updated_options JSONB;
    option_votes INTEGER;
BEGIN
    -- Get current poll data
    SELECT poll_data INTO poll_options 
    FROM posts 
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
    
    IF poll_options IS NULL OR poll_options->'options' IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Initialize updated options array
    updated_options := '[]'::jsonb;
    
    -- Update vote counts for each option
    FOR i IN 0..(jsonb_array_length(poll_options->'options') - 1) LOOP
        -- Count votes for this option
        SELECT COUNT(*)::INTEGER INTO option_votes
        FROM votes 
        WHERE post_id = COALESCE(NEW.post_id, OLD.post_id) 
        AND option_index = i;
        
        -- Add updated option to array
        updated_options := updated_options || jsonb_build_object(
            'text', poll_options->'options'->i->>'text',
            'votes', option_votes
        );
    END LOOP;
    
    -- Update the post with new vote counts
    UPDATE posts 
    SET poll_data = jsonb_build_object(
        'options', updated_options,
        'multiple_choice', poll_options->'multiple_choice',
        'expires_at', poll_options->'expires_at'
    )
    WHERE id = COALESCE(NEW.post_id, OLD.post_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic poll vote count updates
DROP TRIGGER IF EXISTS trigger_update_poll_votes_insert ON votes;
CREATE TRIGGER trigger_update_poll_votes_insert
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_poll_vote_counts();

DROP TRIGGER IF EXISTS trigger_update_poll_votes_update ON votes;
CREATE TRIGGER trigger_update_poll_votes_update
    AFTER UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_poll_vote_counts();

DROP TRIGGER IF EXISTS trigger_update_poll_votes_delete ON votes;
CREATE TRIGGER trigger_update_poll_votes_delete
    AFTER DELETE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_poll_vote_counts();

-- Create function to update reaction counts
CREATE OR REPLACE FUNCTION update_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update reactions_count on posts
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.target_type = 'post' THEN
            UPDATE posts 
            SET reactions_count = (
                SELECT COUNT(*) FROM reactions 
                WHERE target_type = 'post' AND target_id = NEW.target_id
            )
            WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'comment' THEN
            UPDATE comments 
            SET reactions_count = (
                SELECT COUNT(*) FROM reactions 
                WHERE target_type = 'comment' AND target_id = NEW.target_id
            )
            WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'post' THEN
            UPDATE posts 
            SET reactions_count = (
                SELECT COUNT(*) FROM reactions 
                WHERE target_type = 'post' AND target_id = OLD.target_id
            )
            WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'comment' THEN
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

-- Create triggers for automatic reaction count updates
DROP TRIGGER IF EXISTS trigger_update_reaction_counts ON reactions;
CREATE TRIGGER trigger_update_reaction_counts
    AFTER INSERT OR UPDATE OR DELETE ON reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_reaction_counts();

-- Create function to update comment counts
CREATE OR REPLACE FUNCTION update_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update comments_count on posts
        UPDATE posts 
        SET comments_count = (
            SELECT COUNT(*) FROM comments 
            WHERE post_id = NEW.post_id
        )
        WHERE id = NEW.post_id;
        
        -- Update replies_count on parent comments
        IF NEW.parent_id IS NOT NULL THEN
            UPDATE comments 
            SET replies_count = (
                SELECT COUNT(*) FROM comments 
                WHERE parent_id = NEW.parent_id
            )
            WHERE id = NEW.parent_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update comments_count on posts
        UPDATE posts 
        SET comments_count = (
            SELECT COUNT(*) FROM comments 
            WHERE post_id = OLD.post_id
        )
        WHERE id = OLD.post_id;
        
        -- Update replies_count on parent comments
        IF OLD.parent_id IS NOT NULL THEN
            UPDATE comments 
            SET replies_count = (
                SELECT COUNT(*) FROM comments 
                WHERE parent_id = OLD.parent_id
            )
            WHERE id = OLD.parent_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic comment count updates
DROP TRIGGER IF EXISTS trigger_update_comment_counts ON comments;
CREATE TRIGGER trigger_update_comment_counts
    AFTER INSERT OR UPDATE OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_counts();