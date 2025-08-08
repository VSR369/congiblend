import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PostCard } from "./post-card";
import { FeedSkeleton } from "./post-card-skeleton";
import { useVirtualScroll } from '@/hooks/useVirtualScroll';
import { useAdaptivePostHeight } from '@/hooks/useAdaptivePostHeight';
import { useFeedStore } from '@/stores/feedStore';
import { Button } from '@/components/ui/button';
import { PostCreationModal } from '@/components/ui/post-creation-modal';
import { AdvancedFilterSystem } from '@/components/ui/advanced-filter-system';
import { ModalErrorBoundary } from '@/components/ui/modal-error-boundary';
import { Plus, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdaptiveContentFeedProps {
  className?: string;
}

export const AdaptiveContentFeed: React.FC<AdaptiveContentFeedProps> = ({ className }) => {
  const { posts, loading, loadPosts, hasMore, filters } = useFeedStore();
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal state management with error recovery
  const handleOpenModal = useCallback(() => {
    try {
      setModalError(null);
      setShowCreateModal(true);
    } catch (error) {
      console.error('Error opening modal:', error);
      setModalError('Failed to open post creation modal');
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    try {
      setShowCreateModal(false);
      setModalError(null);
    } catch (error) {
      console.error('Error closing modal:', error);
      setModalError(null); // Clear error anyway
    }
  }, []);

  const handleModalReset = useCallback(() => {
    setShowCreateModal(false);
    setModalError(null);
  }, []);

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

  // Header content
  const renderFeedHeader = () => (
    <div className="space-y-6">
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

      {/* Create Post Button */}
      <div className="bg-card border rounded-lg p-4 animate-fade-in">
        <Button
          onClick={handleOpenModal}
          className="w-full justify-start text-muted-foreground"
          variant="ghost"
          disabled={showCreateModal}
        >
          <Plus className="h-5 w-5 mr-2" />
          What would you like to share today?
        </Button>
        
        {modalError && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{modalError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalError(null)}
              className="mt-1 h-6 px-2 text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (loading && posts.length === 0) {
    return (
      <div className={cn("max-w-2xl mx-auto space-y-6", className)}>
        {renderFeedHeader()}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <FeedSkeleton key={index} count={1} />
          ))}
        </div>
      </div>
    );
  }

  if (!shouldVirtualize) {
    // Render all posts without virtualization for small lists
    return (
      <div className={cn("max-w-2xl mx-auto space-y-6", className)}>
        {renderFeedHeader()}
        <div className="space-y-4">
          {posts.map((post, index) => (
            <PostCard 
              key={post.id} 
              post={post}
            />
          ))}
          {loading && (
            <FeedSkeleton count={1} />
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
        <ModalErrorBoundary onReset={handleModalReset}>
          <PostCreationModal
            open={showCreateModal}
            onClose={handleCloseModal}
          />
        </ModalErrorBoundary>
      </div>
    );
  }

  // Virtual scrolling for large lists
  return (
    <div className={cn("max-w-2xl mx-auto space-y-6", className)}>
      {renderFeedHeader()}
      
      <div
        ref={parentRef}
        className={cn(
          "h-screen overflow-auto",
          showCreateModal ? "virtual-scroll-modal-open" : ""
        )}
        style={{
          contain: showCreateModal ? 'none' : 'layout style',
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
                  <PostCard 
                    post={post}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
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
      
      {loading && (
        <div className="px-4 pb-4">
          <FeedSkeleton count={1} />
        </div>
      )}
      
      {/* Post Creation Modal */}
      <ModalErrorBoundary onReset={handleModalReset}>
        <PostCreationModal
          open={showCreateModal}
          onClose={handleCloseModal}
        />
      </ModalErrorBoundary>
    </div>
  );
};