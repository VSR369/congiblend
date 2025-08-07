import * as React from "react";
import { Plus, TrendingUp } from "lucide-react";
import { StablePostCard } from "./stable-post-card";
import { PostCreationModal } from "./post-creation-modal";
import { FeedSkeleton } from "./post-card-skeleton";
import { Button } from "./button";
import { AdvancedFilterSystem } from "./advanced-filter-system";
import { FeedErrorBoundary } from "./feed-error-boundary";
import { useFeedStore } from "@/stores/feedStore";
import { useVirtualScroll } from "@/hooks/useVirtualScroll";
import { useAdvancedIntersectionObserver } from "@/hooks/useAdvancedIntersectionObserver";
import { cn } from "@/lib/utils";

interface ContentFeedProps {
  className?: string;
}

export const ContentFeed = ({ className }: ContentFeedProps) => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const { posts, loading, hasMore, loadPosts, filters } = useFeedStore();

  // Virtual scrolling for performance
  const { 
    parentRef, 
    virtualizer, 
    visibleItems, 
    shouldVirtualize,
    totalSize 
  } = useVirtualScroll({
    items: posts,
    estimateSize: () => 300,
    overscan: 3,
    threshold: 50
  });

  // Advanced intersection observer for load more
  const [loadMoreRef, { isIntersecting }] = useAdvancedIntersectionObserver({
    threshold: 0.1,
    rootMargin: "200px",
    delay: 100
  });

  // Load initial posts
  React.useEffect(() => {
    if (posts.length === 0) {
      loadPosts(true);
    }
  }, [posts.length, loadPosts]);

  // Optimized load more with request animation frame
  const debouncedLoadMore = React.useCallback(() => {
    if (hasMore && !loading) {
      requestAnimationFrame(() => {
        loadPosts();
      });
    }
  }, [hasMore, loading, loadPosts]);

  React.useEffect(() => {
    if (isIntersecting) {
      debouncedLoadMore();
    }
  }, [isIntersecting, debouncedLoadMore]);

  return (
    <FeedErrorBoundary>
      <div className={cn("max-w-2xl mx-auto space-y-6", className)}>
      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">
            {filters.userFilter === 'all' ? 'Community Feed' :
             filters.userFilter === 'my_posts' ? 'My Posts' :
             filters.userFilter === 'others' ? 'Others\' Posts' : 'Filtered Feed'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {filters.userFilter === 'all' ? 'Stay updated with your professional community' :
             filters.userFilter === 'my_posts' ? 'Your posts and updates' :
             'Content from your network'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <AdvancedFilterSystem />
          <Button variant="outline" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </Button>
        </div>
      </div>

      {/* Create Post Button - PHASE 1: Pure CSS animation */}
      <div className="bg-card border rounded-lg p-4 animate-fade-in optimized-container">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full justify-start text-muted-foreground"
          variant="ghost"
        >
          <Plus className="h-5 w-5 mr-2" />
          What would you like to share today?
        </Button>
      </div>

      {/* Optimized Feed Content with Virtual Scrolling */}
      <div 
        ref={parentRef} 
        className="stable-list"
        style={{
          height: shouldVirtualize ? '600px' : 'auto',
          overflow: shouldVirtualize ? 'auto' : 'visible'
        }}
      >
        {posts.length === 0 && loading ? (
          <FeedSkeleton count={3} />
        ) : shouldVirtualize ? (
          // Virtual scrolling for large lists
          <div
            style={{
              height: totalSize,
              width: '100%',
              position: 'relative',
            }}
          >
            {visibleItems.map((item) => {
              // Type guard for virtualized items
              if ('virtualItem' in item) {
                const { item: post, index, virtualItem } = item as any;
                return (
                  <div
                    key={post.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                    ref={virtualizer!.measureElement}
                    data-index={index}
                  >
                    <div className="pb-8">
                      <StablePostCard post={post} className="w-full" />
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ) : (
          // Regular scrolling for smaller lists
          <div className="space-y-8">
            {visibleItems.map(({ item: post, index }) => (
              <div
                key={post.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
              >
                <StablePostCard post={post} className="w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Load More Trigger */}
        {hasMore && (
          <div ref={loadMoreRef as any} className="flex justify-center py-8">
            {loading && <FeedSkeleton count={1} />}
          </div>
        )}

        {/* End of Feed */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              You&apos;re all caught up! 🎉
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back later for more updates from your network.
            </p>
          </div>
        )}
      </div>

      {/* Post Creation Modal */}
      <PostCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      </div>
    </FeedErrorBoundary>
  );
};