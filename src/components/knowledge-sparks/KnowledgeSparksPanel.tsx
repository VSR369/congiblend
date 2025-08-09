
import React, { useEffect, useMemo, useState } from "react";
import { CreateSparkForm } from "./CreateSparkForm";
import { SparksList } from "./SparksList";
import { SparkViewer } from "./SparkViewer";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

type Spark = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
};

interface KnowledgeSparksPanelProps { initialSlug?: string }
export const KnowledgeSparksPanel: React.FC<KnowledgeSparksPanelProps> = ({ initialSlug }) => {
  const [selected, setSelected] = useState<Spark | null>(null);
  // Preselect by slug if provided
  useEffect(() => {
    if (!initialSlug) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("knowledge_sparks")
        .select("id,title,slug,description,category,tags")
        .eq("slug", initialSlug)
        .eq("is_active", true)
        .single();
      if (error) {
        console.warn("Failed to preselect spark by slug:", error);
        return;
      }
      if (active && data) setSelected(data as Spark);
    })();
    return () => { active = false; };
  }, [initialSlug]);

  // Realtime: Refresh selected viewer when new version arrives
  useEffect(() => {
    if (!selected) return;
    const channel = supabase
      .channel("knowledge-spark-editing")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "spark_content_versions", filter: `spark_id=eq.${selected.id}` },
        (payload) => {
          console.log("New spark version inserted:", payload);
          // No direct state update needed; viewer uses react-query and will revalidate on interaction.
          // We could add smart refetch triggers if needed; leaving minimal to avoid overengineering.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selected]);

  const layout = useMemo(
    () => (
      <div className="flex h-full flex-col">
        <div className="p-4">
          <CreateSparkForm onCreated={(spark) => setSelected(spark as Spark)} />
        </div>
        <Separator />
        <div className="p-4 flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-[80vh] rounded-md border">
            <ResizablePanel defaultSize={28} minSize={24}>
              <Card className="h-full overflow-hidden">
                <SparksList
                  selectedId={selected?.id ?? null}
                  onSelect={(spark) => setSelected(spark as Spark)}
                />
              </Card>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={72} minSize={40}>
              <div className="h-full">
                {selected ? (
                  <SparkViewer spark={selected} />
                ) : (
                  <Card className="h-full p-4 text-sm text-muted-foreground flex items-center justify-center">
                    Select a spark to view details.
                  </Card>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    ),
    [selected]
  );

  return layout;
};

export default KnowledgeSparksPanel;
