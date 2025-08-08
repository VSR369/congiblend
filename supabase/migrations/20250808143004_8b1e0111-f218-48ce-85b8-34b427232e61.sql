-- Adjust constraint to allow new reaction types
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;

-- Map existing reaction types to new taxonomy
UPDATE public.reactions
SET reaction_type = CASE
  WHEN reaction_type IN ('insightful','curious','sad') THEN 'well_researched'
  WHEN reaction_type IN ('support','funny','angry') THEN 'practical'
  WHEN reaction_type IN ('like','love','celebrate') THEN 'innovative'
  ELSE reaction_type
END;

-- Recreate check constraint with the new allowed set (defense-in-depth)
ALTER TABLE public.reactions
  ADD CONSTRAINT reactions_reaction_type_check
  CHECK (reaction_type IN ('innovative','practical','well_researched'));

-- Ensure only the new reaction types are allowed at the DB level (also via trigger)
CREATE OR REPLACE FUNCTION public.validate_reaction_type_allowed()
RETURNS trigger AS $$
BEGIN
  IF NEW.reaction_type IS NULL OR NEW.reaction_type NOT IN ('innovative','practical','well_researched') THEN
    RAISE EXCEPTION 'Invalid reaction_type: %, allowed: innovative, practical, well_researched', NEW.reaction_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_reaction_type_allowed ON public.reactions;
CREATE TRIGGER trg_validate_reaction_type_allowed
BEFORE INSERT OR UPDATE ON public.reactions
FOR EACH ROW
EXECUTE FUNCTION public.validate_reaction_type_allowed();