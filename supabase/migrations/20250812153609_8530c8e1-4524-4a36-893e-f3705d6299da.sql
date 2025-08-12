
BEGIN;

-- 1) Convert existing poll posts to plain text while preserving poll payload
UPDATE public.posts
SET
  metadata = COALESCE(metadata, '{}'::jsonb)
             || jsonb_build_object(
                  'archived_poll', poll_data,
                  'poll_migrated_at', now()
                ),
  content   = COALESCE(NULLIF(content, ''), '[Poll removed]'),
  post_type = 'text',
  poll_data = NULL
WHERE post_type = 'poll';

-- 2) Drop triggers related to voting and poll option edits
DROP TRIGGER IF EXISTS trg_validate_vote_allowed ON public.votes;
DROP TRIGGER IF EXISTS trg_update_poll_vote_counts ON public.votes;
DROP TRIGGER IF EXISTS trg_prevent_poll_option_changes_after_votes ON public.posts;

-- 3) Drop poll-related functions (order chosen to avoid dependency issues)
DROP FUNCTION IF EXISTS public.cast_poll_vote(uuid, integer);
DROP FUNCTION IF EXISTS public.get_poll_results(uuid);
DROP FUNCTION IF EXISTS public.validate_vote_allowed();
DROP FUNCTION IF EXISTS public.update_poll_vote_counts();
DROP FUNCTION IF EXISTS public.prevent_poll_option_changes_after_votes();

-- 4) Drop unique/partial index on votes if present
DROP INDEX IF EXISTS public.votes_one_current_per_user_post;

-- 5) Drop votes table
DROP TABLE IF EXISTS public.votes;

COMMIT;
