import { create } from 'zustand';
import type { Post, FeedSettings, CreatePostData, ReactionType, PostType, User } from '@/types/feed';

import { supabase } from '@/integrations/supabase/client';
import { performanceMonitor } from '@/utils/performance';
import { profileCache } from '@/utils/profileCache';
import { requestQueue } from '@/utils/requestQueue';
import { useAuthStore } from '@/stores/authStore';

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
const transformDbPost = (dbPost: any, author: any): Post | null => {
  if (!author) {
    
    return null;
  }
  
  
  
  // Handle media_urls array and transform to proper media format
  let media = [];
  if (dbPost.media_urls && Array.isArray(dbPost.media_urls)) {
    media = dbPost.media_urls.map((url: string, index: number) => {
      // Try to get MIME type from metadata if available
      const mimeType = dbPost.metadata?.media?.[index]?.mimeType;
      const mediaType = determineMediaType(url, mimeType);
      
      
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
  } else if (dbPost.images && Array.isArray(dbPost.images)) {
    // Fallback for legacy images field
    media = dbPost.images.map((url: string, index: number) => ({
      id: `${dbPost.id}-${index}`,
      type: 'image' as const,
      url,
      alt: 'Post image'
    }));
  }

  // Transform poll_data to poll object
  let poll = undefined;
  if (dbPost.poll_data && dbPost.poll_data.options) {
    
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
      expiresAt: dbPost.poll_data.expires_at ? new Date(dbPost.poll_data.expires_at) : undefined,
      allowMultiple: dbPost.poll_data.multiple_choice || false,
      userVote: undefined // TODO: Get user's vote from database
    };
    
  }

  // Transform event_data to event object
  let event = undefined;
  if (dbPost.event_data) {
    event = {
      id: `${dbPost.id}-event`,
      title: dbPost.event_data.title,
      description: dbPost.event_data.description,
      startDate: new Date(dbPost.event_data.start_date),
      endDate: dbPost.event_data.end_date ? new Date(dbPost.event_data.end_date) : undefined,
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
      id: author?.id || 'unknown',
      name: author?.display_name || author?.username || 'Unknown User',
      username: author?.username || 'unknown',
      avatar: author?.avatar_url,
      verified: author?.is_verified || false,
    },
    content: dbPost.content,
    media,
    poll,
    event,
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
    userReaction: dbPost.user_reaction || undefined,
    userSaved: dbPost.user_saved || false,
    userShared: dbPost.user_shared || false,
  };
};

// Helper function to determine media type from URL with MIME type support
const determineMediaType = (url: string, mimeType?: string): 'image' | 'video' | 'audio' | 'document' => {
  // First try to determine from MIME type if available
  if (mimeType) {
    if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
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
  } else {
    // Handle external URLs
    const urlWithoutQuery = url.split('?')[0];
    extension = urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
  }
  
  // Video extensions
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'm4v', 'wmv', 'ogv', '3gp'].includes(extension)) {
    return 'video';
  }
  
  // Audio extensions  
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus'].includes(extension)) {
    return 'audio';
  }
  
  // Document extensions
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(extension)) {
    return 'document';
  }
  
  // Default to image
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
        
        // First get posts without join
        let query = supabase
          .from('posts')
          .select('*');

        // Apply user filter
        const currentUser = useAuthStore.getState().user;
        if (filters.userFilter === 'my_posts') {
          query = query.eq('user_id', currentUser?.id);
        } else if (filters.userFilter === 'others') {
          query = query.neq('user_id', currentUser?.id);
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

        // Get all unique user IDs from posts
        const userIds = [...new Set(postsData?.map(post => post.user_id) || [])];
        
        // Fetch profiles for all users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_verified, title, company')
          .in('id', userIds);

        if (profilesError) {
          console.warn('Error loading profiles:', profilesError);
        }

        // Create a map of user profiles for quick lookup and update cache
        const profilesMap = new Map(profilesData?.map(profile => [profile.id, profile]) || []);
        
        // Update profile cache with fetched profiles
        if (profilesData) {
          profileCache.setMultiple(profilesData);
        }

        // Transform posts to our format
        const transformedPosts = postsData?.map((dbPost) => {
          const profile = profilesMap.get(dbPost.user_id);
          return transformDbPost(dbPost, profile);
        }).filter(Boolean) || [];

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
                table: 'posts',
                filter: 'visibility=eq.public' // Only listen to public posts for performance
              },
              async (payload) => {
                const currentUser = useAuthStore.getState().user;
                // Only add posts from other users via real-time (not our own optimistic posts)
                if (payload.new.user_id !== currentUser?.id) {
                  // Try to get author from cache first
                  let authorData = profileCache.get(payload.new.user_id);
                  
                  if (!authorData) {
                    // Fallback to DB query if not in cache
                    const { data: dbAuthor } = await supabase
                      .from('profiles')
                      .select('id, username, display_name, avatar_url, is_verified')
                      .eq('id', payload.new.user_id)
                      .single();
                    
                    if (dbAuthor) {
                      profileCache.set(dbAuthor);
                      authorData = {
                        id: dbAuthor.id,
                        username: dbAuthor.username || '',
                        display_name: dbAuthor.display_name || '',
                        avatar_url: dbAuthor.avatar_url,
                        is_verified: dbAuthor.is_verified || false,
                        cached_at: Date.now()
                      };
                    }
                  }

                  if (authorData) {
                    const newPost = transformDbPost(payload.new, authorData);
                    if (newPost) {
                      set(state => ({
                        posts: [newPost, ...state.posts]
                      }));
                    }
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

    loadUsers: async () => {
      try {
        const { data: usersData, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, title, company')
          .order('display_name');

        if (error) throw error;

        // Transform database users to our User type
        const transformedUsers = usersData?.map(dbUser => ({
          id: dbUser.id,
          name: dbUser.display_name || dbUser.username,
          username: dbUser.username,
          avatar: dbUser.avatar_url,
          title: dbUser.title,
          company: dbUser.company
        })) || [];
        
        set({ users: transformedUsers });
      } catch (error) {
        console.error('Error loading users:', error);
      }
    },

    createPost: async (data: CreatePostData) => {
      performanceMonitor.startTimer('post_creation', { type: data.type });
      console.log('Creating post with data:', data);
      set(state => ({ ...state, loading: true }));
      
      try {
        const { user, session } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');
        if (!session?.access_token) throw new Error('No access token');

        // Try to get profile from cache first, fallback to DB
        let userProfile = profileCache.get(user.id);
        if (!userProfile) {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, is_verified')
            .eq('id', user.id)
            .single();
          
          if (dbProfile) {
            profileCache.set(dbProfile);
            userProfile = {
              id: dbProfile.id,
              username: dbProfile.username || '',
              display_name: dbProfile.display_name || '',
              avatar_url: dbProfile.avatar_url,
              is_verified: dbProfile.is_verified || false,
              cached_at: Date.now()
            };
          }
        }

        // Create optimistic post for immediate UI feedback
        const optimisticPost: Post = {
          id: `temp-${Date.now()}`,
          type: data.type,
          author: {
            id: user.id,
            name: userProfile?.display_name || userProfile?.username || 'You',
            username: userProfile?.username || 'you',
            avatar: userProfile?.avatar_url,
            verified: userProfile?.is_verified || false,
          },
          content: data.content,
          media: [],
          poll: data.poll ? {
            ...data.poll,
            id: `temp-poll-${Date.now()}`,
            totalVotes: 0,
            options: data.poll.options.map((opt, idx) => ({
              ...opt,
              id: `temp-option-${idx}`,
              votes: 0,
              percentage: 0
            }))
          } : undefined,
          event: data.event ? {
            ...data.event,
            id: `temp-event-${Date.now()}`,
            attendees: 0
          } : undefined,
          hashtags: data.hashtags || [],
          mentions: [],
          reactions: [],
          comments: [],
          shares: 0,
          saves: 0,
          views: 0,
          createdAt: new Date(),
          visibility: data.visibility,
          userReaction: undefined,
          userSaved: false,
          userShared: false,
        };

        // Add optimistic post to UI immediately
        set(state => ({
          posts: [optimisticPost, ...state.posts]
        }));

        // Upload media files in parallel if present
        let mediaUrls: string[] = [];
        let thumbnailUrl: string | undefined;
        
        if (data.media && data.media.length > 0) {
          performanceMonitor.startTimer('file_upload', { fileCount: data.media.length });
          console.log(`Uploading ${data.media.length} files in parallel...`);
          
          const uploadPromises = data.media.map(async (file) => {
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            
            console.log(`Uploading file: ${fileName}`);
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('post-media')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('Upload error:', uploadError);
              throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
              .from('post-media')
              .getPublicUrl(uploadData.path);

            console.log(`File uploaded successfully: ${publicUrl}`);
            return { url: publicUrl, type: fileExt };
          });

          const uploadResults = await Promise.all(uploadPromises);
          mediaUrls = uploadResults.map(result => result.url);
          
          // Set thumbnail for first video
          const firstVideo = uploadResults.find(result => 
            ['mp4', 'webm', 'mov', 'avi'].includes(result.type || '')
          );
          if (firstVideo) {
            thumbnailUrl = firstVideo.url;
          }
          
          console.log('All files uploaded successfully:', mediaUrls);
          performanceMonitor.endTimer('file_upload');
        }

        const postPayload = {
          content: data.content,
          post_type: data.type,
          visibility: data.visibility || 'public',
          media_urls: mediaUrls,
          thumbnail_url: thumbnailUrl,
          poll_data: data.poll ? {
            options: data.poll.options.map(opt => ({ text: opt.text, votes: 0 })),
            multiple_choice: data.poll.allowMultiple || false,
            expires_at: data.poll.expiresAt?.toISOString()
          } : undefined,
          event_data: data.event ? {
            title: data.event.title,
            description: data.event.description,
            start_date: data.event.startDate.toISOString(),
            end_date: data.event.endDate?.toISOString(),
            location: data.event.location,
            is_virtual: data.event.isVirtual,
            max_attendees: data.event.maxAttendees
          } : undefined,
          metadata: {
            hashtags: data.hashtags || [],
            mentions: data.mentions || []
          }
        };

        
        
        // Use the posts edge function with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const { data: newPost, error } = await supabase.functions.invoke('posts', {
          body: postPayload,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error('Edge function error:', error);
          // Remove optimistic post on error
          set(state => ({
            posts: state.posts.filter(post => post.id !== optimisticPost.id)
          }));
          throw error;
        }

        console.log('Post created successfully:', newPost);
        performanceMonitor.endTimer('post_creation');
        
        // Replace optimistic post with real post data
        if (newPost && newPost.id) {
          const realPost = transformDbPost(newPost, userProfile);
          if (realPost) {
            set(state => ({
              posts: state.posts.map(post => 
                post.id === optimisticPost.id ? realPost : post
              )
            }));
          }
        }
        
      } catch (error) {
        console.error('Error creating post:', error);
        performanceMonitor.addMetric({
          name: 'error',
          value: 1,
          timestamp: Date.now(),
          type: 'count',
          metadata: { operation: 'post_creation', error: error instanceof Error ? error.message : 'Unknown error' }
        });
        performanceMonitor.endTimer('post_creation');
        // Remove optimistic post on error
        set(state => ({
          posts: state.posts.filter(post => !post.id.startsWith('temp-'))
        }));
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
      
      
      try {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');

        const state = get();
        const post = state.posts.find(p => p.id === postId);
        if (!post) throw new Error('Post not found');

        // Optimistic update first
        const previousReaction = post.userReaction;
        set(state => ({
          posts: state.posts.map(p => {
            if (p.id !== postId) return p;
            
            const updatedReactions = [...p.reactions];
            const userReactionIndex = updatedReactions.findIndex(r => r.user.id === user.id);
            
            // Remove existing reaction if any
            if (userReactionIndex >= 0) {
              updatedReactions.splice(userReactionIndex, 1);
            }
            
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

        // Call backend
        if (reaction) {
          // Add or update reaction
          const { error } = await supabase.functions.invoke('reactions', {
            body: {
              target_type: 'post',
              target_id: postId,
              reaction_type: reaction
            }
          });
          
          if (error) throw error;
        } else {
          // Remove reaction
          const { error } = await supabase.functions.invoke('reactions', {
            body: {
              target_type: 'post',
              target_id: postId
            }
          });
          
          if (error) throw error;
        }
      } catch (error) {
        console.error('Error toggling reaction:', error);
        
        // Revert optimistic update on error
        set(state => ({
          posts: state.posts.map(p => {
            if (p.id !== postId) return p;
            return { ...p, userReaction: p.userReaction };
          })
        }));
        
        throw error;
      }
    },

    addComment: async (postId: string, content: string, parentId?: string) => {
      try {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');

        // Use the comments Edge Function
        const { data, error } = await supabase.functions.invoke('comments', {
          body: {
            post_id: postId,
            content,
            parent_comment_id: parentId || null
          }
        });

        if (error) throw error;

        // Optimistically update local state
        const newComment = {
          id: data.comment?.id || `temp-${Date.now()}`,
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
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');

        // First, check if user has already voted
        const { data: existingVote } = await supabase
          .from('votes')
          .select('*')
          .eq('user_id', user.id)
          .eq('post_id', postId)
          .single();

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
          throw voteError;
        }

        // Get all votes for this post to calculate accurate counts
        const { data: allVotes, error: votesError } = await supabase
          .from('votes')
          .select('option_index')
          .eq('post_id', postId);

        if (votesError) {
          throw votesError;
        }

        // Count votes per option
        const voteCounts: Record<number, number> = {};
        allVotes?.forEach(vote => {
          voteCounts[vote.option_index] = (voteCounts[vote.option_index] || 0) + 1;
        });

        

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
        const { user } = useAuthStore.getState();
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
    }
  };
});