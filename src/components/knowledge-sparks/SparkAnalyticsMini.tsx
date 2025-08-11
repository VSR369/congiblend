import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Heart, Users, Edit3, Clock } from "lucide-react";

interface SparkAnalyticsMiniProps {
  sparkId: string;
}

export const SparkAnalyticsMini: React.FC<SparkAnalyticsMiniProps> = ({ sparkId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["spark", sparkId, "analytics-mini"],
    enabled: Boolean(sparkId),
    queryFn: async () => {
      const [ks, views] = await Promise.all([
        supabase
          .from("knowledge_sparks")
          .select(
            "contributor_count, total_edits, content_length, reactions_count, last_edited_at, created_at"
          )
          .eq("id", sparkId)
          .maybeSingle(),
        supabase
          .from("spark_analytics")
          .select("*", { count: "exact", head: true })
          .eq("spark_id", sparkId)
          .eq("action_type", "view"),
      ]);
      if (ks.error) throw ks.error;
      return {
        view_count: views.count || 0,
        contributor_count: (ks.data as any)?.contributor_count ?? 1,
        total_edits: (ks.data as any)?.total_edits ?? 0,
        content_length: (ks.data as any)?.content_length ?? 0,
        reactions_count: (ks.data as any)?.reactions_count ?? 0,
        last_edited_at: (ks.data as any)?.last_edited_at ?? null,
        created_at: (ks.data as any)?.created_at ?? new Date().toISOString(),
      } as {
        view_count: number;
        contributor_count: number;
        total_edits: number;
        content_length: number;
        reactions_count: number;
        last_edited_at: string | null;
        created_at: string;
      };
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="mt-4 space-y-2" aria-label="Spark stats loading">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
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
  const lastEdited = stats.last_edited_at ? new Date(stats.last_edited_at) : null;

  return (
    <section aria-label="Spark stats" className="mt-4">
      <div className="text-sm font-medium mb-2">Spark stats</div>
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Views</span>
            <span className="ml-auto font-medium">{stats.view_count?.toLocaleString?.() ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Reactions</span>
            <span className="ml-auto font-medium">{stats.reactions_count ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Contributors</span>
            <span className="ml-auto font-medium">{stats.contributor_count ?? 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Edits</span>
            <span className="ml-auto font-medium">{stats.total_edits ?? 0}</span>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Read time</span>
            <span className="ml-auto font-medium">{readMins} min</span>
          </div>
        </div>
        {lastEdited && (
          <div className="mt-2 text-[11px] text-muted-foreground">
            Last edited {lastEdited.toLocaleDateString()} {lastEdited.toLocaleTimeString()}
          </div>
        )}
      </Card>
    </section>
  );
};

export default SparkAnalyticsMini;
