import { create } from 'zustand';
import type { Post, FeedSettings, CreatePostData, ReactionType, PostType, User } from '@/types/feed';

import { supabase } from '@/integrations/supabase/client';

export interface FeedFilters {
  userFilter: 'all' | 'my_posts' | 'others' | string; // 'string' for specific user
  contentTypes: PostType[];
  timeRange: 'recent' | 'week' | 'month' | 'all';
}

interface FeedState {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  feedSettings: FeedSettings;
  filters: FeedFilters;
  users: User[];
  
  // Actions
  loadPosts: (reset?: boolean) => Promise<void>;
  loadUsers: () => Promise<void>;
  createPost: (data: CreatePostData) => Promise<void>;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  deletePost: (postId: string) => void;
  
  // Engagement actions
  toggleReaction: (postId: string, reaction: ReactionType | null) => Promise<void>;
  toggleCommentReaction: (commentId: string, postId: string, reaction: ReactionType | null) => Promise<void>;
  addComment: (postId: string, content: string, parentId?: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  toggleSave: (postId: string) => void;
  sharePost: (postId: string) => void;
  
  // Poll actions
  votePoll: (postId: string, optionIndex: number) => Promise<any>;
  
  // Settings
  updateFeedSettings: (settings: Partial<FeedSettings>) => void;
  updateFilters: (filters: Partial<FeedFilters>) => void;
}

// Helper function to transform database post to our Post type
const transformDbPost = (dbPost: any, author: any, currentUserId?: string): Post => {
  console.log('🔄 Transforming post:', dbPost.id, 'type:', dbPost.post_type, 'media_urls:', dbPost.media_urls);
  console.log('🔍 Raw post data:', JSON.stringify(dbPost, null, 2));
  
  // Handle media_urls array and transform to proper media format
  let media = [];
  if (dbPost.media_urls && Array.isArray(dbPost.media_urls) && dbPost.media_urls.length > 0) {
    console.log('📷 Processing media URLs:', dbPost.media_urls);
    media = dbPost.media_urls.map((url: string, index: number) => {
      // Try to get MIME type from metadata if available
      const mimeType = dbPost.metadata?.media?.[index]?.mimeType;
      const mediaType = determineMediaType(url, mimeType);
      console.log('📷 Media item:', { url, type: mediaType, mimeType });
      
      return {
        id: `${dbPost.id}-${index}`,
        type: mediaType,
        url,
        alt: `${mediaType} ${index + 1}`,
        thumbnail: dbPost.thumbnail_url || (mediaType === 'video' ? url : undefined),
        duration: dbPost.metadata?.media?.[index]?.duration,
        size: dbPost.metadata?.media?.[index]?.size
      };
    });
    console.log('✅ Final media array:', media);
  } else {
    console.log('❌ No media_urls found or empty array');
  }
  
  // Legacy fallback for images field
  if (media.length === 0 && dbPost.images && Array.isArray(dbPost.images)) {
    console.log('🔄 Using legacy images field:', dbPost.images);
    media = dbPost.images.map((url: string, index: number) => ({
      id: `${dbPost.id}-${index}`,
      type: 'image' as const,
      url,
      alt: 'Post image'
    }));
  }

  // Transform reactions from database
  const reactions = dbPost.reactions?.map((reaction: any) => ({
    id: reaction.id,
    type: reaction.reaction_type,
    user: {
      id: reaction.user_id,
      name: reaction.profiles?.display_name || reaction.profiles?.username || 'User',
      username: reaction.profiles?.username || 'user'
    },
    createdAt: reaction.created_at ? new Date(reaction.created_at) : new Date()
  })) || [];

  // Find current user's reaction
  const userReaction = currentUserId 
    ? reactions.find(r => r.user.id === currentUserId)?.type
    : undefined;

  // Transform comments from database
  const comments = dbPost.comments?.map((comment: any) => ({
    id: comment.id,
    content: comment.content,
    author: {
      id: comment.user_id,
      name: comment.profiles?.display_name || comment.profiles?.username || 'User',
      username: comment.profiles?.username || 'user',
      avatar: comment.profiles?.avatar_url
    },
    createdAt: comment.created_at ? new Date(comment.created_at) : new Date(),
    parentId: comment.parent_comment_id,
    reactions: comment.reactions?.map((reaction: any) => ({
      id: reaction.id,
      type: reaction.reaction_type,
      user: {
        id: reaction.user_id,
        name: reaction.profiles?.display_name || reaction.profiles?.username || 'User',
        username: reaction.profiles?.username || 'user'
      },
      createdAt: reaction.created_at ? new Date(reaction.created_at) : new Date()
    })) || [],
    reactionsCount: comment.reactions_count || 0,
    replies: []
  })) || [];

  // Transform poll_data to poll object
  let poll = undefined;
  if (dbPost.poll_data && dbPost.poll_data.options) {
    console.log('Transforming poll data:', dbPost.poll_data);
    const totalVotes = dbPost.poll_data.options.reduce((sum: number, option: any) => sum + (option.votes || 0), 0);
    poll = {
      id: `${dbPost.id}-poll`,
      question: dbPost.content, // Use post content as question
      options: dbPost.poll_data.options.map((option: any, index: number) => ({
        id: `${dbPost.id}-option-${index}`,
        text: option.text,
        votes: option.votes || 0,
        percentage: totalVotes > 0 ? Math.round((option.votes || 0) / totalVotes * 100) : 0
      })),
      totalVotes,
      expiresAt: dbPost.poll_data.expires_at && !isNaN(new Date(dbPost.poll_data.expires_at).getTime()) ? new Date(dbPost.poll_data.expires_at) : undefined,
      allowMultiple: dbPost.poll_data.multiple_choice || false,
      userVote: undefined // TODO: Get user's vote from database
    };
    console.log('Transformed poll:', poll);
  }

  // Transform event_data to event object
  let event = undefined;
  if (dbPost.event_data) {
    event = {
      id: `${dbPost.id}-event`,
      title: dbPost.event_data.title,
      description: dbPost.event_data.description,
      startDate: dbPost.event_data.start_date && !isNaN(new Date(dbPost.event_data.start_date).getTime()) ? new Date(dbPost.event_data.start_date) : new Date(),
      endDate: dbPost.event_data.end_date && !isNaN(new Date(dbPost.event_data.end_date).getTime()) ? new Date(dbPost.event_data.end_date) : undefined,
      location: dbPost.event_data.location,
      isVirtual: dbPost.event_data.is_virtual || false,
      attendees: dbPost.event_data.attendees || 0,
      maxAttendees: dbPost.event_data.max_attendees,
      userRSVP: dbPost.event_data.user_rsvp || undefined
    };
  }

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
    media,
    poll,
    event,
    hashtags: extractHashtags(dbPost.content),
    mentions: [],
    reactions,
    comments,
    commentsCount: dbPost.comments_count || 0,
    likes: dbPost.likes_count || 0,
    shares: dbPost.shares_count || 0,
    sharesCount: dbPost.shares_count || 0,
    saves: 0,
    views: 0,
    createdAt: dbPost.created_at && !isNaN(new Date(dbPost.created_at).getTime()) ? new Date(dbPost.created_at) : new Date(),
    updatedAt: dbPost.updated_at && !isNaN(new Date(dbPost.updated_at).getTime()) ? new Date(dbPost.updated_at) : undefined,
    edited: false,
    isPinned: dbPost.is_pinned || false,
    visibility: dbPost.visibility || 'public',
    userReaction,
    userSaved: dbPost.user_saved || false,
    isSaved: dbPost.user_saved || false,
    userShared: dbPost.user_shared || false,
  };
};

// Helper function to determine media type from URL with MIME type support
const determineMediaType = (url: string, mimeType?: string): 'image' | 'video' | 'audio' | 'document' => {
  console.log('Determining media type for:', url, 'mimeType:', mimeType);
  
  // First try to determine from MIME type if available
  if (mimeType) {
    if (mimeType.startsWith('video/')) {
      console.log('Detected as video from MIME type');
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      console.log('Detected as audio from MIME type');
      return 'audio';
    } else if (mimeType.startsWith('image/')) {
      console.log('Detected as image from MIME type');
      return 'image';
    } else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      console.log('Detected as document from MIME type');
      return 'document';
    }
  }
  
  // Fallback to extension-based detection
  let extension = '';
  
  if (url.includes('/post-media/')) {
    // Extract filename from Supabase URL, handling query parameters
    const pathParts = url.split('/');
    const filenameWithQuery = pathParts[pathParts.length - 1];
    const filename = filenameWithQuery.split('?')[0]; // Remove query parameters
    extension = filename.split('.').pop()?.toLowerCase() || '';
    console.log('Extracted extension from Supabase URL:', extension);
  } else {
    // Handle external URLs
    const urlWithoutQuery = url.split('?')[0];
    extension = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
  }
  
  // Video extensions
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'm4v', 'wmv', 'ogv', '3gp'].includes(extension)) {
    console.log('Detected as video from extension:', extension);
    return 'video';
  }
  
  // Audio extensions  
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus'].includes(extension)) {
    console.log('Detected as audio from extension:', extension);
    return 'audio';
  }
  
  // Document extensions
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(extension)) {
    console.log('Detected as document from extension:', extension);
    return 'document';
  }
  
  // Default to image
  console.log('Defaulting to image for extension:', extension);
  return 'image';
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
    users: [],
    feedSettings: {
      showRecentFirst: true,
      contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event', 'job'],
      showFromConnections: true,
      showFromCompanies: true,
      showTrending: true,
      filterHashtags: []
    },
    filters: {
      userFilter: 'all',
      contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event', 'job'],
      timeRange: 'all'
    },

    loadPosts: async (reset = false) => {
      const state = get();
      if (state.loading) return;

      set({ loading: true });

      try {
        const { filters } = state;
        
        // Circuit breaker pattern - stop infinite retries
        const maxRetries = 3;
        const retryDelay = 1000;
        
        let query = supabase
          .from('posts')
          .select(`
            *,
            profiles (
              id,
              username,
              display_name,
              avatar_url,
              is_verified,
              title,
              company
            )
          `);

        // Apply user filter
        if (filters.userFilter === 'my_posts') {
          const currentUser = supabase.auth.getUser();
          query = query.eq('user_id', (await currentUser).data.user?.id);
        } else if (filters.userFilter === 'others') {
          const currentUser = supabase.auth.getUser();
          query = query.neq('user_id', (await currentUser).data.user?.id);
         } else if (filters.userFilter !== 'all') {
           // For specific user filter, we'll join with profiles table
           const { data: specificUser } = await supabase
             .from('profiles')
             .select('id')
             .eq('username', filters.userFilter)
             .single();
           
           if (specificUser) {
             query = query.eq('user_id', specificUser.id);
           }
         }

        // Apply content type filter
        if (filters.contentTypes.length > 0 && filters.contentTypes.length < 7) {
          query = query.in('post_type', filters.contentTypes);
        }

        // Apply time range filter
        if (filters.timeRange === 'recent') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          query = query.gte('created_at', yesterday.toISOString());
        } else if (filters.timeRange === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          query = query.gte('created_at', weekAgo.toISOString());
        } else if (filters.timeRange === 'month') {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          query = query.gte('created_at', monthAgo.toISOString());
        }

        // Only show public posts unless it's user's own posts
        if (filters.userFilter !== 'my_posts') {
          query = query.eq('visibility', 'public');
        }

        const { data: postsData, error: postsError } = await query
          .order('created_at', { ascending: false })
          .limit(20);

        if (postsError) throw postsError;

        // Get current user for reactions
        const { data: { user } } = await supabase.auth.getUser();
        
        // Transform posts to our format with reactions and comments loaded separately
        const transformedPosts = await Promise.all(
          (postsData || []).map(async (dbPost) => {
            try {
              // Load reactions for this post
              const { data: reactions } = await supabase
                .from('reactions')
                .select(`
                  id,
                  reaction_type,
                  user_id,
                  created_at,
                  profiles (
                    id,
                    username,
                    display_name,
                    avatar_url
                  )
                `)
                .eq('target_type', 'post')
                .eq('target_id', dbPost.id);

              // Load comments for this post with reactions
              const { data: comments } = await supabase
                .from('comments')
                .select(`
                  id,
                  content,
                  user_id,
                  parent_comment_id,
                  created_at,
                  reactions_count,
                  profiles (
                    id,
                    username,
                    display_name,
                    avatar_url
                  )
                `)
                .eq('post_id', dbPost.id)
                .order('created_at', { ascending: true });

              // Load reactions for each comment
              const commentReactions = await Promise.all(
                (comments || []).map(async (comment) => {
                  const { data: reactions } = await supabase
                    .from('reactions')
                    .select(`
                      id,
                      reaction_type,
                      user_id,
                      created_at,
                      profiles (
                        id,
                        username,
                        display_name,
                        avatar_url
                      )
                    `)
                    .eq('target_type', 'comment')
                    .eq('target_id', comment.id);

                  return {
                    ...comment,
                    reactions: reactions || []
                  };
                })
              );

              // Add reactions and comments to the post data
              const postWithData = {
                ...dbPost,
                reactions: reactions || [],
                comments: commentReactions || []
              };

              return transformDbPost(postWithData, dbPost.profiles, user?.id);
            } catch (error) {
              console.error('Error loading post data:', error);
              // Return post without reactions/comments if there's an error
              return transformDbPost({ ...dbPost, reactions: [], comments: [] }, dbPost.profiles, user?.id);
            }
          })
        );

        set({ 
          posts: reset ? transformedPosts : [...state.posts, ...transformedPosts],
          loading: false,
          hasMore: transformedPosts.length === 20
        });

        // PHASE 4: Intelligent real-time updates with scroll awareness
        if (!realtimeChannel) {
          let insertQueue: any[] = [];
          let deleteQueue: string[] = [];
          let batchTimeout: NodeJS.Timeout;
          let isScrolling = false;
          let scrollTimeout: NodeJS.Timeout;

          // Track scroll state for intelligent updates
          const handleScroll = () => {
            isScrolling = true;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
              isScrolling = false;
            }, 150);
          };

          window.addEventListener('scroll', handleScroll, { passive: true });

          const processBatch = async () => {
            // PHASE 4: Don't update during active scrolling
            if (isScrolling && insertQueue.length > 0) {
              // Re-queue batch processing after scroll stops
              clearTimeout(batchTimeout);
              batchTimeout = setTimeout(processBatch, 1000);
              return;
            }

            if (insertQueue.length > 0 || deleteQueue.length > 0) {
              // PHASE 4: Use React.startTransition for non-urgent updates
              set((state) => {
                let newPosts = [...state.posts];
                
                // Process deletions first
                if (deleteQueue.length > 0) {
                  newPosts = newPosts.filter(post => !deleteQueue.includes(post.id));
                  deleteQueue = [];
                }
                
                // Process insertions with optimized array handling
                if (insertQueue.length > 0) {
                  const transformedPosts = insertQueue
                    .map(item => transformDbPost(item.post, item.author))
                    .filter(Boolean);
                  
                  // PHASE 4: Preserve scroll position by only prepending
                  newPosts.unshift(...transformedPosts);
                  insertQueue = [];
                }
                
                return { posts: newPosts };
              });
            }
          };

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
                console.log('New post inserted:', payload);
                if (payload.new) {
                  // Get author info for new post
                  const { data: authorData } = await supabase
                    .from('profiles')
                    .select('id, username, display_name, avatar_url, is_verified, title, company')
                    .eq('id', payload.new.user_id)
                    .single();

                  if (authorData) {
                    const { data: { user } } = await supabase.auth.getUser();
                    const transformedPost = transformDbPost(payload.new, authorData, user?.id);
                    insertQueue.push({ post: transformedPost, author: authorData });
                    clearTimeout(batchTimeout);
                    // PHASE 4: Longer batch delay to reduce update frequency
                    batchTimeout = setTimeout(processBatch, 1000);
                  }
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
                console.log('Post deleted:', payload);
                if (payload.old?.id) {
                  deleteQueue.push(payload.old.id);
                  clearTimeout(batchTimeout);
                  // PHASE 4: Faster deletion processing
                  batchTimeout = setTimeout(processBatch, 300);
                }
              }
            )
            .subscribe();
        }

      } catch (error) {
        console.error('Error loading posts:', error);
        
        // Circuit breaker - stop infinite retries on persistent errors
        const errorMessage = error?.message || '';
        if (errorMessage.includes('PGRST200') || errorMessage.includes('foreign key')) {
          console.warn('Database schema issue detected, stopping retries');
          set({ 
            loading: false,
            posts: [], // Clear posts to prevent UI flicker
            hasMore: false 
          });
          return;
        }
        
        set({ loading: false });
      }
    },

    loadUsers: async () => {
      try {
        const { data: usersData, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, title, company')
          .order('display_name');

        if (error) throw error;

        // Transform database users to our User type with null safety
        const transformedUsers = usersData?.map(dbUser => ({
          id: dbUser.id,
          name: dbUser.display_name || dbUser.username || `User_${dbUser.id.slice(0, 8)}`,
          username: dbUser.username || `user_${dbUser.id.slice(0, 8)}`,
          avatar: dbUser.avatar_url,
          title: dbUser.title,
          company: dbUser.company
        })).filter(user => user.name && user.username) || [];
        
        set({ users: transformedUsers });
      } catch (error) {
        console.error('Error loading users:', error);
      }
    },

    createPost: async (data: CreatePostData) => {
      console.log('Creating post:', data);
      set(state => ({ ...state, loading: true }));
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get the session token for API calls
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.access_token) throw new Error('No access token');

        // Upload media files if present with progress tracking
        let mediaUrls: string[] = [];
        let thumbnailUrl: string | undefined;
        
        // Media URLs are already uploaded via the media edge function
        if (data.media_urls && data.media_urls.length > 0) {
          console.log('Using provided media URLs:', data.media_urls.length);
          mediaUrls = data.media_urls;
        }

        const postPayload = {
          content: data.content,
          post_type: data.post_type || 'text',
          visibility: data.visibility || 'public',
          media_urls: mediaUrls,
          thumbnail_url: thumbnailUrl,
          poll_data: data.poll_data,
          event_data: data.event_data,
          metadata: data.metadata || {}
        };

        console.log('Sending post payload:', postPayload);

        // Use the posts edge function with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const { data: newPost, error } = await supabase.functions.invoke('posts', {
          body: postPayload,
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

        console.log('Post created successfully:', newPost);
        // Post will be added via real-time subscription
        
      } catch (error) {
        console.error('Error creating post:', error);
        throw error;
      } finally {
        set(state => ({ ...state, loading: false }));
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

    toggleReaction: async (postId: string, reaction: ReactionType | null) => {
      console.log('Toggling reaction:', { postId, reaction });
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const state = get();
        const post = state.posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');

        // Store previous state for rollback
        const previousReaction = post.userReaction;
        const previousReactions = [...post.reactions];

        // Optimistic update
        set(state => ({
          posts: state.posts.map(p => {
            if (p.id !== postId) return p;
            
            const updatedReactions = p.reactions.filter(r => r.user.id !== user.id);
            
            // Add new reaction if provided
            if (reaction) {
              updatedReactions.push({
                id: `temp-${Date.now()}`,
                type: reaction,
                user: {
                  id: user.id,
                  name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
                  username: user.user_metadata?.username || user.email?.split('@')[0] || 'user'
                },
                createdAt: new Date()
              });
            }
            
            return {
              ...p,
              reactions: updatedReactions,
              userReaction: reaction || undefined
            };
          })
        }));

        // Call backend API
        const { data, error } = await supabase.functions.invoke('reactions', {
          body: {
            target_type: 'post',
            target_id: postId,
            reaction_type: reaction
          }
        });

        if (error) throw error;

        // Update with real data from backend if available
        if (data) {
          set(state => ({
            posts: state.posts.map(p => {
              if (p.id !== postId) return p;
              return {
                ...p,
                // Update reactions count if returned from backend
                likes: data.reactions_count || p.likes
              };
            })
          }));
        }

      } catch (error) {
        console.error('Error toggling reaction:', error);
        
        // Revert optimistic update on error
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          set(state => ({
            posts: state.posts.map(p => {
              if (p.id !== postId) return p;
              // Restore previous state
              const post = state.posts.find(post => post.id === postId);
              return {
                ...p,
                reactions: post?.reactions || [],
                userReaction: post?.userReaction
              };
            })
          }));
        }
        
        throw error;
      }
    },

    addComment: async (postId: string, content: string, parentId?: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Optimistic update - add comment immediately to UI
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
          parentId,
          reactions: [],
          reactionsCount: 0,
          replies: []
        };

        set(state => ({
          posts: state.posts.map(p => {
            if (p.id !== postId) return p;
            return {
              ...p,
              comments: [...p.comments, newComment],
              commentsCount: p.commentsCount + 1
            };
          })
        }));

        // Use the comments Edge Function
        const { data, error } = await supabase.functions.invoke('comments', {
          body: {
            post_id: postId,
            content,
            parent_id: parentId || null
          }
        });

        if (error) throw error;

        return data;
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

    votePoll: async (postId: string, optionIndex: number) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        console.log('Voting on poll:', { postId, optionIndex, userId: user.id });

        // First, check if user has already voted
        const { data: existingVote } = await supabase
          .from('votes')
          .select('*')
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .single();

        console.log('Existing vote:', existingVote);

        // Insert or update vote in the votes table
        const { data: voteData, error: voteError } = await supabase
          .from('votes')
          .upsert({
            user_id: user.id,
            post_id: postId,
            option_index: optionIndex
          }, {
            onConflict: 'user_id,post_id'
          })
          .select();

        if (voteError) {
          console.error('Vote error:', voteError);
          throw voteError;
        }

        console.log('Vote saved:', voteData);

        // Get all votes for this post to calculate accurate counts
        const { data: allVotes, error: votesError } = await supabase
          .from('votes')
          .select('option_index')
          .eq('post_id', postId);

        if (votesError) {
          console.error('Error fetching votes:', votesError);
          throw votesError;
        }

        console.log('All votes for post:', allVotes);

        // Count votes per option
        const voteCounts: Record<number, number> = {};
        allVotes?.forEach(vote => {
          voteCounts[vote.option_index] = (voteCounts[vote.option_index] || 0) + 1;
        });

        console.log('Vote counts:', voteCounts);

        // Update local state with accurate vote counts
        set(state => ({
          posts: state.posts.map(post => {
            if (post.id !== postId || !post.poll) return post;
            
            // Update vote counts based on actual database data
            const updatedOptions = post.poll.options.map((option, index) => ({
              ...option,
              votes: voteCounts[index] || 0
            }));

            // Recalculate percentages
            const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
            const optionsWithPercentages = updatedOptions.map(option => ({
              ...option,
              percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
            }));

            return {
              ...post,
              poll: {
                ...post.poll,
                options: optionsWithPercentages,
                totalVotes,
                userVote: [optionIndex.toString()]
              }
            };
          })
        }));

        return voteData;
      } catch (error) {
        console.error('Error voting on poll:', error);
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

        // Check if user is trying to share their own post
        const state = get();
        const post = state.posts.find(p => p.id === postId);
        if (post?.author.id === user.id) {
          throw new Error('Cannot share your own post');
        }

        // Use the shares Edge Function
        const { data, error } = await supabase.functions.invoke('shares', {
          body: {
            target_type: 'post',
            target_id: postId,
            share_type: 'share'
          }
        });

        if (error) {
          if (error.message?.includes('own post')) {
            throw new Error('Cannot share your own post');
          }
          throw error;
        }

        // Update local state optimistically
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

        return data;
      } catch (error) {
        console.error('Error sharing post:', error);
        throw error;
      }
    },

    updateFeedSettings: (settings: Partial<FeedSettings>) => {
      set(state => ({
        feedSettings: { ...state.feedSettings, ...settings }
      }));
    },

    updateFilters: (newFilters: Partial<FeedFilters>) => {
      set(state => ({
        filters: { ...state.filters, ...newFilters }
      }));
      // Reload posts with new filters
      get().loadPosts(true);
    },

    toggleCommentReaction: async (commentId: string, postId: string, reaction: ReactionType | null) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Optimistic update - update comment reactions count
        set(state => ({
          posts: state.posts.map(p => {
            if (p.id !== postId) return p;
            
            return {
              ...p,
              comments: p.comments.map(comment => {
                if (comment.id !== commentId) return comment;
                
                const hasExistingReaction = comment.reactions.some(r => r.user.id === user.id);
                const reactionCountChange = reaction ? 
                  (hasExistingReaction ? 0 : 1) : 
                  (hasExistingReaction ? -1 : 0);
                
                const updatedReactions = comment.reactions.filter(r => r.user.id !== user.id);
                
                if (reaction) {
                  updatedReactions.push({
                    id: `temp-${Date.now()}`,
                    type: reaction,
                    user: {
                      id: user.id,
                      name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
                      username: user.user_metadata?.username || user.email?.split('@')[0] || 'user'
                    },
                    createdAt: new Date()
                  });
                }
                
                return {
                  ...comment,
                  reactions: updatedReactions,
                  reactionsCount: Math.max(0, comment.reactionsCount + reactionCountChange)
                };
              })
            };
          })
        }));

        // Call backend API
        const { data, error } = await supabase.functions.invoke('reactions', {
          body: {
            target_type: 'comment',
            target_id: commentId,
            reaction_type: reaction
          }
        });

        if (error) throw error;

      } catch (error) {
        console.error('Error toggling comment reaction:', error);
        // Revert optimistic update on error
        get().loadPosts(true);
        throw error;
      }
    }
  };
});