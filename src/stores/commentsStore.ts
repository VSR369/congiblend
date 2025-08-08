import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Comment, CommentRecord } from "@/types/comments";
import type { User } from "@/types/feed";

interface PostCommentsState {
  comments: Comment[];
  flat: Comment[];
  loading: boolean;
  error?: string;
  channelId?: string;
}

interface CommentsStore {
  byPostId: Record<string, PostCommentsState>;
  load: (postId: string) => Promise<void>;
  add: (postId: string, content: string, parentId?: string | null) => Promise<void>;
  toggleSoftDelete: (postId: string, commentId: string, isDeleted: boolean) => Promise<void>;
  subscribe: (postId: string) => void;
  unsubscribe: (postId: string) => void;
}

function buildThread(comments: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];
  comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  map.forEach((c) => {
    if (c.parent_id) {
      const parent = map.get(c.parent_id);
      if (parent) parent.children!.push(c);
      else roots.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}

async function enrichAuthors(rows: CommentRecord[]): Promise<Record<string, Partial<User>>> {
  const ids = Array.from(new Set(rows.map((r) => r.user_id))).filter(Boolean);
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_verified")
    .in("id", ids);
  if (error) {
    console.warn("profiles fetch error", error);
    return {};
  }
  const map: Record<string, Partial<User>> = {};
  for (const p of data as any[]) {
    map[p.id] = {
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      verified: p.is_verified,
      name: p.display_name || p.username || "User",
    } as Partial<User>;
  }
  return map;
}

export const useCommentsStore = create<CommentsStore>((set, get) => ({
  byPostId: {},

  load: async (postId: string) => {
    const current = get().byPostId[postId];
    set({ byPostId: { ...get().byPostId, [postId]: { ...(current || { comments: [], flat: [] }), loading: true, error: undefined } } });

    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      set({ byPostId: { ...get().byPostId, [postId]: { comments: [], flat: [], loading: false, error: error.message } } });
      return;
    }

    const authorMap = await enrichAuthors((data || []) as CommentRecord[]);
    const flat: Comment[] = (data || []).map((r: any) => ({
      ...(r as CommentRecord),
      author: authorMap[r.user_id] || null,
    }));
    const threaded = buildThread(flat);
    set({ byPostId: { ...get().byPostId, [postId]: { comments: threaded, flat, loading: false } } });
  },

  add: async (postId: string, content: string, parentId?: string | null) => {
    const { data: user } = await supabase.auth.getUser();
    const uid = user.user?.id;
    if (!uid) throw new Error("Not authenticated");

    // Fetch current user's profile for optimistic comment
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_verified")
      .eq("id", uid)
      .single();

    const userProfile = profile ? {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      verified: profile.is_verified,
      name: profile.display_name || profile.username || "User",
    } : {
      id: uid,
      username: user.user?.email?.split('@')[0] || "User",
      name: user.user?.email?.split('@')[0] || "User",
    };

    const insert = { post_id: postId, user_id: uid, content, parent_id: parentId || null };
    // optimistic
    const tempId = `temp_${Date.now()}`;
    const current = get().byPostId[postId] || { comments: [], flat: [], loading: false };
    const optimistic: Comment = {
      id: tempId,
      post_id: postId,
      user_id: uid,
      parent_id: parentId || null,
      content,
      content_type: "text",
      metadata: {},
      is_deleted: false,
      reactions_count: 0,
      replies_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: userProfile,
    };
    const flat = [...current.flat, optimistic];
    const threaded = buildThread(flat);
    set({ byPostId: { ...get().byPostId, [postId]: { ...current, flat, comments: threaded } } });

    const { data, error } = await supabase.from("comments").insert(insert).select("*").single();
    if (error) {
      // rollback
      const rolledFlat = current.flat.filter((c) => c.id !== tempId);
      set({ byPostId: { ...get().byPostId, [postId]: { ...current, flat: rolledFlat, comments: buildThread(rolledFlat) } } });
      throw error;
    }

    // reconcile temp id
    const reconciledFlat = get().byPostId[postId].flat.map((c) => (c.id === tempId ? (data as any) : c));
    set({ byPostId: { ...get().byPostId, [postId]: { ...get().byPostId[postId], flat: reconciledFlat, comments: buildThread(reconciledFlat) } } });

    // Parse and insert @mentions (support both UUIDs and @usernames)
    try {
      const ids = new Set<string>();

      // 1) UUID mentions (backward compatible)
      const uuidRegex = /@([0-9a-fA-F-]{36})\b/g;
      let m: RegExpExecArray | null;
      while ((m = uuidRegex.exec(content)) !== null) {
        const mentionedId = m[1];
        if (mentionedId && mentionedId !== uid) ids.add(mentionedId);
      }

      // 2) Username mentions: capture tokens like @username
      // Allow letters, numbers, underscore, dot and hyphen
      const usernameRegex = /(^|\s)@([a-zA-Z0-9_.-]{2,32})\b/g;
      const usernames = new Set<string>();
      while ((m = usernameRegex.exec(content)) !== null) {
        const uname = m[2];
        if (uname) usernames.add(uname.toLowerCase());
      }

      if (usernames.size > 0) {
        const { data: profiles, error: profErr } = await supabase
          .from('profiles')
          .select('id, username')
          .in('username', Array.from(usernames));
        if (!profErr && profiles) {
          for (const p of profiles as any[]) {
            if (p.id !== uid) ids.add(p.id);
          }
        }
      }

      if (ids.size > 0) {
        const rows = Array.from(ids).map((mentioned_user_id) => ({ comment_id: (data as any).id, mentioned_user_id }));
        await supabase.from('comment_mentions').insert(rows);
      }
    } catch (e) {
      console.warn('Failed to insert comment mentions', e);
    }
  },
  toggleSoftDelete: async (postId: string, commentId: string, isDeleted: boolean) => {
    const { error } = await supabase.from("comments").update({ is_deleted: isDeleted }).eq("id", commentId);
    if (error) throw error;
    // local update
    const current = get().byPostId[postId];
    if (!current) return;
    const flat = current.flat.map((c) => (c.id === commentId ? { ...c, is_deleted: isDeleted } : c));
    set({ byPostId: { ...get().byPostId, [postId]: { ...current, flat, comments: buildThread(flat) } } });
  },

  subscribe: (postId: string) => {
    const channelId = `comments-post-${postId}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const current = get().byPostId[postId] || { comments: [], flat: [], loading: false };
          let flat = current.flat.slice();
          if (payload.eventType === 'INSERT') {
            flat = [...flat, payload.new as any];
          } else if (payload.eventType === 'UPDATE') {
            flat = flat.map((c) => (c.id === (payload.new as any).id ? (payload.new as any) : c));
          } else if (payload.eventType === 'DELETE') {
            flat = flat.filter((c) => c.id !== (payload.old as any).id);
          }
          set({ byPostId: { ...get().byPostId, [postId]: { ...current, flat, comments: buildThread(flat) } } });
        }
      )
      .subscribe();

    const current = get().byPostId[postId] || { comments: [], flat: [], loading: false };
    set({ byPostId: { ...get().byPostId, [postId]: { ...current, channelId } } });
  },

  unsubscribe: (postId: string) => {
    const state = get().byPostId[postId];
    if (state?.channelId) {
      const channel = (supabase as any).getChannels?.().find((c: any) => c.topic === state.channelId);
      if (channel) supabase.removeChannel(channel);
      const { channelId, ...rest } = state as any;
      set({ byPostId: { ...get().byPostId, [postId]: rest } });
    }
  },
}));
