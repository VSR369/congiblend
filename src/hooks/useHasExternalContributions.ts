import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the spark has external contributions (edits by users other than the author).
 * Backed by the security-definer SQL function public.has_external_contributions.
 */
export const useHasExternalContributions = (sparkId: string | null | undefined) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["spark", sparkId, "hasExternalContributions"],
    enabled: Boolean(sparkId),
    queryFn: async () => {
      if (!sparkId) return false;
      const { data, error } = await (supabase as any).rpc("has_external_contributions", { p_spark_id: sparkId });
      if (error) {
        console.warn("has_external_contributions RPC error:", error);
        return false;
      }
      return Boolean(data);
    },
    staleTime: 1000 * 30,
  });

  return {
    hasExternal: Boolean(data),
    isLoading,
    error,
  };
};
