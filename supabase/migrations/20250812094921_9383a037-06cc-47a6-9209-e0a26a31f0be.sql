
-- Enforce one current vote per user per poll (race-safe revoting)
-- Backward compatible; does not alter existing rows or behavior.
create unique index if not exists votes_unique_current_per_user
on public.votes (post_id, user_id)
where is_current = true;
