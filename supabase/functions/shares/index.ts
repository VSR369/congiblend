import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get the JWT token and verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid token')
    }

    if (req.method === 'POST') {
      const { target_type, target_id, share_type, quote_content } = await req.json()

      // Validate input
      if (!target_type || !target_id || !share_type) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: corsHeaders }
        )
      }

      if (!['post'].includes(target_type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid target_type' }),
          { status: 400, headers: corsHeaders }
        )
      }

      if (!['share', 'quote_repost'].includes(share_type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid share_type' }),
          { status: 400, headers: corsHeaders }
        )
      }

      // Check if post exists and is accessible
      const { data: originalPost, error: postError } = await supabaseClient
        .from('posts')
        .select('*')
        .eq('id', target_id)
        .single()

      if (postError || !originalPost) {
        return new Response(
          JSON.stringify({ error: 'Post not found' }),
          { status: 404, headers: corsHeaders }
        )
      }

      // Check if user already shared this post
      const { data: existingShare } = await supabaseClient
        .from('shares')
        .select('*')
        .eq('user_id', user.id)
        .eq('target_id', target_id)
        .eq('target_type', target_type)
        .maybeSingle()

      if (existingShare) {
        return new Response(
          JSON.stringify({ error: 'Post already shared' }),
          { status: 409, headers: corsHeaders }
        )
      }

      // Create the share record
      const { data: share, error: shareError } = await supabaseClient
        .from('shares')
        .insert({
          user_id: user.id,
          target_type,
          target_id,
          share_type,
          quote_content: share_type === 'quote_repost' ? quote_content : null
        })
        .select()
        .single()

      if (shareError) {
        console.error('Error creating share:', shareError)
        return new Response(
          JSON.stringify({ error: 'Failed to create share' }),
          { status: 500, headers: corsHeaders }
        )
      }

      // Create a new post for quote reposts or regular shares
      let newPost = null
      if (share_type === 'quote_repost' || share_type === 'share') {
        const postContent = share_type === 'quote_repost' ? quote_content : null
        
        const { data: createdPost, error: postCreateError } = await supabaseClient
          .from('posts')
          .insert({
            user_id: user.id,
            content: postContent || '',
            type: 'text',
            visibility: 'public',
            shared_post_id: target_id,
            quote_content: share_type === 'quote_repost' ? quote_content : null
          })
          .select()
          .single()

        if (postCreateError) {
          console.error('Error creating post for share:', postCreateError)
        } else {
          newPost = createdPost
        }
      }

      // Update share count on original post
      const { error: updateError } = await supabaseClient
        .from('posts')
        .update({ 
          shares_count: originalPost.shares_count + 1 
        })
        .eq('id', target_id)

      if (updateError) {
        console.error('Error updating share count:', updateError)
      }

      return new Response(
        JSON.stringify({ 
          ...share,
          post: newPost
        }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error in shares function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})