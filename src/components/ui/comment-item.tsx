import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentComposer } from "@/components/ui/comment-composer";
import type { Comment } from "@/types/comments";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth?: number;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment, postId, depth = 0 }) => {
  const [showReply, setShowReply] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  
  // Maximum depth for visual indentation
  const isNested = depth > 0;
  const paddingLeft = Math.min(depth, 4) * 16;

  // Format timestamp
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  }, [comment.created_at]);

  // Process content with mentions
  const contentNodes = useMemo(() => {
    const parts: React.ReactNode[] = [];
    const text = comment.content || '';
    const regex = /@([0-9a-fA-F-]{36}|[a-zA-Z0-9_.-]{2,32})\b/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      if (start > lastIndex) parts.push(text.slice(lastIndex, start));
      const token = m[1];
      const href = `/messages?to=${token}`;
      parts.push(
        <a 
          key={`${token}-${start}`} 
          href={href} 
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          @{token}
        </a>
      );
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
  }, [comment.content]);

  const handleLikeToggle = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  if (comment.is_deleted) {
    return (
      <div 
        className={cn("flex items-center text-sm text-muted-foreground py-2", isNested && "border-l border-border/50")}
        style={{ paddingLeft }}
      >
        <div className="w-10 h-10 mr-3" /> {/* Avatar placeholder */}
        <em>This comment has been deleted</em>
      </div>
    );
  }

  return (
    <div 
    className={cn(
        "linkedin-comment-item group",
        isNested && "border-l border-border/50"
      )}
      style={{ paddingLeft }}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage 
            src={comment.author?.avatar_url || ""} 
            alt={comment.author?.display_name || comment.author?.username || "User"}
          />
          <AvatarFallback className="bg-muted text-muted-foreground font-medium text-sm">
            {(comment.author?.display_name || comment.author?.username || "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          {/* Comment Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground">
              {comment.author?.display_name || comment.author?.username || "Anonymous User"}
            </span>
            {comment.author?.username && comment.author.display_name && (
              <span className="text-xs text-muted-foreground">
                @{comment.author.username}
              </span>
            )}
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          
          {/* Comment Content */}
          <div className="text-sm text-foreground leading-relaxed mb-2 whitespace-pre-wrap break-words">
            {contentNodes}
          </div>
          
          {/* Comment Actions */}
          <div className="linkedin-comment-actions">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "linkedin-comment-action-btn",
                isLiked && "active"
              )}
              onClick={handleLikeToggle}
            >
              <svg
                className="h-3 w-3 mr-1"
                fill={isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              Like
              {likeCount > 0 && <span className="ml-1">({likeCount})</span>}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="linkedin-comment-action-btn"
              onClick={() => setShowReply(!showReply)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            
            {comment.replies_count > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
              </span>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              className="linkedin-comment-action-btn ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Reply Composer */}
          {showReply && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <CommentComposer 
                postId={postId} 
                parentId={comment.id} 
                onSubmitted={() => setShowReply(false)}
                className="border-0 bg-transparent p-0 shadow-none"
              />
            </div>
          )}
          
          {/* Nested Replies */}
          {comment.children && comment.children.length > 0 && (
            <div className="mt-4 space-y-3">
              {comment.children.map((child) => (
                <CommentItem 
                  key={child.id} 
                  comment={child} 
                  postId={postId} 
                  depth={depth + 1} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};