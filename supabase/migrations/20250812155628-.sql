-- Remove Polls: archive and drop votes/functions
BEGIN;

-- Archive poll data into metadata and convert poll posts to text
UPDATE public.posts
SET 
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('archived_poll', poll_data),
  poll_data = NULL,
  post_type = CASE WHEN post_type = 'poll' THEN 'text' ELSE post_type END
WHERE post_type = 'poll';

-- Drop poll-related triggers on votes table
DROP TRIGGER IF EXISTS trg_votes_validate_allowed_ins ON public.votes;
DROP TRIGGER IF EXISTS trg_votes_validate_allowed_upd ON public.votes;
DROP TRIGGER IF EXISTS trg_validate_vote_allowed ON public.votes;
DROP TRIGGER IF EXISTS trg_votes_update_counts ON public.votes;
DROP TRIGGER IF EXISTS trg_update_poll_vote_counts ON public.votes;
DROP TRIGGER IF EXISTS trigger_update_poll_votes_insert ON public.votes;
DROP TRIGGER IF EXISTS trigger_update_poll_votes_update ON public.votes;
DROP TRIGGER IF EXISTS trigger_update_poll_votes_delete ON public.votes;

-- Drop poll-related triggers on posts table
DROP TRIGGER IF EXISTS trg_posts_lock_poll_options ON public.posts;
DROP TRIGGER IF EXISTS trg_prevent_poll_option_changes_after_votes ON public.posts;

-- Drop poll-related functions
DROP FUNCTION IF EXISTS public.validate_vote_allowed();
DROP FUNCTION IF EXISTS public.update_poll_vote_counts();
DROP FUNCTION IF EXISTS public.prevent_poll_option_changes_after_votes();
DROP FUNCTION IF EXISTS public.cast_poll_vote(uuid, integer);
DROP FUNCTION IF EXISTS public.get_poll_results(uuid);

-- Drop votes table
DROP TABLE IF EXISTS public.votes;

COMMIT;