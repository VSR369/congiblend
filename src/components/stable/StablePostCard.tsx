import React, { memo, useRef, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { StableContainer } from './StableContainer';
import { PostErrorBoundary } from '@/components/ui/post-error-boundary';
import { LazyMedia } from './LazyMedia';
import { PostActions } from '@/components/ui/post-actions';
import { PostHeader } from '@/components/ui/post-header';
import { PostContent } from '@/components/ui/post-content';
import { usePostVisibility } from '@/hooks/useAdvancedIntersectionObserver';
import { useAppContext } from '@/context/AppContext';
import type { Post } from '@/types/feed';
import { cn } from '@/lib/utils';

interface StablePostCardProps {
  post: Post;
  className?: string;
  index?: number;
  onVisibilityChange?: (postId: string, isVisible: boolean, visibilityTime: number) => void;
}

// Memoized Post Card with Stable Dimensions
const StablePostCard = memo<StablePostCardProps>(({
  post,
  className,
  index = 0,
  onVisibilityChange
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { queueRender } = useAppContext();
  
  // Track post visibility for analytics
  const { ref: visibilityRef, isIntersecting } = usePostVisibility(
    post.id,
    onVisibilityChange
  );

  // Combine refs for both container and visibility tracking
  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    cardRef.current = node;
    visibilityRef(node);
  }, [visibilityRef]);

  // Memoized post actions to prevent unnecessary re-renders
  const memoizedActions = useMemo(
    () => ({
      onLike: () => queueRender(`post-${post.id}-like`),
      onComment: () => queueRender(`post-${post.id}-comment`),
      onShare: () => queueRender(`post-${post.id}-share`),
      onSave: () => queueRender(`post-${post.id}-save`),
    }),
    [post.id, queueRender]
  );

  // Calculate stable minimum height based on content
  const minHeight = useMemo(() => {
    let baseHeight = 120; // Base height for header + actions
    
    if (post.content) {
      baseHeight += Math.min(post.content.length * 0.5, 200); // Content estimation
    }
    
    if (post.media && post.media.length > 0) {
      baseHeight += 300; // Media height
    }
    
    if (post.poll) {
      baseHeight += post.poll.options.length * 40 + 60; // Poll height
    }
    
    if (post.event) {
      baseHeight += 150; // Event card height
    }
    
    return baseHeight;
  }, [post.content, post.media, post.poll, post.event]);

  return (
    <PostErrorBoundary>
      <StableContainer
        ref={combinedRef}
        minHeight={minHeight}
        className={cn(
          'post-card-stable',
          'animate-smooth',
          'transition-all duration-200',
          isIntersecting && 'post-visible',
          className
        )}
        id={`post-${post.id}`}
      >
        <Card className="h-full w-full border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          {/* Post Header - Fixed Height */}
          <div className="post-header-container h-16 flex-shrink-0">
            <PostHeader
              author={post.author}
              createdAt={post.createdAt}
              edited={post.edited}
              visibility={post.visibility}
              isPinned={post.isPinned}
            />
          </div>

          {/* Post Content - Variable Height with Container */}
          <div className="post-content-container flex-1 min-h-0">
            <PostContent
              content={post.content}
              hashtags={post.hashtags}
              mentions={post.mentions}
              poll={post.poll}
              event={post.event}
            />
            
            {/* Lazy-loaded Media */}
            {post.media && post.media.length > 0 && (
              <div className="post-media-container mt-4">
                <LazyMedia
                  media={post.media}
                  postId={post.id}
                  aspectRatio="16/9"
                />
              </div>
            )}
          </div>

          {/* Post Actions - Fixed Height */}
          <div className="post-actions-container h-14 flex-shrink-0 border-t border-border/50">
            <PostActions
              post={post}
              onLike={memoizedActions.onLike}
              onComment={memoizedActions.onComment}
              onShare={memoizedActions.onShare}
              onSave={memoizedActions.onSave}
            />
          </div>
        </Card>
      </StableContainer>
    </PostErrorBoundary>
  );
});

StablePostCard.displayName = 'StablePostCard';

// Skeleton version for loading states
export const StablePostCardSkeleton = memo(() => (
  <StableContainer minHeight={300} className="post-card-skeleton">
    <Card className="h-full w-full border-0">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-16 p-4 flex items-center space-x-3">
          <div className="h-10 w-10 bg-muted rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-20" />
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="px-4 pb-4 space-y-3">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-48 bg-muted rounded" />
        </div>
        
        {/* Actions skeleton */}
        <div className="h-14 px-4 flex items-center justify-between border-t border-border/50">
          <div className="flex space-x-6">
            <div className="h-8 w-16 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
          <div className="h-8 w-8 bg-muted rounded" />
        </div>
      </div>
    </Card>
  </StableContainer>
));

StablePostCardSkeleton.displayName = 'StablePostCardSkeleton';

export { StablePostCard };