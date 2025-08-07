import * as React from "react";
import { useInView } from "react-intersection-observer";
import { Plus, TrendingUp, ChevronUp } from "lucide-react";
import { StablePostCard } from "./stable-post-card";
import { PostCreationModal } from "./post-creation-modal";
import { LoadingSkeleton } from "./loading-skeleton";
import { Button } from "./button";
import { AdvancedFilterSystem } from "./advanced-filter-system";
import { useFeedStore } from "@/stores/feedStore";
import { cn } from "@/lib/utils";

interface ContentFeedProps {
  className?: string;
}

export const ContentFeed = ({ className }: ContentFeedProps) => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [pendingUpdates, setPendingUpdates] = React.useState(0);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const { posts, loading, hasMore, loadPosts, filters } = useFeedStore();
  const parentRef = React.useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Throttled intersection observer for infinite scroll to reduce jank
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
    triggerOnce: false,
    delay: 100, // Throttle intersection observer
  });

  // Scroll tracking for real-time updates
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    const container = parentRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, []);

  // Load initial posts
  React.useEffect(() => {
    if (posts.length === 0) {
      loadPosts(true);
    }
  }, [posts.length, loadPosts]);

  // PHASE 4: Debounced load more posts
  const debouncedLoadMore = React.useCallback(
    React.useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (hasMore && !loading) {
            loadPosts();
          }
        }, 500);
      };
    }, [hasMore, loading, loadPosts]),
    [hasMore, loading, loadPosts]
  );

  React.useEffect(() => {
    if (inView) {
      debouncedLoadMore();
    }
  }, [inView, debouncedLoadMore]);

  // Simple scrolling without virtualization to prevent overlap issues
  const shouldUseVirtualization = posts.length > 50;

  return (
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

      {/* Pending Updates Notification */}
      {pendingUpdates > 0 && !isScrolling && (
        <div className="bg-card border rounded-lg p-4 mb-4">
          <Button
            onClick={() => {
              setPendingUpdates(0);
              loadPosts(true);
            }}
            className="w-full"
            variant="outline"
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            {pendingUpdates} new post{pendingUpdates > 1 ? 's' : ''} available
          </Button>
        </div>
      )}

      {/* Create Post Button */}
      <div className="bg-card border rounded-lg p-4">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full justify-start text-muted-foreground"
          variant="ghost"
        >
          <Plus className="h-5 w-5 mr-2" />
          What would you like to share today?
        </Button>
      </div>

      {/* Stable Feed Content with CSS Grid */}
      <div 
        ref={parentRef} 
        className="feed-grid-container"
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}
      >
        {posts.length === 0 && loading ? (
          // Exact dimension skeleton loading
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div 
                key={`skeleton-${i}`} 
                className="post-card-stable bg-card border rounded-lg"
                style={{ minHeight: '400px', height: '400px' }}
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="skeleton-avatar h-10 w-10 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="skeleton-name h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="skeleton-time h-3 w-24 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="skeleton-content h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="skeleton-content h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="skeleton-media h-48 w-full bg-muted animate-pulse rounded-lg" />
                  <div className="flex items-center space-x-4">
                    <div className="skeleton-action h-8 w-16 bg-muted animate-pulse rounded" />
                    <div className="skeleton-action h-8 w-20 bg-muted animate-pulse rounded" />
                    <div className="skeleton-action h-8 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          // Stable post rendering with proper keys
          <>
            {posts.map((post) => (
              <div
                key={post.id}
                className="post-grid-item"
                style={{ minHeight: '300px' }}
              >
                <StablePostCard post={post} />
              </div>
            ))}
          </>
        )}

        {/* Load More Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {loading && (
              <div className="space-y-6 w-full">
                <div className="bg-card border rounded-lg p-6 space-y-4">
                  <div className="flex items-start space-x-3">
                    <LoadingSkeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <LoadingSkeleton className="h-4 w-32" />
                      <LoadingSkeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <LoadingSkeleton className="h-4 w-full" />
                  <LoadingSkeleton className="h-4 w-3/4" />
                </div>
              </div>
            )}
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
  );
};