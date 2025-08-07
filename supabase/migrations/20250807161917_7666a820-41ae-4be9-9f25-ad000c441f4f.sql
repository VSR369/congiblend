-- First, let's see what constraint exists by checking the table definition
-- Find and drop the existing post_type check constraint if it exists
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'posts' 
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%post_type%';
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.posts DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Add a new check constraint that includes all valid post types including 'event'
ALTER TABLE public.posts 
ADD CONSTRAINT posts_post_type_check 
CHECK (post_type IN ('text', 'image', 'video', 'audio', 'poll', 'event', 'job'));

-- Also add the job post type while we're at it since it's referenced in the frontend