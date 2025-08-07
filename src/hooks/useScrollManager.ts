import { useEffect, useRef, useCallback } from 'react';

interface ScrollManagerOptions {
  throttle?: number;
  passive?: boolean;
  onScroll?: (scrollY: number) => void;
}

interface ScrollManager {
  isScrolling: boolean;
  scrollY: number;
  addScrollListener: (callback: (scrollY: number) => void) => () => void;
}

class GlobalScrollManager {
  private static instance: GlobalScrollManager;
  private listeners: Set<(scrollY: number) => void> = new Set();
  private scrollY = 0;
  private isScrolling = false;
  private rafId: number | null = null;
  private scrollTimeout: NodeJS.Timeout | null = null;

  static getInstance(): GlobalScrollManager {
    if (!GlobalScrollManager.instance) {
      GlobalScrollManager.instance = new GlobalScrollManager();
    }
    return GlobalScrollManager.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    const handleScroll = () => {
      if (this.rafId) return;
      
      this.rafId = requestAnimationFrame(() => {
        this.scrollY = window.pageYOffset;
        this.isScrolling = true;
        
        // Notify all listeners with throttled updates (60fps max)
        this.listeners.forEach(callback => callback(this.scrollY));
        
        this.rafId = null;
        
        // Clear scrolling flag after scroll ends
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
          this.isScrolling = false;
        }, 150);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  addListener(callback: (scrollY: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getScrollY(): number {
    return this.scrollY;
  }

  getIsScrolling(): boolean {
    return this.isScrolling;
  }
}

export const useScrollManager = (options: ScrollManagerOptions = {}): ScrollManager => {
  const { onScroll } = options;
  const scrollManager = GlobalScrollManager.getInstance();
  const scrollYRef = useRef(0);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = scrollManager.addListener((scrollY) => {
      scrollYRef.current = scrollY;
      isScrollingRef.current = scrollManager.getIsScrolling();
      onScroll?.(scrollY);
    });

    return unsubscribe;
  }, [onScroll]);

  return {
    isScrolling: isScrollingRef.current,
    scrollY: scrollYRef.current,
    addScrollListener: useCallback(
      (callback: (scrollY: number) => void) => scrollManager.addListener(callback),
      []
    ),
  };
};