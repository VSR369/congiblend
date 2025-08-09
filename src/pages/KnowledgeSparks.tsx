import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import SparksList from "@/components/knowledge-sparks/SparksList";

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

const KnowledgeSparksBrowsePage: React.FC = () => {
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    const saved = localStorage.getItem("spark-view-mode") as "card" | "list" | null;
    return saved === "list" ? "list" : "card"; // default to card
  });

  useEffect(() => {
    document.title = "Knowledge Sparks – Browse and Search";
    setMetaTag("description", "Browse and search Knowledge Sparks. Discover, explore, and open sparks to contribute.");
    setCanonical(window.location.href);
  }, []);

  useEffect(() => {
    localStorage.setItem("spark-view-mode", viewMode);
  }, [viewMode]);

  return (
    <main className="w-full max-w-screen-2xl mx-auto px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Sparks</h1>
          <p className="text-sm text-muted-foreground">Browse and search sparks. Click a card to read and contribute.</p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)} aria-label="View mode">
            <ToggleGroupItem value="card" aria-label="Card view" title="Card view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" title="List view">
              <ListIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button asChild>
            <Link to="/knowledge-sparks/new">Create Spark</Link>
          </Button>
        </div>
      </header>
      <section aria-label="Sparks list">
        <SparksList viewMode={viewMode} onSelect={(spark) => navigate(`/knowledge-sparks/${spark.slug}`)} selectedId={null} />
      </section>
    </main>
  );
};

export default KnowledgeSparksBrowsePage;
