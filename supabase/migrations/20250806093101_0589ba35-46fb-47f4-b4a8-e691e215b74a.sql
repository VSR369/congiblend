-- Create post_interactions table to track user interactions with posts
CREATE TABLE public.post_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('like', 'share', 'save')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(post_id, user_id, interaction_type)
);

-- Create indexes for better query performance
CREATE INDEX idx_post_interactions_post ON public.post_interactions(post_id);
CREATE INDEX idx_post_interactions_user ON public.post_interactions(user_id);
CREATE INDEX idx_post_interactions_type ON public.post_interactions(interaction_type);

-- Enable Row Level Security
ALTER TABLE public.post_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create their own interactions" 
ON public.post_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all interactions" 
ON public.post_interactions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own interactions" 
ON public.post_interactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions" 
ON public.post_interactions 
FOR DELETE 
USING (auth.uid() = user_id);