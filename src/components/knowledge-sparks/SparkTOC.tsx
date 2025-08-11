import React, { useEffect, useMemo, useState } from "react";
import type { SparkSection } from "@/hooks/useSparkSections";

export type HeadingItem = {
  id: string;
  text: string;
  level: number; // 1,2,3
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export function extractHeadings(html: string): { htmlWithIds: string; headings: HeadingItem[] } {
  if (!html) return { htmlWithIds: html, headings: [] };

  const container = document.createElement("div");
  container.innerHTML = html;

  const seen = new Map<string, number>();
  const headings: HeadingItem[] = [];

  (Array.from(container.querySelectorAll("h1, h2, h3")) as HTMLElement[]).forEach((el) => {
    const level = Number(el.tagName.replace("H", "")) as 1 | 2 | 3;
    const text = (el.textContent || "").trim();
    if (!text) return;

    let base = slugify(text);
    let id = base;
    if (seen.has(base)) {
      const count = (seen.get(base) || 0) + 1;
      seen.set(base, count);
      id = `${base}-${count}`;
    } else {
      seen.set(base, 0);
    }
    el.setAttribute("id", id);

    headings.push({ id, text, level });
  });

  return { htmlWithIds: container.innerHTML, headings };
}

interface SparkTOCProps {
  headings: HeadingItem[];
  canContribute?: boolean;
  onEditHere?: (id: string, text: string) => void;
  sections?: SparkSection[];
  currentUserId?: string;
  onDeleteSection?: (id: string, text: string) => void;
}

export const SparkTOC: React.FC<SparkTOCProps> = ({ headings, canContribute, onEditHere, sections, currentUserId, onDeleteSection }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sectionMap = useMemo(() => {
    const m = new Map<string, SparkSection>();
    (sections || []).forEach((s) => {
      if (s.anchor_id && !s.is_deleted) m.set(s.anchor_id, s);
    });
    return m;
  }, [sections]);

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop
          );
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "0px 0px -60% 0px", threshold: [0, 1] }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  const handleClick = (id: string) => {
    try { history.replaceState(null, "", `#${id}`); } catch { location.hash = id; }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label="Table of contents" className="text-xs text-muted-foreground">
      <div className="mb-2 font-medium text-foreground/90">Contents</div>
      <ul className="space-y-1">
        {headings.map((h) => {
          const isActive = activeId === h.id;
          const sec = sectionMap.get(h.id);
          const isOwner = !!(sec && currentUserId && sec.creator_id === currentUserId);
          return (
              <li key={h.id} className={h.level === 1 ? "pl-0" : h.level === 2 ? "pl-3" : "pl-6"}>
                <button
                  onClick={() => handleClick(h.id)}
                  className={`transition-colors ${isActive ? "text-foreground font-medium" : "hover:text-foreground"}`}
                >
                  {h.text}
                </button>
                {sec && (
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {isOwner ? "(yours)" : ""}
                    {sec.last_modified_at ? ` • ${new Date(sec.last_modified_at).toLocaleDateString()}` : ""}
                  </span>
                )}
                {canContribute && onEditHere && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditHere(h.id, h.text);
                    }}
                    className="ml-2 text-[10px] underline underline-offset-2 hover:text-foreground"
                    aria-label={`Edit section ${h.text}`}
                  >
                    Edit
                  </button>
                )}
                {sec && onDeleteSection && isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSection(h.id, h.text);
                    }}
                    className="ml-2 text-[10px] underline underline-offset-2 text-destructive/80 hover:text-destructive"
                    aria-label={`Delete section ${h.text}`}
                  >
                    Delete
                  </button>
                )}
              </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default SparkTOC;
