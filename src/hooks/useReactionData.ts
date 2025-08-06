import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReactionData {
  currentUserReaction: string | null;
  reactionCounts: Record<string, number>;
}

export const useReactionData = (targetId: string, targetType: 'post' | 'comment') => {
  const [reactionData, setReactionData] = useState<ReactionData>({
    currentUserReaction: null,
    reactionCounts: {}
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchReactions = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch all reactions for this target
      const { data: reactions, error } = await supabase
        .from('reactions')
        .select('*')
        .eq('target_id', targetId)
        .eq('target_type', targetType);

      if (error) {
        console.error('Error fetching reactions:', error);
        return;
      }

      // Process reaction data
      const counts: Record<string, number> = {};
      let userReaction: string | null = null;

      reactions?.forEach(reaction => {
        // Count reactions by type
        const type = reaction.reaction_type || 'like';
        counts[type] = (counts[type] || 0) + 1;
        
        // Check if current user has reacted
        if (user && reaction.user_id === user.id) {
          userReaction = type;
        }
      });

      setReactionData({
        currentUserReaction: userReaction,
        reactionCounts: counts
      });
    } catch (error) {
      console.error('Error in fetchReactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReactions();
  }, [targetId, targetType]);

  const updateReactionData = (newReaction: string | null) => {
    setReactionData(prev => {
      const newCounts = { ...prev.reactionCounts };
      
      // Remove old reaction if exists
      if (prev.currentUserReaction) {
        newCounts[prev.currentUserReaction] = Math.max(0, (newCounts[prev.currentUserReaction] || 1) - 1);
        if (newCounts[prev.currentUserReaction] === 0) {
          delete newCounts[prev.currentUserReaction];
        }
      }
      
      // Add new reaction if provided
      if (newReaction) {
        newCounts[newReaction] = (newCounts[newReaction] || 0) + 1;
      }
      
      return {
        currentUserReaction: newReaction,
        reactionCounts: newCounts
      };
    });
  };

  return {
    ...reactionData,
    isLoading,
    refetch: fetchReactions,
    updateReactionData
  };
};