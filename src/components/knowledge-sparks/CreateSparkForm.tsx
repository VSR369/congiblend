
import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "react-router-dom";
import { RichTextEditor, htmlToPlainText } from "./RichTextEditor";
import { extractHeadings } from "@/components/knowledge-sparks/SparkTOC";

type Spark = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  tags?: string[] | null;
  author_id: string;
};

interface CreateSparkFormProps {
  onCreated?: (spark: Spark) => void;
}

const slugify = (t: string) =>
  t
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const CreateSparkForm: React.FC<CreateSparkFormProps> = ({ onCreated }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const { isAuthenticated } = useAuthStore();

  const slug = useMemo(() => (title ? slugify(title) : ""), [title]);

  const handleCreate = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      toast.error("Please sign in to create a Knowledge Spark.");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    const tags = tagsCsv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // Derive plain text and short description from rich text
    const descriptionPlain = htmlToPlainText(contentHtml).trim();
    const descSnippet = descriptionPlain ? descriptionPlain.slice(0, 160) : null;

    // Insert spark
    const { data: spark, error } = await supabase
      .from("knowledge_sparks")
      .insert({
        title: title.trim(),
        slug: slug || `${Date.now()}`,
        description: descSnippet,
        category: category.trim() || null,
        tags,
        author_id: user.id,
        is_active: true,
        is_featured: false,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Create spark error:", error);
      toast.error("Could not create spark.");
      return;
    }

    // Create initial version (v1). We order by version_number elsewhere, so no is_current flag required.
    const initialContentPlain = descriptionPlain;
    const { error: verErr } = await supabase.from("spark_content_versions").insert({
      spark_id: spark.id,
      version_number: 1,
      content: { blocks: [] },
      content_html: contentHtml || null,
      content_plain: initialContentPlain,
      change_summary: "Initial creation",
      edit_type: "creation",
      word_count: initialContentPlain ? initialContentPlain.split(/\s+/).filter(Boolean).length : 0,
      character_count: initialContentPlain.length,
      sections_modified: [],
      edited_by: user.id,
    });

    if (verErr) {
      console.error("Create initial version error:", verErr);
      toast.error("Spark created but version init failed.");
    } else {
      toast.success("Knowledge Spark created!");
      // Register section metadata for headings in the initial content
      try {
        const { headings } = extractHeadings(contentHtml || "");
        if (headings.length) {
          await Promise.all(
            headings.map((h) =>
              (supabase as any).rpc("mark_section_created", {
                p_spark_id: spark.id,
                p_anchor_id: h.id,
                p_title: h.text,
                p_content_html: null,
                p_section_type: "original",
              })
            )
          );
        }
      } catch (e) {
        console.debug("mark_section_created on create error:", e);
      }
    }

    onCreated?.(spark as Spark);

    // Reset
    setTitle("");
    setCategory("");
    setTagsCsv("");
    setContentHtml("");
  };

  return (
    <div className="space-y-3">
      {!isAuthenticated && (
        <div className="p-3 rounded-lg bg-muted text-sm flex items-center justify-between">
          <span>Sign in to create a Knowledge Spark.</span>
          <Button asChild size="sm" variant="secondary">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Spark title"
        />
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
        />
      </div>
      <Input
        value={tagsCsv}
        onChange={(e) => setTagsCsv(e.target.value)}
        placeholder="Tags (comma separated)"
      />
      <RichTextEditor
        valueHtml={contentHtml}
        onChangeHtml={setContentHtml}
        placeholder="Initial content (rich text supported)..."
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Slug: {slug || "(auto)"} 
        </div>
        <Button onClick={handleCreate} disabled={!isAuthenticated}>Create Spark</Button>
      </div>
    </div>
  );
};

export default CreateSparkForm;
