
import { supabase } from "@/integrations/supabase/client";

/**
 * Utility to check if a string is a UUID (v4 style).
 */
export const isUuid = (id: string) => /^[0-9a-fA-F-]{36}$/.test(id);

/**
 * Fetch set of saved post IDs for the current user among the provided postIds.
 * Returns an empty set if user is not authenticated.
 */
export const fetchSavedPostIds = async (postIds: string[]): Promise<Set<string>> => {
  if (!postIds || postIds.length === 0) return new Set();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("[bookmarks] No authenticated user, skipping saved IDs fetch");
    return new Set();
  }

  const { data, error } = await supabase
    .from("post_bookmarks")
    .select("post_id")
    .in("post_id", postIds);

  if (error) {
    console.warn("[bookmarks] Error fetching saved post ids:", error);
    return new Set();
  }

  const savedIds = new Set((data || []).map((row: any) => row.post_id));
  console.log("[bookmarks] Saved post ids fetched:", savedIds);
  return savedIds;
};

/**
 * Persist a bookmark toggle. Inserts when shouldSave=true, deletes otherwise.
 */
export const persistBookmarkToggle = async (postId: string, shouldSave: boolean) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  if (!isUuid(postId)) {
    // Guard against optimistic posts or invalid ids
    throw new Error("Post is still publishing. Please try again in a moment.");
  }

  if (shouldSave) {
    const { error } = await supabase
      .from("post_bookmarks")
      .insert({ user_id: user.id, post_id: postId });
    if (error && error.code !== "23505") { // ignore unique violation (already saved)
      throw error;
    }
  } else {
    const { error } = await supabase
      .from("post_bookmarks")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) throw error;
  }
};
