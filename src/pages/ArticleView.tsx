import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Lazy-loaded below
// import { LikeButton } from "@/components/ui/like-button";
// import { CommentsSection } from "@/components/comments/CommentsSection";
import { supabase } from "@/integrations/supabase/client";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Skeleton } from "@/components/ui/skeleton";

const LikeButtonLazy = React.lazy(() =>
  import("@/components/ui/like-button").then((m) => ({ default: m.LikeButton }))
);
const CommentsSectionLazy = React.lazy(() =>
  import("@/components/comments/CommentsSection").then((m) => ({ default: m.CommentsSection }))
);

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

  const { ref: likeRef, isIntersecting: likeInView } = useIntersectionObserver({ rootMargin: "200px" });
  const { ref: commentsRef, isIntersecting: commentsInView } = useIntersectionObserver({ rootMargin: "400px" });

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

        {(article.metadata?.category || (Array.isArray(article.metadata?.tags) && article.metadata.tags.length > 0) || typeof article.metadata?.tags === 'string') && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {typeof article.metadata?.category === 'string' && article.metadata.category.trim() && (
              <Badge variant="secondary">{article.metadata.category.trim()}</Badge>
            )}
            {(
              Array.isArray(article.metadata?.tags)
                ? article.metadata.tags
                : typeof article.metadata?.tags === 'string'
                  ? article.metadata.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                  : []
            ).map((t: string) => (
              <Badge key={t} variant="outline">#{String(t).trim().replace(/^#/, '')}</Badge>
            ))}
          </div>
        )}
      </header>

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        {/* We trust content from our own editor */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>

      <section className="mt-8">
        <div className="border-t pt-4" ref={likeRef as any}>
          {likeInView ? (
            <React.Suspense fallback={<Skeleton className="h-8 w-32" />}>
              <LikeButtonLazy targetId={article.id} targetType="post" reactions={[]} />
            </React.Suspense>
          ) : (
            <Skeleton className="h-8 w-32" />
          )}
        </div>
        <div className="mt-6" ref={commentsRef as any}>
          {commentsInView ? (
            <React.Suspense fallback={<Skeleton className="h-20 w-full" />}>
              <CommentsSectionLazy postId={article.id} />
            </React.Suspense>
          ) : (
            <Skeleton className="h-20 w-full" />
          )}
        </div>
      </section>
    </main>
  );
};

export default ArticleView;
