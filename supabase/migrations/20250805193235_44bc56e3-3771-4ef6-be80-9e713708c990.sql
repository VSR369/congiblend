-- Clean up RLS policies for posts table and fix authentication issues

-- Drop all existing policies to clean up duplicates
DROP POLICY IF EXISTS "Users can view public posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Allow authenticated users to create posts" ON public.posts;
DROP POLICY IF EXISTS "Allow users to view posts" ON public.posts;

-- Create proper RLS policies for posts
CREATE POLICY "Users can view public posts" 
ON public.posts 
FOR SELECT 
USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own posts" 
ON public.posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON public.posts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.posts 
FOR DELETE 
USING (auth.uid() = user_id);