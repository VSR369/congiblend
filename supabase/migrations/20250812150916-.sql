-- Allow changing poll votes by enforcing only one CURRENT vote per user/post
-- and removing any legacy unique constraints that prevent historical votes.

-- 1) Drop existing UNIQUE constraints on votes (user_id, post_id) if any
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.votes'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.votes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 2) Create a partial unique index to enforce one current vote per user/post
CREATE UNIQUE INDEX IF NOT EXISTS votes_one_current_per_user_post
ON public.votes (user_id, post_id)
WHERE is_current = true;

-- 3) Ensure validation and aggregation triggers exist on votes
DROP TRIGGER IF EXISTS trg_validate_vote_allowed ON public.votes;
CREATE TRIGGER trg_validate_vote_allowed
  BEFORE INSERT OR UPDATE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_vote_allowed();

DROP TRIGGER IF EXISTS trg_update_poll_vote_counts ON public.votes;
CREATE TRIGGER trg_update_poll_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poll_vote_counts();

-- 4) Prevent editing poll options after votes exist (attach trigger to posts)
DROP TRIGGER IF EXISTS trg_prevent_poll_option_changes_after_votes ON public.posts;
CREATE TRIGGER trg_prevent_poll_option_changes_after_votes
  BEFORE UPDATE OF poll_data ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_poll_option_changes_after_votes();