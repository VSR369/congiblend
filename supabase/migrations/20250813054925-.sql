-- Harden functions with explicit search_path and keep same logic

-- update_reaction_counts
CREATE OR REPLACE FUNCTION public.update_reaction_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Update reactions_count on posts
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.target_type = 'post' THEN
            UPDATE posts 
            SET reactions_count = (
                SELECT COUNT(*) FROM reactions 
                WHERE target_type = 'post' AND target_id = NEW.target_id
            )
            WHERE id = NEW.target_id;
        ELSIF NEW.target_type = 'comment' THEN
            UPDATE comments 
            SET reactions_count = (
                SELECT COUNT(*) FROM reactions 
                WHERE target_type = 'comment' AND target_id = NEW.target_id
            )
            WHERE id = NEW.target_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.target_type = 'post' THEN
            UPDATE posts 
            SET reactions_count = (
                SELECT COUNT(*) FROM reactions 
                WHERE target_type = 'post' AND target_id = OLD.target_id
            )
            WHERE id = OLD.target_id;
        ELSIF OLD.target_type = 'comment' THEN
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

-- update_comment_counts
CREATE OR REPLACE FUNCTION public.update_comment_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update comments_count on posts
        UPDATE posts 
        SET comments_count = (
            SELECT COUNT(*) FROM comments 
            WHERE post_id = NEW.post_id
        )
        WHERE id = NEW.post_id;
        
        -- Update replies_count on parent comments
        IF NEW.parent_id IS NOT NULL THEN
            UPDATE comments 
            SET replies_count = (
                SELECT COUNT(*) FROM comments 
                WHERE parent_id = NEW.parent_id
            )
            WHERE id = NEW.parent_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update comments_count on posts
        UPDATE posts 
        SET comments_count = (
            SELECT COUNT(*) FROM comments 
            WHERE post_id = OLD.post_id
        )
        WHERE id = OLD.post_id;
        
        -- Update replies_count on parent comments
        IF OLD.parent_id IS NOT NULL THEN
            UPDATE comments 
            SET replies_count = (
                SELECT COUNT(*) FROM comments 
                WHERE parent_id = OLD.parent_id
            )
            WHERE id = OLD.parent_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- update_profiles_updated_at
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Tighten overly-permissive RLS policies while keeping public reads where intended
-- master_countries
ALTER TABLE public.master_countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on master_countries" ON public.master_countries;
CREATE POLICY "mcur_select_public" ON public.master_countries
FOR SELECT USING (true);
CREATE POLICY "mcur_insert_auth" ON public.master_countries
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "mcur_update_auth" ON public.master_countries
FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "mcur_delete_auth" ON public.master_countries
FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_entity_types
ALTER TABLE public.master_entity_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on master_entity_types" ON public.master_entity_types;
CREATE POLICY "met_select_public" ON public.master_entity_types
FOR SELECT USING (true);
CREATE POLICY "met_insert_auth" ON public.master_entity_types
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "met_update_auth" ON public.master_entity_types
FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "met_delete_auth" ON public.master_entity_types
FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_organization_categories
ALTER TABLE public.master_organization_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on master_organization_categories" ON public.master_organization_categories;
CREATE POLICY "moc_select_public" ON public.master_organization_categories
FOR SELECT USING (true);
CREATE POLICY "moc_insert_auth" ON public.master_organization_categories
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "moc_update_auth" ON public.master_organization_categories
FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "moc_delete_auth" ON public.master_organization_categories
FOR DELETE USING (auth.uid() IS NOT NULL);

-- master_challenge_overage_fees
ALTER TABLE public.master_challenge_overage_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on master_challenge_overage_fees" ON public.master_challenge_overage_fees;
CREATE POLICY "mcof_select_public" ON public.master_challenge_overage_fees
FOR SELECT USING (true);
CREATE POLICY "mcof_insert_auth" ON public.master_challenge_overage_fees
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "mcof_update_auth" ON public.master_challenge_overage_fees
FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "mcof_delete_auth" ON public.master_challenge_overage_fees
FOR DELETE USING (auth.uid() IS NOT NULL);

-- tier_engagement_model_restrictions
ALTER TABLE public.tier_engagement_model_restrictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on tier_engagement_model_restrictions" ON public.tier_engagement_model_restrictions;
CREATE POLICY "temr_select_public" ON public.tier_engagement_model_restrictions
FOR SELECT USING (true);
CREATE POLICY "temr_insert_auth" ON public.tier_engagement_model_restrictions
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "temr_update_auth" ON public.tier_engagement_model_restrictions
FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "temr_delete_auth" ON public.tier_engagement_model_restrictions
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Safe, conditional indexes to improve trigger-backed queries
DO $$ BEGIN
  IF to_regclass('public.reactions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_reactions_target ON public.reactions (target_type, target_id);
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
    CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments (parent_id);
  END IF;
END $$;