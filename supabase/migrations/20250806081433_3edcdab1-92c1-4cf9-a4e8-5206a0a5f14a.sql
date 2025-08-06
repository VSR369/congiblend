-- Add user statistics tracking fields
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS longest_streak_days INTEGER DEFAULT 0;

-- Create user_activity_log table for tracking daily activity
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_types JSONB DEFAULT '[]'::jsonb, -- ['post', 'comment', 'reaction', 'login']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

-- Enable RLS on user_activity_log
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policy for user_activity_log
CREATE POLICY "Users can view their own activity log" ON public.user_activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity log" ON public.user_activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity log" ON public.user_activity_log
  FOR UPDATE USING (auth.uid() = user_id);

-- Create profile_views table
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on profile_views
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Create policies for profile_views
CREATE POLICY "Users can view their own profile views" ON public.profile_views
  FOR SELECT USING (auth.uid() = profile_user_id);

CREATE POLICY "Anyone can create profile views" ON public.profile_views
  FOR INSERT WITH CHECK (true);

-- Function to update streak and activity
CREATE OR REPLACE FUNCTION public.update_user_activity(
  p_user_id UUID,
  p_activity_type TEXT
) RETURNS VOID AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  activity_exists BOOLEAN;
  current_activities JSONB;
  last_activity DATE;
  current_streak INTEGER;
BEGIN
  -- Check if activity already exists for today
  SELECT EXISTS(
    SELECT 1 FROM public.user_activity_log 
    WHERE user_id = p_user_id AND activity_date = today_date
  ) INTO activity_exists;
  
  IF activity_exists THEN
    -- Update existing activity log
    SELECT activity_types INTO current_activities
    FROM public.user_activity_log 
    WHERE user_id = p_user_id AND activity_date = today_date;
    
    -- Add activity type if not already present
    IF NOT (current_activities ? p_activity_type) THEN
      UPDATE public.user_activity_log 
      SET activity_types = activity_types || to_jsonb(p_activity_type)
      WHERE user_id = p_user_id AND activity_date = today_date;
    END IF;
  ELSE
    -- Insert new activity log
    INSERT INTO public.user_activity_log (user_id, activity_date, activity_types)
    VALUES (p_user_id, today_date, to_jsonb(ARRAY[p_activity_type]));
  END IF;
  
  -- Update user streak
  SELECT last_activity_date, current_streak_days 
  INTO last_activity, current_streak
  FROM public.users WHERE id = p_user_id;
  
  IF last_activity IS NULL OR last_activity < yesterday_date THEN
    -- Reset streak if more than 1 day gap
    current_streak := 1;
  ELSIF last_activity = yesterday_date THEN
    -- Continue streak
    current_streak := COALESCE(current_streak, 0) + 1;
  ELSIF last_activity = today_date THEN
    -- Same day, no change to streak
    current_streak := COALESCE(current_streak, 1);
  END IF;
  
  -- Update user record
  UPDATE public.users 
  SET 
    last_activity_date = today_date,
    current_streak_days = current_streak,
    longest_streak_days = GREATEST(COALESCE(longest_streak_days, 0), current_streak)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment profile views
CREATE OR REPLACE FUNCTION public.increment_profile_view(
  p_profile_user_id UUID,
  p_viewer_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Insert profile view record
  INSERT INTO public.profile_views (profile_user_id, viewer_user_id, ip_address, user_agent)
  VALUES (p_profile_user_id, p_viewer_user_id, p_ip_address, p_user_agent);
  
  -- Update profile views count
  UPDATE public.users 
  SET profile_views_count = profile_views_count + 1
  WHERE id = p_profile_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;