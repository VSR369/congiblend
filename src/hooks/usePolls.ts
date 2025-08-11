
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PollOptionResult = {
  text: string;
  votes: number;
  percentage: number;
};

export type PollResults = {
  postId: string;
  total: number;
  options: PollOptionResult[];
  expiresAt?: Date | null;
  closed: boolean;
  userSelected?: number | null;
};

type RpcGetPollResults = {
  post_id: string;
  expires_at: string | null;
  closed: boolean;
  total: number;
  user_selected: number | null;
  options: Array<{ text: string; votes: number; percentage: number }>;
};

export function usePollResults(postId?: string) {
  const [results, setResults] = useState<PollResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc("get_poll_results", {
        p_post_id: postId,
      });
      if (error) throw error;

      const d = data as RpcGetPollResults;
      setResults({
        postId: d.post_id,
        total: d.total,
        options: d.options ?? [],
        expiresAt: d.expires_at ? new Date(d.expires_at) : null,
        closed: Boolean(d.closed),
        userSelected: d.user_selected ?? null,
      });
    } catch (e: any) {
      console.error("get_poll_results failed", e);
      setError(e?.message || "Failed to load poll");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const castVote = useCallback(
    async (optionIndex: number) => {
      if (!postId) return;
      setVoting(true);
      setError(null);
      try {
        // Ensure user is signed in
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          throw new Error("AUTH_REQUIRED");
        }

        const { error } = await supabase.rpc("cast_poll_vote", {
          p_post_id: postId,
          p_option_index: optionIndex,
        });
        if (error) throw error;

        // Refresh to get authoritative counts and selection
        await refresh();
      } catch (e: any) {
        console.error("cast_poll_vote failed", e);
        setError(e?.message || "Failed to submit vote");
        throw e; // let caller decide toast
      } finally {
        setVoting(false);
      }
    },
    [postId, refresh]
  );

  useEffect(() => {
    if (postId) refresh();
  }, [postId, refresh]);

  const statusLabel = useMemo(() => {
    if (!results) return "";
    if (results.closed) {
      const closedOn = results.expiresAt
        ? results.expiresAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
        : "";
      return `${results.total} votes · Closed${closedOn ? ` on ${closedOn}` : ""}`;
    }
    // Active
    const now = new Date();
    const end = results.expiresAt ? results.expiresAt : null;
    let endsIn = "";
    if (end) {
      const diff = end.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      if (days >= 1) {
        endsIn = `${days}d${hours > 0 ? ` ${hours}h` : ""}`;
      } else {
        const mins = Math.max(1, Math.floor((diff / (1000 * 60)) % 60));
        endsIn = `${hours}h ${mins}m`;
      }
    }
    return `${results.total} votes${endsIn ? ` · Ends in ${endsIn}` : ""}`;
  }, [results]);

  return {
    results,
    loading,
    voting,
    error,
    refresh,
    castVote,
    statusLabel,
  };
}
