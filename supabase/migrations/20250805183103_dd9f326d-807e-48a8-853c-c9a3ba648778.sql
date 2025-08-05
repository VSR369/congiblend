-- Add event_data column to posts table for storing event information
ALTER TABLE public.posts ADD COLUMN event_data JSONB;

-- Create event_rsvps table to track user RSVPs to events
CREATE TABLE public.event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('attending', 'interested', 'not_attending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id) -- Prevent duplicate RSVPs per user per event
);

-- Enable Row Level Security on event_rsvps table
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Create policies for event_rsvps table
CREATE POLICY "Users can view all event RSVPs" 
ON public.event_rsvps 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own RSVPs" 
ON public.event_rsvps 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RSVPs" 
ON public.event_rsvps 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on event_rsvps
CREATE TRIGGER update_event_rsvps_updated_at
BEFORE UPDATE ON public.event_rsvps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();