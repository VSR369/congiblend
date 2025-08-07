import React, { memo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { PostHeader } from '@/components/ui/post-header';
import { PostContent } from '@/components/ui/post-content';
import { PostActions } from '@/components/ui/post-actions';
import { LazyMedia } from '@/components/stable/LazyMedia';
import { useAdaptivePostHeight } from '@/hooks/useAdaptivePostHeight';
import type { Post } from '@/types/feed';
import { cn } from '@/lib/utils';

interface AdaptivePostCardProps {
  post: Post;
  className?: string;
  index?: number;
}

// Adaptive height post card with smart content management
const AdaptivePostCard = memo<AdaptivePostCardProps>(({ post, className, index }) => {
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  
  const { 
    height, 
    shouldTruncateText, 
    truncatedContent 
  } = useAdaptivePostHeight(post, isTextExpanded);

  const handleTextExpand = useCallback((expanded: boolean) => {
    setIsTextExpanded(expanded);
  }, []);

  return (
    <Card 
      className={cn("post-card-adaptive overflow-hidden transition-all duration-300", className)}
      style={{ minHeight: height }}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/20">
        <PostHeader
          author={post.author}
          createdAt={post.createdAt}
          isOwnPost={false}
        />
      </div>

      {/* Content - no fixed height, grows with content */}
      <div className="p-4 space-y-3">
        <PostContent
          content={post.content}
          hashtags={post.hashtags}
          truncatedContent={truncatedContent}
          shouldTruncate={shouldTruncateText}
          onExpandToggle={handleTextExpand}
        >
          {/* Media display - full size without constraints */}
          {post.media && post.media.length > 0 && (
            <div className="rounded-lg overflow-hidden">
              <LazyMedia
                media={post.media}
                postId={post.id}
                className="w-full object-contain"
              />
            </div>
          )}
        </PostContent>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 border-t border-border/20">
        <PostActions
          post={post}
          onShare={() => {}}
          onSave={() => {}}
        />
      </div>
    </Card>
  );
});

AdaptivePostCard.displayName = 'AdaptivePostCard';

// Adaptive skeleton with estimated dimensions
export const AdaptivePostCardSkeleton = memo<{ estimatedHeight?: number }>(({ 
  estimatedHeight = 350 
}) => (
  <Card 
    className="post-card-adaptive overflow-hidden"
    style={{ minHeight: estimatedHeight }}
  >
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="p-4 flex items-center space-x-3 border-b border-border/20">
        <div className="h-10 w-10 bg-muted rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-3 bg-muted rounded w-20" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/4" />
        {estimatedHeight > 400 && (
          <div className="h-64 bg-muted rounded mt-3" />
        )}
      </div>
      
      {/* Actions skeleton */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border/20">
        <div className="flex space-x-6">
          <div className="h-8 w-16 bg-muted rounded" />
          <div className="h-8 w-16 bg-muted rounded" />
          <div className="h-8 w-16 bg-muted rounded" />
        </div>
        <div className="h-8 w-8 bg-muted rounded" />
      </div>
    </div>
  </Card>
));

AdaptivePostCardSkeleton.displayName = 'AdaptivePostCardSkeleton';

export { AdaptivePostCard };