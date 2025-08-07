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
  // Deep comparison for complete stability
  if (prevProps.post.id !== nextProps.post.id) return false;
  if (prevProps.post.content !== nextProps.post.content) return false;
  if (prevProps.post.type !== nextProps.post.type) return false;
  if (prevProps.post.shares !== nextProps.post.shares) return false;
  if (prevProps.post.userReaction !== nextProps.post.userReaction) return false;
  if (prevProps.post.userSaved !== nextProps.post.userSaved) return false;
  if (prevProps.post.createdAt !== nextProps.post.createdAt) return false;
  if (prevProps.className !== nextProps.className) return false;

  // Deep compare reactions array
  if (prevProps.post.reactions.length !== nextProps.post.reactions.length) return false;
  for (let i = 0; i < prevProps.post.reactions.length; i++) {
    const prevReaction = prevProps.post.reactions[i];
    const nextReaction = nextProps.post.reactions[i];
    if (prevReaction.type !== nextReaction.type || 
        prevReaction.id !== nextReaction.id) return false;
  }

  // Deep compare comments array
  if (prevProps.post.comments.length !== nextProps.post.comments.length) return false;
  for (let i = 0; i < prevProps.post.comments.length; i++) {
    const prevComment = prevProps.post.comments[i];
    const nextComment = nextProps.post.comments[i];
    if (prevComment.id !== nextComment.id || 
        prevComment.content !== nextComment.content) return false;
  }

  // Deep compare media array
  if (prevProps.post.media?.length !== nextProps.post.media?.length) return false;
  if (prevProps.post.media) {
    for (let i = 0; i < prevProps.post.media.length; i++) {
      if (prevProps.post.media[i].url !== nextProps.post.media[i].url) return false;
    }
  }

  return true;
});

StablePostCard.displayName = "StablePostCard";