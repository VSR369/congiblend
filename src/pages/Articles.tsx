import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";


interface ArticleListItem {
  id: string;
  content: string;
  metadata: any | null;
  created_at: string;
  reactions_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  profiles: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const Articles: React.FC = () => {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    document.title = "Articles | All Articles";
    const metaDesc = document.querySelector("meta[name='description']") as HTMLMetaElement | null;
    const desc = "Browse all published articles with titles and summaries.";
    if (metaDesc) metaDesc.content = desc; else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
    const canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    const href = `${window.location.origin}/articles`;
    if (canonical) canonical.href = href; else {
      const l = document.createElement("link");
      l.rel = "canonical";
      l.href = href;
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("posts")
          .select(`
            id, content, metadata, created_at, reactions_count, likes_count, comments_count,
            profiles:user_id (id, username, display_name, avatar_url)
          `)
          .eq('visibility', 'public')
          .not('metadata->>article_html', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        if (!active) return;
        setArticles((data || []) as unknown as ArticleListItem[]);
      } catch (e) {
        console.error('Failed to load articles list', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const items = useMemo(() => {
    return (articles || []).map(a => {
      const title = a.metadata?.title || (a.content || '').split('\n')[0] || 'Untitled';
      const plain = (a.content || '').replace(/\s+/g, ' ').trim();
      const snippet = plain.length > 160 ? plain.slice(0, 157) + '…' : plain;
      const tags: string[] = Array.isArray(a.metadata?.tags)
        ? a.metadata?.tags
        : typeof a.metadata?.tags === 'string'
          ? a.metadata?.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [];
      return { ...a, title, snippet, tags };
    });
  }, [articles]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Articles</h1>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>Cards</Button>
          <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>List</Button>
          <Button asChild>
            <Link to="/articles/new">Write an article</Link>
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No articles published yet.</p>
      ) : viewMode === 'grid' ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => (
            <Link
              key={a.id}
              to={`/articles/${a.id}`}
              aria-label={`Read article: ${a.title}`}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            >
              <Card className="h-full transition-shadow duration-200 hover:shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{a.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-3">{a.snippet}</p>
                  {(a.metadata?.category || a.tags.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {typeof a.metadata?.category === 'string' && a.metadata?.category.trim() && (
                        <Badge variant="secondary">{a.metadata.category.trim()}</Badge>
                      )}
                      {a.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="outline">#{String(t).replace(/^#/, '')}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </section>
      ) : (
        <section className="space-y-3">
          {items.map((a) => (
            <Link
              key={a.id}
              to={`/articles/${a.id}`}
              aria-label={`Read article: ${a.title}`}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            >
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-medium text-base truncate group-hover:text-primary transition-colors">{a.title}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">{a.snippet}</p>
                    <div className="mt-1 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
};

export default Articles;
