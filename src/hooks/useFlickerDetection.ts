import { useEffect, useRef, useState, useCallback } from 'react';

interface FlickerEvent {
  timestamp: number;
  type: 'layout-shift' | 'paint-flash' | 'dimension-change' | 'style-recalc';
  element?: string;
  severity: 'low' | 'medium' | 'high';
  metrics: {
    cls?: number;
    duration?: number;
    affectedElements?: number;
  };
}

interface FlickerDetectionOptions {
  enabled: boolean;
  clsThreshold: number;
  paintFlashThreshold: number;
  maxEventsToStore: number;
}

const defaultOptions: FlickerDetectionOptions = {
  enabled: true,
  clsThreshold: 0.1,
  paintFlashThreshold: 16, // ms
  maxEventsToStore: 100
};

export const useFlickerDetection = (options: Partial<FlickerDetectionOptions> = {}) => {
  const opts = { ...defaultOptions, ...options };
  const [flickerEvents, setFlickerEvents] = useState<FlickerEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const observerRef = useRef<PerformanceObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const paintTimesRef = useRef<Map<Element, number>>(new Map());

  const addFlickerEvent = useCallback((event: FlickerEvent) => {
    setFlickerEvents(prev => {
      const newEvents = [...prev, event];
      return newEvents.slice(-opts.maxEventsToStore);
    });
  }, [opts.maxEventsToStore]);

  // Layout Shift Detection
  useEffect(() => {
    if (!opts.enabled) return;

    if ('PerformanceObserver' in window) {
      observerRef.current = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            const layoutShiftEntry = entry as PerformanceEntry & { 
              value: number; 
              hadRecentInput: boolean;
              sources?: { node: Node }[];
            };
            
            if (!layoutShiftEntry.hadRecentInput && layoutShiftEntry.value > opts.clsThreshold) {
              const affectedElements = layoutShiftEntry.sources?.length || 0;
              const severity: FlickerEvent['severity'] = 
                layoutShiftEntry.value > 0.25 ? 'high' :
                layoutShiftEntry.value > 0.1 ? 'medium' : 'low';

              addFlickerEvent({
                timestamp: entry.startTime,
                type: 'layout-shift',
                severity,
                metrics: {
                  cls: layoutShiftEntry.value,
                  affectedElements
                }
              });
            }
          }
          
          if (entry.entryType === 'paint') {
            // Track paint timing for flicker detection
            const paintEntry = entry as PerformanceEntry;
            if (paintEntry.name === 'first-contentful-paint' || paintEntry.name === 'largest-contentful-paint') {
              const duration = paintEntry.duration || paintEntry.startTime;
              if (duration > opts.paintFlashThreshold) {
                addFlickerEvent({
                  timestamp: paintEntry.startTime,
                  type: 'paint-flash',
                  severity: duration > 50 ? 'high' : duration > 25 ? 'medium' : 'low',
                  metrics: { duration }
                });
              }
            }
          }
        }
      });

      try {
        observerRef.current.observe({ 
          entryTypes: ['layout-shift', 'paint', 'measure'] 
        });
        setIsMonitoring(true);
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        setIsMonitoring(false);
      }
    };
  }, [opts.enabled, opts.clsThreshold, opts.paintFlashThreshold, addFlickerEvent]);

  // DOM Mutation Detection for Style Recalculations
  useEffect(() => {
    if (!opts.enabled) return;

    mutationObserverRef.current = new MutationObserver((mutations) => {
      const styleChanges = mutations.filter(mutation => 
        mutation.type === 'attributes' && 
        (mutation.attributeName === 'style' || 
         mutation.attributeName === 'class')
      );

      if (styleChanges.length > 5) { // Threshold for mass style changes
        addFlickerEvent({
          timestamp: performance.now(),
          type: 'style-recalc',
          severity: styleChanges.length > 20 ? 'high' : styleChanges.length > 10 ? 'medium' : 'low',
          metrics: {
            affectedElements: styleChanges.length
          }
        });
      }
    });

    mutationObserverRef.current.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      subtree: true
    });

    return () => {
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect();
      }
    };
  }, [opts.enabled, addFlickerEvent]);

  // ResizeObserver for dimension changes
  useEffect(() => {
    if (!opts.enabled || !('ResizeObserver' in window)) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const significantChanges = entries.filter(entry => {
        const { width, height } = entry.contentRect;
        const element = entry.target;
        const previousSize = paintTimesRef.current.get(element);
        
        if (previousSize) {
          const sizeChange = Math.abs(width * height - previousSize);
          return sizeChange > 1000; // Significant size change threshold
        }
        
        paintTimesRef.current.set(element, width * height);
        return false;
      });

      if (significantChanges.length > 0) {
        addFlickerEvent({
          timestamp: performance.now(),
          type: 'dimension-change',
          severity: significantChanges.length > 3 ? 'high' : 'medium',
          metrics: {
            affectedElements: significantChanges.length
          }
        });
      }
    });

    // Observe key elements that might cause layout shifts
    const elementsToWatch = document.querySelectorAll(
      '[data-testid*="post"], .post-card, .content-feed, .virtual-scroll-container'
    );
    
    elementsToWatch.forEach(element => {
      resizeObserver.observe(element);
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [opts.enabled, addFlickerEvent]);

  // Analysis functions
  const getFlickerSummary = useCallback(() => {
    const summary = {
      totalEvents: flickerEvents.length,
      highSeverity: flickerEvents.filter(e => e.severity === 'high').length,
      mediumSeverity: flickerEvents.filter(e => e.severity === 'medium').length,
      lowSeverity: flickerEvents.filter(e => e.severity === 'low').length,
      byType: {
        'layout-shift': flickerEvents.filter(e => e.type === 'layout-shift').length,
        'paint-flash': flickerEvents.filter(e => e.type === 'paint-flash').length,
        'dimension-change': flickerEvents.filter(e => e.type === 'dimension-change').length,
        'style-recalc': flickerEvents.filter(e => e.type === 'style-recalc').length
      },
      avgCLS: flickerEvents
        .filter(e => e.metrics.cls)
        .reduce((sum, e) => sum + (e.metrics.cls || 0), 0) / 
        Math.max(flickerEvents.filter(e => e.metrics.cls).length, 1),
      recentEvents: flickerEvents.filter(e => 
        performance.now() - e.timestamp < 5000 // Last 5 seconds
      ).length
    };

    return summary;
  }, [flickerEvents]);

  const clearEvents = useCallback(() => {
    setFlickerEvents([]);
  }, []);

  const getFlickerScore = useCallback(() => {
    const summary = getFlickerSummary();
    
    // Calculate flicker score (0-100, lower is better)
    let score = 0;
    score += summary.highSeverity * 10;
    score += summary.mediumSeverity * 5;
    score += summary.lowSeverity * 1;
    score += summary.avgCLS * 100;
    
    return Math.min(score, 100);
  }, [getFlickerSummary]);

  const exportFlickerData = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      events: flickerEvents,
      summary: getFlickerSummary(),
      score: getFlickerScore()
    };

    return JSON.stringify(data, null, 2);
  }, [flickerEvents, getFlickerSummary, getFlickerScore]);

  return {
    flickerEvents,
    isMonitoring,
    getFlickerSummary,
    getFlickerScore,
    clearEvents,
    exportFlickerData,
    addFlickerEvent // For manual event addition
  };
};