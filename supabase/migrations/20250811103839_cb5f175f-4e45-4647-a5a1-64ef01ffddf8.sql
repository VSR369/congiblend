-- Phase 2: Notifications on new spark content versions
-- Function to notify spark author and prior contributors when a new version is created
CREATE OR REPLACE FUNCTION public.notify_spark_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert notifications for the author and prior contributors, excluding the editor
  INSERT INTO public.notifications(user_id, type, payload)
  SELECT DISTINCT uid AS user_id,
         'spark_edit'::text AS type,
         jsonb_build_object(
           'spark_id', NEW.spark_id,
           'version_number', NEW.version_number,
           'edited_by', NEW.edited_by,
           'created_at', now()
         ) AS payload
  FROM (
    SELECT ks.author_id AS uid
    FROM public.knowledge_sparks ks
    WHERE ks.id = NEW.spark_id

    UNION

    SELECT v.edited_by AS uid
    FROM public.spark_content_versions v
    WHERE v.spark_id = NEW.spark_id
      AND v.edited_by IS NOT NULL

    UNION

    SELECT s.creator_id AS uid
    FROM public.spark_sections s
    WHERE s.spark_id = NEW.spark_id
      AND s.is_deleted = false
  ) AS recipients
  WHERE uid IS NOT NULL
    AND uid <> NEW.edited_by;

  RETURN NEW;
END;
$$;

-- Create trigger to call the notification function after insert on spark_content_versions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'scv_after_insert_notify' 
      AND tgrelid = 'public.spark_content_versions'::regclass
  ) THEN
    DROP TRIGGER scv_after_insert_notify ON public.spark_content_versions;
  END IF;

  CREATE TRIGGER scv_after_insert_notify
  AFTER INSERT ON public.spark_content_versions
  FOR EACH ROW EXECUTE FUNCTION public.notify_spark_edit();
END$$;
