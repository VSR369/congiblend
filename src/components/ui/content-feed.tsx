import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useInView } from "react-intersection-observer";
import { Plus, TrendingUp } from "lucide-react";
import { StablePostCard } from "./stable-post-card";
import { PostCreationModal } from "./post-creation-modal";
import { FeedSkeleton } from "./post-card-skeleton";
import { Button } from "./button";
import { AdvancedFilterSystem } from "./advanced-filter-system";
import { useFeedStore } from "@/stores/feedStore";
import { cn } from "@/lib/utils";

interface ContentFeedProps {
  className?: string;
}

export const ContentFeed = ({ className }: ContentFeedProps) => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const { posts, loading, hasMore, loadPosts, filters } = useFeedStore();
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Throttled intersection observer for infinite scroll to reduce jank
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
    triggerOnce: false,
    delay: 100, // Throttle intersection observer
  });

  // Load initial posts
  React.useEffect(() => {
    if (posts.length === 0) {
      loadPosts(true);
    }
  }, [posts.length, loadPosts]);

  // PHASE 4: Properly debounced load more with stable reference
  const debouncedLoadMore = React.useCallback(() => {
    if (hasMore && !loading) {
      loadPosts();
    }
  }, [hasMore, loading, loadPosts]);

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

      {/* PHASE 1 & 2: Stable Feed Content */}
      <div ref={parentRef} className="stable-list space-y-8">
        {posts.length === 0 && loading ? (
          // PHASE 4: Exact-matching skeleton feed
          <FeedSkeleton count={3} />
        ) : (
          // PHASE 1: Remove conflicting animations, use stable container
          <div className="stable-animation space-y-8">
            {posts.map((post) => (
              <div
                key={post.id}
                className="post-card-stable animate-fade-in"
              >
                <StablePostCard post={post} className="w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Load More Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
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
  );
};