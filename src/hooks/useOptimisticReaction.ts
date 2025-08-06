import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useFeedStore } from '@/stores/feedStore';
import { useDebounce } from './useDebounce';
import { useState, useCallback } from 'react';
import type { ReactionType } from '@/types/feed';

interface ReactionData {
  postId: string;
  reactionType: ReactionType;
}

export const useOptimisticReaction = () => {
  const { toggleReaction } = useFeedStore();
  const [pendingReactions, setPendingReactions] = useState<Set<string>>(new Set());
  
  // Debounce rapid clicking to prevent API spam
  const debouncedReaction = useDebounce(
    useCallback((data: ReactionData) => {
      return toggleReaction(data.postId, data.reactionType);
    }, [toggleReaction]),
    300
  );

  const mutation = useMutation({
    mutationFn: async ({ postId, reactionType }: ReactionData) => {
      // Mark reaction as pending
      setPendingReactions(prev => new Set(prev).add(postId));
      
      try {
        const result = await toggleReaction(postId, reactionType);
        return result;
      } finally {
        // Remove from pending regardless of success/failure
        setPendingReactions(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      }
    },
    onError: (error: any, { postId }) => {
      console.error('Reaction error:', error);
      
      // Show user-friendly error message
      const errorMessage = error?.message?.includes('rate limit') 
        ? 'Please wait a moment before reacting again'
        : 'Failed to update reaction. Please try again.';
      
      toast.error(errorMessage);
    },
    onSuccess: () => {
      // Optional: Show success feedback for important reactions
      // toast.success('Reaction updated!', { duration: 1000 });
    }
  });

  const isReactionPending = useCallback((postId: string) => {
    return pendingReactions.has(postId) || mutation.isPending;
  }, [pendingReactions, mutation.isPending]);

  return {
    ...mutation,
    isReactionPending
  };
};