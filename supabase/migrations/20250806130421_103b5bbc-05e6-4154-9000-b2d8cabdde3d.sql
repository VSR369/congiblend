-- Fix the update_user_activity function to use profiles table instead of users table
CREATE OR REPLACE FUNCTION public.update_user_activity(p_user_id uuid, p_activity_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  
  -- Update user streak in profiles table
  SELECT last_activity_date, current_streak_days 
  INTO last_activity, current_streak
  FROM public.profiles WHERE id = p_user_id;
  
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
  
  -- Update profiles record
  UPDATE public.profiles 
  SET 
    last_activity_date = today_date,
    current_streak_days = current_streak,
    longest_streak_days = GREATEST(COALESCE(longest_streak_days, 0), current_streak)
  WHERE id = p_user_id;
END;
$function$;