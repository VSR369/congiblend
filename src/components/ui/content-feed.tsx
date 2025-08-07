import * as React from "react";
import { useInView } from "react-intersection-observer";
import { Plus, TrendingUp, ArrowUp } from "lucide-react";
import { PostCard } from "./post-card";
import { PostCreationModal } from "./post-creation-modal";
import { LoadingSkeleton } from "./loading-skeleton";
import { Button } from "./button";
import { AdvancedFilterSystem } from "./advanced-filter-system";
import { useFeedStore } from "@/stores/feedStore";
import { EmergencyFeed } from "./emergency-feed";
import { cn } from "@/lib/utils";

interface ContentFeedProps {
  className?: string;
}

export const ContentFeed = ({ className }: ContentFeedProps) => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const { posts, loading, hasMore, loadPosts, filters, pendingUpdates, loadPendingUpdates } = useFeedStore();
  const parentRef = React.useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout>();
  
  // Emergency fallback for database issues
  const [showEmergencyFeed, setShowEmergencyFeed] = React.useState(false);

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  // Track scroll state for smart real-time updates
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Load initial posts with error handling
  React.useEffect(() => {
    if (posts.length === 0) {
      loadPosts(true).catch(() => {
        setShowEmergencyFeed(true);
      });
    }
  }, [posts.length, loadPosts]);

  // Load more posts when user scrolls to bottom
  React.useEffect(() => {
    if (inView && hasMore && !loading) {
      loadPosts();
    }
  }, [inView, hasMore, loading, loadPosts]);

  // Handle new posts notification
  const handleShowNewPosts = React.useCallback(() => {
    if (typeof loadPendingUpdates === 'function') {
      loadPendingUpdates();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadPendingUpdates]);

  // Emergency fallback
  if (showEmergencyFeed) {
    return <EmergencyFeed className={className} />;
  }

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

      {/* New Posts Notification */}
      {pendingUpdates > 0 && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in">
          <Button
            onClick={handleShowNewPosts}
            className="shadow-elegant hover-lift transition-all duration-300"
            variant="default"
          >
            <ArrowUp className="h-4 w-4 mr-2" />
            {pendingUpdates} new post{pendingUpdates !== 1 ? 's' : ''} available
          </Button>
        </div>
      )}

      {/* Create Post Button */}
      <div className="bg-card border rounded-lg p-4 animate-fade-in">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full justify-start text-muted-foreground"
          variant="ghost"
        >
          <Plus className="h-5 w-5 mr-2" />
          What would you like to share today?
        </Button>
      </div>

      {/* Feed Content */}
      <div ref={parentRef} className="feed-container">
        {posts.length === 0 && loading ? (
          // Initial loading skeleton with exact dimensions
          <div className="feed-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="post-skeleton">
                <div className="flex items-start space-x-3">
                  <LoadingSkeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <LoadingSkeleton className="h-4 w-32" />
                    <LoadingSkeleton className="h-3 w-24" />
                  </div>
                </div>
                <LoadingSkeleton className="h-4 w-full" />
                <LoadingSkeleton className="h-4 w-3/4" />
                <div className="media-container">
                  <LoadingSkeleton className="h-full w-full rounded-lg" />
                </div>
                <div className="flex items-center space-x-4">
                  <LoadingSkeleton className="h-8 w-16" />
                  <LoadingSkeleton className="h-8 w-20" />
                  <LoadingSkeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Stable feed grid with optimized performance
          <div className="feed-grid">
            {posts.map((post) => (
              <div
                key={post.id}
                className="post-item animate-fade-in"
              >
                <PostCard post={post} className="w-full" />
              </div>
            ))}
          </div>
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