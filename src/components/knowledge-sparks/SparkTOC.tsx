import React, { useEffect, useState } from "react";

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
}

export const SparkTOC: React.FC<SparkTOCProps> = ({ headings }) => {
  const [activeId, setActiveId] = useState<string | null>(null);

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
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label="Table of contents" className="text-xs text-muted-foreground">
      <div className="mb-2 font-medium text-foreground/90">Contents</div>
      <ul className="space-y-1">
        {headings.map((h) => {
          const isActive = activeId === h.id;
          return (
            <li key={h.id} className={h.level === 1 ? "pl-0" : h.level === 2 ? "pl-3" : "pl-6"}>
              <button
                onClick={() => handleClick(h.id)}
                className={`transition-colors ${isActive ? "text-foreground font-medium" : "hover:text-foreground"}`}
              >
                {h.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default SparkTOC;
