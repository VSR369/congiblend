
-- 1) Deduplicate event_rsvps so we can enforce a unique key
WITH ranked AS (
  SELECT
    ctid,
    post_id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY post_id, user_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn
  FROM public.event_rsvps
)
DELETE FROM public.event_rsvps e
USING ranked r
WHERE e.ctid = r.ctid
  AND r.rn > 1;

-- 2) Add composite primary key for upsert to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_rsvps_pkey'
  ) THEN
    ALTER TABLE public.event_rsvps
      ADD CONSTRAINT event_rsvps_pkey PRIMARY KEY (post_id, user_id);
  END IF;
END $$;

-- 3) Add FK on event_rsvps.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_rsvps_user_id_fkey'
  ) THEN
    ALTER TABLE public.event_rsvps
      ADD CONSTRAINT event_rsvps_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4) Ensure updated_at on event_rsvps is maintained
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'event_rsvps_set_updated_at'
  ) THEN
    CREATE TRIGGER event_rsvps_set_updated_at
      BEFORE UPDATE ON public.event_rsvps
      FOR EACH ROW
      EXECUTE FUNCTION public.update_event_rsvps_updated_at();
  END IF;
END $$;

-- 5) Deduplicate votes so we can enforce single vote per user/post
WITH ranked AS (
  SELECT
    ctid,
    post_id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY post_id, user_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn
  FROM public.votes
)
DELETE FROM public.votes v
USING ranked r
WHERE v.ctid = r.ctid
  AND r.rn > 1;

-- 6) Add unique (post_id, user_id) to enforce single vote per poll per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'votes_post_user_unique'
  ) THEN
    ALTER TABLE public.votes
      ADD CONSTRAINT votes_post_user_unique UNIQUE (post_id, user_id);
  END IF;
END $$;

-- 7) Add FK on votes.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'votes_user_id_fkey'
  ) THEN
    ALTER TABLE public.votes
      ADD CONSTRAINT votes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 8) Maintain updated_at on votes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'votes_set_updated_at'
  ) THEN
    CREATE TRIGGER votes_set_updated_at
      BEFORE UPDATE ON public.votes
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 9) Deduplicate reactions so we can enforce one reaction per target per user
WITH ranked AS (
  SELECT
    ctid,
    user_id,
    target_type,
    target_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, target_type, target_id
      ORDER BY created_at DESC NULLS LAST
    ) AS rn
  FROM public.reactions
)
DELETE FROM public.reactions r
USING ranked x
WHERE r.ctid = x.ctid
  AND x.rn > 1;

-- 10) Enforce one reaction per target per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reactions_user_target_unique'
  ) THEN
    ALTER TABLE public.reactions
      ADD CONSTRAINT reactions_user_target_unique UNIQUE (user_id, target_type, target_id);
  END IF;
END $$;

-- 11) Add FK on reactions.user_id -> profiles.id to enable profiles(...) embedding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reactions_user_id_fkey'
  ) THEN
    ALTER TABLE public.reactions
      ADD CONSTRAINT reactions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
