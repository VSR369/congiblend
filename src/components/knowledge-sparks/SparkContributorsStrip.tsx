import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface SparkContributorsStripProps {
  sparkId: string;
  max?: number;
}

export const SparkContributorsStrip: React.FC<SparkContributorsStripProps> = ({ sparkId, max = 6 }) => {
  const { data } = useQuery({
    queryKey: ["spark", sparkId, "contributors-strip"],
    enabled: Boolean(sparkId),
    queryFn: async () => {
      const [versions, sections, spark] = await Promise.all([
        supabase.from("spark_content_versions").select("edited_by").eq("spark_id", sparkId),
        supabase.from("spark_sections").select("creator_id").eq("spark_id", sparkId).eq("is_deleted", false),
        supabase.from("knowledge_sparks").select("author_id").eq("id", sparkId).maybeSingle(),
      ]);

      const ids = new Set<string>();
      if (!versions.error) (versions.data || []).forEach((v: any) => v.edited_by && ids.add(v.edited_by));
      if (!sections.error) (sections.data || []).forEach((s: any) => s.creator_id && ids.add(s.creator_id));
      if (!spark.error && (spark.data as any)?.author_id) ids.add((spark.data as any).author_id);
      const userIds = Array.from(ids).slice(0, max);
      if (userIds.length === 0) return [] as any[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,display_name,username,avatar_url")
        .in("id", userIds);
      return (profiles || []) as { id: string; display_name?: string | null; username?: string | null; avatar_url?: string | null; }[];
    },
    staleTime: 60_000,
  });

  const contributors = data || [];
  if (contributors.length === 0) return null;

  return (
    <div className="flex items-center gap-2" aria-label="Contributors">
      {contributors.map((p) => {
        const name = p.display_name || p.username || p.id.slice(0, 6);
        const initials = (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
        return (
          <Avatar key={p.id} className="h-6 w-6">
            <AvatarImage src={p.avatar_url || undefined} alt={`${name} – contributor`} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
        );
      })}
    </div>
  );
};

export default SparkContributorsStrip;
