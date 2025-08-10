
-- 1) Posts ordering hot path
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc
  ON public.posts (created_at DESC);

-- 2) Reactions: fast lookups and enforce one reaction per user/target
CREATE INDEX IF NOT EXISTS idx_reactions_target
  ON public.reactions (target_type, target_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_reactions_user_target
  ON public.reactions (user_id, target_type, target_id);

-- 3) Votes: fast lookups and enforce one vote per user/post
CREATE INDEX IF NOT EXISTS idx_votes_post
  ON public.votes (post_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_votes_user_post
  ON public.votes (user_id, post_id);

-- 4) Event RSVPs: fast lookups and enforce one RSVP per user/post
CREATE INDEX IF NOT EXISTS idx_event_rsvps_post
  ON public.event_rsvps (post_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_event_rsvps_user_post
  ON public.event_rsvps (user_id, post_id);

-- 5) Comments: fast newest-first retrieval per post
CREATE INDEX IF NOT EXISTS idx_comments_post_created_desc
  ON public.comments (post_id, created_at DESC);
