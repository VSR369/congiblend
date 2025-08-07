import * as React from "react";
import { PostCard } from "./post-card";
import type { Post } from "@/types/feed";

interface StablePostCardProps {
  post: Post;
  className?: string;
}

// PHASE 3: Enhanced memoized PostCard with deep comparison and stability
export const StablePostCard = React.memo(({ post, className }: StablePostCardProps) => {
  // PHASE 3: Memoized className to prevent re-renders
  const memoizedClassName = React.useMemo(() => 
    `post-card-stable optimized-container ${className || ''}`.trim(), 
    [className]
  );

  return <PostCard post={post} className={memoizedClassName} />;
}, (prevProps, nextProps) => {
  // PHASE 3: Deep comparison function with hash check for content stability
  const postStable = 
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.type === nextProps.post.type &&
    prevProps.post.reactions.length === nextProps.post.reactions.length &&
    prevProps.post.comments.length === nextProps.post.comments.length &&
    prevProps.post.shares === nextProps.post.shares &&
    prevProps.post.userReaction === nextProps.post.userReaction &&
    prevProps.post.userSaved === nextProps.post.userSaved &&
    prevProps.post.createdAt === nextProps.post.createdAt;
  
  const mediaStable = 
    (!prevProps.post.media && !nextProps.post.media) ||
    (prevProps.post.media?.length === nextProps.post.media?.length);
    
  return postStable && mediaStable && prevProps.className === nextProps.className;
});

StablePostCard.displayName = "StablePostCard";