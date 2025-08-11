import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import SparksList from "@/components/knowledge-sparks/SparksList";
import { Switch } from "@/components/ui/switch";
import { FeedErrorBoundary } from "@/components/ui/feed-error-boundary";

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
  const [searchParams, setSearchParams] = useSearchParams();

  const urlView = (searchParams.get("view") as "card" | "list" | null) ?? null;
  const urlSaved = searchParams.get("saved");

  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    const saved = urlView || (localStorage.getItem("spark-view-mode") as "card" | "list" | null);
    return saved === "list" ? "list" : "card"; // default to card
  });

  const [savedOnly, setSavedOnly] = useState<boolean>(() => {
    if (urlSaved != null) return urlSaved === "1";
    return localStorage.getItem("spark-saved-only") === "1";
  });

  const [showWatchdog, setShowWatchdog] = useState(false);

  useEffect(() => {
    document.title = "Knowledge Sparks – Browse and Search";
    setMetaTag("description", "Browse and search Knowledge Sparks. Discover, explore, and open sparks to contribute.");
    setCanonical(window.location.href);
  }, []);

  useEffect(() => {
    localStorage.setItem("spark-view-mode", viewMode);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("view", viewMode);
      return next;
    }, { replace: true });
  }, [viewMode, setSearchParams]);

  useEffect(() => {
    localStorage.setItem("spark-saved-only", savedOnly ? "1" : "0");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("saved", savedOnly ? "1" : "0");
      return next;
    }, { replace: true });
  }, [savedOnly, setSearchParams]);

  // Loading watchdog: if nothing happens for 6s, show retry helper
  useEffect(() => {
    const t = window.setTimeout(() => setShowWatchdog(true), 6000);
    return () => window.clearTimeout(t);
  }, []);


  return (
    <FeedErrorBoundary>
      <main className="w-full max-w-screen-2xl mx-auto px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Sparks</h1>
            <p className="text-sm text-muted-foreground">Browse and search sparks. Click a card to read and contribute.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)} aria-label="View mode">
                <ToggleGroupItem value="card" aria-label="Card view" title="Card view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view" title="List view">
                  <ListIcon className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground" htmlFor="saved-only">Saved only</label>
              <Switch id="saved-only" checked={savedOnly} onCheckedChange={setSavedOnly} aria-label="Show saved sparks only" />
            </div>
            <Button asChild>
              <Link to="/knowledge-sparks/new">Create Spark</Link>
            </Button>
          </div>
        </header>
        {showWatchdog && (
          <div className="mb-4 text-xs text-muted-foreground flex items-center gap-2">
            Having trouble loading? <button className="underline" onClick={() => window.location.reload()}>Reload</button>
          </div>
        )}
        <section aria-label="Sparks list">
          <SparksList viewMode={viewMode} onSelect={(spark) => navigate(`/knowledge-sparks/${spark.slug}`)} selectedId={null} savedOnly={savedOnly} />
        </section>
      </main>
    </FeedErrorBoundary>
  );
};

export default KnowledgeSparksBrowsePage;
