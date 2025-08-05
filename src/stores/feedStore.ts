import { create } from 'zustand';
import type { Post, FeedSettings, CreatePostData, ReactionType } from '@/types/feed';
import { supabase } from '@/integrations/supabase/client';

interface FeedState {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  feedSettings: FeedSettings;
  
  // Actions
  loadPosts: (reset?: boolean) => Promise<void>;
  createPost: (data: CreatePostData) => Promise<void>;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  deletePost: (postId: string) => void;
  
  // Engagement actions
  toggleReaction: (postId: string, reaction: ReactionType) => void;
  addComment: (postId: string, content: string, parentId?: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  toggleSave: (postId: string) => void;
  sharePost: (postId: string) => void;
  
  // Settings
  updateFeedSettings: (settings: Partial<FeedSettings>) => void;
}

// Helper function to transform database post to our Post type
const transformDbPost = (dbPost: any, author: any): Post => {
  return {
    id: dbPost.id,
    type: dbPost.post_type || 'text',
    author: {
      id: author.id,
      name: author.display_name || author.username,
      username: author.username,
      avatar: author.avatar_url,
      verified: author.is_verified || false,
    },
    content: dbPost.content,
    media: dbPost.images ? dbPost.images.map((url: string, index: number) => ({
      id: `${dbPost.id}-${index}`,
      type: 'image' as const,
      url,
      alt: 'Post image'
    })) : [],
    hashtags: extractHashtags(dbPost.content),
    mentions: [],
    reactions: [],
    comments: [],
    shares: dbPost.shares_count || 0,
    saves: 0,
    views: 0,
    createdAt: new Date(dbPost.created_at),
    updatedAt: dbPost.updated_at ? new Date(dbPost.updated_at) : undefined,
    edited: false,
    isPinned: dbPost.is_pinned || false,
    visibility: dbPost.visibility || 'public',
  };
};

// Helper function to extract hashtags from content
const extractHashtags = (content: string): string[] => {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  return content.match(hashtagRegex) || [];
};

export const useFeedStore = create<FeedState>((set, get) => {
  let realtimeChannel: any = null;

  return {
    posts: [],
    loading: false,
    hasMore: true,
    feedSettings: {
      showRecentFirst: true,
      contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event', 'job'],
      showFromConnections: true,
      showFromCompanies: true,
      showTrending: true,
      filterHashtags: []
    },

    loadPosts: async (reset = false) => {
      const state = get();
      if (state.loading) return;

      set({ loading: true });

      try {
        // Get posts with author information
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            user:user_id (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(20);

        if (postsError) throw postsError;

        // Transform posts to our format
        const transformedPosts = postsData?.map((dbPost) => 
          transformDbPost(dbPost, dbPost.user)
        ) || [];

        set({ 
          posts: reset ? transformedPosts : [...state.posts, ...transformedPosts],
          loading: false,
          hasMore: transformedPosts.length === 20
        });

        // Set up real-time subscription for new posts (only once)
        if (!realtimeChannel) {
          realtimeChannel = supabase
            .channel('posts-changes')
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'posts'
              },
              async (payload) => {
                // Get author info for new post
                const { data: authorData } = await supabase
                  .from('users')
                  .select('id, username, display_name, avatar_url, is_verified')
                  .eq('id', payload.new.user_id)
                  .single();

                if (authorData) {
                  const newPost = transformDbPost(payload.new, authorData);
                  set(state => ({
                    posts: [newPost, ...state.posts]
                  }));
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'DELETE',
                schema: 'public',
                table: 'posts'
              },
              (payload) => {
                set(state => ({
                  posts: state.posts.filter(post => post.id !== payload.old.id)
                }));
              }
            )
            .subscribe();
        }

      } catch (error) {
        console.error('Error loading posts:', error);
        set({ loading: false });
      }
    },

    createPost: async (data: CreatePostData) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check if user exists in users table, if not create them
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingUser) {
          // Create user record
          await supabase
            .from('users')
            .insert({
              id: user.id,
              username: user.email?.split('@')[0] || 'user',
              display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }

        const { error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            content: data.content,
            post_type: data.type,
            visibility: data.visibility,
            hashtags: data.hashtags || [],
            mentions: data.mentions || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        // Post will be added via real-time subscription
      } catch (error) {
        console.error('Error creating post:', error);
        throw error;
      }
    },

    updatePost: (postId: string, updates: Partial<Post>) => {
      set(state => ({
        posts: state.posts.map(post =>
          post.id === postId ? { ...post, ...updates } : post
        )
      }));
    },

    deletePost: async (postId: string) => {
      try {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId);

        if (error) throw error;

        // Post will be removed via real-time subscription
      } catch (error) {
        console.error('Error deleting post:', error);
        throw error;
      }
    },

    toggleReaction: async (postId: string, reaction: ReactionType) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check if reaction already exists
        const { data: existingReaction } = await supabase
          .from('reactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('target_type', 'post')
          .eq('target_id', postId)
          .single();

        if (existingReaction) {
          // Remove reaction
          await supabase
            .from('reactions')
            .delete()
            .eq('id', existingReaction.id);
        } else {
          // Add reaction
          await supabase
            .from('reactions')
            .insert({
              user_id: user.id,
              target_type: 'post',
              target_id: postId,
              reaction_type: reaction
            });
        }

        // Update local state optimistically
        set(state => ({
          posts: state.posts.map(post => {
            if (post.id === postId) {
              const userReaction = post.reactions.find(r => r.user.id === user.id);
              if (userReaction) {
                return {
                  ...post,
                  reactions: post.reactions.filter(r => r.user.id !== user.id),
                  userReaction: undefined
                };
              } else {
                return {
                  ...post,
                  reactions: [...post.reactions, {
                    id: `temp-${Date.now()}`,
                    type: reaction,
                    user: { id: user.id, name: '', username: '' },
                    createdAt: new Date()
                  }],
                  userReaction: reaction
                };
              }
            }
            return post;
          })
        }));
      } catch (error) {
        console.error('Error toggling reaction:', error);
        throw error;
      }
    },

    addComment: async (postId: string, content: string, parentId?: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
          .from('comments')
          .insert({
            post_id: postId,
            user_id: user.id,
            content,
            parent_id: parentId || null
          });

        if (error) throw error;

        // Comment will be added via real-time subscription or optimistic update
        const newComment = {
          id: `temp-${Date.now()}`,
          content,
          author: {
            id: user.id,
            name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
            avatar: user.user_metadata?.avatar_url
          },
          createdAt: new Date(),
          reactions: [],
          parentId
        };

        set(state => ({
          posts: state.posts.map(post => {
            if (post.id !== postId) return post;
            
            return {
              ...post,
              comments: [...post.comments, newComment]
            };
          })
        }));
      } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
      }
    },

    deleteComment: async (postId: string, commentId: string) => {
      try {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);

        if (error) throw error;

        set(state => ({
          posts: state.posts.map(post => {
            if (post.id !== postId) return post;
            
            return {
              ...post,
              comments: post.comments.filter(c => c.id !== commentId)
            };
          })
        }));
      } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
      }
    },

    toggleSave: (postId: string) => {
      // This would require a separate saves table - for now just update locally
      set(state => ({
        posts: state.posts.map(post => {
          if (post.id !== postId) return post;
          
          return {
            ...post,
            userSaved: !post.userSaved,
            saves: post.userSaved ? post.saves - 1 : post.saves + 1
          };
        })
      }));
    },

    sharePost: async (postId: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
          .from('shares')
          .insert({
            user_id: user.id,
            target_type: 'post',
            target_id: postId,
            share_type: 'share'
          });

        if (error) throw error;

        set(state => ({
          posts: state.posts.map(post => {
            if (post.id !== postId) return post;
            
            return {
              ...post,
              userShared: true,
              shares: post.shares + 1
            };
          })
        }));
      } catch (error) {
        console.error('Error sharing post:', error);
        throw error;
      }
    },

    updateFeedSettings: (settings: Partial<FeedSettings>) => {
      set(state => ({
        feedSettings: { ...state.feedSettings, ...settings }
      }));
    }
  };
});