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

interface ProfileUpdateData {
  bio?: string;
  location?: string;
  headline?: string;
  skills?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];

    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Set the session
    const { data: sessionData, error: sessionError } = await supabase.auth.getUser(token);
    
    if (sessionError || !sessionData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user can only update their own profile
    if (sessionData.user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PUT') {
      const profileData: ProfileUpdateData = await req.json();

      // Update user profile
      const { data: updatedUser, error: userError } = await supabase
        .from('users')
        .update({
          bio: profileData.bio,
          location: profileData.location,
          headline: profileData.headline,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (userError) {
        console.error('User profile update error:', userError);
        return new Response(
          JSON.stringify({ error: 'Failed to update profile' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle skills if provided
      if (profileData.skills && profileData.skills.length > 0) {
        // Delete existing skills
        await supabase
          .from('user_skill_profiles')
          .delete()
          .eq('user_id', userId);

        // Insert new skills
        const skillInserts = profileData.skills.map(skill => ({
          user_id: userId,
          skill_name: skill,
          created_at: new Date().toISOString()
        }));

        const { error: skillsError } = await supabase
          .from('user_skill_profiles')
          .insert(skillInserts);

        if (skillsError) {
          console.error('Skills update error:', skillsError);
          // Don't fail the whole update if skills fail
        }
      }

      // Get updated skills
      const { data: skillsData } = await supabase
        .from('user_skill_profiles')
        .select('skill_name')
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({
          ...updatedUser,
          skills: skillsData?.map(s => s.skill_name) || []
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (req.method === 'GET') {
      // Get user profile with skills
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        return new Response(
          JSON.stringify({ error: 'Profile not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user skills
      const { data: skillsData } = await supabase
        .from('user_skill_profiles')
        .select('skill_name')
        .eq('user_id', userId);

      return new Response(
        JSON.stringify({
          ...userData,
          skills: skillsData?.map(s => s.skill_name) || []
        }),
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