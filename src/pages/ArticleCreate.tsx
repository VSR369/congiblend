import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor, htmlToPlainText } from "@/components/knowledge-sparks/RichTextEditor";
import { useFeedStore } from "@/stores/feedStore";
import { toast } from "sonner";

const ArticleCreate: React.FC = () => {
  const navigate = useNavigate();
  const { createPost } = useFeedStore();

  const [title, setTitle] = React.useState("");
  const [contentHtml, setContentHtml] = React.useState("");
  const [publishing, setPublishing] = React.useState(false);

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
    <main className="max-w-3xl mx-auto px-4 py-6">
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

        <RichTextEditor
          valueHtml={contentHtml}
          onChangeHtml={setContentHtml}
          placeholder="Start writing your article..."
          minHeight={320}
        />
      </section>
    </main>
  );
};

export default ArticleCreate;
