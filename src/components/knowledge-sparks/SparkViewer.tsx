import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { htmlToPlainText } from "@/utils/html";
import { useIsSparkAuthor } from "@/hooks/useIsSparkAuthor";
import { SparkTOC, extractHeadings } from "@/components/knowledge-sparks/SparkTOC";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import { createPortal } from "react-dom";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Info, Lock } from "lucide-react";
import { useSparkSections } from "@/hooks/useSparkSections";

const RichTextEditor = React.lazy(() =>
  import("@/components/knowledge-sparks/RichTextEditor").then((m) => ({ default: m.RichTextEditor }))
);
type Spark = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
};

interface SparkViewerProps {
  spark: Spark;
}

const InlineAfterHeadingPortal: React.FC<{
  containerRef: React.RefObject<HTMLElement>;
  headingId: string;
  children: React.ReactNode;
}> = ({ containerRef, headingId, children }) => {
  const [mountEl, setMountEl] = React.useState<HTMLElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !headingId) return;

    let placeholder: HTMLDivElement | null = null;
    let targetEl: HTMLElement | null = null;

    try {
      targetEl = container.querySelector(`#${CSS.escape(headingId)}`) as HTMLElement | null;
    } catch {
      targetEl = null;
    }

    if (targetEl) {
      placeholder = document.createElement("div");
      placeholder.className = "mt-2";
      targetEl.insertAdjacentElement("afterend", placeholder);
      // Highlight + scroll into view
      targetEl.classList.add("ring-1", "ring-ring", "rounded-sm");
      try {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {}
      setMountEl(placeholder);
    }

    return () => {
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }
      if (targetEl) {
        targetEl.classList.remove("ring-1", "ring-ring", "rounded-sm");
      }
    };
  }, [containerRef, headingId]);

  if (!mountEl) return null;
  return createPortal(children as any, mountEl);
};

export const SparkViewer: React.FC<SparkViewerProps> = ({ spark }) => {
  const qc = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
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
      const result = (data && data[0]) || null;
      console.debug("SparkViewer: latestVersion fetched", { sparkId: spark.id, version: result?.version_number });
      return result;
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
      const list = data || [];
      console.debug("SparkViewer: versionHistory fetched", { count: list.length });
      return list;
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

  const contentRef = React.useRef<HTMLDivElement>(null);

  // Section metadata helpers
  const { sections, ensureSectionsForHeadings, recordSectionEdit, deleteSection } = useSparkSections(spark.id);


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
    console.debug("SparkViewer mounted/updated", { sparkId: spark.id });
    (async () => {
      const { error } = await supabase
        .from("spark_analytics")
        .insert({ spark_id: spark.id, action_type: "view" });
      if (error) {
        // Silently ignore analytics errors
        console.debug("spark_analytics insert error", error);
      } else {
        console.debug("spark_analytics inserted view event");
      }
    })();
  }, [spark.id]);

  // Keep draft values when opening the editor to avoid clearing prefilled content

  // Ensure non-authors cannot remain in "replace" mode
  useEffect(() => {
    if (!isAuthor && editMode === "replace") {
      setEditMode("append");
    }
  }, [isAuthor, editMode]);

  const cleanHtml = (html: string) => {
    if (!html) return "";
    let result = html;
    // Remove empty paragraphs that only contain a <br>
    result = result.replace(/<p>\s*(<br\s*\/?\>)\s*<\/p>/gi, "");
    // Collapse multiple <br> into a single
    result = result.replace(/(<br\s*\/?\>\s*){2,}/gi, "<br/>");
    // Trim whitespace between tags
    result = result.replace(/>\s+</g, "><");
    return result.trim();
  };

  const computeMergedHtml = (
    mode: "append" | "modify-section" | "replace",
    baseHtml: string,
    newHtml: string,
    headingId?: string | null
  ) => {
    const base = cleanHtml(baseHtml);
    const addition = cleanHtml(newHtml);

    if (mode === "replace") return addition;
    if (mode === "append") return cleanHtml(base ? `${base}${addition}` : addition);
    if (mode === "modify-section" && headingId) {
      // Ensure headings have stable IDs before manipulating
      const { htmlWithIds } = extractHeadings(base || "");
      const container = document.createElement("div");
      container.innerHTML = htmlWithIds;
      try {
        const target = container.querySelector(`#${CSS.escape(headingId)}`) as HTMLElement | null;
        if (target) {
          const level = parseInt(target.tagName.replace("H", ""), 10) || 2;
          // Remove existing section content until the next heading of same or higher level
          let cursor: Node | null = target.nextSibling;
          while (
            cursor && !(
              cursor.nodeType === Node.ELEMENT_NODE &&
              /^H[1-6]$/.test((cursor as HTMLElement).tagName) &&
              parseInt((cursor as HTMLElement).tagName.replace("H", ""), 10) <= level
            )
          ) {
            const toRemove = cursor;
            cursor = cursor.nextSibling;
            toRemove.parentNode?.removeChild(toRemove);
          }
          // Insert the new HTML right after the heading
          target.insertAdjacentHTML("afterend", addition);
          return cleanHtml(container.innerHTML);
        }
      } catch {}
    }
    // Fallback: append
    return cleanHtml(base ? `${base}${addition}` : addition);
  };


  const getSectionHtml = (baseHtml: string, headingId: string): string => {
    const { htmlWithIds } = extractHeadings(baseHtml || "");
    const container = document.createElement("div");
    container.innerHTML = htmlWithIds;
    try {
      const target = container.querySelector(`#${CSS.escape(headingId)}`) as HTMLElement | null;
      if (!target) return "";
      const level = parseInt(target.tagName.replace("H", ""), 10) || 2;
      const temp = document.createElement("div");
      let cursor: Node | null = target.nextSibling;
      while (
        cursor && !(
          cursor.nodeType === Node.ELEMENT_NODE &&
          /^H[1-6]$/.test((cursor as HTMLElement).tagName) &&
          parseInt((cursor as HTMLElement).tagName.replace("H", ""), 10) <= level
        )
      ) {
        temp.appendChild(cursor.cloneNode(true));
        cursor = cursor.nextSibling;
      }
      return cleanHtml(temp.innerHTML.trim());
    } catch {
      return "";
    }
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

    if (editMode === "modify-section") {
      if (tocHeadings.length === 0) {
        toast.error("No headings available to modify. Use Append or add a heading first.");
        return;
      }
      if (!selectedHeadingId || !tocHeadings.some((h) => h.id === selectedHeadingId)) {
        toast.error("Please choose a section to modify.");
        return;
      }
    }

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
    // Record per-section edit attribution
    if (editMode === "modify-section" && selectedHeadingId) {
      const sec = sectionByAnchor.get(selectedHeadingId);
      if (sec) {
        try {
          await recordSectionEdit({
            sectionId: sec.id,
            contentHtml: newSectionHtml,
            contentPlain: newSectionPlain,
            summary,
            versionNumber: nextVersionNumber,
          });
        } catch (e) {
          console.debug("record_section_edit error:", e);
        }
      }
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

  // Map sections by anchor for quick lookup
  const sectionByAnchor = useMemo(() => {
    const map = new Map<string, any>();
    (sections || []).forEach((s) => { if (s.anchor_id) map.set(s.anchor_id, s); });
    return map;
  }, [sections]);

  const handleDeleteSection = async (anchorId: string, title?: string) => {
    try {
      const sec = sectionByAnchor.get(anchorId);
      if (!sec) {
        toast.error("Section not found");
        return;
      }
      if (!user?.id || user.id !== sec.creator_id) {
        toast.error("Only the section creator can delete this section.");
        return;
      }
      if (!confirm(`Delete section "${title || anchorId}"?`)) return;
      await deleteSection(sec.id);
      toast.success("Section deleted");
    } catch (e) {
      console.debug("deleteSection error:", e);
      toast.error("Failed to delete section");
    }
  };

  // Ensure a section record exists for each heading (for attribution & permissions)
  useEffect(() => {
    if (!spark?.id || tocHeadings.length === 0) return;
    ensureSectionsForHeadings(tocHeadings.map((h) => ({ id: h.id, text: h.text })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spark?.id, currentHtml]);

  useEffect(() => {
    if (editMode === "modify-section" && !selectedHeadingId && tocHeadings.length > 0) {
      setSelectedHeadingId(tocHeadings[0].id);
    }
  }, [editMode, selectedHeadingId, tocHeadings]);

  useEffect(() => {
    if (!editing || editMode !== "modify-section" || !selectedHeadingId) return;
    const existing = getSectionHtml(currentHtml, selectedHeadingId);
    if (existing && !contentHtmlDraft.trim()) {
      setContentHtmlDraft(cleanHtml(existing));
    }
  }, [editing, editMode, selectedHeadingId, currentHtml]);

  // Safety net: when entering replace mode, prefill editor with current content if empty
  useEffect(() => {
    if (editing && editMode === "replace" && !contentHtmlDraft.trim()) {
      setContentHtmlDraft(currentHtml || "");
    }
  }, [editing, editMode, contentHtmlDraft, currentHtml]);

  return (
    <Card className="p-4">
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
          {isAuthor && (
            <Button
              size="sm"
              variant="secondary"
              disabled={isLoading}
              onClick={() => {
                setEditing(true);
                setEditMode("replace");
                setContentHtmlDraft(currentHtml || "");
                setShowPreview(false);
              }}
            >
              Edit full content
            </Button>
          )}
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

      {isAuthenticated && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-xs">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-medium">About contributions</div>
              <p className="text-muted-foreground">
                {isAuthor
                  ? "As the author, you can append, modify sections, or replace the entire content. Others can only suggest append/modify."
                  : "You can append new content or modify a section. Only the spark’s author can replace the full content."}
              </p>
            </div>
          </div>
        </div>
      )}

      {editing && editMode === "modify-section" && tocHeadings.length === 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
          <div>
            <div className="text-sm font-medium">No headings found</div>
            <div className="text-xs text-muted-foreground">Modify section needs at least one H2/H3. Use “Create first section”.</div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditMode("append");
              setContentHtmlDraft("<h2>New section</h2><p>Start writing…</p>");
            }}
          >
            Create first section
          </Button>
        </div>
      )}

      {editing && editMode === "replace" && (
        <div className={`${articleWidthCls} mx-auto mt-4 rounded-md border border-border bg-muted/40 p-3 shadow-sm`}>
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
                  return;
                }
                if (v === "modify-section") {
                  if (tocHeadings.length === 0) {
                    toast.error("No headings available to modify. Use Append or add a heading.");
                    return;
                  }
                  if (!selectedHeadingId && tocHeadings.length > 0) {
                    setSelectedHeadingId(tocHeadings[0].id);
                  }
                }
                setEditMode(v as any);
              }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger>
                      <SelectValue placeholder="Edit mode" />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    Choose how to contribute: Append adds at end, Modify targets a section, Replace overrides all (author only).
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SelectContent>
                <SelectItem value="append">Append</SelectItem>
                <SelectItem value="modify-section">Modify section</SelectItem>
                <SelectItem value="replace" disabled={!isAuthor}>
                  <span className="inline-flex items-center gap-1">
                    {!isAuthor && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                    Replace {!isAuthor && "(author only)"}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Your text will replace the current content. Press Ctrl/⌘ + Enter to submit.
          </div>
          <div className="mt-2">
            <React.Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <RichTextEditor
                valueHtml={contentHtmlDraft}
                onChangeHtml={setContentHtmlDraft}
                placeholder="Write the new content..."
                minHeight={260}
                onCtrlEnter={handleSuggestEdit}
              />
            </React.Suspense>
          </div>
          {showPreview && (
            <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
              <div className="text-xs mb-2 text-muted-foreground">Preview</div>
              <div className="prose prose-sparks prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: computeMergedHtml(editMode, currentHtml, contentHtmlDraft, selectedHeadingId) }}
              />
            </div>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowPreview((v) => !v)}>Preview</Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSuggestEdit}>Submit Edit</Button>
          </div>
        </div>
      )}

      {/* Content + TOC */}
      <div className={`mt-4 ${tocHeadings.length > 0 ? "grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6" : ""} ${editing && editMode === "replace" ? "hidden" : ""}`}>
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
              const cleaned = cleanHtml(htmlSource);
              const { htmlWithIds, headings } = extractHeadings(cleaned);

              return (
                <div className={`${articleWidthCls} mx-auto`}>
                  {htmlSource ? (
                    <div
                      ref={contentRef}
                      className="prose prose-sparks prose-base max-w-none dark:prose-invert text-foreground"
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

        {editing && editMode === "append" && (
          <div className={`${articleWidthCls} mx-auto mt-4 rounded-md border border-border bg-background p-3 shadow-sm`}>
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
                    return;
                  }
                  if (v === "modify-section") {
                    if (tocHeadings.length === 0) {
                      toast.error("No headings available to modify. Use Append or add a heading.");
                      return;
                    }
                    if (!selectedHeadingId && tocHeadings.length > 0) {
                      setSelectedHeadingId(tocHeadings[0].id);
                    }
                  }
                  setEditMode(v as any);
                }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SelectTrigger>
                        <SelectValue placeholder="Edit mode" />
                      </SelectTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      Choose how to contribute: Append adds at end, Modify targets a section, Replace overrides all (author only).
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <SelectContent>
                  <SelectItem value="append">Append</SelectItem>
                  <SelectItem value="modify-section">Modify section</SelectItem>
                  <SelectItem value="replace" disabled={!isAuthor}>
                    <span className="inline-flex items-center gap-1">
                      {!isAuthor && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                      Replace {!isAuthor && "(author only)"}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Your text will be added to the end of the content. Press Ctrl/⌘ + Enter to submit.
            </div>
            <div className="mt-2">
              <React.Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <RichTextEditor
                  valueHtml={contentHtmlDraft}
                  onChangeHtml={setContentHtmlDraft}
                  placeholder="Write what to add..."
                  minHeight={220}
                  onCtrlEnter={handleSuggestEdit}
                />
              </React.Suspense>
            </div>
            {showPreview && (
              <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs mb-2 text-muted-foreground">Preview</div>
                <div className="prose prose-sparks prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: computeMergedHtml(editMode, currentHtml, contentHtmlDraft, selectedHeadingId) }}
                />
              </div>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowPreview((v) => !v)}>Preview</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSuggestEdit}>Submit Edit</Button>
            </div>
          </div>
        )}

        {/* TOC (desktop) */}
        {tocHeadings.length > 0 && (
          <aside className="hidden xl:block sticky top-20 self-start">
            <SparkTOC
              headings={tocHeadings}
              canContribute={isAuthenticated}
              onEditHere={(id) => { setSelectedHeadingId(id); setEditMode("modify-section"); setEditing(true); setShowPreview(false); }}
              sections={sections}
              currentUserId={user?.id}
              onDeleteSection={(id, text) => handleDeleteSection(id, text)}
            />
          </aside>
        )}

      </div>

      {editing && editMode === "modify-section" && selectedHeadingId && tocHeadings.length > 0 && (
        <InlineAfterHeadingPortal containerRef={contentRef} headingId={selectedHeadingId}>
          <div className="rounded-md border border-border bg-background p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Change summary (optional)"
              />
              <Select value={selectedHeadingId ?? undefined} onValueChange={(v) => setSelectedHeadingId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Target section" />
                </SelectTrigger>
                <SelectContent>
                  {tocHeadings.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={editMode}
                onValueChange={(v) => {
                  if (v === "replace" && !isAuthor) {
                    toast.error("Only the author can replace content. Use Append instead.");
                    return;
                  }
                  if (v === "modify-section") {
                    if (tocHeadings.length === 0) {
                      toast.error("No headings available to modify. Use Append or add a heading.");
                      return;
                    }
                    if (!selectedHeadingId && tocHeadings.length > 0) {
                      setSelectedHeadingId(tocHeadings[0].id);
                    }
                  }
                  setEditMode(v as any);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Edit mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">Append</SelectItem>
                  <SelectItem value="modify-section">Modify section</SelectItem>
                  <SelectItem value="replace" disabled={!isAuthor}>
                    <span className="inline-flex items-center gap-1">
                      {!isAuthor && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
                      Replace {!isAuthor && "(author only)"}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Editing this section. Your changes will replace the content under the selected heading. Press Ctrl/⌘ + Enter to submit.
            </div>
            <div className="mt-2">
              <React.Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <RichTextEditor
                  valueHtml={contentHtmlDraft}
                  onChangeHtml={setContentHtmlDraft}
                  placeholder="Write updates for the selected section..."
                  minHeight={220}
                  onCtrlEnter={handleSuggestEdit}
                />
              </React.Suspense>
            </div>
            {showPreview && (
              <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs mb-2 text-muted-foreground">Preview</div>
                <div
                  className="prose prose-sparks prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: computeMergedHtml(editMode, currentHtml, contentHtmlDraft, selectedHeadingId),
                  }}
                />
              </div>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowPreview((v) => !v)}>Preview</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSuggestEdit}>Submit Edit</Button>
            </div>
          </div>
        </InlineAfterHeadingPortal>
      )}

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


    </Card>
  );
};

export default SparkViewer;
