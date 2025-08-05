-- Add missing fields to users table for the test requirements
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS headline text;

-- Create user_roles table for role-based access
CREATE TYPE public.app_role AS ENUM ('user', 'creator', 'business', 'admin');

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create skills table
CREATE TABLE IF NOT EXISTS public.skills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    category text,
    created_at timestamp with time zone DEFAULT now()
);

-- Create user_skills junction table
CREATE TABLE IF NOT EXISTS public.user_skills_detailed (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    skill_id uuid REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
    proficiency_level text DEFAULT 'intermediate',
    years_experience integer,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, skill_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills_detailed ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Users can manage their own roles" ON public.user_roles FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Skills are publicly visible" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create skills" ON public.skills FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "User skills are publicly visible" ON public.user_skills_detailed FOR SELECT USING (true);
CREATE POLICY "Users can manage their own skills" ON public.user_skills_detailed FOR ALL USING (auth.uid() = user_id);

-- Create function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Insert some default skills for testing
INSERT INTO public.skills (name, category) VALUES
('JavaScript', 'Programming'),
('Python', 'Programming'),
('React', 'Frontend'),
('Node.js', 'Backend'),
('Product Management', 'Business'),
('Agile', 'Methodology'),
('Data Analysis', 'Analytics'),
('Vue.js', 'Frontend'),
('DevOps', 'Infrastructure'),
('Content Creation', 'Marketing'),
('Business Strategy', 'Business'),
('Sales', 'Business'),
('Marketing', 'Business'),
('Leadership', 'Management')
ON CONFLICT (name) DO NOTHING;