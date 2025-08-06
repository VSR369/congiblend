-- Add missing columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS reactions_count integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS shares_count integer DEFAULT 0 NOT NULL;

-- Update the create_post_optimized function to fix column ambiguity
CREATE OR REPLACE FUNCTION public.create_post_optimized(
  p_user_id uuid, 
  p_content text, 
  p_post_type text DEFAULT 'text'::text, 
  p_visibility text DEFAULT 'public'::text, 
  p_media_urls text[] DEFAULT NULL::text[], 
  p_poll_data jsonb DEFAULT NULL::jsonb, 
  p_event_data jsonb DEFAULT NULL::jsonb, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(post_id uuid, created_at timestamp with time zone, author_profile jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_post_id UUID;
  new_created_at TIMESTAMPTZ;
  author_data JSONB;
BEGIN
  -- Insert post and get ID with explicit column qualification
  INSERT INTO posts (
    user_id, content, post_type, visibility, media_urls, 
    poll_data, event_data, metadata, reactions_count, 
    comments_count, shares_count, created_at, updated_at
  ) VALUES (
    p_user_id, p_content, p_post_type, p_visibility, p_media_urls,
    p_poll_data, p_event_data, p_metadata, 0, 0, 0, NOW(), NOW()
  ) RETURNING id, posts.created_at INTO new_post_id, new_created_at;
  
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
  
  RETURN QUERY SELECT new_post_id, new_created_at, author_data;
END;
$function$;