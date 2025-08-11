import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface SparkContributorsProps {
  sparkId: string;
}

interface Profile {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

export const SparkContributors: React.FC<SparkContributorsProps> = ({ sparkId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["spark", sparkId, "contributors"],
    enabled: Boolean(sparkId),
    queryFn: async () => {
      // Fetch distinct contributor user ids from versions and sections plus author
      const [versions, sections, spark] = await Promise.all([
        supabase.from("spark_content_versions").select("edited_by").eq("spark_id", sparkId),
        supabase.from("spark_sections").select("creator_id").eq("spark_id", sparkId).eq("is_deleted", false),
        supabase.from("knowledge_sparks").select("author_id").eq("id", sparkId).maybeSingle(),
      ]);

      const ids = new Set<string>();
      if (!versions.error) {
        (versions.data || []).forEach((v: any) => { if (v.edited_by) ids.add(v.edited_by); });
      }
      if (!sections.error) {
        (sections.data || []).forEach((s: any) => { if (s.creator_id) ids.add(s.creator_id); });
      }
      if (!spark.error && (spark.data as any)?.author_id) ids.add((spark.data as any).author_id);

      const userIds = Array.from(ids);
      if (userIds.length === 0) return [] as Profile[];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id,display_name,username,avatar_url")
        .in("id", userIds);
      if (pErr) throw pErr;
      return (profiles || []) as Profile[];
    },
    staleTime: 1000 * 60,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    );
  }

  const contributors = data || [];
  if (contributors.length === 0) return null;

  return (
    <section aria-label="Contributors" className="mt-4">
      <div className="text-sm font-medium mb-2">Contributors</div>
      <div className="flex flex-wrap items-center gap-2">
        {contributors.map((p) => {
          const name = p.display_name || p.username || p.id.slice(0, 6);
          const initials = (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
          return (
            <div key={p.id} className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={p.avatar_url || undefined} alt={`${name} – contributor`} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{contributors.length} contributor{contributors.length > 1 ? "s" : ""}</div>
    </section>
  );
};

export default SparkContributors;
