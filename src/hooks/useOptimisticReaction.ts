import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useFeedStore } from '@/stores/feedStore';
import type { ReactionType } from '@/types/feed';

interface ReactionData {
  postId: string;
  reactionType: ReactionType;
}

export const useOptimisticReaction = () => {
  const queryClient = useQueryClient();
  const { toggleReaction } = useFeedStore();

  return useMutation({
    mutationFn: async ({ postId, reactionType }: ReactionData) => {
      return toggleReaction(postId, reactionType);
    },
    onMutate: async ({ postId, reactionType }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData(['posts']);

      // Optimistically update the cache
      queryClient.setQueryData(['posts'], (old: any) => {
        if (!old?.pages) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data?.map((post: any) => {
              if (post.id === postId) {
                const hasExistingReaction = post.userReaction === reactionType;
                
                return {
                  ...post,
                  userReaction: hasExistingReaction ? null : reactionType,
                  reactions_count: hasExistingReaction 
                    ? Math.max(0, post.reactions_count - 1)
                    : post.reactions_count + 1,
                };
              }
              return post;
            }),
          })),
        };
      });

      return { previousPosts };
    },
    onError: (err, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
      
      console.error('Reaction error:', err);
      toast.error('Failed to update reaction. Please try again.');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};