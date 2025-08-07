import * as React from "react";
import { PostCard } from "./post-card";
import type { Post } from "@/types/feed";

interface StablePostCardProps {
  post: Post;
  className?: string;
}

// Memoized PostCard with stable comparison to prevent unnecessary re-renders
export const StablePostCard = React.memo(({ post, className }: StablePostCardProps) => {
  return <PostCard post={post} className={className} />;
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders on irrelevant changes
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.content === nextProps.post.content &&
    prevProps.post.reactions.length === nextProps.post.reactions.length &&
    prevProps.post.comments.length === nextProps.post.comments.length &&
    prevProps.post.shares === nextProps.post.shares &&
    prevProps.post.userReaction === nextProps.post.userReaction &&
    prevProps.post.userSaved === nextProps.post.userSaved &&
    prevProps.className === nextProps.className
  );
});

StablePostCard.displayName = "StablePostCard";