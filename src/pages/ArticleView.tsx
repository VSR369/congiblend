import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import { LikeButton } from "@/components/ui/like-button";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { supabase } from "@/integrations/supabase/client";

interface ArticleRecord {
  id: string;
  content: string;
  metadata: any | null;
  created_at: string;
  user_id: string;
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
  } | null;
}

const ArticleView: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select(
            `id, content, metadata, created_at, user_id,
             profiles:user_id (id, username, display_name, avatar_url, is_verified)`
          )
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (isMounted) {
          if (!data) {
            setError("Article not found");
          } else {
            setArticle(data as unknown as ArticleRecord);
          }
        }
      } catch (e: any) {
        console.error(e);
        if (isMounted) setError(e?.message || "Failed to load article");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const title = useMemo(() => {
    if (!article) return "Article";
    return article.metadata?.title || article.content?.split("\n")[0] || "Article";
  }, [article]);

  const description = useMemo(() => {
    if (!article) return "";
    const plain = (article.content || "").replace(/\s+/g, " ").trim();
    return plain.length > 150 ? plain.slice(0, 157) + "..." : plain;
  }, [article]);

  // Basic SEO tags without extra deps
  useEffect(() => {
    if (!article) return;
    document.title = `${title} | Article`;
    const metaDesc = document.querySelector("meta[name='description']") as HTMLMetaElement | null;
    if (metaDesc) metaDesc.content = description; else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = description;
      document.head.appendChild(m);
    }
    const canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    const href = `${window.location.origin}/articles/${article.id}`;
    if (canonical) canonical.href = href; else {
      const l = document.createElement("link");
      l.rel = "canonical";
      l.href = href;
      document.head.appendChild(l);
    }
  }, [article, title, description]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-muted-foreground">Loading article...</p>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Article</h1>
          <p className="text-destructive">{error || "Article not found"}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </main>
    );
  }

  const author = article.profiles;
  const html = article.metadata?.article_html || "";

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold leading-tight mb-4">{title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt={author.display_name || author.username || "Author"} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-medium">{(author?.display_name || author?.username || "U").charAt(0)}</span>
            )}
          </div>
          <div>
            <div className="font-medium text-foreground">
              {author?.display_name || author?.username || "User"}
            </div>
            <div>{new Date(article.created_at).toLocaleString()}</div>
          </div>
        </div>
      </header>

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        {/* We trust content from our own editor */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>

      <section className="mt-8">
        <div className="border-t pt-4">
          <LikeButton targetId={article.id} targetType="post" reactions={[]} />
        </div>
        <div className="mt-6">
          <CommentsSection postId={article.id} />
        </div>
      </section>
    </main>
  );
};

export default ArticleView;
