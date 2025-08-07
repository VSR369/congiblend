import React, { useState } from 'react';
import { MessageCircle, Reply } from 'lucide-react';
import { Button } from './button';
import { CommentInput } from './comment-input';
import { useFeedStore } from '@/stores/feedStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Comment } from '@/types/feed';

interface CommentsSectionProps {
  postId: string;
  comments: Comment[];
  commentsCount: number;
  className?: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  postId,
  comments,
  commentsCount,
  className
}) => {
  const [showComments, setShowComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const { addComment } = useFeedStore();

  const handleAddComment = async (content: string, parentId?: string) => {
    try {
      await addComment(postId, content, parentId);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const topLevelComments = comments.filter(comment => !comment.parentId);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Comments Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowComments(!showComments)}
        className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
      >
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm">
          Comments
          {commentsCount > 0 && (
            <span className="ml-1 text-xs opacity-70">{commentsCount}</span>
          )}
        </span>
      </Button>

      {/* Comments Section */}
      {showComments && (
        <div className="space-y-4 border-t border-border/50 pt-3">
          {/* Comment Input */}
          <CommentInput
            onSubmit={(content) => handleAddComment(content)}
            placeholder="Write a comment..."
          />

          {/* Comments List */}
          {topLevelComments.length > 0 && (
            <div className="space-y-3">
              {topLevelComments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  allComments={comments}
                  onReply={(content) => handleAddComment(content, comment.id)}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                />
              ))}
            </div>
          )}

          {topLevelComments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface CommentItemProps {
  comment: Comment;
  allComments: Comment[];
  onReply: (content: string) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  allComments,
  onReply,
  replyingTo,
  setReplyingTo
}) => {
  const replies = allComments.filter(c => c.parentId === comment.id);

  return (
    <div className="space-y-2">
      {/* Main Comment */}
      <div className="flex space-x-3">
        <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
          {comment.author.avatar ? (
            <img 
              src={comment.author.avatar} 
              alt={comment.author.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <span className="text-xs font-medium">
              {comment.author.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-1">
          <div className="bg-muted rounded-lg px-3 py-2">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-sm">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          </div>

          {/* Reply Input */}
          {replyingTo === comment.id && (
            <div className="mt-2">
              <CommentInput
                onSubmit={onReply}
                placeholder={`Reply to ${comment.author.name}...`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-11 space-y-2">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              allComments={allComments}
              onReply={onReply}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
            />
          ))}
        </div>
      )}
    </div>
  );
};