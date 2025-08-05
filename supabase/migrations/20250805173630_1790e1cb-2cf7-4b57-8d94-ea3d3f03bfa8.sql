-- Create shares table for post and comment sharing functionality
CREATE TABLE public.shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('share', 'repost', 'quote_repost')),
  quote_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id, share_type)
);

-- Enable RLS on shares table
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_shares_user_id ON public.shares(user_id);
CREATE INDEX idx_shares_target ON public.shares(target_id, target_type);
CREATE INDEX idx_shares_created_at ON public.shares(created_at DESC);

-- Create RLS policies for shares
CREATE POLICY "Users can view shares" ON public.shares
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own shares" ON public.shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shares" ON public.shares
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shares" ON public.shares
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_shares_updated_at 
  BEFORE UPDATE ON public.shares 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();