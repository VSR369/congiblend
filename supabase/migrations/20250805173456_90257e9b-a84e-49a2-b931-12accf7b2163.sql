-- Update reactions table to support more reaction types and fix constraints
ALTER TABLE public.reactions 
DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;

ALTER TABLE public.reactions 
ADD CONSTRAINT reactions_reaction_type_check 
CHECK (reaction_type IN ('like', 'love', 'celebrate', 'support', 'insightful', 'funny', 'heart', 'laugh', 'angry', 'sad'));

-- Drop existing unique constraint and recreate with proper naming
ALTER TABLE public.reactions 
DROP CONSTRAINT IF EXISTS reactions_user_id_target_id_target_type_key;

-- Add the properly named unique constraint
ALTER TABLE public.reactions 
ADD CONSTRAINT unique_user_reaction_per_target 
UNIQUE(user_id, target_type, target_id);