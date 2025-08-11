import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SparkViewer from "@/components/knowledge-sparks/SparkViewer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { SparkAuthorControls } from "@/components/knowledge-sparks/SparkAuthorControls";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";

const setMetaTag = (name: string, content: string) => {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const setCanonical = (href: string) => {
  let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

interface Spark {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  status?: string | null;
}

const KnowledgeSparkViewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: spark, isLoading } = useQuery({
    queryKey: ["knowledge-sparks", "by-slug", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_sparks")
        .select("id,title,slug,description,status")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as Spark | null;
    },
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (spark) {
      console.debug("KnowledgeSparkView: spark loaded", { slug, id: spark.id });
      document.title = `${spark.title} – Knowledge Sparks`;
      setMetaTag("description", spark.description || "Read and contribute to this Knowledge Spark.");
      setCanonical(window.location.href);

      // Add structured data (JSON-LD)
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: spark.title,
        description: spark.description || "Knowledge Spark article",
        url: window.location.href,
      } as const;
      let script = document.getElementById("spark-jsonld") as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = "spark-jsonld";
        document.head.appendChild(script);
      }
      script.text = JSON.stringify(jsonLd);
    } else {
      console.debug("KnowledgeSparkView: no spark found yet", { slug });
    }
  }, [spark, slug]);

  // Log a view event once per session for this spark
  useEffect(() => {
    const logView = async () => {
      if (!spark?.id) return;
      const key = `spark-viewed-${spark.id}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('spark_analytics').insert({
          spark_id: spark.id,
          action_type: 'view',
          user_id: user?.id ?? null,
        });
      } catch (e) {
        console.warn('Failed to log spark view', e);
      }
    };
    logView();
  }, [spark?.id]);

  if (isLoading) {
    return (
      <main className="w-full max-w-screen-lg mx-auto px-4 py-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  if (!spark) {
    return (
      <main className="w-full max-w-screen-lg mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Spark not found</h1>
          <p className="text-sm text-muted-foreground">The requested Knowledge Spark could not be found.</p>
        </header>
        <Button asChild>
          <Link to="/knowledge-sparks">Back to Browse</Link>
        </Button>
      </main>
    );
  }

  const { status: realtimeStatus } = useRealtimeStatus();

  return (
    <main className="w-full max-w-screen-xl mx-auto px-4 py-6">
      <header className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/knowledge-sparks" aria-label="Back to all Knowledge Sparks">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back to all sparks
            </Link>
          </Button>
          <div className="text-xs text-muted-foreground" aria-live="polite">
            Realtime: {realtimeStatus}
          </div>
        </div>
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/knowledge-sparks">Knowledge Sparks</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{spark.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {spark.title}
          {spark.status === 'collaborative' ? (
            <Badge variant="secondary" aria-label="Collaborative spark">Collaborative</Badge>
          ) : null}
        </h1>
        {spark.description ? (
          <p className="text-sm text-muted-foreground">{spark.description}</p>
        ) : null}
        <div className="mt-2">
          <SparkAuthorControls sparkId={spark.id} />
        </div>
      </header>
      <section>
        <SparkViewer spark={spark} />
      </section>
    </main>
  );
};

export default KnowledgeSparkViewPage;
