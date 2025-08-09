import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SparkViewer from "@/components/knowledge-sparks/SparkViewer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
}

const KnowledgeSparkViewPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: spark, isLoading } = useQuery({
    queryKey: ["knowledge-sparks", "by-slug", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_sparks")
        .select("id,title,slug,description")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as Spark | null;
    },
  });

  useEffect(() => {
    if (spark) {
      document.title = `${spark.title} – Knowledge Sparks`;
      setMetaTag("description", spark.description || "Read and contribute to this Knowledge Spark.");
      setCanonical(window.location.href);
    }
  }, [spark]);

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

  return (
    <main className="w-full max-w-screen-xl mx-auto px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">{spark.title}</h1>
        {spark.description ? (
          <p className="text-sm text-muted-foreground">{spark.description}</p>
        ) : null}
      </header>
      <section>
        <SparkViewer spark={spark} />
      </section>
    </main>
  );
};

export default KnowledgeSparkViewPage;
