-- Create user_analytics table to track user engagement metrics
CREATE TABLE public.user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_posts INTEGER DEFAULT 0,
  text_posts INTEGER DEFAULT 0,
  image_posts INTEGER DEFAULT 0,
  video_posts INTEGER DEFAULT 0,
  poll_posts INTEGER DEFAULT 0,
  total_likes_received INTEGER DEFAULT 0,
  total_comments_received INTEGER DEFAULT 0,
  total_shares_received INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_user_analytics_user ON public.user_analytics(user_id);
CREATE INDEX idx_user_analytics_updated ON public.user_analytics(updated_at);

-- Enable Row Level Security
ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own analytics" 
ON public.user_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics" 
ON public.user_analytics 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert analytics for any user" 
ON public.user_analytics 
FOR INSERT 
WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_analytics_updated_at
  BEFORE UPDATE ON public.user_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_user_analytics_updated_at();

-- Function to initialize analytics for new users
CREATE OR REPLACE FUNCTION initialize_user_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_analytics (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create analytics record when user is created
CREATE TRIGGER create_user_analytics
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_analytics();