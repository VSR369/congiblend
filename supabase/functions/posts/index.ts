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
  post_type: 'text' | 'image' | 'video' | 'article' | 'poll' | 'event' | 'job' | 'carousel';
  images?: string[];
  videos?: string[];
  media_urls?: string[];
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