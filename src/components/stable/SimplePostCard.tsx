import React, { memo } from 'react';
import { Card } from '@/components/ui/card';
import { PostHeader } from '@/components/ui/post-header';
import { PostContent } from '@/components/ui/post-content';
import { PostActions } from '@/components/ui/post-actions';
import type { Post } from '@/types/feed';

interface SimplePostCardProps {
  post: Post;
  className?: string;
}

// PHASE 2: Ultra-simple post card with fixed height and no dynamic calculations
const SimplePostCard = memo<SimplePostCardProps>(({ post, className }) => {
  return (
    <Card className={`post-card-simple h-96 overflow-hidden ${className || ''}`}>
      {/* Fixed height header - 64px */}
      <div className="h-16 flex-shrink-0 border-b border-border/20">
        <PostHeader
          author={post.author}
          createdAt={post.createdAt}
          isOwnPost={false}
        />
      </div>

      {/* Fixed height content - 256px */}
      <div className="h-64 overflow-y-auto p-4">
        <PostContent
          content={post.content}
          hashtags={post.hashtags}
        />
        
        {/* Simple media display */}
        {post.media && post.media.length > 0 && (
          <div className="mt-3">
            <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                {post.media.length} media item{post.media.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Fixed height actions - 56px */}
      <div className="h-14 flex-shrink-0 border-t border-border/20">
        <PostActions
          postId={post.id}
          initialLikes={post.likes}
          commentsCount={post.commentsCount}
          sharesCount={post.sharesCount}
          isSaved={post.isSaved}
          onComment={() => {}}
          onShare={() => {}}
          onSave={() => {}}
        />
      </div>
    </Card>
  );
});

SimplePostCard.displayName = 'SimplePostCard';

// Simple skeleton with exact matching dimensions
export const SimplePostCardSkeleton = memo(() => (
  <Card className="post-card-simple h-96 overflow-hidden">
    <div className="animate-pulse">
      {/* Header skeleton - 64px */}
      <div className="h-16 p-4 flex items-center space-x-3 border-b border-border/20">
        <div className="h-10 w-10 bg-muted rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-32" />
          <div className="h-3 bg-muted rounded w-20" />
        </div>
      </div>
      
      {/* Content skeleton - 256px */}
      <div className="h-64 p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-32 bg-muted rounded mt-3" />
      </div>
      
      {/* Actions skeleton - 56px */}
      <div className="h-14 px-4 flex items-center justify-between border-t border-border/20">
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

SimplePostCardSkeleton.displayName = 'SimplePostCardSkeleton';

export { SimplePostCard };