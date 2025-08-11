import { supabase } from "@/integrations/supabase/client";
import { isUuid } from "@/services/bookmarks";

/**
 * Fetch set of saved spark IDs for the current user among the provided sparkIds.
 * Returns an empty set if user is not authenticated.
 */
export const fetchSavedSparkIds = async (sparkIds: string[]): Promise<Set<string>> => {
  if (!sparkIds || sparkIds.length === 0) return new Set();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("spark_bookmarks")
    .select("spark_id")
    .in("spark_id", sparkIds);

  if (error) {
    console.warn("[sparkBookmarks] Error fetching saved spark ids:", error);
    return new Set();
  }
  return new Set((data || []).map((row: any) => row.spark_id));
};

/**
 * Persist a spark bookmark toggle. Inserts when shouldSave=true, deletes otherwise.
 */
export const persistSparkBookmarkToggle = async (sparkId: string, shouldSave: boolean) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  if (!isUuid(sparkId)) throw new Error("Invalid spark id");

  if (shouldSave) {
    const { error } = await supabase
      .from("spark_bookmarks")
      .insert({ user_id: user.id, spark_id: sparkId, bookmark_type: 'favorite' });
    if (error && error.code !== "23505") { // ignore unique violation
      throw error;
    }
  } else {
    const { error } = await supabase
      .from("spark_bookmarks")
      .delete()
      .eq("spark_id", sparkId)
      .eq("user_id", user.id);
    if (error) throw error;
  }
};
