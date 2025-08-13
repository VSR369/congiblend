-- 1) Harden SECURITY DEFINER functions with explicit search_path

-- handle_new_user_signup
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    username,
    display_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );

  -- Insert user role if provided
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Default role is 'user'
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- poll_create
CREATE OR REPLACE FUNCTION public.poll_create(p_post_id uuid, p_question text, p_end_time timestamptz, p_options text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_poll_id UUID;
  i INT;
BEGIN
  IF array_length(p_options,1) < 2 OR array_length(p_options,1) > 4 THEN
    RAISE EXCEPTION 'Poll must have 2 to 4 options';
  END IF;

  INSERT INTO polls (post_id, question, end_time, created_by)
  VALUES (p_post_id, p_question, p_end_time, auth.uid())
  RETURNING id INTO v_poll_id;

  FOR i IN 1..array_length(p_options,1) LOOP
    INSERT INTO poll_options (poll_id, idx, option_text)
    VALUES (v_poll_id, i-1, p_options[i]);
  END LOOP;

  RETURN v_poll_id;
END $function$;

-- poll_vote
CREATE OR REPLACE FUNCTION public.poll_vote(p_poll_id uuid, p_option_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO poll_votes (poll_id, option_id, voter_id)
  VALUES (p_poll_id, p_option_id, auth.uid())
  ON CONFLICT (poll_id, voter_id)
  DO UPDATE SET option_id = EXCLUDED.option_id, updated_at = now();
END $function$;

-- restrict_dm_updates
CREATE OR REPLACE FUNCTION public.restrict_dm_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only recipient can update and only read_at, metadata allowed; content/link/source immutable
  IF auth.uid() <> NEW.recipient_id THEN
    RAISE EXCEPTION 'Only recipient can update messages';
  END IF;
  IF NEW.sender_id <> OLD.sender_id OR NEW.recipient_id <> OLD.recipient_id OR NEW.content <> OLD.content OR COALESCE(NEW.link,'') <> COALESCE(OLD.link,'') OR COALESCE(NEW.source_comment_id,'00000000-0000-0000-0000-000000000000') <> COALESCE(OLD.source_comment_id,'00000000-0000-0000-0000-000000000000') THEN
    RAISE EXCEPTION 'Only read status may be updated';
  END IF;
  RETURN NEW;
END;
$function$;

-- recalc_spark_collaboration
CREATE OR REPLACE FUNCTION public.recalc_spark_collaboration(p_spark_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_collaborative boolean;
  v_contributor_count integer;
  v_total_edits integer;
  v_last_edited_by uuid;
  v_last_edited_at timestamptz;
  v_content_length integer;
BEGIN
  v_is_collaborative := public.has_external_contributions(p_spark_id);

  SELECT COUNT(*) INTO v_contributor_count FROM (
    SELECT ks.author_id AS uid
    FROM public.knowledge_sparks ks WHERE ks.id = p_spark_id
    UNION
    SELECT edited_by AS uid FROM public.spark_content_versions WHERE spark_id = p_spark_id AND edited_by IS NOT NULL
    UNION
    SELECT creator_id AS uid FROM public.spark_sections WHERE spark_id = p_spark_id AND is_deleted = false
  ) AS contributors;

  SELECT COUNT(*) INTO v_total_edits FROM public.spark_content_versions WHERE spark_id = p_spark_id;

  SELECT v.edited_by, COALESCE(v.created_at, now())
  INTO v_last_edited_by, v_last_edited_at
  FROM public.spark_content_versions v
  WHERE v.spark_id = p_spark_id
  ORDER BY v.version_number DESC NULLS LAST, v.created_at DESC NULLS LAST
  LIMIT 1;

  SELECT COALESCE(length(v.content_plain), 0) INTO v_content_length
  FROM public.spark_content_versions v
  WHERE v.spark_id = p_spark_id
  ORDER BY v.version_number DESC NULLS LAST, v.created_at DESC NULLS LAST
  LIMIT 1;

  UPDATE public.knowledge_sparks ks
  SET 
    status = CASE WHEN v_is_collaborative THEN 'collaborative' ELSE COALESCE(ks.status, 'published') END,
    contributor_count = COALESCE(v_contributor_count, ks.contributor_count),
    total_edits = COALESCE(v_total_edits, ks.total_edits),
    last_edited_by = COALESCE(v_last_edited_by, ks.last_edited_by),
    last_edited_at = COALESCE(v_last_edited_at, ks.last_edited_at),
    content_length = COALESCE(v_content_length, ks.content_length),
    updated_at = now()
  WHERE ks.id = p_spark_id;
END;
$function$;

-- trg_scv_after_insert
CREATE OR REPLACE FUNCTION public.trg_scv_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.recalc_spark_collaboration(NEW.spark_id);
  RETURN NEW;
END;
$function$;

-- poll_results
CREATE OR REPLACE FUNCTION public.poll_results(p_poll_id uuid)
 RETURNS TABLE(option_id uuid, option_text text, votes bigint, pct numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH totals AS (
  SELECT COUNT(*)::BIGINT AS total FROM poll_votes WHERE poll_id = p_poll_id
),
counts AS (
  SELECT o.id, o.option_text, COUNT(v.*)::BIGINT AS votes
  FROM poll_options o
  LEFT JOIN poll_votes v ON v.option_id = o.id
  WHERE o.poll_id = p_poll_id
  GROUP BY o.id, o.option_text, o.idx
  ORDER BY o.idx
)
SELECT
  c.id, c.option_text, c.votes,
  CASE WHEN t.total = 0 THEN 0 ELSE ROUND((c.votes::NUMERIC*100)/t.total, 1) END AS pct
FROM counts c, totals t
ORDER BY c.id;
$function$;

-- increment_profile_view
CREATE OR REPLACE FUNCTION public.increment_profile_view(p_profile_user_id uuid, p_viewer_user_id uuid DEFAULT NULL::uuid, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profile_views (profile_user_id, viewer_user_id, ip_address, user_agent)
  VALUES (p_profile_user_id, p_viewer_user_id, p_ip_address, p_user_agent);
  
  UPDATE public.users 
  SET profile_views_count = profile_views_count + 1
  WHERE id = p_profile_user_id;
END;
$function$;

-- update_user_activity
CREATE OR REPLACE FUNCTION public.update_user_activity(p_user_id uuid, p_activity_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  today_date DATE := CURRENT_DATE;
  yesterday_date DATE := CURRENT_DATE - INTERVAL '1 day';
  activity_exists BOOLEAN;
  current_activities JSONB;
  last_activity DATE;
  current_streak INTEGER;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.user_activity_log 
    WHERE user_id = p_user_id AND activity_date = today_date
  ) INTO activity_exists;
  
  IF activity_exists THEN
    SELECT activity_types INTO current_activities
    FROM public.user_activity_log 
    WHERE user_id = p_user_id AND activity_date = today_date;
    
    IF NOT (current_activities ? p_activity_type) THEN
      UPDATE public.user_activity_log 
      SET activity_types = activity_types || to_jsonb(p_activity_type)
      WHERE user_id = p_user_id AND activity_date = today_date;
    END IF;
  ELSE
    INSERT INTO public.user_activity_log (user_id, activity_date, activity_types)
    VALUES (p_user_id, today_date, to_jsonb(ARRAY[p_activity_type]));
  END IF;
  
  SELECT last_activity_date, current_streak_days 
  INTO last_activity, current_streak
  FROM public.profiles WHERE id = p_user_id;
  
  IF last_activity IS NULL OR last_activity < yesterday_date THEN
    current_streak := 1;
  ELSIF last_activity = yesterday_date THEN
    current_streak := COALESCE(current_streak, 0) + 1;
  ELSIF last_activity = today_date THEN
    current_streak := COALESCE(current_streak, 1);
  END IF;
  
  UPDATE public.profiles 
  SET 
    last_activity_date = today_date,
    current_streak_days = current_streak,
    longest_streak_days = GREATEST(COALESCE(longest_streak_days, 0), current_streak)
  WHERE id = p_user_id;
END;
$function$;

-- handle_comment_mention
CREATE OR REPLACE FUNCTION public.handle_comment_mention()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c_record RECORD;
  excerpt TEXT;
  deep_link TEXT;
BEGIN
  SELECT c.id, c.post_id, c.user_id, c.content
  INTO c_record
  FROM public.comments c
  WHERE c.id = NEW.comment_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF c_record.user_id = NEW.mentioned_user_id THEN
    INSERT INTO public.notifications(user_id, type, payload)
    VALUES (
      NEW.mentioned_user_id,
      'mention',
      jsonb_build_object(
        'comment_id', NEW.comment_id,
        'post_id', c_record.post_id,
        'by_user_id', c_record.user_id
      )
    );
    RETURN NEW;
  END IF;

  excerpt := CASE WHEN length(c_record.content) > 140 THEN substr(c_record.content, 1, 140) || '…' ELSE c_record.content END;
  deep_link := concat('/', '?post=', c_record.post_id::text, '&comment=', NEW.comment_id::text);

  INSERT INTO public.notifications(user_id, type, payload)
  VALUES (
    NEW.mentioned_user_id,
    'mention',
    jsonb_build_object(
      'comment_id', NEW.comment_id,
      'post_id', c_record.post_id,
      'by_user_id', c_record.user_id,
      'excerpt', excerpt,
      'link', deep_link
    )
  );

  INSERT INTO public.direct_messages(sender_id, recipient_id, content, link, source_comment_id, metadata)
  VALUES (
    c_record.user_id,
    NEW.mentioned_user_id,
    concat('You were mentioned in a comment: ', excerpt),
    deep_link,
    NEW.comment_id,
    jsonb_build_object('type','mention')
  );

  RETURN NEW;
END;
$function$;

-- mark_section_created
CREATE OR REPLACE FUNCTION public.mark_section_created(p_spark_id uuid, p_anchor_id text, p_title text, p_content_html text, p_section_type text DEFAULT 'original')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_author uuid;
BEGIN
  SELECT author_id INTO v_author FROM public.knowledge_sparks WHERE id = p_spark_id;

  INSERT INTO public.spark_sections (spark_id, anchor_id, title, content_html, creator_id, section_type)
  VALUES (p_spark_id, p_anchor_id, p_title, p_content_html, auth.uid(),
          CASE WHEN auth.uid() = v_author THEN 'original' ELSE COALESCE(p_section_type,'contribution') END)
  ON CONFLICT (spark_id, anchor_id)
  WHERE p_anchor_id IS NOT NULL
  DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO v_id;

  PERFORM public.recalc_spark_collaboration(p_spark_id);

  RETURN v_id;
END;
$function$;

-- record_section_edit
CREATE OR REPLACE FUNCTION public.record_section_edit(p_section_id uuid, p_spark_id uuid, p_content_html text, p_content_plain text, p_summary text, p_edit_type text DEFAULT 'modify', p_version_number integer DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.spark_section_edits (
    spark_id, section_id, editor_id, edit_type, summary, content_html, content_plain, version_number
  ) VALUES (
    p_spark_id, p_section_id, auth.uid(), COALESCE(p_edit_type,'modify'), p_summary, p_content_html, p_content_plain, p_version_number
  ) RETURNING id INTO v_id;

  UPDATE public.spark_sections
  SET last_modified_by = auth.uid(), last_modified_at = now()
  WHERE id = p_section_id;

  PERFORM public.recalc_spark_collaboration(p_spark_id);

  RETURN v_id;
END;
$function$;

-- delete_spark_section
CREATE OR REPLACE FUNCTION public.delete_spark_section(p_section_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_creator uuid;
  v_spark uuid;
BEGIN
  SELECT creator_id, spark_id INTO v_creator, v_spark FROM public.spark_sections WHERE id = p_section_id;
  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'Section not found';
  END IF;
  IF v_creator <> auth.uid() THEN
    RAISE EXCEPTION 'Only the section creator can delete this section';
  END IF;

  UPDATE public.spark_sections SET is_deleted = true, last_modified_by = auth.uid(), last_modified_at = now()
  WHERE id = p_section_id;

  PERFORM public.recalc_spark_collaboration(v_spark);
  RETURN true;
END;
$function$;

-- create_post_optimized
CREATE OR REPLACE FUNCTION public.create_post_optimized(p_user_id uuid, p_content text, p_post_type text DEFAULT 'text', p_visibility text DEFAULT 'public', p_media_urls text[] DEFAULT NULL, p_poll_data jsonb DEFAULT NULL, p_event_data jsonb DEFAULT NULL, p_metadata jsonb DEFAULT '{}')
 RETURNS TABLE(post_id uuid, created_at timestamptz, author_profile jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_post_id UUID;
  new_created_at TIMESTAMPTZ;
  author_data JSONB;
BEGIN
  INSERT INTO posts (
    user_id, content, post_type, visibility, media_urls, 
    poll_data, event_data, metadata, reactions_count, 
    comments_count, shares_count, created_at, updated_at
  ) VALUES (
    p_user_id, p_content, p_post_type, p_visibility, p_media_urls,
    p_poll_data, p_event_data, p_metadata, 0, 0, 0, NOW(), NOW()
  ) RETURNING id, posts.created_at INTO new_post_id, new_created_at;
  
  SELECT jsonb_build_object(
    'id', id,
    'username', username,
    'display_name', display_name,
    'avatar_url', avatar_url,
    'is_verified', is_verified
  ) INTO author_data
  FROM profiles 
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT new_post_id, new_created_at, author_data;
END;
$function$;

-- get_membership_workflow_status
CREATE OR REPLACE FUNCTION public.get_membership_workflow_status(user_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  activation_record RECORD;
BEGIN
  SELECT * INTO activation_record
  FROM engagement_activations
  WHERE user_id = user_id_param
  ORDER BY updated_at DESC
  LIMIT 1;
  
  IF activation_record IS NULL THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'current_step', 'membership_decision',
      'is_complete', false
    );
  END IF;
  
  result := jsonb_build_object(
    'has_workflow', true,
    'current_step', COALESCE(activation_record.workflow_step, 'membership_decision'),
    'is_complete', COALESCE(activation_record.workflow_completed, false),
    'membership_status', activation_record.membership_status,
    'payment_status', activation_record.payment_simulation_status,
    'pricing_tier', activation_record.pricing_tier,
    'engagement_model', activation_record.engagement_model,
    'last_updated', activation_record.updated_at
  );
  
  RETURN result;
END;
$function$;

-- get_comprehensive_organization_data
CREATE OR REPLACE FUNCTION public.get_comprehensive_organization_data(org_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    org_data jsonb;
    membership_fees jsonb;
    tier_config jsonb;
    engagement_details jsonb;
    pricing_config jsonb;
BEGIN
    SELECT to_jsonb(scv.*) INTO org_data
    FROM solution_seekers_comprehensive_view scv
    WHERE scv.organization_id = org_id;
    
    IF org_data IS NULL THEN
        RETURN jsonb_build_object('error', 'Organization not found');
    END IF;
    
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', smf.id,
            'country', smf.country,
            'organization_type', smf.organization_type,
            'entity_type', smf.entity_type,
            'monthly_amount', smf.monthly_amount,
            'monthly_currency', smf.monthly_currency,
            'quarterly_amount', smf.quarterly_amount,
            'quarterly_currency', smf.quarterly_currency,
            'half_yearly_amount', smf.half_yearly_amount,
            'half_yearly_currency', smf.half_yearly_currency,
            'annual_amount', smf.annual_amount,
            'annual_currency', smf.annual_currency,
            'description', smf.description
        )
    ) INTO membership_fees
    FROM master_seeker_membership_fees smf
    WHERE smf.country = (org_data->>'country')
        AND smf.organization_type = (org_data->>'organization_type')
        AND smf.entity_type = (org_data->>'entity_type');
    
    IF org_data->>'pricing_tier' IS NOT NULL THEN
        SELECT jsonb_build_object(
            'tier_info', jsonb_build_object(
                'name', pt.name,
                'description', pt.description,
                'level_order', pt.level_order
            ),
            'configurations', jsonb_agg(
                jsonb_build_object(
                    'country', c.name,
                    'currency', curr.code,
                    'monthly_challenge_limit', tc.monthly_challenge_limit,
                    'solutions_per_challenge', tc.solutions_per_challenge,
                    'allows_overage', tc.allows_overage,
                    'fixed_charge_per_challenge', tc.fixed_charge_per_challenge,
                    'support_type', st.name,
                    'support_level', st.service_level,
                    'support_availability', st.availability,
                    'support_response_time', st.response_time,
                    'analytics_access', at.name,
                    'analytics_features', at.features_included,
                    'analytics_dashboard_access', at.dashboard_access,
                    'onboarding_type', ot.name,
                    'onboarding_service_type', ot.service_type,
                    'onboarding_resources', ot.resources_included,
                    'workflow_template', wt.name,
                    'workflow_customization_level', wt.customization_level,
                    'workflow_template_count', wt.template_count
                )
            )
        ) INTO tier_config
        FROM master_pricing_tiers pt
        LEFT JOIN master_tier_configurations tc ON tc.pricing_tier_id = pt.id
        LEFT JOIN master_countries c ON c.id = tc.country_id
        LEFT JOIN master_currencies curr ON curr.id = tc.currency_id
        LEFT JOIN master_support_types st ON st.id = tc.support_type_id
        LEFT JOIN master_analytics_access_types at ON at.id = tc.analytics_access_id
        LEFT JOIN master_onboarding_types ot ON ot.id = tc.onboarding_type_id
        LEFT JOIN master_workflow_templates wt ON wt.id = tc.workflow_template_id
        WHERE pt.name = (org_data->>'pricing_tier')
        GROUP BY pt.id, pt.name, pt.description, pt.level_order;
    END IF;
    
    SELECT jsonb_build_object(
        'model_info', jsonb_build_object(
            'name', em.name,
            'description', em.description
        ),
        'complexity_levels', jsonb_agg(
            DISTINCT jsonb_build_object(
                'name', cc.name,
                'description', cc.description,
                'level_order', cc.level_order,
                'consulting_fee_multiplier', cc.consulting_fee_multiplier,
                'management_fee_multiplier', cc.management_fee_multiplier
            )
        ),
        'platform_fee_formulas', jsonb_agg(
            DISTINCT jsonb_build_object(
                'formula_name', pff.formula_name,
                'description', pff.description,
                'formula_expression', pff.formula_expression,
                'base_consulting_fee', pff.base_consulting_fee,
                'base_management_fee', pff.base_management_fee,
                'platform_usage_fee_percentage', pff.platform_usage_fee_percentage,
                'advance_payment_percentage', pff.advance_payment_percentage,
                'membership_discount_percentage', pff.membership_discount_percentage,
                'country', c.name,
                'currency', curr.code
            )
        ),
        'subtypes', jsonb_agg(
            DISTINCT jsonb_build_object(
                'name', ems.name,
                'description', ems.description,
                'required_fields', ems.required_fields,
                'optional_fields', ems.optional_fields
            )
        )
    ) INTO engagement_details
    FROM master_engagement_models em
    LEFT JOIN master_challenge_complexity cc ON true
    LEFT JOIN master_platform_fee_formulas pff ON pff.engagement_model_id = em.id
    LEFT JOIN master_countries c ON c.id = pff.country_id
    LEFT JOIN master_currencies curr ON curr.id = pff.currency_id
    LEFT JOIN master_engagement_model_subtypes ems ON ems.engagement_model_id = em.id
    WHERE em.name = (org_data->>'engagement_model')
    GROUP BY em.id, em.name, em.description;
    
    SELECT jsonb_agg(
        jsonb_build_object(
            'config_name', pc.config_name,
            'base_value', pc.base_value,
            'calculated_value', pc.calculated_value,
            'unit_symbol', pc.unit_symbol,
            'currency_code', pc.currency_code,
            'membership_discount', pc.membership_discount_percentage,
            'billing_frequency', pc.billing_frequency,
            'effective_from', pc.effective_from,
            'effective_to', pc.effective_to
        )
    ) INTO pricing_config
    FROM pricing_configurations_detailed pc
    WHERE pc.country_name = (org_data->>'country')
        AND pc.organization_type = (org_data->>'organization_type')
        AND pc.entity_type = (org_data->>'entity_type')
        AND (org_data->>'engagement_model' IS NULL OR pc.engagement_model = (org_data->>'engagement_model'))
        AND pc.is_active = true;
    
    result := jsonb_build_object(
        'organization', org_data,
        'membership_fees', COALESCE(membership_fees, '[]'::jsonb),
        'tier_configuration', COALESCE(tier_config, '{}'::jsonb),
        'engagement_model_details', COALESCE(engagement_details, '{}'::jsonb),
        'pricing_configurations', COALESCE(pricing_config, '[]'::jsonb)
    );
    
    RETURN result;
END;
$function$;

-- update_posts_likes_count
CREATE OR REPLACE FUNCTION public.update_posts_likes_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
      SET likes_count = COALESCE(likes_count, 0) + 1
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
      SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- is_org_admin
CREATE OR REPLACE FUNCTION public.is_org_admin(check_user_id uuid DEFAULT auth.uid())
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT organization_id
  FROM public.org_admins
  WHERE user_id = check_user_id
  LIMIT 1;
$function$;

-- get_table_schema
CREATE OR REPLACE FUNCTION public.get_table_schema(table_name text)
 RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text, ordinal_position integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    c.is_nullable::TEXT,
    c.column_default::TEXT,
    c.ordinal_position::INTEGER
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
    AND c.table_name = get_table_schema.table_name
  ORDER BY c.ordinal_position;
END;
$function$;

-- get_user_current_global_model
CREATE OR REPLACE FUNCTION public.get_user_current_global_model(user_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_model TEXT;
  model_info JSONB;
BEGIN
  SELECT engagement_model INTO current_model
  FROM engagement_activations
  WHERE user_id = user_id_param
    AND activation_status = 'Activated'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF current_model IS NULL THEN
    RETURN jsonb_build_object(
      'has_global_model', false,
      'current_model', null
    );
  END IF;
  
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'description', description
  ) INTO model_info
  FROM master_engagement_models
  WHERE name = current_model;
  
  RETURN jsonb_build_object(
    'has_global_model', true,
    'current_model', current_model,
    'model_info', model_info
  );
END;
$function$;

-- create_profile_from_organization
CREATE OR REPLACE FUNCTION public.create_profile_from_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      custom_user_id,
      organization_name,
      organization_id,
      contact_person_name,
      organization_type,
      entity_type,
      country,
      country_code,
      industry_segment,
      address,
      phone_number,
      website
    )
    SELECT 
      NEW.user_id,
      NEW.organization_id,
      NEW.organization_name,
      NEW.organization_id,
      NEW.contact_person_name,
      ot.name as organization_type,
      et.name as entity_type,
      c.name as country,
      NEW.country_code,
      i.name as industry_segment,
      NEW.address,
      NEW.phone_number,
      NEW.website
    FROM organizations o
    LEFT JOIN master_organization_types ot ON ot.id = NEW.organization_type_id
    LEFT JOIN master_entity_types et ON et.id = NEW.entity_type_id
    LEFT JOIN master_countries c ON c.id = NEW.country_id
    LEFT JOIN master_industry_segments i ON i.id = NEW.industry_segment_id
    WHERE o.id = NEW.id
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- check_active_challenges_for_user
CREATE OR REPLACE FUNCTION public.check_active_challenges_for_user(user_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM engagement_activations
  WHERE user_id = user_id_param
    AND activation_status = 'Activated'
    AND (engagement_locked IS NULL OR engagement_locked = false);
  
  RETURN COALESCE(active_count, 0);
END;
$function$;

-- validate_engagement_model_switch
CREATE OR REPLACE FUNCTION public.validate_engagement_model_switch(user_id_param uuid, tier_id_param uuid, new_model_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tier_rules RECORD;
  active_challenges INTEGER;
  result JSONB;
BEGIN
  SELECT selection_scope, max_concurrent_models, switch_requirements, allows_multiple_challenges
  INTO tier_rules
  FROM master_tier_engagement_model_access tema
  WHERE tema.pricing_tier_id = tier_id_param
    AND tema.engagement_model_id = new_model_id
    AND tema.is_active = true
    AND tema.is_allowed = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Engagement model not allowed for this tier',
      'error_code', 'MODEL_NOT_ALLOWED'
    );
  END IF;
  
  active_challenges := public.check_active_challenges_for_user(user_id_param);
  
  IF tier_rules.selection_scope = 'global' AND tier_rules.switch_requirements = 'no_active_challenges' THEN
    IF active_challenges > 0 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Cannot switch engagement model while challenges are active. Please complete or pause all active challenges first.',
        'error_code', 'ACTIVE_CHALLENGES_EXIST',
        'active_challenges_count', active_challenges
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'tier_rules', row_to_json(tier_rules),
    'active_challenges_count', active_challenges
  );
END;
$function$;

-- 2) Replace overly permissive RLS policies

-- Organizations: ensure row ownership
DROP POLICY IF EXISTS "Allow all operations on organizations" ON public.organizations;
CREATE POLICY org_select_public ON public.organizations
FOR SELECT USING (true);
CREATE POLICY org_insert_own ON public.organizations
FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY org_update_own ON public.organizations
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY org_delete_own ON public.organizations
FOR DELETE USING (auth.uid() = user_id);

-- Engagement activations: ensure row ownership
DROP POLICY IF EXISTS "Allow all authenticated operations on engagement_activations" ON public.engagement_activations;
CREATE POLICY ea_select_own ON public.engagement_activations
FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ea_insert_own ON public.engagement_activations
FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ea_update_own ON public.engagement_activations
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY ea_delete_own ON public.engagement_activations
FOR DELETE USING (auth.uid() = user_id);

-- Helper to batch master-like tables
-- master_organization_types
DROP POLICY IF EXISTS "Allow all operations on master_organization_types" ON public.master_organization_types;
CREATE POLICY mot_select_public ON public.master_organization_types FOR SELECT USING (true);
CREATE POLICY mot_insert_auth ON public.master_organization_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mot_update_auth ON public.master_organization_types FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mot_delete_auth ON public.master_organization_types FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_analytics_access_types
DROP POLICY IF EXISTS "Allow all operations on master_analytics_access_types" ON public.master_analytics_access_types;
CREATE POLICY maat_select_public ON public.master_analytics_access_types FOR SELECT USING (true);
CREATE POLICY maat_insert_auth ON public.master_analytics_access_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY maat_update_auth ON public.master_analytics_access_types FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY maat_delete_auth ON public.master_analytics_access_types FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_team_units
DROP POLICY IF EXISTS "Allow all operations on master_team_units" ON public.master_team_units;
CREATE POLICY mtu_select_public ON public.master_team_units FOR SELECT USING (true);
CREATE POLICY mtu_insert_auth ON public.master_team_units FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mtu_update_auth ON public.master_team_units FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mtu_delete_auth ON public.master_team_units FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_sub_departments
DROP POLICY IF EXISTS "Allow all operations on master_sub_departments" ON public.master_sub_departments;
CREATE POLICY msd_select_public ON public.master_sub_departments FOR SELECT USING (true);
CREATE POLICY msd_insert_auth ON public.master_sub_departments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY msd_update_auth ON public.master_sub_departments FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY msd_delete_auth ON public.master_sub_departments FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_support_types
DROP POLICY IF EXISTS "Allow all operations on master_support_types" ON public.master_support_types;
CREATE POLICY mst_select_public ON public.master_support_types FOR SELECT USING (true);
CREATE POLICY mst_insert_auth ON public.master_support_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mst_update_auth ON public.master_support_types FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mst_delete_auth ON public.master_support_types FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_categories
DROP POLICY IF EXISTS "Allow all operations on master_categories" ON public.master_categories;
CREATE POLICY mc_select_public ON public.master_categories FOR SELECT USING (true);
CREATE POLICY mc_insert_auth ON public.master_categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mc_update_auth ON public.master_categories FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mc_delete_auth ON public.master_categories FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_industry_segments
DROP POLICY IF EXISTS "Allow all operations on master_industry_segments" ON public.master_industry_segments;
CREATE POLICY mis_select_public ON public.master_industry_segments FOR SELECT USING (true);
CREATE POLICY mis_insert_auth ON public.master_industry_segments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mis_update_auth ON public.master_industry_segments FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mis_delete_auth ON public.master_industry_segments FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_currencies
DROP POLICY IF EXISTS "Allow all operations on master_currencies" ON public.master_currencies;
CREATE POLICY mcur_select_public ON public.master_currencies FOR SELECT USING (true);
CREATE POLICY mcur_insert_auth ON public.master_currencies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mcur_update_auth ON public.master_currencies FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mcur_delete_auth ON public.master_currencies FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_system_feature_access
DROP POLICY IF EXISTS "Allow all operations on master_system_feature_access" ON public.master_system_feature_access;
CREATE POLICY msfa_select_public ON public.master_system_feature_access FOR SELECT USING (true);
CREATE POLICY msfa_insert_auth ON public.master_system_feature_access FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY msfa_update_auth ON public.master_system_feature_access FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY msfa_delete_auth ON public.master_system_feature_access FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_competency_capabilities
DROP POLICY IF EXISTS "Allow all operations on master_competency_capabilities" ON public.master_competency_capabilities;
CREATE POLICY mcc_select_public ON public.master_competency_capabilities FOR SELECT USING (true);
CREATE POLICY mcc_insert_auth ON public.master_competency_capabilities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mcc_update_auth ON public.master_competency_capabilities FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY mcc_delete_auth ON public.master_competency_capabilities FOR DELETE USING (auth.uid() IS NOT NULL);

-- engagement_model_fee_mapping
DROP POLICY IF EXISTS "Allow all operations on engagement_model_fee_mapping" ON public.engagement_model_fee_mapping;
CREATE POLICY emf_select_public ON public.engagement_model_fee_mapping FOR SELECT USING (true);
CREATE POLICY emf_insert_auth ON public.engagement_model_fee_mapping FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY emf_update_auth ON public.engagement_model_fee_mapping FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY emf_delete_auth ON public.engagement_model_fee_mapping FOR DELETE USING (auth.uid() IS NOT NULL);
