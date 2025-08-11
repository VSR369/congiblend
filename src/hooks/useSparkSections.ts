import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SparkSection = {
  id: string;
  spark_id: string;
  anchor_id: string | null;
  title: string | null;
  content_html: string | null;
  creator_id: string;
  section_type: string;
  is_deleted: boolean;
  created_at: string;
  last_modified_by: string | null;
  last_modified_at: string;
};

export const useSparkSections = (sparkId: string | undefined) => {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["spark", sparkId, "sections"],
    enabled: Boolean(sparkId),
    queryFn: async () => {
      if (!sparkId) return [] as SparkSection[];
      const { data, error } = await (supabase as any)
        .from("spark_sections")
        .select("id,spark_id,anchor_id,title,content_html,creator_id,section_type,is_deleted,created_at,last_modified_by,last_modified_at")
        .eq("spark_id", sparkId)
        .eq("is_deleted", false);
      if (error) throw error;
      return (data || []) as SparkSection[];
    },
    staleTime: 1000 * 30,
  });

  const ensureSectionsForHeadings = async (
    headings: { id: string; text: string }[]
  ) => {
    if (!sparkId || headings.length === 0) return;
    const existing = new Set((data || []).map((s) => s.anchor_id || ""));
    const missing = headings.filter((h) => h.id && !existing.has(h.id));
    if (missing.length === 0) return;

    await Promise.all(
      missing.map((h) =>
        (supabase as any).rpc("mark_section_created", {
          p_spark_id: sparkId,
          p_anchor_id: h.id,
          p_title: h.text,
          p_content_html: null,
          p_section_type: "contribution",
        })
      )
    );
    qc.invalidateQueries({ queryKey: ["spark", sparkId, "sections"] });
  };

  const recordSectionEdit = async (params: {
    sectionId: string;
    contentHtml: string;
    contentPlain?: string;
    summary?: string;
    versionNumber?: number | null;
  }) => {
    if (!sparkId) return;
    await (supabase as any).rpc("record_section_edit", {
      p_section_id: params.sectionId,
      p_spark_id: sparkId,
      p_content_html: params.contentHtml,
      p_content_plain: params.contentPlain ?? null,
      p_summary: params.summary ?? null,
      p_edit_type: "modify",
      p_version_number: params.versionNumber ?? null,
    });
    qc.invalidateQueries({ queryKey: ["spark", sparkId, "sections"] });
  };

  const deleteSection = async (sectionId: string) => {
    await (supabase as any).rpc("delete_spark_section", { p_section_id: sectionId });
    qc.invalidateQueries({ queryKey: ["spark", sparkId, "sections"] });
  };

  return {
    sections: (data || []) as SparkSection[],
    isLoading,
    ensureSectionsForHeadings,
    recordSectionEdit,
    deleteSection,
  };
};
