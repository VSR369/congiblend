import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo } from 'react';

interface VirtualScrollOptions<T> {
  items: T[];
  estimateSize?: () => number;
  overscan?: number;
  enabled?: boolean;
  threshold?: number;
}

export function useVirtualScroll<T>({
  items,
  estimateSize = () => 200,
  overscan = 5,
  enabled = true,
  threshold = 20
}: VirtualScrollOptions<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Only enable virtualization for large lists
  const shouldVirtualize = enabled && items.length > threshold;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
    // Performance optimization: measure items only when necessary
    measureElement: shouldVirtualize ? undefined : () => 0,
  });

  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : [];

  // Memoize visible items for performance
  const visibleItems = useMemo(() => {
    if (!shouldVirtualize) {
      return items.map((item, index) => ({ item, index }));
    }

    return virtualItems.map(virtualItem => ({
      item: items[virtualItem.index],
      index: virtualItem.index,
      virtualItem,
    }));
  }, [shouldVirtualize, items, virtualItems]);

  return {
    parentRef,
    virtualizer: shouldVirtualize ? virtualizer : null,
    visibleItems,
    shouldVirtualize,
    totalSize: shouldVirtualize ? virtualizer.getTotalSize() : 'auto',
  };
}

// Hook for infinite scroll with virtual scrolling
export function useVirtualInfiniteScroll<T>({
  items,
  hasMore,
  loading,
  onLoadMore,
  ...virtualOptions
}: VirtualScrollOptions<T> & {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}) {
  const { parentRef, virtualizer, visibleItems, shouldVirtualize, totalSize } = 
    useVirtualScroll({ items, ...virtualOptions });

  // Load more when scrolled near bottom
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Use intersection observer for load more trigger
  const { ref: loadMoreTriggerRef } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '200px',
  });

  // Attach load more trigger
  const enhancedLoadMoreRef = (node: HTMLDivElement | null) => {
    loadMoreRef.current = node;
    loadMoreTriggerRef.current = node;
    
    if (node && hasMore && !loading) {
      onLoadMore();
    }
  };

  return {
    parentRef,
    virtualizer,
    visibleItems,
    shouldVirtualize,
    totalSize,
    loadMoreRef: enhancedLoadMoreRef,
  };
}

// Import intersection observer hook
import { useIntersectionObserver } from './useIntersectionObserver';