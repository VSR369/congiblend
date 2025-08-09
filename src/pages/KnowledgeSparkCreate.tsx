import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CreateSparkForm from "@/components/knowledge-sparks/CreateSparkForm";

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

const KnowledgeSparkCreatePage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Create Knowledge Spark – Knowledge Sparks";
    setMetaTag("description", "Create a new Knowledge Spark to share and refine knowledge collaboratively.");
    setCanonical(window.location.href);
  }, []);

  return (
    <main className="w-full max-w-screen-lg mx-auto px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create Knowledge Spark</h1>
          <p className="text-sm text-muted-foreground">Start a new collaborative knowledge thread.</p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/knowledge-sparks">Back to Browse</Link>
        </Button>
      </header>

      <section aria-label="Create spark form">
        <CreateSparkForm
          onCreated={(spark) => {
            if (spark?.slug) navigate(`/knowledge-sparks/${spark.slug}`);
          }}
        />
      </section>
    </main>
  );
};

export default KnowledgeSparkCreatePage;
