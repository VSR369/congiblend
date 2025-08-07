-- Add reactions_count column to comments table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'reactions_count') THEN
        ALTER TABLE public.comments ADD COLUMN reactions_count integer DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- Create index for comment reactions if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_reactions_comment_target 
ON public.reactions (target_id, target_type) 
WHERE target_type = 'comment';

-- Create or replace function to update comment reaction counts
CREATE OR REPLACE FUNCTION public.update_comment_reactions_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.target_type = 'comment' THEN
            UPDATE public.comments 
            SET reactions_count = (
                SELECT COUNT(*) FROM public.reactions 
                WHERE target_type = 'comment' AND target_id = NEW.target_id
            )
            WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'comment' THEN
            UPDATE public.comments 
            SET reactions_count = (
                SELECT COUNT(*) FROM public.reactions 
                WHERE target_type = 'comment' AND target_id = OLD.target_id
            )
            WHERE id = OLD.target_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

-- Create trigger for comment reactions count updates
DROP TRIGGER IF EXISTS trigger_update_comment_reactions_count ON public.reactions;
CREATE TRIGGER trigger_update_comment_reactions_count
    AFTER INSERT OR UPDATE OR DELETE ON public.reactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_comment_reactions_count();