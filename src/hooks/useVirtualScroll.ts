import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo, useCallback, useState, useEffect } from 'react';

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
  
  const resizeObservers = useRef(new WeakMap<Element, ResizeObserver>());
  const resizeObserverSet = useRef<Set<ResizeObserver>>(new Set());
  
  // Only enable virtualization for large lists
  const shouldVirtualize = enabled && items.length > threshold;

  const [isScrolling, setIsScrolling] = useState(false);
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    let timeoutId: number | undefined;
    const onScroll = () => {
      if (!isScrolling) setIsScrolling(true);
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setIsScrolling(false), 150);
    };
    el.addEventListener('scroll', onScroll, { passive: true } as any);
    return () => {
      el.removeEventListener('scroll', onScroll as any);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [shouldVirtualize]);

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
    const node = el as HTMLElement;
    // Initial measurement in next frame to reduce layout thrash
    requestAnimationFrame(() => {
      virtualizer.measureElement(node);
    });
    // Observe size changes for dynamic content
    if ('ResizeObserver' in window) {
      let ro = resizeObservers.current.get(node);
      if (!ro) {
        ro = new ResizeObserver(() => {
          requestAnimationFrame(() => virtualizer.measureElement(node));
        });
        resizeObservers.current.set(node, ro);
        resizeObserverSet.current.add(ro);
      }
      ro.observe(node);
    }
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

  // Cleanup any ResizeObservers on unmount to prevent leaks and measurement jitter
  useEffect(() => {
    return () => {
      resizeObserverSet.current.forEach((ro) => ro.disconnect());
      resizeObserverSet.current.clear();
    };
  }, []);


  return {
    parentRef,
    virtualizer: shouldVirtualize ? virtualizer : null,
    visibleItems,
    shouldVirtualize,
    totalSize: shouldVirtualize ? virtualizer.getTotalSize() : 'auto',
    measureElement: measureRef,
    isScrolling,
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
  const { parentRef, virtualizer, visibleItems, shouldVirtualize, totalSize, measureElement, isScrolling } = 
    useVirtualScroll({ items, ...virtualOptions });

  // Load more when scrolled near bottom
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Use intersection observer for load more trigger
  const { ref: loadMoreTriggerRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '200px',
    root: parentRef.current,
  });

  // Attach load more trigger
  const enhancedLoadMoreRef = (node: HTMLDivElement | null) => {
    loadMoreRef.current = node;
    loadMoreTriggerRef.current = node;
  };

  // Trigger load more only when intersecting
  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, loading, onLoadMore]);

  return {
    parentRef,
    virtualizer,
    visibleItems,
    shouldVirtualize,
    totalSize,
    loadMoreRef: enhancedLoadMoreRef,
    measureElement,
    isScrolling,
  };
}

// Import intersection observer hook
import { useIntersectionObserver } from './useIntersectionObserver';