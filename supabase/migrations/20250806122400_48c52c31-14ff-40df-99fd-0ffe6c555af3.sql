-- Phase 1: Remove password columns from tables (they shouldn't store passwords with Supabase Auth)
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS password_hash;

-- Phase 2: Create a comprehensive profiles table that consolidates user data
-- Add missing columns to profiles table to match users table structure
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS headline TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_activity_date DATE,
ADD COLUMN IF NOT EXISTS current_streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS company TEXT;

-- Phase 3: Migrate existing data from users table to profiles table
-- Update profiles with data from users table where they exist
UPDATE public.profiles 
SET 
  username = COALESCE(profiles.username, users.username),
  display_name = COALESCE(profiles.display_name, users.display_name),
  bio = COALESCE(profiles.bio, users.bio),
  location = COALESCE(profiles.location, users.location),
  headline = COALESCE(profiles.headline, users.headline),
  avatar_url = COALESCE(profiles.avatar_url, users.avatar_url),
  cover_url = COALESCE(profiles.cover_url, users.cover_url),
  is_verified = COALESCE(profiles.is_verified, users.is_verified),
  is_active = COALESCE(profiles.is_active, users.is_active),
  last_activity_date = COALESCE(profiles.last_activity_date, users.last_activity_date),
  current_streak_days = COALESCE(profiles.current_streak_days, users.current_streak_days),
  longest_streak_days = COALESCE(profiles.longest_streak_days, users.longest_streak_days),
  profile_views_count = COALESCE(profiles.profile_views_count, users.profile_views_count),
  last_seen_at = COALESCE(profiles.last_seen_at, users.last_seen_at),
  title = COALESCE(profiles.title, users.title),
  company = COALESCE(profiles.company, users.company),
  updated_at = NOW()
FROM public.users 
WHERE profiles.id = users.id;

-- Insert any users that exist in users table but not in profiles
INSERT INTO public.profiles (
  id, custom_user_id, username, display_name, bio, location, headline, 
  avatar_url, cover_url, role, is_verified, is_active, last_activity_date, 
  current_streak_days, longest_streak_days, profile_views_count, last_seen_at,
  title, company, organization_name, contact_person_name, organization_type, 
  entity_type, country, country_code, website, address, phone_number
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
  users.cover_url,
  'user',
  users.is_verified,
  users.is_active,
  users.last_activity_date,
  users.current_streak_days,
  users.longest_streak_days,
  users.profile_views_count,
  users.last_seen_at,
  users.title,
  users.company,
  COALESCE(users.display_name, users.username),
  COALESCE(users.display_name, users.username),
  'user',
  'individual',
  'United States',
  'US',
  users.website,
  NULL,
  NULL
FROM public.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = users.id
);

-- Phase 4: Drop the redundant users table since all data is now in profiles
DROP TABLE IF EXISTS public.users CASCADE;