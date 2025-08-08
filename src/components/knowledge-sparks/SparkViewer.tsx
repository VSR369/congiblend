
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type Spark = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
};

interface SparkViewerProps {
  spark: Spark;
}

export const SparkViewer: React.FC<SparkViewerProps> = ({ spark }) => {
  const qc = useQueryClient();

  const { data: latestVersion, isLoading } = useQuery({
    queryKey: ["spark", spark.id, "latestVersion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spark_content_versions")
        .select("id,version_number,content,content_html,content_plain,change_summary,edited_by,created_at")
        .eq("spark_id", spark.id)
        .order("version_number", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Fetch latest version error:", error);
        throw error;
      }
      return (data && data[0]) || null;
    },
  });

  const [editing, setEditing] = useState(false);
  const [contentDraft, setContentDraft] = useState("");

  const nextVersionNumber = useMemo(() => {
    return (latestVersion?.version_number ?? 0) + 1;
  }, [latestVersion]);

  const handleSuggestEdit = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      toast.error("Please sign in to suggest an edit.");
      return;
    }
    const contentPlain = contentDraft.trim();
    if (!contentPlain) {
      toast.error("Please enter some content for your edit.");
      return;
    }

    const { error } = await supabase.from("spark_content_versions").insert({
      spark_id: spark.id,
      version_number: nextVersionNumber,
      content: { blocks: [] },
      content_html: null,
      content_plain: contentPlain,
      change_summary: "Content update",
      edit_type: "modification",
      word_count: contentPlain.split(/\s+/).filter(Boolean).length,
      character_count: contentPlain.length,
      sections_modified: [],
      edited_by: user.id,
    });

    if (error) {
      console.error("Insert version error:", error);
      toast.error("Failed to submit edit.");
      return;
    }

    toast.success("Edit submitted!");
    setEditing(false);
    setContentDraft("");
    qc.invalidateQueries({ queryKey: ["spark", spark.id, "latestVersion"] });
    qc.invalidateQueries({ queryKey: ["knowledge-sparks", "list"] });
  };

  return (
    <Card className="p-4 h-full overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{spark.title}</h2>
          <div className="text-xs text-muted-foreground">/{spark.slug}</div>
        </div>
        <Button size="sm" variant={editing ? "secondary" : "default"} onClick={() => setEditing((s) => !s)}>
          {editing ? "Cancel" : "Suggest Edit"}
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2 mt-2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </>
        ) : latestVersion ? (
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {latestVersion.content_plain || "No content yet."}
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              v{latestVersion.version_number} • {new Date(latestVersion.created_at).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No versions yet.</div>
        )}
      </div>

      {editing ? (
        <div className="mt-4 space-y-2">
          <Textarea
            value={contentDraft}
            onChange={(e) => setContentDraft(e.target.value)}
            rows={8}
            placeholder="Propose your changes here..."
          />
          <div className="flex justify-end">
            <Button onClick={handleSuggestEdit}>Submit Edit</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
};

export default SparkViewer;
