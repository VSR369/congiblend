import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

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
    
    // Verify the token and get user
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser(token);
    
    if (sessionError || !sessionData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
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
      const { data: newPost, error: postError } = await supabase
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
          JSON.stringify({ error: 'Failed to create post' }),
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
      const { data: posts, error: postsError } = await supabase
        .from('posts')
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
        const { data: post, error: postError } = await supabase
          .from('posts')
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
          .eq('id', postId)
          .single();

        if (postError) {
          return new Response(
            JSON.stringify({ error: 'Post not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            ...post,
            author_id: post.user_id,
            reaction_count: post.reactions_count,
            comment_count: post.comments_count,
            hashtags: post.metadata?.hashtags || [],
            mentions: post.metadata?.mentions || []
          }),
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
      const { data: existingVote, error: voteCheckError } = await supabase
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
      const { data: post, error: postError } = await supabase
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
      const { error: voteError } = await supabase
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

      const { error: updateError } = await supabase
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