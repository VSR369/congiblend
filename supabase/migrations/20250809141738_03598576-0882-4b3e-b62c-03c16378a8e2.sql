
-- 1) Columns for indexed event timestamps
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS event_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS event_end_at   timestamptz;

-- 2) Trigger function: sync from JSON and validate
CREATE OR REPLACE FUNCTION public.sync_event_timestamps_from_json()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_ts timestamptz;
  v_end_ts   timestamptz;
BEGIN
  -- Only apply for event posts
  IF NEW.post_type = 'event' THEN
    -- Parse timestamps from event_data JSONB (if present)
    IF NEW.event_data ? 'start_date' AND COALESCE(NEW.event_data->>'start_date','') <> '' THEN
      BEGIN
        v_start_ts := (NEW.event_data->>'start_date')::timestamptz;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Invalid event_data.start_date format. Expected ISO-8601 string, got: %', NEW.event_data->>'start_date';
      END;
    ELSE
      v_start_ts := NULL;
    END IF;

    IF NEW.event_data ? 'end_date' AND COALESCE(NEW.event_data->>'end_date','') <> '' THEN
      BEGIN
        v_end_ts := (NEW.event_data->>'end_date')::timestamptz;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Invalid event_data.end_date format. Expected ISO-8601 string, got: %', NEW.event_data->>'end_date';
      END;
    ELSE
      v_end_ts := NULL;
    END IF;

    -- Validation: if both are provided, end must be after start
    IF v_start_ts IS NOT NULL AND v_end_ts IS NOT NULL AND v_end_ts <= v_start_ts THEN
      RAISE EXCEPTION 'Event end date/time must be after start date/time';
    END IF;

    NEW.event_start_at := v_start_ts;
    NEW.event_end_at   := v_end_ts;
  ELSE
    -- Non-event posts: keep derived cols null
    NEW.event_start_at := NULL;
    NEW.event_end_at   := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Trigger to keep columns in sync on insert/update
DROP TRIGGER IF EXISTS tg_posts_sync_event_ts ON public.posts;
CREATE TRIGGER tg_posts_sync_event_ts
BEFORE INSERT OR UPDATE OF event_data, post_type ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.sync_event_timestamps_from_json();

-- 4) Backfill existing data for current event posts
UPDATE public.posts
SET
  event_start_at = NULLIF(event_data->>'start_date','')::timestamptz,
  event_end_at   = NULLIF(event_data->>'end_date','')::timestamptz
WHERE post_type = 'event';

-- 5) Helpful indexes (non-breaking)
CREATE INDEX IF NOT EXISTS idx_posts_event_start_at ON public.posts (event_start_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_event_end_at   ON public.posts (event_end_at DESC);
