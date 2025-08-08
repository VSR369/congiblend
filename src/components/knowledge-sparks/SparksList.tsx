
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SparkCard from "./SparkCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type Spark = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  view_count?: number | null;
  contributor_count?: number | null;
  total_edits?: number | null;
  updated_at?: string | null;
  is_featured?: boolean | null;
};

interface SparksListProps {
  onSelect: (spark: Spark) => void;
  selectedId?: string | null;
}

export const SparksList: React.FC<SparksListProps> = ({ onSelect, selectedId }) => {
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["knowledge-sparks", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_sparks")
        .select("id,title,slug,description,category,tags,view_count,contributor_count,total_edits,updated_at,is_featured")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) {
        console.error("Fetch sparks error:", error);
        throw error;
      }
      return data as Spark[] | null;
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q) ||
      (s.category ?? "").toLowerCase().includes(q) ||
      (s.tags ?? []).some(t => t.toLowerCase().includes(q))
    );
  }, [data, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="p-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sparks by title, tag, or category..."
        />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : (
          filtered.map((spark) => (
            <SparkCard
              key={spark.id}
              spark={spark}
              selected={selectedId === spark.id}
              onClick={() => onSelect(spark)}
            />
          ))
        )}
        {!isLoading && filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No sparks found.</div>
        ) : null}
      </div>
    </div>
  );
};

export default SparksList;
