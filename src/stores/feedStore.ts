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
  
  // Poll actions
  votePoll: (postId: string, optionIndex: number) => Promise<any>;
  
  // Settings
  updateFeedSettings: (settings: Partial<FeedSettings>) => void;
}

// Helper function to transform database post to our Post type
const transformDbPost = (dbPost: any, author: any): Post => {
  console.log('Transforming post:', dbPost.id, 'type:', dbPost.post_type, 'media_urls:', dbPost.media_urls);
  
  // Handle media_urls array and transform to proper media format
  let media = [];
  if (dbPost.media_urls && Array.isArray(dbPost.media_urls)) {
    media = dbPost.media_urls.map((url: string, index: number) => {
      const mediaType = determineMediaType(url);
      console.log('Media item:', { url, type: mediaType });
      return {
        id: `${dbPost.id}-${index}`,
        type: mediaType,
        url,
        alt: `Media ${index + 1}`,
        thumbnail: dbPost.thumbnail_url // Use thumbnail if available
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
      expiresAt: dbPost.poll_data.expires_at ? new Date(dbPost.poll_data.expires_at) : undefined,
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

// Helper function to determine media type from URL
const determineMediaType = (url: string): 'image' | 'video' | 'document' => {
  // Handle Supabase storage URLs that may not have clear extensions
  if (url.includes('/post-media/')) {
    // Extract filename from Supabase URL
    const pathParts = url.split('/');
    const filename = pathParts[pathParts.length - 1];
    const extension = filename.split('.').pop()?.toLowerCase();
    
    console.log('Determining media type for:', filename, 'extension:', extension);
    
    if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'm4v', 'wmv'].includes(extension || '')) {
      console.log('Detected as video');
      return 'video';
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
      console.log('Detected as document');
      return 'document';
    }
    console.log('Detected as image (default)');
    return 'image';
  }
  
  // Fallback for external URLs
  const extension = url.split('.').pop()?.toLowerCase();
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'm4v', 'wmv'].includes(extension || '')) {
    return 'video';
  } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
    return 'document';
  }
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
        // Use direct database query for now, since edge function routing needs fix
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

        // Get the session token for API calls
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.access_token) throw new Error('No access token');

        // Upload media files if present
        let mediaUrls: string[] = [];
        if (data.media && data.media.length > 0) {
          for (const file of data.media) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('post-media')
              .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('post-media')
              .getPublicUrl(uploadData.path);

            mediaUrls.push(publicUrl);
          }
        }

        // Use the posts edge function for consistent post creation
        const { data: newPost, error } = await supabase.functions.invoke('posts', {
          body: {
            content: data.content,
            post_type: data.type,
            visibility: data.visibility,
            media_urls: mediaUrls,
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
              hashtags: data.hashtags,
              mentions: data.mentions
            }
          },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
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

        // Use the reactions Edge Function
        const { data, error } = await supabase.functions.invoke('reactions', {
          body: {
            target_type: 'post',
            target_id: postId,
            reaction_type: reaction
          }
        });

        if (error) throw error;

        // Update local state based on the response
        set(state => ({
          posts: state.posts.map(post => {
            if (post.id === postId) {
              if (data.action === 'removed') {
                return {
                  ...post,
                  userReaction: undefined,
                  reactions: post.reactions.filter(r => r.user.id !== user.id)
                };
              } else {
                return {
                  ...post,
                  userReaction: reaction,
                  reactions: [
                    ...post.reactions.filter(r => r.user.id !== user.id),
                    {
                      id: data.reaction?.id || `temp-${Date.now()}`,
                      type: reaction,
                      user: { 
                        id: user.id, 
                        name: user.user_metadata?.display_name || 'User', 
                        username: user.user_metadata?.username || 'user' 
                      },
                      createdAt: new Date()
                    }
                  ]
                };
              }
            }
            return post;
          })
        }));

        return data;
      } catch (error) {
        console.error('Error toggling reaction:', error);
        throw error;
      }
    },

    addComment: async (postId: string, content: string, parentId?: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Use the comments Edge Function
        const { data, error } = await supabase.functions.invoke('comments', {
          body: {
            post_id: postId,
            content,
            parent_id: parentId || null
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
    }
  };
});