
import { useState, useCallback } from 'react';
import { invokeEdgeFunction } from '@/utils/authUtils';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/hooks/use-toast';

export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  createdAt: Date;
  reactions: any[];
  parentId?: string;
}

export interface UseCommentsReturn {
  isLoading: boolean;
  error: string | null;
  addComment: (postId: string, content: string, parentId?: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  clearError: () => void;
}

export function useComments(
  onCommentAdded?: (comment: Comment) => void,
  onCommentDeleted?: (commentId: string) => void
): UseCommentsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const addComment = useCallback(async (
    postId: string, 
    content: string, 
    parentId?: string
  ) => {
    if (!user) {
      setError('Authentication required to add comments');
      return;
    }

    if (!content.trim()) {
      setError('Comment content cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Adding comment:', { postId, content, parentId });
      
      const response = await invokeEdgeFunction('comments', {
        post_id: postId,
        content: content.trim(),
        parent_comment_id: parentId || null
      });

      if (response?.comment) {
        const newComment: Comment = {
          id: response.comment.id,
          content: response.comment.content,
          author: {
            id: response.comment.profiles.id,
            name: response.comment.profiles.display_name || response.comment.profiles.username || 'User',
            username: response.comment.profiles.username || 'user',
            avatar: response.comment.profiles.avatar_url
          },
          createdAt: new Date(response.comment.created_at),
          reactions: [],
          parentId: response.comment.parent_comment_id
        };

        onCommentAdded?.(newComment);
        
        toast({
          title: "Comment added",
          description: "Your comment has been posted successfully.",
        });
      }
    } catch (error: any) {
      console.error('Error adding comment:', error);
      const errorMessage = error.message || 'Failed to add comment. Please try again.';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Failed to add comment",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [onCommentAdded, user]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) {
      setError('Authentication required to delete comments');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Deleting comment:', commentId);
      
      await invokeEdgeFunction('comments', {
        method: 'DELETE',
        comment_id: commentId
      });

      onCommentDeleted?.(commentId);
      
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      const errorMessage = error.message || 'Failed to delete comment. Please try again.';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Failed to delete comment",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [onCommentDeleted, user]);

  return {
    isLoading,
    error,
    addComment,
    deleteComment,
    clearError
  };
}
