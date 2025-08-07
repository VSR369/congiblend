import * as React from "react";
import { PostCard } from "./post-card";
import type { Post } from "@/types/feed";

interface StablePostCardProps {
  post: Post;
  className?: string;
}

// PHASE 5: Enhanced memoized PostCard with deep comparison and performance optimization
export const StablePostCard = React.memo(({ post, className }: StablePostCardProps) => {
  // Stable className without containment conflicts
  const memoizedClassName = React.useMemo(() => 
    `optimized-container ${className || ''}`.trim(), 
    [className]
  );

  return <PostCard post={post} className={memoizedClassName} />;
}, (prevProps, nextProps) => {
  // PHASE 5: Optimized deep comparison with early bailout
  if (prevProps.post.id !== nextProps.post.id) return false;
  if (prevProps.className !== nextProps.className) return false;
  
  const post1 = prevProps.post;
  const post2 = nextProps.post;
  
  // Check critical fields that affect UI
  const contentStable = 
    post1.content === post2.content &&
    post1.type === post2.type &&
    post1.userReaction === post2.userReaction &&
    post1.userSaved === post2.userSaved;
  
  const countsStable = 
    post1.reactions.length === post2.reactions.length &&
    post1.comments.length === post2.comments.length &&
    post1.shares === post2.shares;
  
  const mediaStable = 
    (!post1.media && !post2.media) ||
    (post1.media?.length === post2.media?.length &&
     post1.media?.every((m1, i) => m1.url === post2.media?.[i]?.url));
    
  return contentStable && countsStable && mediaStable;
});

StablePostCard.displayName = "StablePostCard";