-- Add 'poll' back to PostType enum and create LinkedIn-style polls tables
-- 1) Update post type to include 'poll' (assuming it's a text column)
-- No need to alter if posts.post_type is already text

-- 2) Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 300),
  end_time TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Create poll options table (2-4 options per poll)
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  idx SMALLINT NOT NULL CHECK (idx BETWEEN 0 AND 3),
  option_text TEXT NOT NULL CHECK (char_length(option_text) BETWEEN 1 AND 100),
  UNIQUE (poll_id, idx)
);

-- 4) Create poll votes table (one vote per user per poll, updatable until end_time)
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, voter_id)
);

-- 5) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_polls_post ON polls(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_polls_end_time ON polls(end_time);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);

-- 6) Enable RLS
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- 7) Create RLS policies
-- Polls read: anyone who can read the parent post
CREATE POLICY polls_read ON polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = polls.post_id 
      AND (
        p.visibility = 'public' 
        OR (auth.uid() IS NOT NULL AND p.visibility = 'connections')
        OR p.user_id = auth.uid()
      )
    )
  );

-- Poll options read: same as polls
CREATE POLICY options_read ON poll_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls pl
      JOIN posts p ON p.id = pl.post_id
      WHERE pl.id = poll_options.poll_id
      AND (
        p.visibility = 'public' 
        OR (auth.uid() IS NOT NULL AND p.visibility = 'connections')
        OR p.user_id = auth.uid()
      )
    )
  );

-- Poll votes insert: authenticated users, can view post, before end_time
CREATE POLICY votes_insert ON poll_votes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM polls pl
      JOIN posts p ON p.id = pl.post_id
      WHERE pl.id = poll_votes.poll_id
      AND (
        p.visibility = 'public' 
        OR (auth.uid() IS NOT NULL AND p.visibility = 'connections')
        OR p.user_id = auth.uid()
      )
      AND now() < pl.end_time
    )
  );

-- Poll votes update: voter can change their vote before end_time
CREATE POLICY votes_update ON poll_votes
  FOR UPDATE USING (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1 FROM polls pl 
      WHERE pl.id = poll_votes.poll_id 
      AND now() < pl.end_time
    )
  )
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1 FROM polls pl 
      WHERE pl.id = poll_votes.poll_id 
      AND now() < pl.end_time
    )
  );

-- Poll votes read: aggregate data allowed
CREATE POLICY votes_read ON poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM polls pl
      JOIN posts p ON p.id = pl.post_id
      WHERE pl.id = poll_votes.poll_id
      AND (
        p.visibility = 'public' 
        OR (auth.uid() IS NOT NULL AND p.visibility = 'connections')
        OR p.user_id = auth.uid()
      )
    )
  );

-- 8) Create database functions
-- Create poll with options atomically
CREATE OR REPLACE FUNCTION poll_create(
  p_post_id UUID,
  p_question TEXT,
  p_end_time TIMESTAMPTZ,
  p_options TEXT[]
) RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_poll_id UUID;
  i INT;
BEGIN
  IF array_length(p_options,1) < 2 OR array_length(p_options,1) > 4 THEN
    RAISE EXCEPTION 'Poll must have 2 to 4 options';
  END IF;

  INSERT INTO polls (post_id, question, end_time, created_by)
  VALUES (p_post_id, p_question, p_end_time, auth.uid())
  RETURNING id INTO v_poll_id;

  FOR i IN 1..array_length(p_options,1) LOOP
    INSERT INTO poll_options (poll_id, idx, option_text)
    VALUES (v_poll_id, i-1, p_options[i]);
  END LOOP;

  RETURN v_poll_id;
END $$;

-- Cast or change a vote
CREATE OR REPLACE FUNCTION poll_vote(
  p_poll_id UUID,
  p_option_id UUID
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO poll_votes (poll_id, option_id, voter_id)
  VALUES (p_poll_id, p_option_id, auth.uid())
  ON CONFLICT (poll_id, voter_id)
  DO UPDATE SET option_id = EXCLUDED.option_id, updated_at = now();
END $$;

-- Get poll results with percentages
CREATE OR REPLACE FUNCTION poll_results(p_poll_id UUID)
RETURNS TABLE(option_id UUID, option_text TEXT, votes BIGINT, pct NUMERIC) 
LANGUAGE sql 
SECURITY DEFINER
AS $$
WITH totals AS (
  SELECT COUNT(*)::BIGINT AS total FROM poll_votes WHERE poll_id = p_poll_id
),
counts AS (
  SELECT o.id, o.option_text, COUNT(v.*)::BIGINT AS votes
  FROM poll_options o
  LEFT JOIN poll_votes v ON v.option_id = o.id
  WHERE o.poll_id = p_poll_id
  GROUP BY o.id, o.option_text, o.idx
  ORDER BY o.idx
)
SELECT
  c.id, c.option_text, c.votes,
  CASE WHEN t.total = 0 THEN 0 ELSE ROUND((c.votes::NUMERIC*100)/t.total, 1) END AS pct
FROM counts c, totals t
ORDER BY c.id;
$$;