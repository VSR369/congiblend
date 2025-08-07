-- Phase 1: Remove password columns from tables (they shouldn't store passwords with Supabase Auth)
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS password_hash;

-- Phase 2: Create a comprehensive profiles table that consolidates user data
-- First, let's update the existing profiles table to include all user fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_activity_date DATE,
ADD COLUMN IF NOT EXISTS current_streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_views_count INTEGER DEFAULT 0;

-- Phase 3: Update the existing trigger to create profiles from auth.users metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Create profile for the new user
  INSERT INTO public.profiles (
    id,
    custom_user_id,
    username,
    display_name,
    organization_name,
    contact_person_name,
    organization_type,
    entity_type,
    country,
    country_code,
    role,
    website,
    address,
    phone_number,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'organization_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'organization_type', 'user'),
    COALESCE(NEW.raw_user_meta_data->>'entity_type', 'individual'),
    COALESCE(NEW.raw_user_meta_data->>'country', 'United States'),
    COALESCE(NEW.raw_user_meta_data->>'country_code', 'US'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'website',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'phone_number',
    NOW(),
    NOW()
  );

  -- Insert user role if provided
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Default role is 'user'
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Phase 4: Migrate existing data from users table to profiles table
-- Update profiles with data from users table where they exist
UPDATE public.profiles 
SET 
  username = COALESCE(profiles.username, users.username),
  display_name = COALESCE(profiles.display_name, users.display_name),
  bio = COALESCE(profiles.bio, users.bio),
  location = COALESCE(profiles.location, users.location),
  headline = COALESCE(profiles.headline, users.headline),
  avatar_url = COALESCE(profiles.avatar_url, users.avatar_url),
  role = COALESCE(profiles.role, users.role),
  is_verified = COALESCE(profiles.is_verified, users.is_verified),
  last_activity_date = COALESCE(profiles.last_activity_date, users.last_activity_date),
  current_streak_days = COALESCE(profiles.current_streak_days, users.current_streak_days),
  longest_streak_days = COALESCE(profiles.longest_streak_days, users.longest_streak_days),
  profile_views_count = COALESCE(profiles.profile_views_count, users.profile_views_count),
  updated_at = NOW()
FROM public.users 
WHERE profiles.id = users.id;

-- Insert any users that exist in users table but not in profiles
INSERT INTO public.profiles (
  id, custom_user_id, username, display_name, bio, location, headline, 
  avatar_url, role, is_verified, last_activity_date, current_streak_days, 
  longest_streak_days, profile_views_count, organization_name, contact_person_name,
  organization_type, entity_type, country, country_code, website, address, phone_number
)
SELECT 
  users.id,
  users.username,
  users.username,
  users.display_name,
  users.bio,
  users.location,
  users.headline,
  users.avatar_url,
  users.role,
  users.is_verified,
  users.last_activity_date,
  users.current_streak_days,
  users.longest_streak_days,
  users.profile_views_count,
  COALESCE(users.display_name, users.username),
  COALESCE(users.display_name, users.username),
  'user',
  'individual',
  'United States',
  'US',
  NULL,
  NULL,
  NULL
FROM public.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = users.id
);

-- Phase 5: Clean up - we can now drop the users table since all data is in profiles
-- But first, let's make sure all foreign key relationships are updated
-- Update any tables that reference users.id to reference profiles.id instead

-- Drop the redundant users table
DROP TABLE IF EXISTS public.users CASCADE;