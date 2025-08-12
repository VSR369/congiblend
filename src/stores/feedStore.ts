import { create } from 'zustand';
import type { Post, FeedSettings, CreatePostData, ReactionType, PostType, User } from '@/types/feed';

import { supabase } from '@/integrations/supabase/client';
import { ALL_POST_TYPES } from '@/utils/constants';
import { persistBookmarkToggle, fetchSavedPostIds } from '@/services/bookmarks';

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
  isScrolling: boolean;
  
  // New posts queue (LinkedIn-style)
  pendingNewPosts: Post[];
  
  // Actions
  loadPosts: (reset?: boolean) => Promise<void>;
  loadUsers: () => Promise<void>;
  createPost: (data: CreatePostData) => Promise<void>;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  deletePost: (postId: string) => void;
  
  // Engagement actions
  toggleLike: (postId: string) => Promise<void>;
  toggleReaction: (postId: string, reaction: ReactionType | null) => Promise<void>;
  // Comment functions removed - comments functionality not implemented
  toggleSave: (postId: string) => void;
  
  
  // Event actions
  rsvpEvent: (postId: string, status: 'attending' | 'interested' | 'not_attending') => Promise<void>;
  
  // Settings
  updateFeedSettings: (settings: Partial<FeedSettings>) => void;
  updateFilters: (filters: Partial<FeedFilters>) => void;
  setScrolling: (scrolling: boolean) => void;

  // New posts queue actions
  flushPendingPosts: () => void;
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
      type: reaction.reaction_type || 'innovative',
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
      userRSVP: dbPost.event_data.user_rsvp || undefined,
      speakers: Array.isArray(dbPost.event_data.speakers) ? dbPost.event_data.speakers : undefined,
    };
  }

  const authorData = author ?? {
    id: dbPost.user_id || 'unknown',
    username: dbPost.metadata?.author?.username || (dbPost as any).username || 'user',
    display_name: dbPost.metadata?.author?.display_name || (dbPost as any).display_name || (dbPost as any).username || 'User',
    avatar_url: (dbPost as any).avatar_url || dbPost.metadata?.author?.avatar_url,
    is_verified: dbPost.metadata?.author?.is_verified || false,
  };
  if (!author) {
    console.warn('⚠️ Missing author profile for post, using fallback author', dbPost.id);
  }
  // Determine final type (treat text with article_html as article)
  let computedType = dbPost.post_type || 'text';
  if (computedType === 'text' && dbPost.metadata?.article_html) {
    computedType = 'article';
  }
  return {
    id: dbPost.id,
    type: computedType,
    author: {
      id: authorData.id,
      name: authorData.display_name || authorData.username,
      username: authorData.username,
      avatar: authorData.avatar_url,
      verified: authorData.is_verified || false,
    },
    content: dbPost.content,
    media,
    
    event,
    event_data: dbPost.event_data, // Include the raw event_data
    hashtags: Array.from(new Set([
      ...(extractHashtags(dbPost.content) || []),
      ...(
        Array.isArray(dbPost.metadata?.tags)
          ? dbPost.metadata.tags
          : typeof dbPost.metadata?.tags === 'string'
            ? dbPost.metadata.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : []
      ).map((t: string) => `#${String(t).trim().replace(/^#/, '')}`)
    ])),
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
    pendingNewPosts: [],
    loading: false,
    hasMore: true,
    users: [],
    feedSettings: {
      showRecentFirst: true,
      contentTypes: ALL_POST_TYPES,
      showFromConnections: true,
      showFromCompanies: true,
      showTrending: true,
      filterHashtags: []
    },
    filters: {
      userFilter: 'all',
      contentTypes: ALL_POST_TYPES,
      timeRange: 'all'
    },
    isScrolling: false,

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
            likes_count,
            shares_count,
            created_at,
            updated_at,
            user_id,
            profiles:user_id (
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
        console.log('🔍 Current userFilter:', filters.userFilter);
        if (filters.userFilter === 'my_posts') {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.warn('⏳ Auth not ready for my_posts; deferring load');
            set({ loading: false });
            return;
          }
          query = query.eq('user_id', user.id);
          console.log('✅ Applied my_posts filter');
        } else if (filters.userFilter === 'others') {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.warn('⏳ Auth not ready for others; deferring load');
            set({ loading: false });
            return;
          }
          query = query.neq('user_id', user.id);
          console.log('✅ Applied others filter');
        } else if (filters.userFilter !== 'all' && filters.userFilter !== undefined) {
          // For specific user filter, we'll join with profiles table
          const { data: specificUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', filters.userFilter)
            .single();
          
          if (specificUser) {
            query = query.eq('user_id', specificUser.id);
            console.log('✅ Applied specific user filter for:', filters.userFilter);
          }
        } else {
          console.log('✅ No user filter applied (showing all posts)');
        }

        // Apply content type filter
        if (filters.contentTypes.length > 0 && filters.contentTypes.length < ALL_POST_TYPES.length) {
          query = query.in('post_type', filters.contentTypes);
        }

        // Apply time range filter - skip for "All Posts" unless explicitly set
        const shouldApplyTimeFilter = filters.timeRange !== 'all' && 
                                    !(filters.userFilter === 'all' && filters.timeRange === 'recent');
        
        console.log('⏰ Time filter check:', {
          timeRange: filters.timeRange,
          userFilter: filters.userFilter,
          shouldApplyTimeFilter
        });

        if (shouldApplyTimeFilter) {
          if (filters.timeRange === 'recent') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            query = query.gte('created_at', yesterday.toISOString());
            console.log('✅ Applied recent time filter from:', yesterday.toISOString());
          } else if (filters.timeRange === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            query = query.gte('created_at', weekAgo.toISOString());
            console.log('✅ Applied week time filter from:', weekAgo.toISOString());
          } else if (filters.timeRange === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            query = query.gte('created_at', monthAgo.toISOString());
            console.log('✅ Applied month time filter from:', monthAgo.toISOString());
          }
        } else {
          console.log('✅ Skipped time filter - showing posts from all time periods');
        }


        const pageSize = 20;
        const offset = reset ? 0 : state.posts.length;

        const { data: postsData, error: postsError } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        console.log('📊 Query results:', {
          totalPosts: postsData?.length || 0,
          userFilter: filters.userFilter,
          contentTypes: filters.contentTypes,
          timeRange: filters.timeRange,
          posts: postsData?.map(p => ({ 
            id: p.id, 
            user_id: p.user_id, 
            type: p.post_type, 
            created_at: p.created_at,
            username: p.profiles?.username,
            display_name: p.profiles?.display_name
          }))
        });

        if (postsError) console.error('❌ Posts query error:', postsError);

        if (postsError) throw postsError;

        // Get current user for reactions
        const { data: { user } } = await supabase.auth.getUser();
        
        // Batch load engagement data
        const postIds = (postsData || []).map((p: any) => p.id);

        // Reactions by post (single query)
        const reactionsByPost: Record<string, any[]> = {};
        if (postIds.length > 0) {
          const { data: allReactions } = await supabase
            .from('reactions')
            .select(`
              id,
              reaction_type,
              user_id,
              created_at,
              target_id,
              profiles (
                id,
                username,
                display_name,
                avatar_url
              )
            `)
            .eq('target_type', 'post')
            .in('target_id', postIds);
          (allReactions || []).forEach((r: any) => {
            const pid = r.target_id;
            (reactionsByPost[pid] ||= []).push(r);
          });
        }
        // Likes set for current user
        let likedSet = new Set<string>();
        if (postIds.length > 0 && user?.id) {
          const { data: userLikes } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds);
          (userLikes || []).forEach((l: any) => likedSet.add(l.post_id));
        }


        // Transform posts using batched data
        const transformedPosts = (postsData || []).map((dbPost: any) => {
          const reactions = reactionsByPost[dbPost.id] || [];
          let postWithData: any = {
            ...dbPost,
            reactions
          };


          return transformDbPost(postWithData, dbPost.profiles, user?.id);
        });

        // NEW: annotate saved and liked states for current user
        let annotatedPosts = transformedPosts;
        try {
          const postIds = (transformedPosts || []).map(p => p.id).filter(Boolean);
          const savedSet = await fetchSavedPostIds(postIds);
          annotatedPosts = transformedPosts.map(p => ({
            ...p,
            isSaved: savedSet.has(p.id) || p.isSaved,
            userSaved: savedSet.has(p.id) || p.userSaved,
            userLiked: (typeof (p as any).userLiked === 'boolean' ? (p as any).userLiked : undefined) ?? (typeof p.userLiked === 'boolean' ? p.userLiked : undefined) ?? likedSet.has(p.id),
          }));
        } catch (e) {
          console.warn('Failed to annotate saved/liked posts:', e);
          annotatedPosts = transformedPosts.map(p => ({ ...p, userLiked: likedSet.has(p.id) }));
        }

        set((state) => {
          let merged = reset ? annotatedPosts : [...state.posts, ...annotatedPosts];
          if (reset) {
            // Purge any stale optimistic posts to avoid stuck "Publishing..." UI
            merged = merged.filter(p => !String(p.id).startsWith('post-'));
          }
          const unique = Array.from(new Map(merged.map(p => [p.id, p])).values());
          return {
            posts: unique,
            loading: false,
            hasMore: (annotatedPosts.length || 0) === pageSize
          };
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
                  p.id.startsWith('post-') && p.author.id === payload.new.user_id
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
                        // Queue new post to avoid scroll jumps; user can load via banner
                        const pending = [transformedPost, ...state.pendingNewPosts.filter(p => p.id !== transformedPost.id)];
                        return { pendingNewPosts: pending };
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
          id: `post-${Date.now()}`,
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
            id: `media-${Date.now()}-${index}`,
            type: determineMediaType(url, ''),
            url,
            alt: `Media ${index + 1}`,
            thumbnail: url
          })),
          event: data.event_data ? {
            id: `event-${Date.now()}`,
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
        try {
          // Fallback: immediately replace optimistic post with the real post
          const transformed = transformDbPost(
            { ...newPost, reactions: [] },
            newPost.author,
            user?.id
          );
          set(state => ({
            posts: state.posts.map(p => p.id === optimisticPost.id ? transformed : p)
          }));
        } catch (e) {
          console.warn('Fallback replacement failed, attempting ID swap only:', e);
          set(state => ({
            posts: state.posts.map(p => p.id === optimisticPost.id ? { ...p, id: newPost.id } : p)
          }));
        }
        
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

    toggleLike: async (postId: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const state = get();
        const post = state.posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');

        const wasLiked = Boolean(post.userLiked);
        // Optimistic update
        set(s => ({
          posts: s.posts.map(p => {
            if (p.id !== postId) return p;
            const nextLiked = !wasLiked;
            const nextLikes = typeof p.likes === 'number'
              ? (nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1))
              : p.likes;
            return { ...p, userLiked: nextLiked, likes: nextLikes };
          })
        }));

        // Toggle in DB
        const { data: existing } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing?.id) {
          const { error: delErr } = await supabase.from('post_likes').delete().eq('id', existing.id);
          if (delErr) throw delErr;
        } else {
          const { error: insErr } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
          if (insErr) throw insErr;
        }

        // Reconcile with server count
        const { data: refreshed } = await supabase
          .from('posts')
          .select('likes_count')
          .eq('id', postId)
          .maybeSingle();

        if (refreshed?.likes_count !== undefined) {
          set(s => ({
            posts: s.posts.map(p => p.id === postId ? { ...p, likes: refreshed.likes_count } : p)
          }));
        }
      } catch (error) {
        console.error('Error toggling like:', error);
        // Roll back optimistic update
        set(s => ({
          posts: s.posts.map(p => {
            if (p.id !== postId) return p;
            return { ...p, userLiked: !p.userLiked, likes: typeof p.likes === 'number' ? Math.max(0, p.likes + (p.userLiked ? -1 : 1)) : p.likes };
          })
        }));
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
                id: `reaction-${Date.now()}`,
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

        if (data) {
          // Reaction persisted; state already optimistically updated.
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


    rsvpEvent: async (postId: string, status: 'attending' | 'interested' | 'not_attending') => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('User not authenticated');

        // Guard against optimistic (temporary) IDs
        const isUuid = /^[0-9a-fA-F-]{36}$/.test(postId);
        if (!isUuid) {
          console.warn('RSVP attempted on temporary post ID:', postId);
          throw new Error('Post is still publishing. Please try again in a moment.');
        }

        const prev = get().posts.find(p => p.id === postId)?.event?.userRSVP;

        const response = await fetch(`https://cmtehutbazgfjoksmkly.supabase.co/functions/v1/posts/posts/${postId}/rsvp`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdGVodXRiYXpnZmpva3Nta2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDc3MzcsImV4cCI6MjA2NzIyMzczN30.N_pjYJGlpV8cIENLeRcVyYiHGxiR_WCv669MKOxXJRA',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) {
          const txt = await response.text();
          console.error('RSVP failed:', response.status, txt);
          throw new Error('Failed to RSVP');
        }

        // Update local state
        set(state => ({
          posts: state.posts.map(p => {
            if (p.id !== postId || !p.event) return p;
            const wasAttending = p.event.userRSVP === 'attending';
            const willAttend = status === 'attending';
            let attendees = p.event.attendees;
            if (willAttend && !wasAttending) attendees = attendees + 1;
            if (!willAttend && wasAttending) attendees = Math.max(0, attendees - 1);
            return {
              ...p,
              event: {
                ...p.event,
                userRSVP: status,
                attendees,
              },
              event_data: {
                ...p.event_data,
                user_rsvp: status,
              }
            };
          })
        }));
      } catch (error) {
        console.error('Error on RSVP:', error);
        throw error;
      }
    },

    toggleSave: async (postId: string) => {
      const state = get();
      const post = state.posts.find(p => p.id === postId);
      if (!post) return;

      const willSave = !post.userSaved && !post.isSaved ? true : !post.userSaved || !post.isSaved ? true : false;
      // Better: consider either property as the current truth
      const currentlySaved = Boolean(post.userSaved ?? post.isSaved);
      const nextSaved = !currentlySaved;

      // Optimistic update
      set(s => ({
        posts: s.posts.map(p => {
          if (p.id !== postId) return p;
          return {
            ...p,
            userSaved: nextSaved,
            isSaved: nextSaved,
            // If you display saves count elsewhere, this keeps a local feel
            saves: typeof p.saves === 'number' ? (nextSaved ? p.saves + 1 : Math.max(0, p.saves - 1)) : p.saves
          };
        })
      }));

      try {
        await persistBookmarkToggle(postId, nextSaved);
        console.log('[toggleSave] persisted', { postId, saved: nextSaved });
      } catch (err) {
        console.error('[toggleSave] error, rolling back:', err);
        // Rollback optimistic update
        set(s => ({
          posts: s.posts.map(p => {
            if (p.id !== postId) return p;
            const rollbackSaved = currentlySaved;
            return {
              ...p,
              userSaved: rollbackSaved,
              isSaved: rollbackSaved,
              saves: typeof p.saves === 'number'
                ? (rollbackSaved ? p.saves + (nextSaved ? -1 : 0) : p.saves - (nextSaved ? -1 : 0)) // revert the +/- we just did
                : p.saves
            };
          })
        }));
        throw err;
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

    setScrolling: (scrolling: boolean) => {
      set({ isScrolling: scrolling });
    },

    flushPendingPosts: () => {
      set(state => {
        if (state.pendingNewPosts.length === 0) return state as any;
        const merged = [...state.pendingNewPosts, ...state.posts];
        const unique = Array.from(new Map(merged.map(p => [p.id, p])).values());
        return { posts: unique, pendingNewPosts: [] } as any;
      });
    },

    // Comment reaction function removed - comments functionality not implemented
  };
});
