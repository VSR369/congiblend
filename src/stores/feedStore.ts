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
  // Comment functions removed - comments functionality not implemented
  toggleSave: (postId: string) => void;
  
  
  // Poll actions
  votePoll: (postId: string, optionIndex: number) => Promise<any>;
  
  // Settings
  updateFeedSettings: (settings: Partial<FeedSettings>) => void;
  updateFilters: (filters: Partial<FeedFilters>) => void;
}

// Helper function to transform database post to our Post type
const transformDbPost = (dbPost: any, author: any, currentUserId?: string): Post => {
  console.log('🔄 Transforming post:', dbPost.id, 'type:', dbPost.post_type, 'media_urls:', dbPost.media_urls);
  
  // Handle media_urls array and transform to proper media format
  let media = [];
  if (dbPost.media_urls && Array.isArray(dbPost.media_urls) && dbPost.media_urls.length > 0) {
    console.log('📷 Processing media URLs:', dbPost.media_urls);
    media = dbPost.media_urls.map((url: string, index: number) => {
      // Ensure URL is valid and accessible
      if (!url || typeof url !== 'string') {
        console.log('⚠️ Invalid URL:', url);
        return null;
      }

      // Try to get MIME type from metadata if available
      const mimeType = dbPost.metadata?.media?.[index]?.mimeType;
      const mediaType = determineMediaType(url, mimeType);
      console.log('📷 Creating media item:', { url, type: mediaType, mimeType });
      
      return {
        id: `${dbPost.id}-media-${index}`,
        type: mediaType,
        url: url.trim(),
        alt: `${mediaType} ${index + 1}`,
        thumbnail: dbPost.thumbnail_url || (mediaType === 'video' ? url : undefined),
        duration: dbPost.metadata?.media?.[index]?.duration,
        size: dbPost.metadata?.media?.[index]?.size
      };
    }).filter(Boolean); // Remove null entries
    
    console.log('✅ Final media array:', media);
  } else {
    console.log('❌ No media_urls found or empty array');
  }
  
  // Legacy fallback for images field
  if (media.length === 0 && dbPost.images && Array.isArray(dbPost.images)) {
    console.log('🔄 Using legacy images field:', dbPost.images);
    media = dbPost.images.map((url: string, index: number) => ({
      id: `${dbPost.id}-legacy-${index}`,
      type: 'image' as const,
      url,
      alt: 'Post image'
    }));
  }

  // Transform reactions from database with better error handling
  const reactions = dbPost.reactions?.map((reaction: any) => {
    if (!reaction || !reaction.id || !reaction.user_id) {
      console.log('⚠️ Invalid reaction data:', reaction);
      return null;
    }
    
    return {
      id: reaction.id,
      type: reaction.reaction_type || 'like',
      user: {
        id: reaction.user_id,
        name: reaction.profiles?.display_name || reaction.profiles?.username || 'User',
        username: reaction.profiles?.username || 'user'
      },
      createdAt: reaction.created_at ? new Date(reaction.created_at) : new Date()
    };
  }).filter(Boolean) || [];

  // Find current user's reaction
  const userReaction = currentUserId 
    ? reactions.find(r => r.user.id === currentUserId)?.type
    : undefined;

  // Comments functionality removed - no comments

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
      userVote: undefined
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
    event_data: dbPost.event_data, // Include the raw event_data
    hashtags: extractHashtags(dbPost.content),
    mentions: [],
    reactions,
    // Comments removed - functionality not implemented
    likes: dbPost.likes_count || 0,
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
      contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event'],
      showFromConnections: true,
      showFromCompanies: true,
      showTrending: true,
      filterHashtags: []
    },
    filters: {
      userFilter: 'all',
      contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event'],
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
            id,
            content,
            post_type,
            visibility,
            media_urls,
            metadata,
            poll_data,
            event_data,
            reactions_count,
            shares_count,
            created_at,
            updated_at,
            user_id,
            profiles!posts_user_id_fkey (
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
        
        // Transform posts to our format with reactions loaded separately
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

              // Add reactions to the post data
              const postWithData = {
                ...dbPost,
                reactions: reactions || []
              };

              return transformDbPost(postWithData, dbPost.profiles, user?.id);
            } catch (error) {
              console.error('Error loading post data:', error);
              // Return post without reactions if there's an error
              return transformDbPost({ ...dbPost, reactions: [] }, dbPost.profiles, user?.id);
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
                  const { data: { user } } = await supabase.auth.getUser();
                  const currentState = get();
                  
                  // Check if this is our own optimistic post
                  const optimisticPost = currentState.posts.find(p => 
                    p.id.startsWith('temp-') && p.author.id === payload.new.user_id
                  );
                  
                  // Get complete post data with author info
                  const { data: postData } = await supabase
                    .from('posts')
                    .select(`
                      *,
                      profiles:user_id (
                        id,
                        username,
                        display_name,
                        avatar_url,
                        is_verified,
                        title,
                        company
                      )
                    `)
                    .eq('id', payload.new.id)
                    .single();

                  if (postData) {
                    const transformedPost = transformDbPost(postData, postData.profiles, user?.id);
                    
                    set(state => {
                      if (optimisticPost) {
                        // Replace optimistic post with real post
                        return {
                          posts: state.posts.map(p => 
                            p.id === optimisticPost.id ? transformedPost : p
                          )
                        };
                      } else {
                        // Add new post from other users
                        return {
                          posts: [transformedPost, ...state.posts.filter(p => p.id !== payload.new.id)]
                        };
                      }
                    });
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

        // Get user profile for optimistic update
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_verified')
          .eq('id', user.id)
          .single();

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

        // Create optimistic post for immediate display
        const optimisticPost: Post = {
          id: `temp-${Date.now()}`,
          type: data.post_type || 'text',
          author: {
            id: user.id,
            name: userProfile?.display_name || userProfile?.username || user.email?.split('@')[0] || 'User',
            username: userProfile?.username || user.email?.split('@')[0] || 'user',
            avatar: userProfile?.avatar_url,
            verified: userProfile?.is_verified || false,
          },
          content: data.content,
          media: mediaUrls.map((url, index) => ({
            id: `temp-media-${index}`,
            type: determineMediaType(url, ''),
            url,
            alt: `Media ${index + 1}`,
            thumbnail: url
          })),
          poll: data.poll_data ? {
            id: `temp-poll-${Date.now()}`,
            question: data.content,
            options: data.poll_data.options.map((option, index) => ({
              id: `temp-option-${index}`,
              text: option.text,
              votes: 0,
              percentage: 0
            })),
            totalVotes: 0,
            expiresAt: data.poll_data.expires_at ? new Date(data.poll_data.expires_at) : undefined,
            allowMultiple: data.poll_data.multiple_choice || false,
          } : undefined,
          event: data.event_data ? {
            id: `temp-event-${Date.now()}`,
            title: data.event_data.title,
            description: data.event_data.description || '',
            startDate: new Date(data.event_data.start_date),
            endDate: data.event_data.end_date ? new Date(data.event_data.end_date) : undefined,
            location: data.event_data.location,
            attendees: 0,
            maxAttendees: data.event_data.max_attendees,
          } : undefined,
          event_data: data.event_data, // Include raw event_data for display
          hashtags: extractHashtags(data.content),
          mentions: [],
          reactions: [],
          // Comments removed - functionality not implemented
          likes: 0,
          saves: 0,
          views: 0,
          createdAt: new Date(),
          edited: false,
          isPinned: false,
          visibility: data.visibility || 'public',
          userSaved: false,
          isSaved: false,
        };

        // Add optimistic post immediately
        set(state => ({
          posts: [optimisticPost, ...state.posts],
          loading: false
        }));

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
          // Remove optimistic post on error
          set(state => ({
            posts: state.posts.filter(p => p.id !== optimisticPost.id)
          }));
          throw error;
        }

        console.log('Post created successfully:', newPost);
        // Real post will replace optimistic one via real-time subscription
        
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

    // Comment functions removed - comments functionality not implemented

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

    // Comment reaction function removed - comments functionality not implemented
  };
});