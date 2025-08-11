
-- 1) Add is_current flag to preserve full audit but ensure a single current vote counts
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;

-- Backfill: keep only the latest vote per (user_id, post_id) as current; others become historical
WITH ranked AS (
  SELECT
    id,
    user_id,
    post_id,
    created_at,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, post_id
      ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
    ) AS rn
  FROM public.votes
)
UPDATE public.votes v
SET is_current = (r.rn = 1)
FROM ranked r
WHERE v.id = r.id;

-- Ensure one current vote per user per poll (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS votes_unique_current_per_user_post
  ON public.votes (post_id, user_id)
  WHERE is_current;

-- Fast counting index (only current votes)
CREATE INDEX IF NOT EXISTS votes_post_option_current_idx
  ON public.votes (post_id, option_index)
  WHERE is_current;

-- 2) Enforce “active window” and valid option index on any INSERT/UPDATE to votes
CREATE OR REPLACE FUNCTION public.validate_vote_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_expires_at timestamptz;
  v_is_archived boolean;
  v_options_count int;
BEGIN
  -- Validate the poll exists and extract metadata
  SELECT
    NULLIF(poll_data->>'expires_at','')::timestamptz,
    COALESCE((poll_data->>'archived')::boolean, false),
    jsonb_array_length(poll_data->'options')
  INTO v_expires_at, v_is_archived, v_options_count
  FROM public.posts
  WHERE id = COALESCE(NEW.post_id, OLD.post_id) AND post_type = 'poll';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found or not a poll';
  END IF;

  IF v_is_archived THEN
    RAISE EXCEPTION 'Poll is archived';
  END IF;

  -- Closed if expires_at is missing or in the past
  IF v_expires_at IS NULL OR now() >= v_expires_at THEN
    RAISE EXCEPTION 'Poll is closed';
  END IF;

  -- When inserting/updating, check option_index range (0..N-1)
  IF TG_OP IN ('INSERT','UPDATE') THEN
    IF NEW.option_index < 0 OR NEW.option_index >= v_options_count THEN
      RAISE EXCEPTION 'Invalid option_index % (options: %)', NEW.option_index, v_options_count;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_votes_validate_allowed_ins ON public.votes;
CREATE TRIGGER trg_votes_validate_allowed_ins
  BEFORE INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_vote_allowed();

DROP TRIGGER IF EXISTS trg_votes_validate_allowed_upd ON public.votes;
CREATE TRIGGER trg_votes_validate_allowed_upd
  BEFORE UPDATE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_vote_allowed();

-- 3) Server-owned vote counting that only considers current votes
CREATE OR REPLACE FUNCTION public.update_poll_vote_counts()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    poll_options JSONB;
    updated_options JSONB := '[]'::jsonb;
    options_count INTEGER;
    option_votes INTEGER;
    i INTEGER;
    post_uuid uuid := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
    -- Get current poll options and count
    SELECT poll_data, jsonb_array_length(poll_data->'options')
    INTO poll_options, options_count
    FROM posts
    WHERE id = post_uuid;

    IF poll_options IS NULL OR (poll_options->'options') IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Recompute votes for each option using only is_current = true
    FOR i IN 0..(options_count - 1) LOOP
        SELECT COUNT(*)::INTEGER INTO option_votes
        FROM votes
        WHERE post_id = post_uuid
          AND is_current = true
          AND option_index = i;

        updated_options := updated_options || jsonb_build_object(
            'text', poll_options->'options'->i->>'text',
            'votes', option_votes
        );
    END LOOP;

    UPDATE posts
    SET poll_data = jsonb_set(
      poll_options,
      '{options}',
      updated_options,
      false
    )
    WHERE id = post_uuid;

    RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_votes_update_counts ON public.votes;
CREATE TRIGGER trg_votes_update_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poll_vote_counts();

-- 4) Lock poll option texts once any vote exists (author can edit before first vote only)
CREATE OR REPLACE FUNCTION public.prevent_poll_option_changes_after_votes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  old_texts TEXT[];
  new_texts TEXT[];
  has_any_vote BOOLEAN;
BEGIN
  -- Only apply to poll posts and when poll_data is being changed
  IF NEW.post_type <> 'poll' OR NEW.poll_data IS NULL OR OLD.poll_data IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extract arrays of option texts (ignore votes fields)
  SELECT ARRAY(
    SELECT elem->>'text'
    FROM jsonb_array_elements(OLD.poll_data->'options') AS elem
  ) INTO old_texts;

  SELECT ARRAY(
    SELECT elem->>'text'
    FROM jsonb_array_elements(NEW.poll_data->'options') AS elem
  ) INTO new_texts;

  -- If texts changed (including length changes), ensure no votes exist
  IF old_texts IS DISTINCT FROM new_texts THEN
    SELECT EXISTS (
      SELECT 1 FROM public.votes
      WHERE post_id = NEW.id AND is_current = true
      LIMIT 1
    ) INTO has_any_vote;

    IF has_any_vote THEN
      RAISE EXCEPTION 'Cannot edit poll options after votes have been cast';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_posts_lock_poll_options ON public.posts;
CREATE TRIGGER trg_posts_lock_poll_options
  BEFORE UPDATE OF poll_data ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_poll_option_changes_after_votes();

-- 5) Cast vote RPC: atomically switch current vote and return results
CREATE OR REPLACE FUNCTION public.cast_poll_vote(p_post_id uuid, p_option_index integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_options_count int;
  v_expires_at timestamptz;
  v_archived boolean;
  v_now timestamptz := now();
  updated_options jsonb := '[]'::jsonb;
  total int := 0;
  i int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    jsonb_array_length(poll_data->'options'),
    NULLIF(poll_data->>'expires_at','')::timestamptz,
    COALESCE((poll_data->>'archived')::boolean, false)
  INTO v_options_count, v_expires_at, v_archived
  FROM public.posts
  WHERE id = p_post_id AND post_type = 'poll';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  IF v_archived THEN
    RAISE EXCEPTION 'Poll is archived';
  END IF;

  IF v_expires_at IS NULL OR v_now >= v_expires_at THEN
    RAISE EXCEPTION 'Poll is closed';
  END IF;

  IF p_option_index < 0 OR p_option_index >= v_options_count THEN
    RAISE EXCEPTION 'Invalid option_index % (options: %)', p_option_index, v_options_count;
  END IF;

  -- Mark previous current vote (if any) as historical
  UPDATE public.votes
  SET is_current = false, updated_at = now()
  WHERE post_id = p_post_id
    AND user_id = v_user
    AND is_current = true;

  -- Insert new current vote (validate_vote_allowed trigger will re-check invariants)
  INSERT INTO public.votes (id, user_id, post_id, option_index, is_current, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user, p_post_id, p_option_index, true, now(), now());

  -- Rebuild options with authoritative counts (only current votes)
  FOR i IN 0..(v_options_count - 1) LOOP
    PERFORM 1; -- placeholder
    updated_options := updated_options || jsonb_build_object(
      'text', (SELECT (poll_data->'options'->i->>'text') FROM public.posts WHERE id = p_post_id),
      'votes', COALESCE((
         SELECT COUNT(*)::int FROM public.votes
         WHERE post_id = p_post_id AND is_current = true AND option_index = i
      ),0)
    );
  END LOOP;

  UPDATE public.posts
  SET poll_data = jsonb_set(
    poll_data,
    '{options}',
    updated_options,
    false
  )
  WHERE id = p_post_id;

  -- compute total
  SELECT COALESCE(SUM( (elem->>'votes')::int ), 0)
  INTO total
  FROM jsonb_array_elements(updated_options) elem;

  RETURN jsonb_build_object(
    'post_id', p_post_id,
    'total', total,
    'selected', p_option_index,
    'expires_at', v_expires_at,
    'closed', false
  );
END;
$function$;

-- 6) Results RPC for display (totals, percentages, user’s selection, status)
CREATE OR REPLACE FUNCTION public.get_poll_results(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_expires_at timestamptz;
  v_now timestamptz := now();
  opts jsonb;
  total int;
  user_selected int;
  closed boolean;
BEGIN
  SELECT (poll_data->'options'), NULLIF(poll_data->>'expires_at','')::timestamptz
  INTO opts, v_expires_at
  FROM public.posts
  WHERE id = p_post_id AND post_type = 'poll';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  closed := (v_expires_at IS NULL OR v_now >= v_expires_at);

  -- authoritative total
  SELECT COALESCE(SUM( (elem->>'votes')::int ), 0)
  INTO total
  FROM jsonb_array_elements(opts) elem;

  -- user’s current selection (if any)
  SELECT v.option_index INTO user_selected
  FROM public.votes v
  WHERE v.post_id = p_post_id
    AND v.user_id = v_user
    AND v.is_current = true
  LIMIT 1;

  -- attach percentages
  RETURN jsonb_build_object(
    'post_id', p_post_id,
    'expires_at', v_expires_at,
    'closed', closed,
    'total', total,
    'user_selected', user_selected,
    'options', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'text', elem->>'text',
          'votes', (elem->>'votes')::int,
          'percentage', CASE WHEN total > 0 THEN ROUND(((elem->>'votes')::numeric * 100.0) / total)::int ELSE 0 END
        )
      )
      FROM jsonb_array_elements(opts) elem
    )
  );
END;
$function$;
