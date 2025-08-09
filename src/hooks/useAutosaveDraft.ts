import { useEffect, useMemo, useRef, useState } from "react";

interface DraftData {
  contentHtmlDraft: string;
  changeSummary: string;
  editMode: string;
  selectedHeadingId?: string | null;
}

/**
 * Simple localStorage-based autosave for edit drafts.
 * - Keyed by a stable storageKey (e.g., `sparkDraft:${sparkId}`)
 * - Debounced writes
 * - Exposes loadedDraft and a clearDraft() helper
 */
export const useAutosaveDraft = (storageKey: string, data: DraftData, debounceMs = 600) => {
  const [loadedDraft, setLoadedDraft] = useState<DraftData | null>(null);
  const firstLoadRef = useRef(true);

  // Load once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLoadedDraft(JSON.parse(raw));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Debounced save
  const toSave = useMemo(() => data, [data]);
  useEffect(() => {
    // Avoid writing immediately on first mount if we just loaded a draft
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      } catch {}
    }, debounceMs);
    return () => clearTimeout(t);
  }, [storageKey, toSave, debounceMs]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey);
      setLoadedDraft(null);
    } catch {}
  };

  return { loadedDraft, clearDraft };
};
