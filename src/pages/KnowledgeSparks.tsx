import React, { useEffect } from "react";
import KnowledgeSparksPanel from "@/components/knowledge-sparks/KnowledgeSparksPanel";
import { useParams } from "react-router-dom";

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

const KnowledgeSparksPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();

  useEffect(() => {
    const title = slug
      ? `${slug} – Knowledge Sparks`
      : "Knowledge Sparks – Collaborative Wiki";
    document.title = title;
    setMetaTag("description", "Knowledge Sparks – collaborative wiki-style knowledge base for sharing and refining knowledge.");
    setCanonical(window.location.href);
  }, [slug]);

  return (
    <main className="w-full max-w-screen-2xl mx-auto px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Knowledge Sparks</h1>
        <p className="text-sm text-muted-foreground">Collaborative wiki-style knowledge base.</p>
      </header>
      <section>
        <KnowledgeSparksPanel initialSlug={slug} />
      </section>
    </main>
  );
};

export default KnowledgeSparksPage;
