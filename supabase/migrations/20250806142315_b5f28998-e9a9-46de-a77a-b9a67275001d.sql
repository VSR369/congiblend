-- Add performance indexes for post queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at_desc ON posts (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id_created_at ON posts (user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_post_type ON posts (post_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_visibility ON posts (visibility);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_composite_public ON posts (visibility, created_at DESC) WHERE visibility = 'public';

-- Add indexes for reactions table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_target_type_id ON reactions (target_type, target_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_user_target ON reactions (user_id, target_type, target_id);

-- Add indexes for profiles table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username ON profiles (username);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_display_name ON profiles (display_name);

-- Add indexes for votes table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_post_user ON votes (post_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_post ON votes (user_id, post_id);

-- Add indexes for comments table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_id ON comments (post_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_id ON comments (user_id);

-- Create optimized function for post creation with profile caching
CREATE OR REPLACE FUNCTION create_post_optimized(
  p_user_id UUID,
  p_content TEXT,
  p_post_type TEXT DEFAULT 'text',
  p_visibility TEXT DEFAULT 'public',
  p_media_urls TEXT[] DEFAULT NULL,
  p_poll_data JSONB DEFAULT NULL,
  p_event_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS TABLE (
  post_id UUID,
  created_at TIMESTAMPTZ,
  author_profile JSONB
) AS $$
DECLARE
  new_post_id UUID;
  author_data JSONB;
BEGIN
  -- Insert post and get ID
  INSERT INTO posts (
    user_id, content, post_type, visibility, media_urls, 
    poll_data, event_data, metadata, reactions_count, 
    comments_count, shares_count, created_at, updated_at
  ) VALUES (
    p_user_id, p_content, p_post_type, p_visibility, p_media_urls,
    p_poll_data, p_event_data, p_metadata, 0, 0, 0, NOW(), NOW()
  ) RETURNING id, created_at INTO new_post_id, created_at;
  
  -- Get author profile in same transaction
  SELECT jsonb_build_object(
    'id', id,
    'username', username,
    'display_name', display_name,
    'avatar_url', avatar_url,
    'is_verified', is_verified
  ) INTO author_data
  FROM profiles 
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT new_post_id, created_at, author_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;