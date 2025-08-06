import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useActivityTracker = () => {
  const trackActivity = async (activityType: 'post' | 'comment' | 'reaction' | 'login' | 'view') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('update_user_activity', {
        p_user_id: user.id,
        p_activity_type: activityType
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  const trackProfileView = async (profileUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.rpc('increment_profile_view', {
        p_profile_user_id: profileUserId,
        p_viewer_user_id: user?.id || null,
        p_ip_address: null, // Could be populated from request headers if needed
        p_user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error tracking profile view:', error);
    }
  };

  // Track page view on mount
  useEffect(() => {
    trackActivity('view');
  }, []);

  return {
    trackActivity,
    trackProfileView
  };
};