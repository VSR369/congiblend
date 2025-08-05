-- Create shares table for tracking post and comment shares
CREATE TABLE IF NOT EXISTS public.shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  target_type TEXT CHECK (target_type IN ('post', 'comment')) NOT NULL,
  target_id UUID NOT NULL,
  share_type TEXT CHECK (share_type IN ('share', 'repost', 'quote_repost')) DEFAULT 'share' NOT NULL,
  quote_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, target_type, target_id, share_type)
);

-- Enable RLS
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create shares" ON public.shares
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view shares" ON public.shares
FOR SELECT USING (true);

CREATE POLICY "Users can delete their own shares" ON public.shares
FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shares_target ON public.shares(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON public.shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_created_at ON public.shares(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_shares_updated_at
  BEFORE UPDATE ON public.shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();