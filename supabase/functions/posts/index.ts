import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create authenticated Supabase client function
const createAuthenticatedClient = (token: string) => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  )
}

interface CreatePostData {
  content: string;
  visibility: 'public' | 'connections' | 'private';
  post_type: 'text' | 'image' | 'video' | 'article' | 'poll' | 'event' | 'job' | 'carousel' | 'audio' | 'podcast';
  images?: string[];
  videos?: string[];
  media_urls?: string[];
  thumbnail_url?: string;
  duration?: number;
  poll_data?: {
    options: Array<{ text: string; votes: number }>;
    multiple_choice: boolean;
    expires_at?: string;
  };
  event_data?: {
    title: string;
    description?: string;
    start_date: string;
    end_date?: string;
    location?: string;
    virtual_link?: string;
    max_attendees?: number;
    is_virtual?: boolean;
    is_hybrid?: boolean;
    ticket_price?: number;
    organizer?: string;
  };
  metadata?: any;
}

// Helper function to extract hashtags and mentions
const extractHashtags = (content: string): string[] => {
  const hashtagRegex = /#[\w]+/g;
  const matches = content.match(hashtagRegex) || [];
  return [...new Set(matches)];
};

const extractMentions = (content: string): string[] => {
  const mentionRegex = /@[\w]+/g;
  const matches = content.match(mentionRegex) || [];
  return [...new Set(matches.map(m => m.substring(1)))];
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    const endpoint = pathParts[pathParts.length - 1];

    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Create authenticated Supabase client
    const authenticatedSupabase = createAuthenticatedClient(token);
    
    // Verify the token and get user
    const { data: sessionData, error: sessionError } = await authenticatedSupabase.auth.getUser();
    
    if (sessionError || !sessionData.user) {
      console.error('Authentication error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = sessionData.user.id;

    // CREATE POST
    if (req.method === 'POST' && (endpoint === 'posts' || pathParts[pathParts.length - 2] === 'api')) {
      const postData: CreatePostData = await req.json();

      // Validate required fields
      if (!postData.content || !postData.content.trim()) {
        return new Response(
          JSON.stringify({ error: 'Content is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract hashtags and mentions
      const hashtags = extractHashtags(postData.content);
      const mentions = extractMentions(postData.content);

      // Create the post
      const { data: newPost, error: postError } = await authenticatedSupabase
        .from('posts')
        .insert({
          user_id: userId,
          content: postData.content.trim(),
          post_type: postData.post_type || 'text',
          visibility: postData.visibility || 'public',
          images: postData.images || null,
          videos: postData.videos || null,
          media_urls: postData.media_urls || null,
          thumbnail_url: postData.thumbnail_url || null,
          poll_data: postData.poll_data || null,
          event_data: postData.event_data || null,
          metadata: {
            hashtags,
            mentions,
            ...postData.metadata
          },
          reactions_count: 0,
          comments_count: 0,
          shares_count: 0,
          is_pinned: false,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (postError) {
        console.error('Post creation error:', postError);
        return new Response(
          JSON.stringify({ error: 'Failed to create post' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user profile for response
      const { data: userProfile } = await authenticatedSupabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_verified')
        .eq('id', userId)
        .single();

      // Return the complete post data with author info
      const responseData = {
        ...newPost,
        author: {
          id: userId,
          username: userProfile?.username || 'unknown',
          display_name: userProfile?.display_name || 'Unknown User',
          avatar_url: userProfile?.avatar_url,
          is_verified: userProfile?.is_verified || false
        },
        author_id: newPost.user_id,
        reaction_count: newPost.reactions_count,
        comment_count: newPost.comments_count,
        hashtags,
        mentions
      };

      console.log('Post created successfully, returning:', responseData);

      return new Response(
        JSON.stringify(responseData),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // GET POSTS WITH FILTERING
    if (req.method === 'GET' && (endpoint === 'posts' || endpoint === 'feed')) {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;
      
      // Get filtering parameters
      const filter = url.searchParams.get('filter') || 'all';
      const contentTypes = url.searchParams.get('contentType')?.split(',') || [];
      const timeRange = url.searchParams.get('timeRange') || 'all';
      const specificUserId = url.searchParams.get('userId');

      let query = authenticatedSupabase
        .from('posts')
        .select('*');

      // Apply user filter
      if (filter === 'mine') {
        query = query.eq('user_id', userId);
      } else if (filter === 'others') {
        query = query.neq('user_id', userId);
      } else if (specificUserId) {
        query = query.eq('user_id', specificUserId);
      }

      // Apply content type filter
      if (contentTypes.length > 0) {
        query = query.in('post_type', contentTypes);
      }

      // Apply time range filter
      const now = new Date();
      if (timeRange === '24h') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        query = query.gte('created_at', yesterday.toISOString());
      } else if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      // Apply visibility filter (only show public posts unless it's user's own posts)
      if (filter !== 'mine') {
        query = query.eq('visibility', 'public');
      }

      // Execute query with pagination
      const { data: posts, error: postsError } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (postsError) {
        console.error('Posts fetch error:', postsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch posts' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user interactions for each post
      const postIds = posts?.map(p => p.id) || [];
      let userInteractions = {};

      if (postIds.length > 0) {
        // Get user's reactions
        const { data: reactions } = await authenticatedSupabase
          .from('reactions')
          .select('target_id, reaction_type')
          .eq('user_id', userId)
          .eq('target_type', 'post')
          .in('target_id', postIds);

        // Get user's saves (if you have a saves table)
        // Add this if you implement saves functionality
        
        // Format interactions
        reactions?.forEach(reaction => {
          if (!userInteractions[reaction.target_id]) {
            userInteractions[reaction.target_id] = {};
          }
          userInteractions[reaction.target_id].isLikedByUser = reaction.reaction_type === 'like';
        });
      }

      // Get user profiles for all posts
      const userIds = [...new Set(posts?.map(p => p.user_id) || [])];
      let userProfiles = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await authenticatedSupabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);
        
        profiles?.forEach(profile => {
          userProfiles[profile.id] = profile;
        });
      }

      // Format posts for response
      const formattedPosts = posts?.map(post => {
        const author = userProfiles[post.user_id];
        return {
          id: post.id,
          content: post.content,
          postType: post.post_type,
          author: {
            id: post.user_id,
            username: author?.username || 'unknown',
            displayName: author?.display_name || 'Unknown User',
            profilePicture: author?.avatar_url,
            title: 'Solution Provider'
          },
          interactions: {
            likesCount: post.reactions_count || 0,
            commentsCount: post.comments_count || 0,
            sharesCount: post.shares_count || 0,
            isLikedByUser: userInteractions[post.id]?.isLikedByUser || false
          },
          createdAt: post.created_at,
          // Include additional data for specific post types
          ...(post.poll_data && { pollData: post.poll_data }),
          ...(post.event_data && { eventData: post.event_data }),
          ...(post.media_urls && { mediaUrls: post.media_urls }),
          ...(post.thumbnail_url && { thumbnailUrl: post.thumbnail_url })
        };
      }) || [];

      return new Response(
        JSON.stringify({
          posts: formattedPosts,
          pagination: {
            page,
            limit,
            total: formattedPosts.length,
            hasMore: formattedPosts.length === limit
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // GET SINGLE POST
    if (req.method === 'GET' && pathParts.length >= 2) {
      const postId = pathParts[pathParts.length - 1];
      
      if (postId !== 'feed') {
        const { data: post, error: postError } = await authenticatedSupabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (postError) {
          return new Response(
            JSON.stringify({ error: 'Post not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If it's an event post, get RSVP counts
        let eventCounts = {};
        if (post.post_type === 'event') {
          const { data: rsvpCounts, error: rsvpError } = await authenticatedSupabase
            .from('event_rsvps')
            .select('status')
            .eq('post_id', postId);

          if (!rsvpError && rsvpCounts) {
            eventCounts = {
              attending_count: rsvpCounts.filter(r => r.status === 'attending').length,
              interested_count: rsvpCounts.filter(r => r.status === 'interested').length,
              not_attending_count: rsvpCounts.filter(r => r.status === 'not_attending').length
            };
          }
        }

        // Get author profile
        const { data: authorProfile } = await authenticatedSupabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', post.user_id)
          .single();

        const responsePost = {
          ...post,
          author: {
            id: post.user_id,
            username: authorProfile?.username || 'unknown',
            display_name: authorProfile?.display_name || 'Unknown User',
            avatar_url: authorProfile?.avatar_url
          },
          author_id: post.user_id,
          reaction_count: post.reactions_count,
          comment_count: post.comments_count,
          share_count: post.shares_count,
          hashtags: post.metadata?.hashtags || [],
          mentions: post.metadata?.mentions || []
        };

        // Add event counts to event_data if it's an event
        if (post.post_type === 'event' && post.event_data) {
          responsePost.event_data = {
            ...post.event_data,
            ...eventCounts
          };
        }
        return new Response(
          JSON.stringify(responsePost),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // VOTE ON POLL ENDPOINT
    if (req.method === 'POST' && pathParts.length >= 3 && pathParts[pathParts.length - 1] === 'vote') {
      const postId = pathParts[pathParts.length - 2];
      const { option_index } = await req.json();

      // Validate option_index
      if (typeof option_index !== 'number' || option_index < 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid option index' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user already voted on this poll
      const { data: existingVote, error: voteCheckError } = await authenticatedSupabase
        .from('votes')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

      if (voteCheckError && voteCheckError.code !== 'PGRST116') {
        console.error('Vote check error:', voteCheckError);
        return new Response(
          JSON.stringify({ error: 'Failed to check existing vote' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingVote) {
        return new Response(
          JSON.stringify({ error: 'User has already voted on this poll' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the current poll data
      const { data: post, error: postError } = await authenticatedSupabase
        .from('posts')
        .select('poll_data')
        .eq('id', postId)
        .single();

      if (postError || !post || !post.poll_data) {
        return new Response(
          JSON.stringify({ error: 'Poll not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate option index against poll options
      if (option_index >= post.poll_data.options.length) {
        return new Response(
          JSON.stringify({ error: 'Invalid option index for this poll' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if poll has expired
      if (post.poll_data.expires_at && new Date(post.poll_data.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Poll has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record the vote
      const { error: voteError } = await authenticatedSupabase
        .from('votes')
        .insert({
          user_id: userId,
          post_id: postId,
          option_index: option_index
        });

      if (voteError) {
        console.error('Vote creation error:', voteError);
        return new Response(
          JSON.stringify({ error: 'Failed to record vote' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update poll data with new vote count
      const updatedPollData = { ...post.poll_data };
      updatedPollData.options[option_index].votes += 1;

      const { error: updateError } = await authenticatedSupabase
        .from('posts')
        .update({ poll_data: updatedPollData })
        .eq('id', postId);

      if (updateError) {
        console.error('Poll update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update poll data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          voted: true,
          option_index: option_index,
          poll_data: updatedPollData
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // RSVP TO EVENT ENDPOINT
    if (req.method === 'POST' && pathParts.length >= 3 && pathParts[pathParts.length - 1] === 'rsvp') {
      const postId = pathParts[pathParts.length - 2];
      const { status } = await req.json();

      // Validate RSVP status
      const validStatuses = ['attending', 'interested', 'not_attending'];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid RSVP status. Must be one of: attending, interested, not_attending' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the event post to validate it exists and is an event
      const { data: post, error: postError } = await authenticatedSupabase
        .from('posts')
        .select('post_type, event_data')
        .eq('id', postId)
        .single();

      if (postError || !post || post.post_type !== 'event') {
        return new Response(
          JSON.stringify({ error: 'Event post not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if event has capacity restrictions
      if (status === 'attending' && post.event_data?.max_attendees) {
        const { count: attendingCount, error: countError } = await authenticatedSupabase
          .from('event_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
          .eq('status', 'attending');

        if (countError) {
          console.error('Error counting attendees:', countError);
          return new Response(
            JSON.stringify({ error: 'Failed to check event capacity' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (attendingCount >= post.event_data.max_attendees) {
          return new Response(
            JSON.stringify({ error: 'Event is at maximum capacity' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Insert or update RSVP
      const { error: rsvpError } = await authenticatedSupabase
        .from('event_rsvps')
        .upsert({
          user_id: userId,
          post_id: postId,
          status: status
        });

      if (rsvpError) {
        console.error('RSVP creation error:', rsvpError);
        return new Response(
          JSON.stringify({ error: 'Failed to record RSVP' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          rsvp_status: status,
          post_id: postId
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})