import React, { useState, useEffect, useRef } from 'react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface DebugStats {
  fps: number;
  memoryUsage: number;
  renderCount: number;
  layoutShifts: number;
  networkRequests: number;
  errorCount: number;
  lastError?: string;
  browserInfo: {
    userAgent: string;
    viewport: { width: number; height: number };
    devicePixelRatio: number;
    connectionType?: string;
  };
}

const DebugOverlay: React.FC<{ enabled?: boolean }> = ({ enabled = false }) => {
  const [stats, setStats] = useState<DebugStats>({
    fps: 0,
    memoryUsage: 0,
    renderCount: 0,
    layoutShifts: 0,
    networkRequests: 0,
    errorCount: 0,
    browserInfo: {
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      devicePixelRatio: window.devicePixelRatio,
      connectionType: (navigator as any).connection?.effectiveType
    }
  });

  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'performance' | 'errors' | 'network' | 'browser'>('performance');
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [networkLog, setNetworkLog] = useState<{ method: string; url: string; status: number; time: number }[]>([]);
  
  const frameCount = useRef(0);
  const lastFrameTime = useRef(performance.now());
  const { metrics, budgetViolations } = usePerformanceMonitor(enabled);
  const { state } = useAppContext();

  // FPS Monitoring
  useEffect(() => {
    if (!enabled) return;

    const measureFPS = () => {
      frameCount.current++;
      const now = performance.now();
      
      if (now >= lastFrameTime.current + 1000) {
        const fps = Math.round((frameCount.current * 1000) / (now - lastFrameTime.current));
        frameCount.current = 0;
        lastFrameTime.current = now;
        
        setStats(prev => ({ ...prev, fps }));
      }
      
      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }, [enabled]);

  // Memory Monitoring
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = Math.round(memory.usedJSHeapSize / 1048576); // MB
        setStats(prev => ({ ...prev, memoryUsage }));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [enabled]);

  // Error Monitoring
  useEffect(() => {
    if (!enabled) return;

    const errorHandler = (event: ErrorEvent) => {
      const errorMsg = `${event.error?.name || 'Error'}: ${event.message}`;
      setErrorLog(prev => [...prev.slice(-19), errorMsg]); // Keep last 20 errors
      setStats(prev => ({ 
        ...prev, 
        errorCount: prev.errorCount + 1,
        lastError: errorMsg
      }));
    };

    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const errorMsg = `Unhandled Promise: ${event.reason}`;
      setErrorLog(prev => [...prev.slice(-19), errorMsg]);
      setStats(prev => ({ 
        ...prev, 
        errorCount: prev.errorCount + 1,
        lastError: errorMsg
      }));
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
    };
  }, [enabled]);

  // Network Monitoring
  useEffect(() => {
    if (!enabled) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        setNetworkLog(prev => [...prev.slice(-19), {
          method: args[1]?.method || 'GET',
          url: args[0].toString(),
          status: response.status,
          time: Math.round(endTime - startTime)
        }]);
        
        setStats(prev => ({ ...prev, networkRequests: prev.networkRequests + 1 }));
        return response;
      } catch (error) {
        const endTime = performance.now();
        setNetworkLog(prev => [...prev.slice(-19), {
          method: args[1]?.method || 'GET',
          url: args[0].toString(),
          status: 0,
          time: Math.round(endTime - startTime)
        }]);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [enabled]);

  // Layout Shift Monitoring
  useEffect(() => {
    if (!enabled) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          setStats(prev => ({ 
            ...prev, 
            layoutShifts: prev.layoutShifts + (entry as any).value 
          }));
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    return () => observer.disconnect();
  }, [enabled]);

  // Component Render Count Tracking - FIXED: Remove infinite loop
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current += 1;
    setStats(prev => ({ ...prev, renderCount: renderCountRef.current }));
  }, [enabled]); // Only update when enabled changes

  if (!enabled) return null;

  const getBrowserName = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.warning) return 'text-yellow-500';
    return 'text-red-500';
  };

  const tabs = [
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'errors', label: 'Errors', icon: '❌' },
    { id: 'network', label: 'Network', icon: '🌐' },
    { id: 'browser', label: 'Browser', icon: '🔧' }
  ] as const;

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-[9999] bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg',
      'font-mono text-xs max-w-md',
      isMinimized ? 'w-48' : 'w-96'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-semibold">Debug Monitor</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="px-2 py-1 hover:bg-muted rounded text-xs"
          >
            {isMinimized ? '↗' : '↙'}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div className="flex border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={cn(
                  'flex-1 px-2 py-1 text-xs border-r last:border-r-0 hover:bg-muted',
                  selectedTab === tab.id ? 'bg-muted font-semibold' : ''
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-3 max-h-64 overflow-y-auto">
            {selectedTab === 'performance' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-muted-foreground">FPS</div>
                    <div className={getPerformanceColor(stats.fps, { good: 55, warning: 45 })}>
                      {stats.fps}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Memory (MB)</div>
                    <div className={getPerformanceColor(stats.memoryUsage, { good: 30, warning: 50 })}>
                      {stats.memoryUsage}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Layout Shifts</div>
                    <div className={getPerformanceColor(stats.layoutShifts, { good: 0.1, warning: 0.25 })}>
                      {stats.layoutShifts.toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Renders</div>
                    <div>{stats.renderCount}</div>
                  </div>
                </div>
                
                {budgetViolations.length > 0 && (
                  <div className="mt-3">
                    <div className="text-red-500 font-semibold mb-1">Performance Issues:</div>
                    {budgetViolations.map((violation, i) => (
                      <div key={i} className="text-red-400 text-xs">{violation}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'errors' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Errors: {stats.errorCount}</span>
                  <button 
                    onClick={() => { setErrorLog([]); setStats(prev => ({ ...prev, errorCount: 0 })); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {errorLog.length === 0 ? (
                    <div className="text-muted-foreground">No errors logged</div>
                  ) : (
                    errorLog.slice(-10).map((error, i) => (
                      <div key={i} className="text-red-400 break-all">{error}</div>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedTab === 'network' && (
              <div className="space-y-2">
                <div>Total Requests: {stats.networkRequests}</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {networkLog.slice(-10).map((req, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="truncate flex-1">{req.method} {req.url.split('/').pop()}</span>
                      <span className={req.status >= 400 ? 'text-red-400' : req.status >= 300 ? 'text-yellow-400' : 'text-green-400'}>
                        {req.status} ({req.time}ms)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'browser' && (
              <div className="space-y-2">
                <div>Browser: {getBrowserName()}</div>
                <div>Viewport: {stats.browserInfo.viewport.width}x{stats.browserInfo.viewport.height}</div>
                <div>DPR: {stats.browserInfo.devicePixelRatio}</div>
                {stats.browserInfo.connectionType && (
                  <div>Connection: {stats.browserInfo.connectionType}</div>
                )}
                <div>Posts: {state.posts.length}</div>
                <div>Loading: {state.loading.posts ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Minimized View */}
      {isMinimized && (
        <div className="p-2">
          <div className="flex justify-between text-xs">
            <span className={getPerformanceColor(stats.fps, { good: 55, warning: 45 })}>
              {stats.fps} FPS
            </span>
            <span className={getPerformanceColor(stats.memoryUsage, { good: 30, warning: 50 })}>
              {stats.memoryUsage}MB
            </span>
            {stats.errorCount > 0 && (
              <span className="text-red-500">{stats.errorCount} errors</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugOverlay;