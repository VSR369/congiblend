
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the current user is the author of the given spark.
 * Uses the security-definer SQL function public.is_spark_author.
 */
export const useIsSparkAuthor = (sparkId: string | null | undefined) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["spark", sparkId, "isAuthor"],
    enabled: Boolean(sparkId),
    queryFn: async () => {
      if (!sparkId) return false;
      const { data, error } = await supabase.rpc("is_spark_author", { p_spark_id: sparkId });
      if (error) {
        console.warn("is_spark_author RPC error:", error);
        return false;
      }
      return Boolean(data);
    },
    staleTime: 1000 * 30,
  });

  return {
    isAuthor: Boolean(data),
    isLoading,
    error,
  };
};
