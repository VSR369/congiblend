import React, { useState, useEffect } from 'react';
import { SimplePostCard, SimplePostCardSkeleton } from '@/components/stable/SimplePostCard';
import { useFeedStore } from '@/stores/feedStore';

interface SimpleContentFeedProps {
  className?: string;
}

// PHASE 3: Brutally simple feed with basic pagination
export const SimpleContentFeed: React.FC<SimpleContentFeedProps> = ({ className }) => {
  const { posts, loading, loadPosts } = useFeedStore();
  const [page, setPage] = useState(0);
  const postsPerPage = 5;

  // Load initial posts
  useEffect(() => {
    loadPosts(true);
  }, [loadPosts]);

  // Simple pagination
  const startIndex = page * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const visiblePosts = posts.slice(startIndex, endIndex);
  const hasNextPage = endIndex < posts.length;
  const hasPrevPage = page > 0;

  return (
    <div className={`simple-feed space-y-4 ${className || ''}`}>
      {/* Feed header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Feed</h2>
        <div className="text-sm text-muted-foreground">
          {posts.length} posts
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {loading && page === 0 ? (
          // Show skeletons only on initial load
          Array.from({ length: postsPerPage }).map((_, i) => (
            <SimplePostCardSkeleton key={`skeleton-${i}`} />
          ))
        ) : visiblePosts.length > 0 ? (
          visiblePosts.map((post) => (
            <SimplePostCard
              key={post.id}
              post={post}
              className="transition-opacity duration-200"
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts to show</p>
          </div>
        )}
      </div>

      {/* Simple pagination */}
      {posts.length > postsPerPage && (
        <div className="flex items-center justify-center space-x-4 py-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={!hasPrevPage}
            className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
          >
            Previous
          </button>
          
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {Math.ceil(posts.length / postsPerPage)}
          </span>
          
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasNextPage}
            className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};