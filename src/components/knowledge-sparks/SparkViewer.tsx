
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  const { isAuthenticated } = useAuthStore();

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

  const { data: versionHistory } = useQuery({
    queryKey: ["spark", spark.id, "versions", "history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spark_content_versions")
        .select("id,version_number,change_summary,edited_by,created_at,content_plain")
        .eq("spark_id", spark.id)
        .order("version_number", { ascending: false })
        .limit(5);
      if (error) {
        console.error("Fetch versions error:", error);
        throw error;
      }
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  const [editing, setEditing] = useState(false);
  const [contentDraft, setContentDraft] = useState("");
  const [changeSummary, setChangeSummary] = useState("");

  const nextVersionNumber = useMemo(() => {
    return (latestVersion?.version_number ?? 0) + 1;
  }, [latestVersion]);

  // Log a non-blocking view analytics event when a spark is opened
  useEffect(() => {
    if (!spark?.id) return;
    (async () => {
      const { error } = await supabase
        .from("spark_analytics")
        .insert({ spark_id: spark.id, action_type: "view" });
      if (error) {
        // Silently ignore analytics errors
        console.debug("spark_analytics insert error", error);
      }
    })();
  }, [spark.id]);

  // Reset fields when entering edit mode
  useEffect(() => {
    if (editing) {
      setContentDraft("");
      setChangeSummary("");
    }
  }, [editing]);

  const handleSuggestEdit = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      toast.error("Please sign in to suggest an edit.");
      return;
    }
    const newSection = contentDraft.trim();
    if (!newSection) {
      toast.error("Please enter some content for your edit.");
      return;
    }

    const basePlain = (latestVersion?.content_plain || "").trim();
    const finalPlain = basePlain ? `${basePlain}\n\n${newSection}` : newSection;
    const summary = changeSummary.trim() || "Append update";

    const { error } = await supabase.from("spark_content_versions").insert({
      spark_id: spark.id,
      version_number: nextVersionNumber,
      content: { blocks: [] },
      content_html: null,
      content_plain: finalPlain,
      change_summary: summary,
      edit_type: "modification",
      word_count: finalPlain.split(/\s+/).filter(Boolean).length,
      character_count: finalPlain.length,
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
    setChangeSummary("");
    qc.invalidateQueries({ queryKey: ["spark", spark.id, "latestVersion"] });
    qc.invalidateQueries({ queryKey: ["spark", spark.id, "versions", "history"] });
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

      {!isAuthenticated && (
        <div className="mt-4 p-3 rounded-lg bg-muted text-sm flex items-center justify-between">
          <span>Sign in to contribute to Knowledge Sparks.</span>
          <Button asChild size="sm" variant="secondary">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      )}

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

      {versionHistory && (versionHistory as any[]).length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-medium">Version history</div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {(versionHistory as any[]).map((v: any) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded-md border border-border px-2 py-1 bg-muted/30"
              >
                <span>
                  v{v.version_number}
                  {latestVersion?.id === v.id ? " (latest)" : ""}
                </span>
                <span>{new Date(v.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs text-muted-foreground">
            Append mode: your text will be added to the end of the current content.
          </div>
          <Input
            value={changeSummary}
            onChange={(e) => setChangeSummary(e.target.value)}
            placeholder="Change summary (optional)"
          />
          <Textarea
            value={contentDraft}
            onChange={(e) => setContentDraft(e.target.value)}
            rows={8}
            placeholder="Add your addition here..."
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
