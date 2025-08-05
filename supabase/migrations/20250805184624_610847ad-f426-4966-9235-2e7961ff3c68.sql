-- Create shares table to track post shares and quote reposts
CREATE TABLE public.shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post')),
  target_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL CHECK (share_type IN ('share', 'quote_repost')),
  quote_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_id, share_type) -- Prevent duplicate shares of same type per user per post
);

-- Enable Row Level Security on shares table
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Create policies for shares table
CREATE POLICY "Users can view all shares" 
ON public.shares 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own shares" 
ON public.shares 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shares" 
ON public.shares 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shares" 
ON public.shares 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on shares
CREATE TRIGGER update_shares_updated_at
BEFORE UPDATE ON public.shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add columns to posts table for shared post tracking
ALTER TABLE public.posts ADD COLUMN shared_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN quote_content TEXT;