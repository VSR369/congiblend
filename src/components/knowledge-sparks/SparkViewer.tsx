import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { RichTextEditor, htmlToPlainText } from "@/components/knowledge-sparks/RichTextEditor";
import { useIsSparkAuthor } from "@/hooks/useIsSparkAuthor";
import { Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { SparkTOC, extractHeadings } from "@/components/knowledge-sparks/SparkTOC";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
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
  const { isAuthor } = useIsSparkAuthor(spark?.id);

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
  const [contentHtmlDraft, setContentHtmlDraft] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [editMode, setEditMode] = useState<"append" | "modify-section" | "replace">("append");
  const [selectedHeadingId, setSelectedHeadingId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [compareVersion, setCompareVersion] = useState<any | null>(null);
  const [viewVersion, setViewVersion] = useState<any | null>(null);

  const draftKey = `sparkDraft:${spark.id}`;
  const { loadedDraft, clearDraft } = useAutosaveDraft(draftKey, {
    contentHtmlDraft,
    changeSummary,
    editMode,
    selectedHeadingId,
  });

  // Load any saved draft into state when opening editor
  useEffect(() => {
    if (!editing) return;
    if (loadedDraft) {
      if (loadedDraft.contentHtmlDraft && !contentHtmlDraft) setContentHtmlDraft(loadedDraft.contentHtmlDraft);
      if (loadedDraft.changeSummary && !changeSummary) setChangeSummary(loadedDraft.changeSummary);
      if (loadedDraft.editMode && editMode === "append") setEditMode(loadedDraft.editMode as any);
      if (loadedDraft.selectedHeadingId) setSelectedHeadingId(loadedDraft.selectedHeadingId);
    }
  }, [editing, loadedDraft]);

  const nextVersionNumber = useMemo(() => {
    return (latestVersion?.version_number ?? 0) + 1;
  }, [latestVersion]);

  const [articleWidth, setArticleWidth] = useLocalStorage<"narrow" | "comfortable" | "wide" | "full">(
    "spark-article-width",
    "comfortable"
  );

  const articleWidthCls = useMemo(() => {
    switch (articleWidth) {
      case "narrow":
        return "max-w-[65ch]";
      case "comfortable":
        return "max-w-[80ch]";
      case "wide":
        return "max-w-[96ch]";
      case "full":
      default:
        return "max-w-none w-full";
    }
  }, [articleWidth]);
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
      setContentHtmlDraft("");
      setChangeSummary("");
      // Preserve current editMode to allow "Edit here" flows and drafts
    }
  }, [editing]);

  // Ensure non-authors cannot remain in "replace" mode
  useEffect(() => {
    if (!isAuthor && editMode === "replace") {
      setEditMode("append");
    }
  }, [isAuthor, editMode]);

  const computeMergedHtml = (
    mode: "append" | "modify-section" | "replace",
    baseHtml: string,
    newHtml: string,
    headingId?: string | null
  ) => {
    if (mode === "replace") return newHtml;
    if (mode === "append") return baseHtml ? `${baseHtml}<p><br/></p>${newHtml}` : newHtml;
    if (mode === "modify-section" && headingId) {
      const container = document.createElement("div");
      container.innerHTML = baseHtml || "";
      try {
        const target = container.querySelector(`#${CSS.escape(headingId)}`);
        if (target) {
          const spacer = document.createElement("p");
          spacer.innerHTML = "<br/>";
          const wrapper = document.createElement("div");
          wrapper.innerHTML = newHtml;
          (target as HTMLElement).insertAdjacentElement("afterend", spacer);
          spacer.insertAdjacentElement("afterend", wrapper);
          return container.innerHTML;
        }
      } catch {}
    }
    // Fallback: append
    return baseHtml ? `${baseHtml}<p><br/></p>${newHtml}` : newHtml;
  };

  const handleSuggestEdit = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      toast.error("Please sign in to suggest an edit.");
      return;
    }
    const newSectionHtml = contentHtmlDraft.trim();
    const newSectionPlain = htmlToPlainText(newSectionHtml).trim();
    if (!newSectionPlain) {
      toast.error("Please enter some content for your edit.");
      return;
    }

    if (editMode === "replace" && !isAuthor) {
      toast.error("Only the author can replace content. Use Append instead.");
      setEditMode("append");
      return;
    }

    const baseHtml = (latestVersion?.content_html || "").trim();

    const finalHtml = computeMergedHtml(editMode, baseHtml, newSectionHtml, selectedHeadingId);
    const finalPlain = htmlToPlainText(finalHtml).trim();

    const summary = changeSummary.trim() ||
      (editMode === "append" ? "Append update" : editMode === "modify-section" ? "Section update" : "Replace content");

    const { error } = await supabase.from("spark_content_versions").insert({
      spark_id: spark.id,
      version_number: nextVersionNumber,
      content: { blocks: [] },
      content_html: finalHtml || null,
      content_plain: finalPlain,
      change_summary: summary,
      edit_type: editMode === "replace" ? "replacement" : "append",
      word_count: finalPlain.split(/\s+/).filter(Boolean).length,
      character_count: finalPlain.length,
      sections_modified: editMode === "modify-section" && selectedHeadingId ? [selectedHeadingId] : [],
      edited_by: user.id,
    });

    if (error) {
      console.error("Insert version error:", error);
      if (String(error.message || "").toLowerCase().includes("author")) {
        toast.error("Only the author can replace content. Try using Append instead.");
      } else {
        toast.error("Failed to submit edit.");
      }
      return;
    }

    toast.success("Edit submitted!");
    clearDraft();
    setEditing(false);
    setContentHtmlDraft("");
    setChangeSummary("");
    setViewVersion(null);
    setShowPreview(false);
    qc.invalidateQueries({ queryKey: ["spark", spark.id, "latestVersion"] });
    qc.invalidateQueries({ queryKey: ["spark", spark.id, "versions", "history"] });
    qc.invalidateQueries({ queryKey: ["knowledge-sparks", "list"] });
  };

  const currentHtml = useMemo(() => (viewVersion?.content_html || latestVersion?.content_html || ""), [viewVersion?.content_html, latestVersion?.content_html]);
  const tocHeadings = useMemo(() => extractHeadings(currentHtml).headings, [currentHtml]);

  useEffect(() => {
    if (editMode === "modify-section" && !selectedHeadingId && tocHeadings.length > 0) {
      setSelectedHeadingId(tocHeadings[0].id);
    }
  }, [editMode, selectedHeadingId, tocHeadings]);

  return (
    <Card className="p-4 h-full overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{spark.title}</h2>
          <div className="text-xs text-muted-foreground">/{spark.slug}</div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={articleWidth} onValueChange={(v) => setArticleWidth(v as any)}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Width" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="narrow">Width: Narrow</SelectItem>
              <SelectItem value="comfortable">Width: Comfortable</SelectItem>
              <SelectItem value="wide">Width: Wide</SelectItem>
              <SelectItem value="full">Width: Full</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant={editing ? "secondary" : "default"} onClick={() => setEditing(true)}>
            Contribute
          </Button>
        </div>
      </div>

      {!isAuthenticated && (
        <div className="mt-4 p-3 rounded-lg bg-muted text-sm flex items-center justify-between">
          <span>Sign in to contribute to Knowledge Sparks.</span>
          <Button asChild size="sm" variant="secondary">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      )}

      {/* Content + TOC */}
      <div className={`mt-4 ${tocHeadings.length > 0 ? "grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6" : ""}`}>
        <article className="min-h-[300px]">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2 mt-2" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </>
          ) : (latestVersion || viewVersion) ? (
            (() => {
              const htmlSource = (viewVersion?.content_html || latestVersion?.content_html || "");
              const { htmlWithIds, headings } = extractHeadings(htmlSource);

              return (
                <div className={`${articleWidthCls} mx-auto`}>
                  {htmlSource ? (
                    <div
                      className="text-sm leading-relaxed space-y-3"
                      dangerouslySetInnerHTML={{ __html: htmlWithIds }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {viewVersion?.content_plain || latestVersion?.content_plain || "No content yet."}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    v{(viewVersion?.version_number) ?? latestVersion?.version_number} • {new Date((viewVersion?.created_at) ?? (latestVersion?.created_at)).toLocaleString()}
                    {viewVersion ? " • viewing history" : ""}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-sm text-muted-foreground">No versions yet.</div>
          )}
        </article>

        {/* TOC (desktop) */}
        {tocHeadings.length > 0 && (
          <aside className="hidden xl:block sticky top-20 self-start">
            <SparkTOC headings={tocHeadings} canContribute={isAuthenticated} onEditHere={(id) => { setSelectedHeadingId(id); setEditMode("modify-section"); setEditing(true); setShowPreview(false); }} />
          </aside>
        )}

      </div>

      {versionHistory && (versionHistory as any[]).length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Version history</div>
            {viewVersion && (
              <Button variant="ghost" size="sm" onClick={() => setViewVersion(null)}>View latest</Button>
            )}
          </div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {(versionHistory as any[]).map((v: any) => (
              <li
                key={v.id}
                className={`flex items-center justify-between rounded-md border border-border px-2 py-1 bg-muted/30 cursor-pointer ${viewVersion?.id === v.id ? "ring-1 ring-ring" : ""}`}
                onClick={() => setViewVersion(v)}
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

      {/* Focused Edit Drawer */}
      <Drawer open={editing} onOpenChange={(open) => setEditing(open)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Contribute</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Change summary (optional)"
              />
              <Select
                value={editMode}
                onValueChange={(v) => {
                  if (v === "replace" && !isAuthor) {
                    toast.error("Only the author can replace content. Use Append instead.");
                    return; // keep current (append)
                  }
                  setEditMode(v as "append" | "modify-section" | "replace");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Edit mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">Append</SelectItem>
                  <SelectItem value="modify-section">Modify section</SelectItem>
                  <SelectItem value="replace" disabled={!isAuthor}>Replace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editMode === "modify-section" && (
              <div className="sm:max-w-sm">
                <Select
                  value={selectedHeadingId ?? ""}
                  onValueChange={(v) => setSelectedHeadingId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Target section" />
                  </SelectTrigger>
                  <SelectContent>
                    {tocHeadings.length === 0 ? (
                      <SelectItem value="" disabled>
                        No headings available
                      </SelectItem>
                    ) : (
                      tocHeadings.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.text}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {editMode === "append"
                ? "Your text will be added to the end of the current content."
                : editMode === "modify-section"
                ? "Your text will appear under the selected section heading."
                : "Your text will replace the current content."}
              {!isAuthor ? " • Only the author can replace content." : ""}
            </div>
            <RichTextEditor
              valueHtml={contentHtmlDraft}
              onChangeHtml={setContentHtmlDraft}
              placeholder={
                editMode === "append"
                  ? "Write what to add..."
                  : editMode === "modify-section"
                  ? "Write updates for the selected section..."
                  : "Write the new content..."
              }
              minHeight={220}
              onCtrlEnter={handleSuggestEdit}
            />
          </div>
          <DrawerFooter>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowPreview(true)}>Preview</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSuggestEdit}>Submit Edit</Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview merged content</DialogTitle>
          </DialogHeader>
          <div className="text-sm leading-relaxed space-y-3">
            <div
              dangerouslySetInnerHTML={{
                __html: computeMergedHtml(editMode, currentHtml, contentHtmlDraft, selectedHeadingId),
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SparkViewer;
