import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppContext } from '@/context/AppContext';

// Performance Metrics Interface
interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  layoutShifts: number;
  interactionLatency: number;
  bundleSize: number;
  cacheHitRatio: number;
}

interface PerformanceBudgets {
  maxRenderTime: number; // ms
  minFPS: number;
  maxMemoryUsage: number; // MB
  maxLayoutShifts: number;
  maxInteractionLatency: number; // ms
}

// Default performance budgets
const DEFAULT_BUDGETS: PerformanceBudgets = {
  maxRenderTime: 16, // 60fps = 16.67ms per frame
  minFPS: 55,
  maxMemoryUsage: 50, // 50MB
  maxLayoutShifts: 0.1,
  maxInteractionLatency: 100,
};

// Performance Monitor Class
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observer: PerformanceObserver | null = null;
  private fpsCounter: { count: number; lastTime: number } = { count: 0, lastTime: 0 };
  private layoutShifts: number[] = [];
  private renderTimes: number[] = [];
  private interactions: { start: number; end?: number }[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Initialize monitoring
  initialize(): void {
    this.setupPerformanceObserver();
    this.setupFPSMonitoring();
    this.setupMemoryMonitoring();
  }

  // Setup Performance Observer for Web Vitals
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'layout-shift':
            this.trackLayoutShift(entry as PerformanceEntry & { value: number });
            break;
          case 'largest-contentful-paint':
            console.log('LCP:', entry.startTime);
            break;
          case 'first-input':
            console.log('FID:', entry.processingStart - entry.startTime);
            break;
          case 'measure':
            if (entry.name.startsWith('render-')) {
              this.trackRenderTime(entry.duration);
            }
            break;
        }
      }
    });

    // Observe different performance metrics
    try {
      this.observer.observe({ entryTypes: ['layout-shift', 'largest-contentful-paint', 'first-input', 'measure'] });
    } catch (error) {
      console.warn('Performance Observer setup failed:', error);
    }
  }

  // Setup FPS monitoring
  private setupFPSMonitoring(): void {
    const measureFPS = () => {
      const now = performance.now();
      this.fpsCounter.count++;

      if (now >= this.fpsCounter.lastTime + 1000) {
        const fps = Math.round((this.fpsCounter.count * 1000) / (now - this.fpsCounter.lastTime));
        this.fpsCounter = { count: 0, lastTime: now };
        
        // Trigger low FPS warning
        if (fps < DEFAULT_BUDGETS.minFPS) {
          console.warn(`Low FPS detected: ${fps}fps`);
        }
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  // Setup memory monitoring
  private setupMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    setInterval(() => {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
      
      if (usedMB > DEFAULT_BUDGETS.maxMemoryUsage) {
        console.warn(`High memory usage: ${usedMB}MB`);
      }
    }, 10000); // Check every 10 seconds
  }

  // Track layout shifts
  private trackLayoutShift(entry: PerformanceEntry & { value: number }): void {
    this.layoutShifts.push(entry.value);
    
    // Keep only last 100 shifts
    if (this.layoutShifts.length > 100) {
      this.layoutShifts.shift();
    }

    // Calculate CLS
    const cls = this.layoutShifts.reduce((sum, shift) => sum + shift, 0);
    if (cls > DEFAULT_BUDGETS.maxLayoutShifts) {
      console.warn(`High Cumulative Layout Shift: ${cls}`);
    }
  }

  // Track render times
  private trackRenderTime(duration: number): void {
    this.renderTimes.push(duration);
    
    // Keep only last 100 renders
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift();
    }

    if (duration > DEFAULT_BUDGETS.maxRenderTime) {
      console.warn(`Slow render detected: ${duration}ms`);
    }
  }

  // Start interaction measurement
  startInteraction(): string {
    const id = `interaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.interactions.push({ start: performance.now() });
    return id;
  }

  // End interaction measurement
  endInteraction(id: string): void {
    const interaction = this.interactions.find(i => !i.end);
    if (interaction) {
      interaction.end = performance.now();
      const latency = interaction.end - interaction.start;
      
      if (latency > DEFAULT_BUDGETS.maxInteractionLatency) {
        console.warn(`High interaction latency: ${latency}ms`);
      }
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    const memory = (performance as any).memory;
    const avgRenderTime = this.renderTimes.length > 0 
      ? this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length 
      : 0;
    
    const cls = this.layoutShifts.reduce((sum, shift) => sum + shift, 0);
    
    const avgInteractionLatency = this.interactions
      .filter(i => i.end)
      .reduce((sum, i) => sum + (i.end! - i.start), 0) / Math.max(this.interactions.length, 1);

    return {
      fps: this.fpsCounter.count,
      renderTime: avgRenderTime,
      memoryUsage: memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0,
      layoutShifts: cls,
      interactionLatency: avgInteractionLatency,
      bundleSize: 0, // Would need to be calculated server-side
      cacheHitRatio: 0, // Would need to be tracked separately
    };
  }

  // Cleanup
  cleanup(): void {
    this.observer?.disconnect();
  }
}

// Hook for performance monitoring
export const usePerformanceMonitor = (enabled: boolean = true) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [budgetViolations, setBudgetViolations] = useState<string[]>([]);
  const monitorRef = useRef<PerformanceMonitor | null>(null);
  const { queueRender } = useAppContext();

  // Initialize monitor
  useEffect(() => {
    if (!enabled) return;

    monitorRef.current = PerformanceMonitor.getInstance();
    monitorRef.current.initialize();

    return () => {
      monitorRef.current?.cleanup();
    };
  }, [enabled]);

  // Update metrics periodically
  useEffect(() => {
    if (!enabled || !monitorRef.current) return;

    const interval = setInterval(() => {
      const currentMetrics = monitorRef.current!.getMetrics();
      setMetrics(currentMetrics);

      // Check budget violations
      const violations: string[] = [];
      
      if (currentMetrics.renderTime > DEFAULT_BUDGETS.maxRenderTime) {
        violations.push(`Render time: ${currentMetrics.renderTime.toFixed(2)}ms`);
      }
      
      if (currentMetrics.fps < DEFAULT_BUDGETS.minFPS) {
        violations.push(`FPS: ${currentMetrics.fps}`);
      }
      
      if (currentMetrics.memoryUsage > DEFAULT_BUDGETS.maxMemoryUsage) {
        violations.push(`Memory: ${currentMetrics.memoryUsage}MB`);
      }
      
      if (currentMetrics.layoutShifts > DEFAULT_BUDGETS.maxLayoutShifts) {
        violations.push(`Layout shifts: ${currentMetrics.layoutShifts.toFixed(3)}`);
      }
      
      if (currentMetrics.interactionLatency > DEFAULT_BUDGETS.maxInteractionLatency) {
        violations.push(`Interaction latency: ${currentMetrics.interactionLatency.toFixed(2)}ms`);
      }

      setBudgetViolations(violations);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [enabled]);

  // Measure component render time
  const measureRender = useCallback((componentName: string, renderFn: () => void) => {
    if (!enabled || !monitorRef.current) {
      renderFn();
      return;
    }

    performance.mark(`${componentName}-render-start`);
    renderFn();
    performance.mark(`${componentName}-render-end`);
    performance.measure(
      `render-${componentName}`,
      `${componentName}-render-start`,
      `${componentName}-render-end`
    );
  }, [enabled]);

  // Start interaction tracking
  const startInteraction = useCallback(() => {
    if (!enabled || !monitorRef.current) return '';
    return monitorRef.current.startInteraction();
  }, [enabled]);

  // End interaction tracking
  const endInteraction = useCallback((id: string) => {
    if (!enabled || !monitorRef.current) return;
    monitorRef.current.endInteraction(id);
  }, [enabled]);

  return {
    metrics,
    budgetViolations,
    measureRender,
    startInteraction,
    endInteraction,
    isMonitoring: enabled && !!monitorRef.current,
  };
};

// Hook for component performance tracking
export const useComponentPerformance = (componentName: string) => {
  const { measureRender, startInteraction, endInteraction } = usePerformanceMonitor();
  const renderCount = useRef(0);
  const interactionRef = useRef<string>('');

  // Track renders
  useEffect(() => {
    renderCount.current++;
  });

  // Wrapped render function
  const trackRender = useCallback((renderFn: () => void) => {
    measureRender(`${componentName}-${renderCount.current}`, renderFn);
  }, [componentName, measureRender]);

  // Interaction tracking
  const trackInteractionStart = useCallback(() => {
    interactionRef.current = startInteraction();
  }, [startInteraction]);

  const trackInteractionEnd = useCallback(() => {
    if (interactionRef.current) {
      endInteraction(interactionRef.current);
      interactionRef.current = '';
    }
  }, [endInteraction]);

  return {
    trackRender,
    trackInteractionStart,
    trackInteractionEnd,
    renderCount: renderCount.current,
  };
};
