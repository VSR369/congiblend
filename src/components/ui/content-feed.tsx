import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Plus, TrendingUp } from "lucide-react";
import { PostCard } from "./enhanced-post-card";
import { PostCreationModal } from "./post-creation-modal";
import { LoadingSkeleton } from "./loading-skeleton";
import { Button } from "./button";
import { FeedFilterPanel } from "./feed-filter-panel";
import { useFeedStore } from "@/stores/feedStore";
import { cn } from "@/lib/utils";

interface ContentFeedProps {
  className?: string;
}

export const ContentFeed = ({ className }: ContentFeedProps) => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const { posts, loading, hasMore, loadPosts, filters } = useFeedStore();
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  // Load initial posts
  React.useEffect(() => {
    if (posts.length === 0) {
      loadPosts(true);
    }
  }, [posts.length, loadPosts]);

  // Load more posts when user scrolls to bottom
  React.useEffect(() => {
    if (inView && hasMore && !loading) {
      loadPosts();
    }
  }, [inView, hasMore, loading, loadPosts]);

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
          <FeedFilterPanel />
          <Button variant="outline" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trending
          </Button>
        </div>
      </div>

      {/* Create Post Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border rounded-lg p-4"
      >
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full justify-start text-muted-foreground"
          variant="ghost"
        >
          <Plus className="h-5 w-5 mr-2" />
          What would you like to share today?
        </Button>
      </motion.div>

      {/* Feed Content */}
      <div ref={parentRef} className="space-y-8">
        {posts.length === 0 && loading ? (
          // Initial loading skeleton
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-lg p-6 space-y-4">
                <div className="flex items-start space-x-3">
                  <LoadingSkeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <LoadingSkeleton className="h-4 w-32" />
                    <LoadingSkeleton className="h-3 w-24" />
                  </div>
                </div>
                <LoadingSkeleton className="h-4 w-full" />
                <LoadingSkeleton className="h-4 w-3/4" />
                <LoadingSkeleton className="h-48 w-full rounded-lg" />
                <div className="flex items-center space-x-4">
                  <LoadingSkeleton className="h-8 w-16" />
                  <LoadingSkeleton className="h-8 w-20" />
                  <LoadingSkeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Simple feed layout with proper spacing
          <div className="space-y-8">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="relative"
              >
                <PostCard post={post} className="w-full" />
              </motion.div>
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