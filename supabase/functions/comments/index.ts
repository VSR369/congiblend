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

      console.log('Creating comment:', { post_id, content, parent_comment_id, userId });

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
        console.error('Post check error:', postCheckError);
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
          console.error('Parent comment check error:', parentCheckError);
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

      // Insert the comment
      const { data: comment, error: insertError } = await authSupabase
        .from('comments')
        .insert({
          post_id: post_id,
          user_id: userId,
          content: content.trim(),
          parent_comment_id: parent_comment_id || null
        })
        .select(`
          id,
          content,
          created_at,
          parent_comment_id,
          reactions_count,
          user_id,
          profiles!comments_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (insertError) {
        console.error('Comment creation error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create comment', details: insertError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Comment created:', comment);

      return new Response(JSON.stringify({
        ...comment,
        author: comment.profiles
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      });
    }

    // GET COMMENT REPLIES
    if (req.method === 'GET' && pathParts.length >= 2 && pathParts[pathParts.length - 1] === 'replies') {
      const commentId = pathParts[pathParts.length - 2];
      
      const { data, error } = await authSupabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          parent_comment_id,
          reactions_count,
          user_id,
          profiles!comments_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('parent_comment_id', commentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Replies fetch error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch replies' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify(
        data.map(comment => ({
          ...comment,
          author: comment.profiles
        }))
      ), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET SINGLE COMMENT
    if (req.method === 'GET' && pathParts.length >= 1) {
      const commentId = pathParts[pathParts.length - 1];
      
      if (commentId !== 'comments') {
        const { data, error } = await authSupabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            parent_comment_id,
            reactions_count,
            user_id,
            profiles!comments_user_id_fkey (
              id,
              username,
              display_name,
              avatar_url
            )
          `)
          .eq('id', commentId)
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Comment not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(JSON.stringify({
          ...data,
          author: data.profiles
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
      const { data, error } = await authSupabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          parent_comment_id,
          reactions_count,
          user_id,
          profiles!comments_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Comments fetch error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch comments' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify(
        data.map(comment => ({
          ...comment,
          author: comment.profiles
        }))
      ), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Route not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})