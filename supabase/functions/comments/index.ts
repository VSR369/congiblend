import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to create authenticated Supabase client
const createAuthenticatedClient = (token: string) => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

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
    
    // Create authenticated client for this user
    const authSupabase = createAuthenticatedClient(token);

    // CREATE COMMENT
    if (req.method === 'POST' && endpoint === 'comments') {
      const { post_id, content, parent_comment_id } = await req.json();

      // Validate required fields
      if (!post_id || !content || !content.trim()) {
        return new Response(
          JSON.stringify({ error: 'post_id and content are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify post exists
      const { data: postExists, error: postCheckError } = await authSupabase
        .from('posts')
        .select('id')
        .eq('id', post_id)
        .single();

      if (postCheckError || !postExists) {
        return new Response(
          JSON.stringify({ error: 'Post not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If parent_comment_id is provided, verify it exists and belongs to the same post
      if (parent_comment_id) {
        const { data: parentComment, error: parentCheckError } = await authSupabase
          .from('comments')
          .select('id, post_id')
          .eq('id', parent_comment_id)
          .single();

        if (parentCheckError || !parentComment) {
          return new Response(
            JSON.stringify({ error: 'Parent comment not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (parentComment.post_id !== post_id) {
          return new Response(
            JSON.stringify({ error: 'Parent comment does not belong to the specified post' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Extract hashtags and mentions
      const hashtags = extractHashtags(content);
      const mentions = extractMentions(content);

      // Create the comment
      const { data: newComment, error: commentError } = await authSupabase
        .from('comments')
        .insert({
          post_id: post_id,
          user_id: userId,
          content: content.trim(),
          parent_comment_id: parent_comment_id || null
        })
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .single();

      if (commentError) {
        console.error('Comment creation error:', commentError);
        return new Response(
          JSON.stringify({ error: 'Failed to create comment' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update post comment count
      await updatePostCommentCount(authSupabase, post_id, 1);

      // If this is a reply, update parent comment reply count would go here
      // (currently not implemented as replies_count column doesn't exist)

      return new Response(
        JSON.stringify({
          ...newComment,
          author_id: newComment.user_id,
          hashtags,
          mentions,
          parent_comment_id: newComment.parent_comment_id
        }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // GET COMMENT REPLIES
    if (req.method === 'GET' && pathParts.length >= 2 && pathParts[pathParts.length - 1] === 'replies') {
      const commentId = pathParts[pathParts.length - 2];
      
      const { data: replies, error: repliesError } = await authSupabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: true });

      if (repliesError) {
        console.error('Replies fetch error:', repliesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch replies' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Format replies for response
      const formattedReplies = replies?.map(reply => ({
        ...reply,
        author_id: reply.user_id,
        parent_comment_id: reply.parent_comment_id
      })) || [];

      return new Response(
        JSON.stringify({
          replies: formattedReplies
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // GET SINGLE COMMENT
    if (req.method === 'GET' && pathParts.length >= 1) {
      const commentId = pathParts[pathParts.length - 1];
      
      if (commentId !== 'comments') {
        const { data: comment, error: commentError } = await authSupabase
          .from('comments')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              display_name,
              avatar_url,
              is_verified
            )
          `)
          .eq('id', commentId)
          .single();

        if (commentError) {
          return new Response(
            JSON.stringify({ error: 'Comment not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            ...comment,
            author_id: comment.user_id,
            parent_comment_id: comment.parent_comment_id
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // GET COMMENTS FOR POST
    if (req.method === 'GET' && endpoint === 'comments') {
      const postId = url.searchParams.get('post_id');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      if (!postId) {
        return new Response(
          JSON.stringify({ error: 'post_id parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get top-level comments (no parent)
      const { data: comments, error: commentsError } = await authSupabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (commentsError) {
        console.error('Comments fetch error:', commentsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch comments' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Format comments for response
      const formattedComments = comments?.map(comment => ({
        ...comment,
        author_id: comment.user_id,
        parent_comment_id: comment.parent_comment_id
      })) || [];

      return new Response(
        JSON.stringify({
          comments: formattedComments,
          pagination: {
            page,
            limit,
            total: formattedComments.length,
            hasMore: formattedComments.length === limit
          }
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

// Helper function to update post comment count
async function updatePostCommentCount(authSupabase: any, postId: string, increment: number) {
  try {
    // Get current count
    const { data: currentData, error: fetchError } = await authSupabase
      .from('posts')
      .select('comments_count')
      .eq('id', postId)
      .single();

    if (fetchError || !currentData) {
      console.error('Failed to fetch current post comment count:', fetchError);
      return;
    }

    const newCount = Math.max(0, (currentData.comments_count || 0) + increment);

    // Update count
    const { error: updateError } = await authSupabase
      .from('posts')
      .update({ comments_count: newCount })
      .eq('id', postId);

    if (updateError) {
      console.error('Failed to update post comment count:', updateError);
    }
  } catch (error) {
    console.error('Error updating post comment count:', error);
  }
}

// Helper function to update comment reply count (not used since replies_count column doesn't exist)
async function updateCommentReplyCount(authSupabase: any, commentId: string, increment: number) {
  // This function is not implemented as the replies_count column doesn't exist in the current schema
  console.log('Reply count update skipped - column not implemented');
}