import React, { useState, useEffect, useMemo } from 'react';
import { AdaptivePostCard, AdaptivePostCardSkeleton } from '@/components/stable/AdaptivePostCard';
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { useAdaptivePostHeight } from '@/hooks/useAdaptivePostHeight';
import { useFeedStore } from '@/stores/feedStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdaptiveContentFeedProps {
  className?: string;
}

export const AdaptiveContentFeed: React.FC<AdaptiveContentFeedProps> = ({ className }) => {
  const { posts, loading, loadPosts } = useFeedStore();
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  // Smart size estimation based on post content
  const estimatePostSize = useMemo(() => (index: number) => {
    const post = posts[index];
    if (!post) return 350; // fallback
    
    const isExpanded = expandedPosts.has(post.id);
    let height = 120; // base (header + actions + padding)
    
    // Text content estimation
    if (post.content) {
      const estimatedLines = Math.ceil(post.content.length / 50);
      const visibleLines = isExpanded ? estimatedLines : Math.min(estimatedLines, 4);
      height += visibleLines * 24;
    }
    
    // Media content estimation
    if (post.media && post.media.length > 0) {
      const firstMedia = post.media[0];
      if (firstMedia.type === 'video') {
        height += 350;
      } else if (firstMedia.type === 'image') {
        // Estimate based on common aspect ratios
        height += 300;
      }
    }
    
    // Poll/event content
    if (post.poll) {
      height += post.poll.options.length * 40 + 40;
    }
    if (post.event) {
      height += 120;
    }
    
    // Hashtags
    if (post.hashtags && post.hashtags.length > 0) {
      height += 40;
    }
    
    return Math.max(height, 250);
  }, [posts, expandedPosts]);

  const {
    parentRef,
    virtualizer,
    visibleItems,
    shouldVirtualize,
    totalSize,
  } = useVirtualScroll({
    items: posts,
    estimateSize: estimatePostSize,
    overscan: 3,
    enabled: true,
    threshold: 15, // Start virtualizing with fewer items for better performance
  });

  useEffect(() => {
    loadPosts(true);
  }, [loadPosts]);

  // Handle text expansion state
  const handlePostExpansion = (postId: string, expanded: boolean) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (expanded) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
      }
      return newSet;
    });
  };

  if (loading && posts.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <AdaptivePostCardSkeleton key={index} estimatedHeight={350} />
        ))}
      </div>
    );
  }

  if (!shouldVirtualize) {
    // Render all posts without virtualization for small lists
    return (
      <div className={cn("space-y-4", className)}>
        {posts.map((post, index) => (
          <AdaptivePostCard 
            key={post.id} 
            post={post} 
            index={index}
          />
        ))}
        {loading && (
          <AdaptivePostCardSkeleton estimatedHeight={350} />
        )}
      </div>
    );
  }

  // Virtual scrolling for large lists
  return (
    <div className={cn("w-full", className)}>
      <div
        ref={parentRef}
        className="h-screen overflow-auto"
        style={{
          contain: 'strict',
        }}
      >
        <div
          style={{
            height: totalSize,
            width: '100%',
            position: 'relative',
          }}
        >
          {visibleItems.map((item) => {
            const virtualItem = 'virtualItem' in item ? item.virtualItem as any : null;
            const post = item.item;
            const index = item.index;
            
            return (
              <div
                key={post.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualItem ? `${virtualItem.size}px` : 'auto',
                  transform: `translateY(${virtualItem ? virtualItem.start : index * 350}px)`,
                }}
              >
                <div className="px-4 pb-4">
                  <AdaptivePostCard 
                    post={post} 
                    index={index}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {loading && (
        <div className="px-4 pb-4">
          <AdaptivePostCardSkeleton estimatedHeight={350} />
        </div>
      )}
    </div>
  );
};