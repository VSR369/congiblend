-- Add missing fields to users table for the test requirements
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS headline text;

-- Create user_roles table for role-based access
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('user', 'creator', 'business', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create user_skills junction table with better name to avoid conflicts
CREATE TABLE IF NOT EXISTS public.user_skill_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    skill_name text NOT NULL,
    proficiency_level text DEFAULT 'intermediate',
    years_experience integer,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, skill_name)
);

-- Enable RLS
DO $$
BEGIN
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$
BEGIN
    ALTER TABLE public.user_skill_profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN others THEN null;
END $$;

-- Create RLS policies only if they don't exist
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
    CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own roles" ON public.user_roles;
    CREATE POLICY "Users can manage their own roles" ON public.user_roles FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "User skill profiles are publicly visible" ON public.user_skill_profiles;
    CREATE POLICY "User skill profiles are publicly visible" ON public.user_skill_profiles FOR SELECT USING (true);
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own skill profiles" ON public.user_skill_profiles;
    CREATE POLICY "Users can manage their own skill profiles" ON public.user_skill_profiles FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN others THEN null;
END $$;