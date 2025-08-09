-- Create event_rsvps table for event RSVP functionality
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('attending','interested','not_attending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_rsvps_post_id ON public.event_rsvps(post_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_post_status ON public.event_rsvps(post_id, status);

-- Enable RLS
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_rsvps' AND policyname = 'Public can view RSVPs'
  ) THEN
    CREATE POLICY "Public can view RSVPs"
    ON public.event_rsvps
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_rsvps' AND policyname = 'Users can insert their own RSVP'
  ) THEN
    CREATE POLICY "Users can insert their own RSVP"
    ON public.event_rsvps
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_rsvps' AND policyname = 'Users can update their own RSVP'
  ) THEN
    CREATE POLICY "Users can update their own RSVP"
    ON public.event_rsvps
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.update_event_rsvps_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_event_rsvps_updated_at ON public.event_rsvps;
CREATE TRIGGER trg_update_event_rsvps_updated_at
BEFORE UPDATE ON public.event_rsvps
FOR EACH ROW EXECUTE FUNCTION public.update_event_rsvps_updated_at();