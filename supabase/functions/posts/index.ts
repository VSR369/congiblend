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

      // Validate event data if it's an event post
      if (postData.post_type === 'event') {
        if (!postData.event_data?.title?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Event title is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!postData.event_data?.description?.trim()) {
          return new Response(
            JSON.stringify({ error: 'Event description is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!postData.event_data?.start_date) {
          return new Response(
            JSON.stringify({ error: 'Event start date is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Extract hashtags and mentions
      const hashtags = extractHashtags(postData.content);
      const mentions = extractMentions(postData.content);

      // Normalize post_type to match DB constraints (map 'article' to 'text')
      const normalizedType = postData.post_type === 'article' ? 'text' : (postData.post_type || 'text');
      console.log('Normalized post_type:', postData.post_type, '->', normalizedType);

      // Create the post
      const { data: newPost, error: postError } = await authenticatedSupabase
        .from('posts')
        .insert({
          user_id: userId,
          content: postData.content.trim(),
          post_type: normalizedType,
          visibility: postData.visibility || 'public',
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
        .select(`
          *,
          author:user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .single();

      if (postError) {
        console.error('Post creation error:', postError);
        return new Response(
          JSON.stringify({ error: 'Failed to create post', code: (postError as any).code, message: (postError as any).message, details: (postError as any).details ?? null }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          ...newPost,
          author_id: newPost.user_id,
          reaction_count: newPost.reactions_count,
          comment_count: newPost.comments_count,
          hashtags,
          mentions
        }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // GET FEED
    if (req.method === 'GET' && endpoint === 'feed') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      // Get posts with author information
      const { data: posts, error: postsError } = await authenticatedSupabase
        .from('posts')
        .select(`
          *,
          author:user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          ),
          shared_post:shared_post_id (
            *,
            author:user_id (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          )
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (postsError) {
        console.error('Feed fetch error:', postsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch feed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Format posts for response
      const formattedPosts = posts?.map(post => ({
        ...post,
        author_id: post.user_id,
        reaction_count: post.reactions_count,
        comment_count: post.comments_count,
        share_count: post.shares_count,
        hashtags: post.metadata?.hashtags || [],
        mentions: post.metadata?.mentions || []
      })) || [];

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
          .select(`
            *,
            author:user_id (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            ),
            shared_post:shared_post_id (
              *,
              author:user_id (
                id,
                username,
                display_name,
                avatar_url,
                is_verified
              )
            )
          `)
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

        const responsePost = {
          ...post,
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

      // Use server-side RPC to safely cast vote (allows changing vote)
      const { data: voteResult, error: voteError } = await authenticatedSupabase
        .rpc('cast_poll_vote', { p_post_id: postId, p_option_index: option_index });

      if (voteError) {
        console.error('cast_poll_vote error:', voteError);
        return new Response(
          JSON.stringify({ error: voteError.message || 'Failed to record vote' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(voteResult),
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