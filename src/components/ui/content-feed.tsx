import * as React from "react";
import { Plus, TrendingUp, MessageSquare, FileText, BarChart3, Calendar } from "lucide-react";
import { PostCard } from "./post-card";
import { PostCreationModal } from "./post-creation-modal";
import { FeedSkeleton } from "./loading-skeleton";
import { Button } from "./button";
import { AdvancedFilterSystem } from "./advanced-filter-system";
import { FeedErrorBoundary } from "./feed-error-boundary";
import { useFeedStore } from "@/stores/feedStore";
import { useAdvancedIntersectionObserver } from "@/hooks/useAdvancedIntersectionObserver";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { PostType } from "@/types/feed";

interface ContentFeedProps {
  className?: string;
}

export const ContentFeed = ({ className }: ContentFeedProps) => {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showChooser, setShowChooser] = React.useState(false);
  const [modalAllowedTypes, setModalAllowedTypes] = React.useState<PostType[] | undefined>(undefined);
  const [modalInitialType, setModalInitialType] = React.useState<PostType | undefined>(undefined);
  const navigate = useNavigate();
  const { posts, loading, hasMore, loadPosts, filters, pendingNewPosts, flushPendingPosts } = useFeedStore();

  // Simple list rendering - no virtual scrolling complexity

  // Simple intersection observer for load more
  const [loadMoreRef, { isIntersecting }] = useAdvancedIntersectionObserver({
    threshold: 0.1,
    rootMargin: "200px",
    delay: 100
  });

  // Load initial posts
  React.useEffect(() => {
    console.log('🚀 ContentFeed: Initial posts effect', { postsLength: posts.length, loading });
    if (posts.length === 0 && !loading) {
      console.log('🚀 Loading initial posts...');
      loadPosts(true);
    }
  }, [posts.length, loadPosts, loading]);

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
      <div className={cn("w-full max-w-2xl mx-auto px-2 md:px-4 overflow-x-hidden", className)}>
        {/* Feed Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
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
        <div className="bg-card border rounded-lg p-3 md:p-4 mb-6">
          <Button
            onClick={() => setShowChooser((v) => !v)}
            className="w-full justify-start text-muted-foreground"
            variant="ghost"
          >
            <Plus className="h-5 w-5 mr-2" />
            What would you like to share today?
          </Button>

          {showChooser && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setModalAllowedTypes(["text","image","video","audio"] as PostType[]);
                  setModalInitialType("text");
                  setShowCreateModal(true);
                  setShowChooser(false);
                }}
                className="h-20 flex flex-col items-center justify-center"
                title="Share messages: Text, Image, Video, Audio"
              >
                <MessageSquare className="h-5 w-5 mb-1" />
                <span className="text-xs">Messages</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setShowChooser(false);
                  navigate("/articles/new");
                }}
                className="h-20 flex flex-col items-center justify-center"
                title="Write a long-form article"
              >
                <FileText className="h-5 w-5 mb-1" />
                <span className="text-xs">Articles</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setModalAllowedTypes(["poll"] as PostType[]);
                  setModalInitialType("poll");
                  setShowCreateModal(true);
                  setShowChooser(false);
                }}
                className="h-20 flex flex-col items-center justify-center"
                title="Create a poll"
              >
                <BarChart3 className="h-5 w-5 mb-1" />
                <span className="text-xs">Polls</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setModalAllowedTypes(["event"] as PostType[]);
                  setModalInitialType("event");
                  setShowCreateModal(true);
                  setShowChooser(false);
                }}
                className="h-20 flex flex-col items-center justify-center"
                title="Announce an event"
              >
                <Calendar className="h-5 w-5 mb-1" />
                <span className="text-xs">Events</span>
              </Button>
            </div>
          )}

        </div>

        {/* LinkedIn-Style Feed - Clean List */}
        {pendingNewPosts.length > 0 && (
          <div className="sticky top-0 z-20 mb-4">
            <Button variant="secondary" size="sm" className="w-full" onClick={flushPendingPosts}>
              Show {pendingNewPosts.length} new post{pendingNewPosts.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
        <div className="linkedin-feed">
          {posts.length === 0 && loading ? (
            <FeedSkeleton />
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No posts to display</p>
              <Button variant="outline" onClick={() => loadPosts(true)}>
                Refresh Feed
              </Button>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          )}

          {/* Load More Trigger */}
          {hasMore && (
            <div ref={loadMoreRef as any} className="flex justify-center py-8">
              {loading && <FeedSkeleton />}
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
          allowedTypes={modalAllowedTypes}
          initialType={modalInitialType}
        />
      </div>
    </FeedErrorBoundary>
  );
};