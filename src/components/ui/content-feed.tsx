import * as React from "react";
import { Plus, TrendingUp } from "lucide-react";
import { PostCard } from "./post-card";
import { PostCreationModal } from "./post-creation-modal";
import { FeedSkeleton } from "./post-card-skeleton";
import { Button } from "./button";
import { AdvancedFilterSystem } from "./advanced-filter-system";
import { FeedErrorBoundary } from "./feed-error-boundary";
import { useFeedStore } from "@/stores/feedStore";
import { useAdvancedIntersectionObserver } from "@/hooks/useAdvancedIntersectionObserver";
import { cn } from "@/lib/utils";

interface ContentFeedProps {
  className?: string;
}

export const ContentFeed = ({ className }: ContentFeedProps) => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const { posts, loading, hasMore, loadPosts, filters } = useFeedStore();

  // Simple list rendering - no virtual scrolling complexity

  // Simple intersection observer for load more
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
      <div className={cn("max-w-2xl mx-auto", className)}>
        {/* Feed Header */}
        <div className="flex items-center justify-between mb-6">
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

        {/* Create Post Button */}
        <div className="bg-card border rounded-lg p-4 mb-6">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="w-full justify-start text-muted-foreground"
            variant="ghost"
          >
            <Plus className="h-5 w-5 mr-2" />
            What would you like to share today?
          </Button>
        </div>

        {/* LinkedIn-Style Feed - Clean List */}
        <div className="linkedin-feed">
          {posts.length === 0 && loading ? (
            <FeedSkeleton count={3} />
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
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