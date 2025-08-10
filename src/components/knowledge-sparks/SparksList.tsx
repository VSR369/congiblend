
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SparkCard from "./SparkCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useVirtualScroll } from "@/hooks/useVirtualScroll";
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
  viewMode?: "card" | "list";
}

export const SparksList: React.FC<SparksListProps> = ({ onSelect, selectedId, viewMode = "list" }) => {
  const [query, setQuery] = useState("");

  const { data, isLoading, isError } = useQuery({
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
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
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

  const { parentRef, visibleItems, shouldVirtualize, totalSize, measureElement } =
    useVirtualScroll({ items: filtered, threshold: 30, estimateSize: () => 120, overscan: 8 });

  const qc = useQueryClient();
  const prefetchSpark = (id: string) => {
    qc.prefetchQuery({
      queryKey: ["spark", id, "latestVersion"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("spark_content_versions")
          .select("id,version_number,content_html")
          .eq("spark_id", id)
          .order("version_number", { ascending: false })
          .limit(1);
        if (error) throw error;
        return (data && data[0]) || null;
      },
      staleTime: 1000 * 60 * 5,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sparks by title, tag, or category..."
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2" ref={viewMode === "list" ? (parentRef as any) : undefined}>
        {isError ? (
          <div className="p-4 text-sm text-destructive">Failed to load sparks. Please try again.</div>
        ) : isLoading ? (
          viewMode === "card" ? (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          )
        ) : viewMode === "card" ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {filtered.map((spark) => (
              <div key={spark.id} className="h-full" onMouseEnter={() => prefetchSpark(spark.id)}>
                <SparkCard
                  spark={spark}
                  selected={selectedId === spark.id}
                  onClick={() => onSelect(spark)}
                  className="h-full"
                  showActions={false}
                />
              </div>
            ))}
          </div>
        ) : (
          shouldVirtualize ? (
            <div style={{ height: typeof totalSize === 'number' ? `${totalSize}px` : totalSize, position: 'relative', width: '100%' }}>
              {visibleItems.map(({ item, virtualItem, index }) => (
                <div
                  key={virtualItem?.key ?? item.id}
                  className="will-change-transform overflow-hidden"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: virtualItem ? `${virtualItem.size}px` : 'auto',
                    transform: `translateY(${virtualItem?.start ?? 0}px)`,
                  }}
                >
                  <div ref={measureElement as any} data-index={virtualItem?.index ?? index}>
                    <SparkCard
                      spark={item}
                      selected={selectedId === item.id}
                      onClick={() => onSelect(item)}
                      showActions={false}
                      className="h-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((spark) => (
                <div key={spark.id} onMouseEnter={() => prefetchSpark(spark.id)}>
                  <SparkCard
                    spark={spark}
                    selected={selectedId === spark.id}
                    onClick={() => onSelect(spark)}
                    showActions={false}
                  />
                </div>
              ))}
            </div>
          )
        )}
        {!isLoading && !isError && filtered.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No sparks found. Create one using the form above.</div>
        ) : null}
      </div>
    </div>
  );
};

export default SparksList;
