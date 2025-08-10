import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo, useCallback } from 'react';

interface VirtualScrollOptions<T> {
  items: T[];
  estimateSize?: (index: number) => number;
  overscan?: number;
  enabled?: boolean;
  threshold?: number;
}

export function useVirtualScroll<T>({
  items,
  estimateSize = () => 350,
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
    // Provide a measurement function for dynamic heights
    measureElement: shouldVirtualize ? (el) => (el as HTMLElement).getBoundingClientRect().height : undefined,
    // Stable keys prevent measurement mismatches when list order changes
    getItemKey: (index) => (items[index] as any)?.id ?? index,
  });

  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : [];

  const measureRef = useCallback((el: Element | null) => {
    if (!shouldVirtualize || !el) return;
    virtualizer.measureElement(el);
  }, [shouldVirtualize, virtualizer]);
  // Memoize visible items for performance
  const visibleItems = useMemo(() => {
    if (!shouldVirtualize) {
      return items.map((item, index) => ({ item, index, virtualItem: undefined }));
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
    measureElement: measureRef,
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
  const { parentRef, virtualizer, visibleItems, shouldVirtualize, totalSize, measureElement } = 
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
    measureElement,
  };
}

// Import intersection observer hook
import { useIntersectionObserver } from './useIntersectionObserver';