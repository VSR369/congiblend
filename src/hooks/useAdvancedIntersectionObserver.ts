import { useEffect, useRef, useState, useCallback } from 'react';

interface AdvancedIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  root?: Element | null;
  triggerOnce?: boolean;
  delay?: number;
  trackVisibility?: boolean;
  trackVisibilityTime?: boolean;
}

interface IntersectionResult {
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
  visibilityTime: number;
  wasVisible: boolean;
}

export function useAdvancedIntersectionObserver(
  options: AdvancedIntersectionObserverOptions = {}
): [React.RefObject<HTMLElement>, IntersectionResult] {
  const {
    threshold = 0,
    rootMargin = '0px',
    root = null,
    triggerOnce = false,
    delay = 0,
    trackVisibility = false,
    trackVisibilityTime = false,
  } = options;

  const targetRef = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [visibilityTime, setVisibilityTime] = useState(0);
  const [wasVisible, setWasVisible] = useState(false);
  const visibilityStartRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateIntersection = useCallback((entry: IntersectionObserverEntry) => {
    const isCurrentlyIntersecting = entry.isIntersecting;
    
    if (delay > 0) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      timeoutRef.current = setTimeout(() => {
        setIsIntersecting(isCurrentlyIntersecting);
        setEntry(entry);
        
        if (trackVisibility && isCurrentlyIntersecting && !wasVisible) {
          setWasVisible(true);
        }
      }, delay);
    } else {
      setIsIntersecting(isCurrentlyIntersecting);
      setEntry(entry);
      
      if (trackVisibility && isCurrentlyIntersecting && !wasVisible) {
        setWasVisible(true);
      }
    }

    // Track visibility timing
    if (trackVisibilityTime) {
      if (isCurrentlyIntersecting && !visibilityStartRef.current) {
        visibilityStartRef.current = performance.now();
      } else if (!isCurrentlyIntersecting && visibilityStartRef.current) {
        const timeVisible = performance.now() - visibilityStartRef.current;
        setVisibilityTime(prev => prev + timeVisible);
        visibilityStartRef.current = null;
      }
    }
  }, [delay, trackVisibility, trackVisibilityTime, wasVisible]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        updateIntersection(entry);
        
        if (triggerOnce && entry.isIntersecting) {
          observer.unobserve(target);
        }
      },
      {
        threshold,
        rootMargin,
        root,
      }
    );

    observer.observe(target);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      observer.unobserve(target);
    };
  }, [threshold, rootMargin, root, triggerOnce, updateIntersection]);

  return [
    targetRef,
    {
      isIntersecting,
      entry,
      visibilityTime,
      wasVisible,
    },
  ];
}

// Hook for lazy loading media with advanced intersection observer
export function useLazyMedia(
  options: AdvancedIntersectionObserverOptions = {}
): { ref: React.RefObject<HTMLElement>; shouldLoad: boolean; wasVisible: boolean } {
  const [ref, { isIntersecting, wasVisible }] = useAdvancedIntersectionObserver({
    rootMargin: '50px',
    triggerOnce: true,
    ...options,
  });

  const shouldLoad = isIntersecting || wasVisible;

  return { ref, shouldLoad, wasVisible };
}

// Hook for tracking post visibility for analytics
export function usePostVisibility(
  postId: string,
  onVisibilityChange?: (postId: string, isVisible: boolean, visibilityTime: number) => void
): { ref: React.RefObject<HTMLElement>; isIntersecting: boolean } {
  const [ref, { isIntersecting, visibilityTime }] = useAdvancedIntersectionObserver({
    threshold: 0.5, // 50% visible
    trackVisibilityTime: true,
    delay: 1000, // 1s delay to avoid false positives
  });

  useEffect(() => {
    onVisibilityChange?.(postId, isIntersecting, visibilityTime);
  }, [postId, isIntersecting, visibilityTime, onVisibilityChange]);

  return { ref, isIntersecting };
}