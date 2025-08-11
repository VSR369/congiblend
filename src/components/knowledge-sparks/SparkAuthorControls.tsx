import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useIsSparkAuthor } from "@/hooks/useIsSparkAuthor";

interface SparkAuthorControlsProps {
  sparkId: string;
}

export const SparkAuthorControls: React.FC<SparkAuthorControlsProps> = ({ sparkId }) => {
  const { isAuthor } = useIsSparkAuthor(sparkId);
  const qc = useQueryClient();

  const { data: meta } = useQuery({
    queryKey: ["spark", sparkId, "author-meta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_sparks")
        .select("is_featured,is_archived,archived_at")
        .eq("id", sparkId)
        .maybeSingle();
      if (error) throw error;
      return data as { is_featured: boolean; is_archived: boolean; archived_at: string | null } | null;
    },
    enabled: !!sparkId && !!isAuthor,
    staleTime: 30_000,
  });

  if (!isAuthor) return null;

  const toggleFeatured = async () => {
    try {
      const next = !meta?.is_featured;
      const { error } = await supabase
        .from("knowledge_sparks")
        .update({ is_featured: next })
        .eq("id", sparkId);
      if (error) throw error;
      toast.success(next ? "Spark featured" : "Spark unfeatured");
      qc.invalidateQueries({ queryKey: ["knowledge-sparks"] });
      qc.invalidateQueries({ queryKey: ["spark", sparkId, "author-meta"] });
    } catch (e) {
      toast.error("Failed to update featured status");
    }
  };

  const toggleArchived = async () => {
    try {
      const next = !meta?.is_archived;
      const { error } = await supabase
        .from("knowledge_sparks")
        .update({ is_archived: next, archived_at: next ? new Date().toISOString() : null })
        .eq("id", sparkId);
      if (error) throw error;
      toast.success(next ? "Spark archived" : "Spark unarchived");
      qc.invalidateQueries({ queryKey: ["knowledge-sparks"] });
      qc.invalidateQueries({ queryKey: ["spark", sparkId, "author-meta"] });
    } catch (e) {
      toast.error("Failed to update archive status");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {meta?.is_featured ? (
        <Badge variant="secondary" aria-label="Featured spark">Featured</Badge>
      ) : null}
      {meta?.is_archived ? (
        <Badge variant="outline" aria-label="Archived spark">Archived</Badge>
      ) : null}
      <Button size="sm" variant="outline" onClick={toggleFeatured} aria-label="Toggle featured">
        {meta?.is_featured ? "Unfeature" : "Feature"}
      </Button>
      <Button size="sm" variant="outline" onClick={toggleArchived} aria-label="Toggle archive">
        {meta?.is_archived ? "Unarchive" : "Archive"}
      </Button>
    </div>
  );
};

export default SparkAuthorControls;
