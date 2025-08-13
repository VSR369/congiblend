import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { htmlToPlainText } from "@/utils/html";
import { useFeedStore } from "@/stores/feedStore";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import AutoScaleSection from "@/components/ui/auto-scale-section";
const RichTextEditor = React.lazy(() =>
  import("@/components/knowledge-sparks/RichTextEditor").then((m) => ({ default: m.RichTextEditor }))
);
const ArticleCreate: React.FC = () => {
  const navigate = useNavigate();
  const { createPost } = useFeedStore();

  const [title, setTitle] = React.useState("");
  const [contentHtml, setContentHtml] = React.useState("");
  const [publishing, setPublishing] = React.useState(false);

  const [category, setCategory] = React.useState("");
  const [tagsInput, setTagsInput] = React.useState("");

  const canPublish = title.trim().length > 2 && htmlToPlainText(contentHtml).trim().length > 20 && !publishing;

  const handlePublish = async () => {
    if (!canPublish) return;
    try {
      setPublishing(true);
      const plain = htmlToPlainText(contentHtml).trim();
      const snippet = plain.length > 280 ? plain.slice(0, 277) + "..." : plain;

      await createPost({
        content: `${title}\n\n${snippet}`,
        post_type: "article",
        visibility: "public",
        metadata: {
          article_html: contentHtml,
          title,
          category: category.trim() || undefined,
          tags: Array.from(new Set(tagsInput.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean))),
        },
      });

      toast.success("Article published");
      navigate("/");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to publish article");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AutoScaleSection viewportPadding={8} minScale={1}>
      <main className="max-w-3xl mx-auto px-2 sm:px-3 md:px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Write an article</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button onClick={handlePublish} disabled={!canPublish} loading={publishing} loadingText="Publishing...">
              Publish
            </Button>
          </div>
        </header>

        <section className="space-y-4">
          <Input
            placeholder="Article title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl h-12"
          />

          <Input
            placeholder="Category (e.g., Technology)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Article category"
          />

          <div>
            <Input
              placeholder="Tags (comma-separated: AI, Research, Startups)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              aria-label="Article tags"
            />
            {tagsInput.trim() && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(new Set(tagsInput.split(",").map(t => t.trim()).filter(Boolean))).map((t) => (
                  <Badge key={t} variant="outline">#{t.replace(/^#/, "")}</Badge>
                ))}
              </div>
            )}
          </div>

          <React.Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <RichTextEditor
              valueHtml={contentHtml}
              onChangeHtml={setContentHtml}
              placeholder="Start writing your article..."
              minHeight={320}
            />
          </React.Suspense>
        </section>
      </main>
    </AutoScaleSection>
  );
};

export default ArticleCreate;
