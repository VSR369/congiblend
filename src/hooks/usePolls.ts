
import { useCallback } from "react";

type PollOption = {
  text: string;
  votes: number;
  percentage: number;
};

type PollResults = {
  options: PollOption[];
  userSelected: number | null;
  closed: boolean;
};

type UsePollResultsReturn = {
  results: PollResults; // Always non-null to satisfy existing components
  loading: boolean;
  voting: boolean;
  statusLabel: string;
  castVote: (optionIndex: number) => Promise<never>;
  refresh: () => void;
};

/**
 * Polls have been removed from the app.
 * This hook returns a non-null, closed, empty result so existing components compile,
 * while still preventing any poll interaction.
 */
export function usePollResults(_pollId?: string): UsePollResultsReturn {
  const statusLabel = "Polls are disabled";

  const castVote = useCallback(async (_optionIndex: number) => {
    console.warn("Poll vote attempted while polls are disabled.");
    throw new Error("Polls disabled");
  }, []);

  const refresh = useCallback(() => {
    console.info("Poll refresh attempted while polls are disabled.");
  }, []);

  const results: PollResults = {
    options: [],
    userSelected: null,
    closed: true,
  };

  return {
    results,
    loading: false,
    voting: false,
    statusLabel,
    castVote,
    refresh,
  };
}

