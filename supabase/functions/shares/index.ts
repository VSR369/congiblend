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

// Valid target types
const VALID_TARGET_TYPES = ['post'];

// Valid share types
const VALID_SHARE_TYPES = ['share', 'quote_repost'];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // CREATE SHARE
    if (req.method === 'POST') {
      const { target_type, target_id, share_type, quote_content } = await req.json();

      // Validate input
      if (!target_type || !target_id || !share_type) {
        return new Response(
          JSON.stringify({ error: 'target_type, target_id, and share_type are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!VALID_TARGET_TYPES.includes(target_type)) {
        return new Response(
          JSON.stringify({ error: `Invalid target_type. Must be one of: ${VALID_TARGET_TYPES.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!VALID_SHARE_TYPES.includes(share_type)) {
        return new Response(
          JSON.stringify({ error: `Invalid share_type. Must be one of: ${VALID_SHARE_TYPES.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate quote content for quote reposts
      if (share_type === 'quote_repost' && (!quote_content || !quote_content.trim())) {
        return new Response(
          JSON.stringify({ error: 'quote_content is required for quote reposts' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if target post exists
      const { data: targetPost, error: targetError } = await supabase
        .from('posts')
        .select('id, user_id, post_type, content, visibility')
        .eq('id', target_id)
        .single();

      if (targetError || !targetPost) {
        return new Response(
          JSON.stringify({ error: 'Target post not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Prevent users from sharing their own posts
      if (targetPost.user_id === userId) {
        return new Response(
          JSON.stringify({ error: 'You cannot share your own posts' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user already shared this post with the same share type
      const { data: existingShare, error: shareCheckError } = await supabase
        .from('shares')
        .select('id')
        .eq('user_id', userId)
        .eq('target_id', target_id)
        .eq('share_type', share_type)
        .single();

      if (shareCheckError && shareCheckError.code !== 'PGRST116') {
        console.error('Share check error:', shareCheckError);
        return new Response(
          JSON.stringify({ error: 'Failed to check existing share' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingShare) {
        return new Response(
          JSON.stringify({ error: 'You have already shared this post' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create share record
      const { data: newShare, error: shareError } = await supabase
        .from('shares')
        .insert({
          user_id: userId,
          target_type: target_type,
          target_id: target_id,
          share_type: share_type,
          quote_content: quote_content?.trim() || null
        })
        .select()
        .single();

      if (shareError) {
        console.error('Share creation error:', shareError);
        return new Response(
          JSON.stringify({ error: 'Failed to create share' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For quote reposts, create a new post entry
      if (share_type === 'quote_repost') {
        const { data: quotePost, error: quotePostError } = await supabase
          .from('posts')
          .insert({
            user_id: userId,
            content: '', // Quote content is stored separately
            post_type: 'quote_repost',
            visibility: 'public',
            shared_post_id: target_id,
            quote_content: quote_content.trim(),
            reactions_count: 0,
            comments_count: 0,
            shares_count: 0,
            is_pinned: false,
            is_archived: false
          })
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
          .single();

        if (quotePostError) {
          console.error('Quote post creation error:', quotePostError);
          // Try to clean up the share record
          await supabase.from('shares').delete().eq('id', newShare.id);
          return new Response(
            JSON.stringify({ error: 'Failed to create quote post' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        newShare.quote_post = quotePost;
      }

      // Update share count on target post
      await updateShareCount(target_id, 1);

      return new Response(
        JSON.stringify(newShare),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // DELETE SHARE (UNSHARE)
    if (req.method === 'DELETE') {
      const { target_type, target_id, share_type } = await req.json();

      // Validate input
      if (!target_type || !target_id || !share_type) {
        return new Response(
          JSON.stringify({ error: 'target_type, target_id, and share_type are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find and delete existing share
      const { data: deletedShare, error: deleteError } = await supabase
        .from('shares')
        .delete()
        .eq('user_id', userId)
        .eq('target_id', target_id)
        .eq('target_type', target_type)
        .eq('share_type', share_type)
        .select()
        .single();

      if (deleteError || !deletedShare) {
        return new Response(
          JSON.stringify({ error: 'No share found to delete' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If it was a quote repost, also delete the quote post
      if (share_type === 'quote_repost') {
        await supabase
          .from('posts')
          .delete()
          .eq('user_id', userId)
          .eq('shared_post_id', target_id)
          .eq('post_type', 'quote_repost');
      }

      // Update share count on target post
      await updateShareCount(target_id, -1);

      return new Response(
        JSON.stringify({ success: true, deleted_share: deletedShare }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})

// Helper function to update share count on target post
async function updateShareCount(targetId: string, increment: number) {
  try {
    // Get current count
    const { data: currentData, error: fetchError } = await supabase
      .from('posts')
      .select('shares_count')
      .eq('id', targetId)
      .single();

    if (fetchError || !currentData) {
      console.error('Failed to fetch current share count:', fetchError);
      return;
    }

    const newCount = Math.max(0, (currentData.shares_count || 0) + increment);

    // Update count
    const { error: updateError } = await supabase
      .from('posts')
      .update({ shares_count: newCount })
      .eq('id', targetId);

    if (updateError) {
      console.error('Failed to update share count:', updateError);
    }
  } catch (error) {
    console.error('Error updating share count:', error);
  }
}