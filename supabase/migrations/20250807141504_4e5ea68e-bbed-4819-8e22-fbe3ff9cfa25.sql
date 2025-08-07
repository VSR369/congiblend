-- Add reactions_count column to comments table
ALTER TABLE public.comments 
ADD COLUMN reactions_count integer DEFAULT 0 NOT NULL;

-- Create index for better performance on comment reactions
CREATE INDEX idx_reactions_comment_target ON public.reactions(target_id) 
WHERE target_type = 'comment';

-- Create function to update comment reaction counts
CREATE OR REPLACE FUNCTION public.update_comment_reactions_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment reaction count for comments
        IF NEW.target_type = 'comment' THEN
            UPDATE public.comments 
            SET reactions_count = reactions_count + 1
            WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement reaction count for comments
        IF OLD.target_type = 'comment' THEN
            UPDATE public.comments 
            SET reactions_count = reactions_count - 1
            WHERE id = OLD.target_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle target type changes (though unlikely)
        IF OLD.target_type = 'comment' AND NEW.target_type != 'comment' THEN
            UPDATE public.comments 
            SET reactions_count = reactions_count - 1
            WHERE id = OLD.target_id;
        ELSIF OLD.target_type != 'comment' AND NEW.target_type = 'comment' THEN
            UPDATE public.comments 
            SET reactions_count = reactions_count + 1
            WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$function$;

-- Create trigger for comment reactions
CREATE TRIGGER trigger_update_comment_reactions_count
    AFTER INSERT OR UPDATE OR DELETE ON public.reactions
    FOR EACH ROW EXECUTE FUNCTION public.update_comment_reactions_count();

-- Initialize existing comment reaction counts
UPDATE public.comments 
SET reactions_count = (
    SELECT COUNT(*) 
    FROM public.reactions 
    WHERE target_type = 'comment' AND target_id = comments.id
);