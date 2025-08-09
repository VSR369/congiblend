import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the current user can delete the given spark.
 * Uses the security-definer SQL function public.can_delete_spark.
 */
export const useCanDeleteSpark = (sparkId: string | null | undefined) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["spark", sparkId, "canDelete"],
    enabled: Boolean(sparkId),
    queryFn: async () => {
      if (!sparkId) return false;
      const { data, error } = await (supabase as any).rpc("can_delete_spark", { p_spark_id: sparkId });
      if (error) {
        console.warn("can_delete_spark RPC error:", error);
        return false;
      }
      return Boolean(data);
    },
    staleTime: 1000 * 30,
  });

  return {
    canDelete: Boolean(data),
    isLoading,
    error,
  };
};
