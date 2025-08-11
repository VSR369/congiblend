-- Phase 1: Core Wiki Functionality - DB changes (additive, non-breaking)
-- 1) Enum for spark status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'spark_status') THEN
    CREATE TYPE public.spark_status AS ENUM ('draft','published','collaborative');
  END IF;
END$$;

-- 2) Add status column to knowledge_sparks (defaults to published)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='knowledge_sparks' AND column_name='status'
  ) THEN
    ALTER TABLE public.knowledge_sparks
      ADD COLUMN status public.spark_status NOT NULL DEFAULT 'published';
  END IF;
END$$;

-- 3) Sections table (metadata for section-level ownership)
CREATE TABLE IF NOT EXISTS public.spark_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spark_id UUID NOT NULL REFERENCES public.knowledge_sparks(id) ON DELETE CASCADE,
  anchor_id TEXT,
  title TEXT,
  content_html TEXT,
  creator_id UUID NOT NULL,
  section_type TEXT NOT NULL DEFAULT 'original', -- 'original' | 'contribution'
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_by UUID,
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Avoid duplicate sections per anchor within a spark (ignore deleted)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_section_per_anchor
  ON public.spark_sections (spark_id, anchor_id)
  WHERE anchor_id IS NOT NULL AND is_deleted = false;

-- RLS for spark_sections
ALTER TABLE public.spark_sections ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  -- Select for everyone
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='spark_sections' AND policyname='ss_select'
  ) THEN
    CREATE POLICY ss_select ON public.spark_sections
    FOR SELECT USING (true);
  END IF;

  -- Insert only by creator
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='spark_sections' AND policyname='ss_insert_own'
  ) THEN
    CREATE POLICY ss_insert_own ON public.spark_sections
    FOR INSERT WITH CHECK (auth.uid() = creator_id);
  END IF;

  -- Update only by creator (for is_deleted or adjustments)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='spark_sections' AND policyname='ss_update_own'
  ) THEN
    CREATE POLICY ss_update_own ON public.spark_sections
    FOR UPDATE USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);
  END IF;
END$$;

-- 4) Section edits table (history of per-section edits)
CREATE TABLE IF NOT EXISTS public.spark_section_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spark_id UUID NOT NULL REFERENCES public.knowledge_sparks(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.spark_sections(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL,
  edit_type TEXT NOT NULL DEFAULT 'modify', -- 'append' | 'modify' | 'replace'
  summary TEXT,
  content_html TEXT,
  content_plain TEXT,
  version_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spark_section_edits ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  -- Everyone can read edit history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='spark_section_edits' AND policyname='sse_select'
  ) THEN
    CREATE POLICY sse_select ON public.spark_section_edits
    FOR SELECT USING (true);
  END IF;

  -- Only the editor can insert their own edits
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='spark_section_edits' AND policyname='sse_insert_own'
  ) THEN
    CREATE POLICY sse_insert_own ON public.spark_section_edits
    FOR INSERT WITH CHECK (auth.uid() = editor_id);
  END IF;
END$$;

-- 5) Collaboration recalculation helper
CREATE OR REPLACE FUNCTION public.recalc_spark_collaboration(p_spark_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_collaborative boolean;
  v_contributor_count integer;
  v_total_edits integer;
  v_last_edited_by uuid;
  v_last_edited_at timestamptz;
  v_content_length integer;
BEGIN
  -- Detect collaboration using existing helper over versions
  v_is_collaborative := public.has_external_contributions(p_spark_id);

  -- Compute contributors: author + distinct editors + section creators
  SELECT COUNT(*) INTO v_contributor_count FROM (
    SELECT ks.author_id AS uid
    FROM public.knowledge_sparks ks WHERE ks.id = p_spark_id
    UNION
    SELECT edited_by AS uid FROM public.spark_content_versions WHERE spark_id = p_spark_id AND edited_by IS NOT NULL
    UNION
    SELECT creator_id AS uid FROM public.spark_sections WHERE spark_id = p_spark_id AND is_deleted = false
  ) AS contributors;

  -- Total edits from content versions
  SELECT COUNT(*) INTO v_total_edits FROM public.spark_content_versions WHERE spark_id = p_spark_id;

  -- Last edited metadata from latest version
  SELECT v.edited_by, COALESCE(v.created_at, now())
  INTO v_last_edited_by, v_last_edited_at
  FROM public.spark_content_versions v
  WHERE v.spark_id = p_spark_id
  ORDER BY v.version_number DESC NULLS LAST, v.created_at DESC NULLS LAST
  LIMIT 1;

  -- Content length from latest version
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
$$;

-- 6) Trigger after insert on spark_content_versions to recalc spark stats
CREATE OR REPLACE FUNCTION public.trg_scv_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.recalc_spark_collaboration(NEW.spark_id);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_after_insert_scv_recalc'
  ) THEN
    CREATE TRIGGER trg_after_insert_scv_recalc
    AFTER INSERT ON public.spark_content_versions
    FOR EACH ROW EXECUTE FUNCTION public.trg_scv_after_insert();
  END IF;
END$$;

-- 7) RPCs for section lifecycle
-- Create or get a section for an anchor
CREATE OR REPLACE FUNCTION public.mark_section_created(
  p_spark_id uuid,
  p_anchor_id text,
  p_title text,
  p_content_html text,
  p_section_type text DEFAULT 'original'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- Recalc collaboration/contributors
  PERFORM public.recalc_spark_collaboration(p_spark_id);

  RETURN v_id;
END;
$$;

-- Record an edit to a section
CREATE OR REPLACE FUNCTION public.record_section_edit(
  p_section_id uuid,
  p_spark_id uuid,
  p_content_html text,
  p_content_plain text,
  p_summary text,
  p_edit_type text DEFAULT 'modify',
  p_version_number integer DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Delete (soft) a section if caller is the creator
CREATE OR REPLACE FUNCTION public.delete_spark_section(p_section_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;