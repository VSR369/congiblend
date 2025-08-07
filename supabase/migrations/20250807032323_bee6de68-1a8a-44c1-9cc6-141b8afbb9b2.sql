-- Phase 1: Fix Database Schema - Create proper foreign key relationship
-- First, let's check if we need to add a foreign key constraint

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    -- Check if posts table has user_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'user_id') THEN
        -- Check if foreign key constraint already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'posts_user_id_fkey' 
            AND table_name = 'posts'
        ) THEN
            -- Add the foreign key constraint
            ALTER TABLE public.posts 
            ADD CONSTRAINT posts_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Added foreign key constraint posts_user_id_fkey';
        ELSE
            RAISE NOTICE 'Foreign key constraint posts_user_id_fkey already exists';
        END IF;
    ELSE
        RAISE NOTICE 'posts.user_id column does not exist';
    END IF;
END
$$;