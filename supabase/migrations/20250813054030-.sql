-- Add SET search_path TO 'public' for remaining functions (triggers and helpers)

CREATE OR REPLACE FUNCTION public.update_media_processing_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_comments_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.append_comment_edit_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edit_history = COALESCE(OLD.edit_history, '[]'::jsonb) || jsonb_build_object(
      'edited_at', now(),
      'editor_id', auth.uid(),
      'prev_length', COALESCE(length(OLD.content), 0),
      'new_length', COALESCE(length(NEW.content), 0)
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_comment_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_reaction_type_allowed()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.reaction_type IS NULL OR NEW.reaction_type NOT IN ('innovative','practical','well_researched') THEN
    RAISE EXCEPTION 'Invalid reaction_type: %, allowed: innovative, practical, well_researched', NEW.reaction_type;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_event_timestamps_from_json()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start_ts timestamptz;
  v_end_ts   timestamptz;
BEGIN
  IF NEW.post_type = 'event' THEN
    IF NEW.event_data ? 'start_date' AND COALESCE(NEW.event_data->>'start_date','') <> '' THEN
      BEGIN
        v_start_ts := (NEW.event_data->>'start_date')::timestamptz;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Invalid event_data.start_date format. Expected ISO-8601 string, got: %', NEW.event_data->>'start_date';
      END;
    ELSE
      v_start_ts := NULL;
    END IF;

    IF NEW.event_data ? 'end_date' AND COALESCE(NEW.event_data->>'end_date','') <> '' THEN
      BEGIN
        v_end_ts := (NEW.event_data->>'end_date')::timestamptz;
      EXCEPTION WHEN others THEN
        RAISE EXCEPTION 'Invalid event_data.end_date format. Expected ISO-8601 string, got: %', NEW.event_data->>'end_date';
      END;
    ELSE
      v_end_ts := NULL;
    END IF;

    IF v_start_ts IS NOT NULL AND v_end_ts IS NOT NULL AND v_end_ts <= v_start_ts THEN
      RAISE EXCEPTION 'Event end date/time must be after start date/time';
    END IF;

    NEW.event_start_at := v_start_ts;
    NEW.event_end_at   := v_end_ts;
  ELSE
    NEW.event_start_at := NULL;
    NEW.event_end_at   := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_comment_reactions_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.target_type = 'comment' THEN
      UPDATE comments 
      SET reactions_count = (
        SELECT COUNT(*) FROM reactions 
        WHERE target_type = 'comment' AND target_id = NEW.target_id
      )
      WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'comment' THEN
      UPDATE comments 
      SET reactions_count = (
        SELECT COUNT(*) FROM reactions 
        WHERE target_type = 'comment' AND target_id = OLD.target_id
      )
      WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_analytics_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.initialize_user_analytics()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_analytics (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_event_rsvps_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bulk_update_pricing_discount(p_country_name text, p_organization_type text, p_new_discount numeric)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE public.pricing_configurations 
  SET membership_discount_percentage = p_new_discount,
      updated_at = now()
  WHERE country_id = (SELECT id FROM master_countries WHERE name = p_country_name)
    AND organization_type_id = (SELECT id FROM master_organization_types WHERE name = p_organization_type);
    
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_populate_currency_from_country()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.country_id IS NOT NULL THEN
    SELECT id INTO NEW.currency_id
    FROM master_currencies
    WHERE country = (SELECT name FROM master_countries WHERE id = NEW.country_id)
    LIMIT 1;
  END IF;
  NEW.rate_type := 'currency';
  NEW.complexity_applicable := true;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pricing_configuration(p_country_name text, p_organization_type text, p_entity_type text, p_engagement_model text, p_membership_status text DEFAULT 'Not Active', p_billing_frequency text DEFAULT NULL)
 RETURNS TABLE(id uuid, config_name text, base_value numeric, calculated_value numeric, unit_symbol text, currency_code text, membership_discount numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pcd.id,
    pcd.config_name,
    pcd.base_value,
    pcd.calculated_value,
    pcd.unit_symbol,
    pcd.currency_code,
    pcd.membership_discount_percentage
  FROM public.pricing_configurations_detailed pcd
  WHERE pcd.country_name = p_country_name
    AND pcd.organization_type = p_organization_type
    AND pcd.entity_type = p_entity_type
    AND pcd.engagement_model = p_engagement_model
    AND pcd.membership_status = p_membership_status
    AND (p_billing_frequency IS NULL OR pcd.billing_frequency = p_billing_frequency)
    AND pcd.is_active = true
    AND (pcd.effective_from IS NULL OR pcd.effective_from <= CURRENT_DATE)
    AND (pcd.effective_to IS NULL OR pcd.effective_to >= CURRENT_DATE);
END;
$function$;

CREATE OR REPLACE FUNCTION public.safe_delete_fee_component(component_id uuid, cascade_delete boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    dependency_check JSONB;
    component_name TEXT;
BEGIN
    SELECT name INTO component_name FROM master_fee_components WHERE id = component_id;
    
    IF component_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fee component not found');
    END IF;
    
    dependency_check := check_fee_component_dependencies(component_id);
    
    IF NOT (dependency_check->>'can_delete')::boolean AND NOT cascade_delete THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Cannot delete fee component due to dependencies',
            'dependencies', dependency_check
        );
    END IF;
    
    IF cascade_delete THEN
        DELETE FROM engagement_model_fee_mapping WHERE fee_component_id = component_id;
    END IF;
    
    DELETE FROM master_fee_components WHERE id = component_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Fee component deleted successfully');
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_fee_component_deletion_with_dependencies()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    dependency_check JSONB;
BEGIN
    dependency_check := check_fee_component_dependencies(OLD.id);
    
    IF NOT (dependency_check->>'can_delete')::boolean THEN
        RAISE EXCEPTION 'Cannot delete fee component "%" because it has dependencies in: %', 
            OLD.name, dependency_check->'blocking_dependencies';
    END IF;
    
    RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_pricing_value()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.calculated_value := NEW.base_value * (1 - COALESCE(NEW.membership_discount_percentage, 0) / 100);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_currency_country_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.country IS NOT NULL AND NEW.country_code IS NULL) OR 
     (NEW.country IS NULL AND NEW.country_code IS NOT NULL) THEN
    RAISE EXCEPTION 'Country and country_code must both be provided or both be null';
  END IF;
  
  IF NEW.country IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM master_countries WHERE name = NEW.country) THEN
      RAISE EXCEPTION 'Country % does not exist in master_countries', NEW.country;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_organization_id()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    new_id TEXT;
    id_exists BOOLEAN;
BEGIN
    LOOP
        new_id := 'ORG-' || upper(substr(md5(random()::text), 1, 8));
        SELECT EXISTS(SELECT 1 FROM public.organizations WHERE organization_id = new_id) INTO id_exists;
        IF NOT id_exists THEN
            RETURN new_id;
        END IF;
    END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_fee_component_dependencies(component_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    dependency_count INTEGER;
    dependency_details JSONB;
BEGIN
    SELECT COUNT(*) INTO dependency_count
    FROM engagement_model_fee_mapping 
    WHERE fee_component_id = component_id;
    
    dependency_details := jsonb_build_object(
        'engagement_model_mappings', dependency_count,
        'can_delete', CASE WHEN dependency_count = 0 THEN true ELSE false END,
        'blocking_dependencies', CASE WHEN dependency_count > 0 THEN 
            jsonb_build_array('engagement_model_fee_mapping') 
            ELSE jsonb_build_array() END
    );
    
    RETURN dependency_details;
END;
$function$;
