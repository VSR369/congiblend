import * as React from "react";
import { ChevronDown, ChevronUp, TrendingUp, Clock } from "lucide-react";
import { CommentInput } from "./comment-input";
import { LikeButton } from "./like-button";
import { Button } from "./button";
import { Avatar } from "./avatar";
import { formatRelativeTime } from "@/utils/formatters";
import { useFeedStore } from "@/stores/feedStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import type { Comment, ReactionType } from "@/types/feed";

interface SimpleCommentsSectionProps {
  postId: string;
  comments: Comment[];
  commentsCount: number;
  showCommentInput?: boolean;
  onToggleCommentInput?: () => void;
  className?: string;
}

export const SimpleCommentsSection = React.memo(({ 
  postId, 
  comments, 
  commentsCount,
  showCommentInput = false,
  onToggleCommentInput,
  className 
}: SimpleCommentsSectionProps) => {
  const [showComments, setShowComments] = React.useState(false);
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const { addComment } = useFeedStore();

  // Auto-expand when comments are added
  React.useEffect(() => {
    if (comments.length > 0 && !showComments) {
      setShowComments(true);
    }
  }, [comments.length, showComments]);

  const handleAddComment = React.useCallback(async (content: string) => {
    try {
      await addComment(postId, content);
      setShowComments(true); // Auto-expand after adding comment
    } catch (error) {
      throw error;
    }
  }, [postId, addComment]);

  const handleAddReply = React.useCallback(async (content: string, parentId: string) => {
    try {
      await addComment(postId, content, parentId);
      setReplyingTo(null);
      setShowComments(true); // Auto-expand after adding reply
    } catch (error) {
      throw error;
    }
  }, [postId, addComment]);

  const topLevelComments = React.useMemo(() => 
    comments.filter(comment => !comment.parentId),
    [comments]
  );

  return (
    <div className={cn("space-y-4 border-t pt-4", className)}>
      {/* LinkedIn-style comment sorting */}
      {showComments && commentsCount > 0 && (
        <div className="px-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground p-0 h-auto font-normal"
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Most relevant
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Enhanced comment input - only show when Comment button clicked */}
      {showCommentInput && (
        <CommentInput
          onSubmit={handleAddComment}
          placeholder="Add a comment..."
          className="px-4"
        />
      )}

      {/* Comments toggle */}
      {commentsCount > 0 && !showComments && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(true)}
          className="w-full justify-start text-muted-foreground hover:text-foreground px-4"
        >
          <span>
            View {commentsCount} comment{commentsCount !== 1 ? 's' : ''}
          </span>
        </Button>
      )}

      {/* Comments list */}
      {showComments && topLevelComments.length > 0 && (
        <div className="space-y-4 animate-fade-in px-4">
          {topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              allComments={comments}
              onReply={(commentId) => setReplyingTo(commentId)}
              replyingTo={replyingTo}
              onAddReply={handleAddReply}
              postId={postId}
            />
          ))}
        </div>
      )}

      {showComments && topLevelComments.length === 0 && (
        <div className="text-center py-4">
          <p className="text-muted-foreground text-sm">No comments yet. Be the first to comment!</p>
        </div>
      )}
    </div>
  );
});

SimpleCommentsSection.displayName = "SimpleCommentsSection";

// Comment Item Component
interface CommentItemProps {
  comment: Comment;
  allComments: Comment[];
  onReply: (commentId: string) => void;
  replyingTo: string | null;
  onAddReply: (content: string, parentId: string) => Promise<void>;
  postId: string;
}

const CommentItem = React.memo(({ 
  comment, 
  allComments, 
  onReply, 
  replyingTo, 
  onAddReply,
  postId
}: CommentItemProps) => {
  const { user } = useAuthStore();
  const replies = React.useMemo(() => 
    allComments.filter(c => c.parentId === comment.id),
    [allComments, comment.id]
  );

  const handleReplySubmit = React.useCallback(async (content: string) => {
    await onAddReply(content, comment.id);
  }, [onAddReply, comment.id]);

  const currentUserReaction = comment.reactions?.find(
    r => r.user.id === user?.id
  )?.type;

  return (
    <div className="space-y-3">
      {/* Main comment - LinkedIn style with name above */}
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8">
          {comment.author.avatar ? (
            <img src={comment.author.avatar} alt={comment.author.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs">{comment.author.name.charAt(0)}</span>
          )}
        </Avatar>
        
        <div className="flex-1 space-y-1">
          {/* Author name outside the bubble */}
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          
          {/* Comment content in bubble */}
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm">{comment.content}</p>
          </div>
          
          {/* Like and Reply actions */}
          <div className="flex items-center space-x-4">
            <LikeButton
              targetId={comment.id}
              targetType="comment"
              currentReaction={currentUserReaction}
              reactions={comment.reactions || []}
              postId={postId}
              className="text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
            >
              Reply
            </Button>
          </div>
        </div>
      </div>

      {/* Reply input */}
      {replyingTo === comment.id && (
        <div className="ml-11 animate-fade-in">
          <CommentInput
            onSubmit={handleReplySubmit}
            placeholder={`Reply to ${comment.author.name}...`}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-11 space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              allComments={allComments}
              onReply={onReply}
              replyingTo={replyingTo}
              onAddReply={onAddReply}
              postId={postId}
            />
          ))}
        </div>
      )}
    </div>
  );
});

CommentItem.displayName = "CommentItem";