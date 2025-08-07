-- Create trigger for comment reactions (the function already exists as update_reaction_counts)
CREATE TRIGGER trigger_update_comment_reactions_count
    AFTER INSERT OR UPDATE OR DELETE ON reactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_reaction_counts();