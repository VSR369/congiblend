import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Heart, Users, Edit3, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SparkStatsRowProps {
  sparkId: string;
}

export const SparkStatsRow: React.FC<SparkStatsRowProps> = ({ sparkId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["spark", sparkId, "analytics-mini"],
    enabled: Boolean(sparkId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_sparks")
        .select(
          "view_count, contributor_count, total_edits, content_length, reactions_count, last_edited_at, created_at"
        )
        .eq("id", sparkId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        view_count: number;
        contributor_count: number;
        total_edits: number;
        content_length: number;
        reactions_count: number;
        last_edited_at: string | null;
        created_at: string;
      } | null;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="w-full rounded-md border border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    );
  }

  const stats = data || {
    view_count: 0,
    contributor_count: 1,
    total_edits: 0,
    content_length: 0,
    reactions_count: 0,
    last_edited_at: null as string | null,
    created_at: new Date().toISOString(),
  };

  const words = Math.max(0, Math.round((stats.content_length || 0) / 5));
  const readMins = Math.max(1, Math.round(words / 200));

  return (
    <section aria-label="Spark quick stats" className="w-full">
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">{stats.view_count?.toLocaleString?.() ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">{stats.reactions_count ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">{stats.contributor_count ?? 1}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">{stats.total_edits ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-medium">{readMins}m</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SparkStatsRow;
