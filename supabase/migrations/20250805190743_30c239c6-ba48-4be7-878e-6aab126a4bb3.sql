-- Add missing columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mentions text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Create shares table
CREATE TABLE IF NOT EXISTS shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  share_type text NOT NULL DEFAULT 'share',
  quote_content text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on shares table
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;

-- Create shares policies
DROP POLICY IF EXISTS "Users can create their own shares" ON shares;
CREATE POLICY "Users can create their own shares"
ON shares FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all shares" ON shares;
CREATE POLICY "Users can view all shares"
ON shares FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can delete their own shares" ON shares;
CREATE POLICY "Users can delete their own shares"
ON shares FOR DELETE
USING (auth.uid() = user_id);

-- Create event_rsvps table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('attending', 'interested', 'not_attending')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS on event_rsvps table
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Create event_rsvps policies
DROP POLICY IF EXISTS "Users can manage their own RSVPs" ON event_rsvps;
CREATE POLICY "Users can manage their own RSVPs"
ON event_rsvps FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all RSVPs" ON event_rsvps;
CREATE POLICY "Users can view all RSVPs"
ON event_rsvps FOR SELECT
USING (true);