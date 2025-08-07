import * as React from "react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface PostCardSkeletonProps {
  className?: string;
  showMedia?: boolean;
  mediaType?: 'image' | 'video' | 'poll' | 'event';
}

// PHASE 4: Exact-matching skeleton for PostCard components
export const PostCardSkeleton = ({ 
  className, 
  showMedia = true, 
  mediaType = 'image' 
}: PostCardSkeletonProps) => {
  return (
    <div className={cn("post-card-stable bg-card border rounded-lg shadow-sm overflow-hidden mb-8", className)}>
      <div className="p-6 space-y-4">
        {/* Header - exact match to PostCard header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="skeleton-avatar loading-shimmer" />
            <div className="space-y-2">
              <Skeleton className="skeleton-title loading-shimmer" />
              <Skeleton className="skeleton-subtitle loading-shimmer" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-full loading-shimmer" />
        </div>

        {/* Content - exact match to content spacing */}
        <div className="space-y-3">
          <Skeleton className="skeleton-content w-full loading-shimmer" />
          <Skeleton className="skeleton-content w-3/4 loading-shimmer" />
          
          {/* Hashtags placeholder */}
          <div className="flex flex-wrap gap-1 mt-3">
            <Skeleton className="h-5 w-16 rounded-full loading-shimmer" />
            <Skeleton className="h-5 w-20 rounded-full loading-shimmer" />
          </div>
        </div>

        {/* Media Content - exact dimensions matching actual media */}
        {showMedia && (
          <div className="mt-3">
            {mediaType === 'image' || mediaType === 'video' ? (
              <Skeleton className="skeleton-media rounded-lg loading-shimmer" />
            ) : mediaType === 'poll' ? (
              <div className="space-y-3 p-4 border rounded-lg">
                <Skeleton className="h-5 w-48 loading-shimmer" />
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full rounded-lg loading-shimmer" />
                  <Skeleton className="h-12 w-full rounded-lg loading-shimmer" />
                  <Skeleton className="h-12 w-full rounded-lg loading-shimmer" />
                </div>
                <Skeleton className="h-4 w-32 loading-shimmer" />
              </div>
            ) : mediaType === 'event' ? (
              <div className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-40 loading-shimmer" />
                    <Skeleton className="h-4 w-full loading-shimmer" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full loading-shimmer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 loading-shimmer" />
                    <Skeleton className="h-4 w-32 loading-shimmer" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-20 loading-shimmer ml-auto" />
                    <Skeleton className="h-3 w-16 loading-shimmer ml-auto" />
                  </div>
                </div>
                <Skeleton className="h-8 w-full rounded-lg loading-shimmer" />
              </div>
            ) : null}
          </div>
        )}

        {/* Engagement Stats - exact match to reaction display */}
        <div className="flex items-center justify-between py-3 text-sm">
          <div className="flex items-center space-x-1">
            <div className="flex -space-x-1">
              <Skeleton className="h-5 w-5 rounded-full loading-shimmer" />
              <Skeleton className="h-5 w-5 rounded-full loading-shimmer" />
              <Skeleton className="h-5 w-5 rounded-full loading-shimmer" />
            </div>
            <Skeleton className="h-4 w-8 loading-shimmer" />
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-4 w-20 loading-shimmer" />
            <Skeleton className="h-4 w-16 loading-shimmer" />
          </div>
        </div>

        {/* Action Buttons - exact match to button layout */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center space-x-1">
            <Skeleton className="skeleton-button w-16 loading-shimmer" />
            <Skeleton className="h-8 w-8 rounded-full loading-shimmer" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="skeleton-button w-20 loading-shimmer" />
            <Skeleton className="skeleton-button w-16 loading-shimmer" />
            <Skeleton className="h-8 w-8 rounded-full loading-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
};

// PHASE 4: Multiple skeleton variations
export const FeedSkeleton = ({ count = 3 }: { count?: number }) => {
  const mediaTypes: Array<'image' | 'video' | 'poll' | 'event'> = ['image', 'video', 'poll', 'event'];
  
  return (
    <div className="space-y-8 stable-animation">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton
          key={i}
          mediaType={mediaTypes[i % mediaTypes.length]}
          showMedia={Math.random() > 0.2} // 80% show media
        />
      ))}
    </div>
  );
};

// PHASE 4: Comment skeleton matching comment structure
export const CommentSkeleton = () => (
  <div className="flex space-x-3 animate-fade-in">
    <Skeleton className="h-8 w-8 rounded-full loading-shimmer" />
    <div className="flex-1 bg-muted/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-24 loading-shimmer" />
        <Skeleton className="h-3 w-16 loading-shimmer" />
      </div>
      <Skeleton className="h-4 w-full loading-shimmer" />
      <Skeleton className="h-4 w-2/3 loading-shimmer" />
    </div>
  </div>
);