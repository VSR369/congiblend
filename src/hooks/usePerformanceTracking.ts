import { useEffect, useCallback } from 'react';
import { performanceMonitor } from '@/utils/performance';

export const usePerformanceTracking = () => {
  const trackOperation = useCallback((name: string, metadata?: Record<string, any>) => {
    return {
      start: () => performanceMonitor.startTimer(name, metadata),
      end: () => performanceMonitor.endTimer(name)
    };
  }, []);

  const trackError = useCallback((error: Error, context?: string) => {
    performanceMonitor.addMetric({
      name: 'error',
      value: 1,
      timestamp: Date.now(),
      type: 'count',
      metadata: {
        message: error.message,
        stack: error.stack,
        context
      }
    });
    console.error('Tracked error:', error, context);
  }, []);

  const trackUserAction = useCallback((action: string, metadata?: Record<string, any>) => {
    performanceMonitor.addMetric({
      name: `user_action_${action}`,
      value: 1,
      timestamp: Date.now(),
      type: 'count',
      metadata
    });
  }, []);

  return {
    trackOperation,
    trackError,
    trackUserAction,
    generateReport: () => performanceMonitor.generateReport()
  };
};

// Hook for tracking component render performance
export const useRenderTracking = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      performanceMonitor.addMetric({
        name: `render_${componentName}`,
        value: renderTime,
        timestamp: Date.now(),
        type: 'timing'
      });
    };
  });
};

// Hook for tracking page load performance
export const usePageLoadTracking = (pageName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    const handleLoad = () => {
      const loadTime = performance.now() - startTime;
      performanceMonitor.addMetric({
        name: `page_load_${pageName}`,
        value: loadTime,
        timestamp: Date.now(),
        type: 'timing'
      });
    };

    // Track when page is fully loaded
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [pageName]);
};