
import { useCallback } from "react";

/**
 * Polls have been removed from the app. This hook is a no-op shim so existing
 * components that still import/use it can compile and show a "polls disabled"
 * state without enabling any functionality.
 */
type UsePollResultsReturn = {
  results: null;
  loading: boolean;
  voting: boolean;
  statusLabel: string;
  castVote: (optionIndex: number) => Promise<never>;
  refresh: () => void;
};

export function usePollResults(_pollId?: string): UsePollResultsReturn {
  const statusLabel = "Polls are disabled";

  const castVote = useCallback(async (_optionIndex: number) => {
    // Intentionally reject to prevent any optimistic UI like "Vote submitted"
    console.warn("Poll vote attempted while polls are disabled.");
    throw new Error("Polls disabled");
  }, []);

  const refresh = useCallback(() => {
    console.info("Poll refresh attempted while polls are disabled.");
  }, []);

  return {
    results: null,
    loading: false,
    voting: false,
    statusLabel,
    castVote,
    refresh,
  };
}
