// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  static getInstance() {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Web Vitals monitoring
  measureWebVitals() {
    if ('web-vital' in window) {
      // CLS - Cumulative Layout Shift
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('CLS:', entry);
        }
      }).observe({ type: 'layout-shift', buffered: true });

      // LCP - Largest Contentful Paint
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('LCP:', entry);
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // FID - First Input Delay
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('FID:', entry);
        }
      }).observe({ type: 'first-input', buffered: true });
    }
  }

  // Custom performance marks
  mark(name: string) {
    performance.mark(name);
    this.metrics.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string) {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    console.log(`${name}: ${measure.duration}ms`);
    return measure.duration;
  }

  // Bundle size analysis
  analyzeBundleSize() {
    if ('navigator' in window && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      console.log('Network info:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      });
    }
  }

  // Memory usage monitoring
  monitorMemory() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Memory usage:', {
        used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB',
      });
    }
  }
}

// Image optimization utilities
export const optimizeImage = (
  src: string,
  width?: number,
  height?: number,
  format: 'webp' | 'avif' | 'jpeg' | 'png' = 'webp'
) => {
  if (!src) return src;
  
  // Add query parameters for optimization
  const url = new URL(src, window.location.origin);
  if (width) url.searchParams.set('w', width.toString());
  if (height) url.searchParams.set('h', height.toString());
  url.searchParams.set('format', format);
  url.searchParams.set('q', '85'); // Quality
  
  return url.toString();
};

// Lazy loading utilities
export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
};

// Cache management
export class CacheManager {
  private static readonly CACHE_PREFIX = 'app-cache-';
  private static readonly DEFAULT_TTL = 1000 * 60 * 60; // 1 hour

  static async set(key: string, data: any, ttl = CacheManager.DEFAULT_TTL) {
    const item = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    try {
      localStorage.setItem(CacheManager.CACHE_PREFIX + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
  }

  static async get(key: string) {
    try {
      const item = localStorage.getItem(CacheManager.CACHE_PREFIX + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const now = Date.now();

      if (now - parsed.timestamp > parsed.ttl) {
        CacheManager.delete(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Cache get failed:', error);
      return null;
    }
  }

  static delete(key: string) {
    localStorage.removeItem(CacheManager.CACHE_PREFIX + key);
  }

  static clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CacheManager.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Performance-optimized debounce
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) func(...args);
    }, wait);
    
    if (callNow) func(...args);
  };
};