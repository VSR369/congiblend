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

// Valid reaction types
const VALID_REACTION_TYPES = [
  'like',
  'love', 
  'celebrate',
  'support',
  'insightful',
  'funny',
  'angry',
  'sad'
];

// Valid target types
const VALID_TARGET_TYPES = ['post', 'comment'];

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
    
    // Create authenticated client for this user
    const authSupabase = createAuthenticatedClient(token);

    // ADD REACTION
    if (req.method === 'POST') {
      const { target_type, target_id, reaction_type } = await req.json();

      // Validate input
      if (!target_type || !target_id || !reaction_type) {
        return new Response(
          JSON.stringify({ error: 'target_type, target_id, and reaction_type are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!VALID_TARGET_TYPES.includes(target_type)) {
        return new Response(
          JSON.stringify({ error: `Invalid target_type. Must be one of: ${VALID_TARGET_TYPES.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!VALID_REACTION_TYPES.includes(reaction_type)) {
        return new Response(
          JSON.stringify({ error: `Invalid reaction_type. Must be one of: ${VALID_REACTION_TYPES.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if target exists
      const { data: targetExists, error: targetError } = await authSupabase
        .from(target_type === 'post' ? 'posts' : 'comments')
        .select('id')
        .eq('id', target_id)
        .single();

      if (targetError || !targetExists) {
        return new Response(
          JSON.stringify({ error: `${target_type} not found` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user already has a reaction on this target
      const { data: existingReaction, error: reactionCheckError } = await authSupabase
        .from('reactions')
        .select('id, reaction_type')
        .eq('user_id', userId)
        .eq('target_id', target_id)
        .eq('target_type', target_type)
        .single();

      if (reactionCheckError && reactionCheckError.code !== 'PGRST116') {
        console.error('Reaction check error:', reactionCheckError);
        return new Response(
          JSON.stringify({ error: 'Failed to check existing reaction' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let reactionResult;

      if (existingReaction) {
        // Update existing reaction
        const { data: updatedReaction, error: updateError } = await authSupabase
          .from('reactions')
          .update({ reaction_type: reaction_type })
          .eq('id', existingReaction.id)
          .select()
          .single();

        if (updateError) {
          console.error('Reaction update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update reaction' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        reactionResult = updatedReaction;
      } else {
        // Create new reaction
        const { data: newReaction, error: insertError } = await authSupabase
          .from('reactions')
          .insert({
            user_id: userId,
            target_id: target_id,
            target_type: target_type,
            reaction_type: reaction_type
          })
          .select()
          .single();

        if (insertError) {
          console.error('Reaction creation error:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to create reaction' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        reactionResult = newReaction;

        // Update reaction count on target
        await updateReactionCount(authSupabase, target_type, target_id, 1);
      }

      return new Response(
        JSON.stringify(reactionResult),
        { 
          status: existingReaction ? 200 : 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // UPDATE REACTION TYPE
    if (req.method === 'PUT') {
      const { target_type, target_id, reaction_type } = await req.json();

      // Validate input
      if (!target_type || !target_id || !reaction_type) {
        return new Response(
          JSON.stringify({ error: 'target_type, target_id, and reaction_type are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!VALID_REACTION_TYPES.includes(reaction_type)) {
        return new Response(
          JSON.stringify({ error: `Invalid reaction_type. Must be one of: ${VALID_REACTION_TYPES.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find existing reaction
      const { data: existingReaction, error: findError } = await authSupabase
        .from('reactions')
        .select('id')
        .eq('user_id', userId)
        .eq('target_id', target_id)
        .eq('target_type', target_type)
        .single();

      if (findError || !existingReaction) {
        return new Response(
          JSON.stringify({ error: 'No existing reaction found to update' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update reaction
      const { data: updatedReaction, error: updateError } = await authSupabase
        .from('reactions')
        .update({ reaction_type: reaction_type })
        .eq('id', existingReaction.id)
        .select()
        .single();

      if (updateError) {
        console.error('Reaction update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update reaction' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(updatedReaction),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // REMOVE REACTION
    if (req.method === 'DELETE') {
      const { target_type, target_id } = await req.json();

      // Validate input
      if (!target_type || !target_id) {
        return new Response(
          JSON.stringify({ error: 'target_type and target_id are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find and delete existing reaction
      const { data: deletedReaction, error: deleteError } = await authSupabase
        .from('reactions')
        .delete()
        .eq('user_id', userId)
        .eq('target_id', target_id)
        .eq('target_type', target_type)
        .select()
        .single();

      if (deleteError || !deletedReaction) {
        return new Response(
          JSON.stringify({ error: 'No reaction found to delete' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update reaction count on target
      await updateReactionCount(authSupabase, target_type, target_id, -1);

      return new Response(
        JSON.stringify({ success: true, deleted_reaction: deletedReaction }),
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

// Helper function to update reaction count on target
async function updateReactionCount(authSupabase: any, targetType: string, targetId: string, increment: number) {
  try {
    const tableName = targetType === 'post' ? 'posts' : 'comments';
    const countField = targetType === 'post' ? 'reactions_count' : 'reactions_count';
    
    // Get current count
    const { data: currentData, error: fetchError } = await authSupabase
      .from(tableName)
      .select(countField)
      .eq('id', targetId)
      .single();

    if (fetchError || !currentData) {
      console.error('Failed to fetch current count:', fetchError);
      return;
    }

    const newCount = Math.max(0, (currentData[countField] || 0) + increment);

    // Update count
    const { error: updateError } = await authSupabase
      .from(tableName)
      .update({ [countField]: newCount })
      .eq('id', targetId);

    if (updateError) {
      console.error('Failed to update reaction count:', updateError);
    }
  } catch (error) {
    console.error('Error updating reaction count:', error);
  }
}