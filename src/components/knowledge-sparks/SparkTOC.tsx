import React from "react";

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
  if (!headings.length) return null;
  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label="Table of contents" className="text-xs text-muted-foreground">
      <div className="mb-2 font-medium text-foreground/90">Contents</div>
      <ul className="space-y-1">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 1 ? "pl-0" : h.level === 2 ? "pl-3" : "pl-6"}>
            <button
              onClick={() => handleClick(h.id)}
              className="hover:text-foreground transition-colors"
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SparkTOC;
