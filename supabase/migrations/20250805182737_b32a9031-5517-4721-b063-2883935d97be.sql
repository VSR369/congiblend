-- Add poll_data column to posts table for storing poll information
ALTER TABLE public.posts ADD COLUMN poll_data JSONB;

-- Create votes table to track user votes on polls
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id) -- Prevent duplicate votes per user per poll
);

-- Enable Row Level Security on votes table
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Create policies for votes table
CREATE POLICY "Users can view all votes" 
ON public.votes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own votes" 
ON public.votes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" 
ON public.votes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on votes
CREATE TRIGGER update_votes_updated_at
BEFORE UPDATE ON public.votes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();