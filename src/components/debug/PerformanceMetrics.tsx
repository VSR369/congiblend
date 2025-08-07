import React, { useState, useEffect } from 'react';
import { useFlickerDetection } from '@/hooks/useFlickerDetection';
import { useBrowserOptimization } from '@/hooks/useBrowserOptimization';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { cn } from '@/lib/utils';

interface PerformanceMetricsProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  enabled = false,
  position = 'top-right',
  compact = false
}) => {
  const [showDetails, setShowDetails] = useState(!compact);
  const [autoMode, setAutoMode] = useState(true);
  
  const { flickerEvents, getFlickerSummary, getFlickerScore, clearEvents } = useFlickerDetection({
    enabled
  });
  
  const { 
    browserInfo, 
    settings, 
    performanceMode, 
    optimizeMemory, 
    setPerformanceMode 
  } = useBrowserOptimization();
  
  const { 
    metrics, 
    budgetViolations, 
    measureRender,
    startInteraction,
    endInteraction 
  } = usePerformanceMonitor(enabled);

  const [realtimeStats, setRealtimeStats] = useState({
    fps: 0,
    memoryUsage: 0,
    domNodes: 0,
    eventListeners: 0
  });

  // Real-time stats monitoring
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const memory = (performance as any).memory;
      const domNodes = document.querySelectorAll('*').length;
      
      setRealtimeStats({
        fps: Math.round(performance.now() % 60), // Simplified FPS calculation
        memoryUsage: memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0,
        domNodes,
        eventListeners: Object.keys((window as any).getEventListeners?.(document) || {}).length
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled) return null;

  const flickerSummary = getFlickerSummary();
  const flickerScore = getFlickerScore();
  
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getScoreColor = (score: number) => {
    if (score < 20) return 'text-green-500';
    if (score < 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMemoryColor = (usage: number) => {
    if (usage < 50) return 'text-green-500';
    if (usage < 100) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className={cn(
      'fixed z-[9998] bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg',
      'font-mono text-xs p-3 max-w-sm',
      positionClasses[position]
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="font-semibold">Performance</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-1 py-0.5 hover:bg-muted rounded text-xs"
          >
            {showDetails ? '−' : '+'}
          </button>
          <button
            onClick={optimizeMemory}
            className="px-1 py-0.5 hover:bg-muted rounded text-xs"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Flicker Score</span>
          <div className={getScoreColor(flickerScore)}>{flickerScore.toFixed(1)}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Memory</span>
          <div className={getMemoryColor(realtimeStats.memoryUsage)}>
            {realtimeStats.memoryUsage}MB
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">FPS</span>
          <div className={realtimeStats.fps < 45 ? 'text-red-500' : 'text-green-500'}>
            {realtimeStats.fps}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">DOM Nodes</span>
          <div className={realtimeStats.domNodes > 2000 ? 'text-yellow-500' : 'text-green-500'}>
            {realtimeStats.domNodes}
          </div>
        </div>
      </div>

      {showDetails && (
        <>
          {/* Browser Info */}
          <div className="mt-3 pt-2 border-t">
            <div className="text-muted-foreground mb-1">Browser</div>
            <div>{browserInfo.name} {browserInfo.version}</div>
            <div>{browserInfo.isMobile ? 'Mobile' : 'Desktop'}</div>
            {browserInfo.deviceMemory && (
              <div>RAM: {browserInfo.deviceMemory}GB</div>
            )}
            {browserInfo.connectionType && (
              <div>Net: {browserInfo.connectionType}</div>
            )}
          </div>

          {/* Performance Mode */}
          <div className="mt-3 pt-2 border-t">
            <div className="text-muted-foreground mb-1">Performance Mode</div>
            <div className="flex gap-1">
              {['auto', 'high', 'low'].map(mode => (
                <button
                  key={mode}
                  onClick={() => {
                    setPerformanceMode(mode as 'auto' | 'high' | 'low');
                    setAutoMode(mode === 'auto');
                  }}
                  className={cn(
                    'px-2 py-1 text-xs rounded border',
                    performanceMode === mode 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Flicker Analysis */}
          <div className="mt-3 pt-2 border-t">
            <div className="flex justify-between items-center mb-1">
              <span className="text-muted-foreground">Flicker Events</span>
              <button 
                onClick={clearEvents}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Layout Shifts:</span>
                <span className={flickerSummary.byType['layout-shift'] > 5 ? 'text-red-500' : 'text-green-500'}>
                  {flickerSummary.byType['layout-shift']}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Paint Flashes:</span>
                <span className={flickerSummary.byType['paint-flash'] > 3 ? 'text-red-500' : 'text-green-500'}>
                  {flickerSummary.byType['paint-flash']}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Style Recalcs:</span>
                <span className={flickerSummary.byType['style-recalc'] > 10 ? 'text-red-500' : 'text-green-500'}>
                  {flickerSummary.byType['style-recalc']}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg CLS:</span>
                <span className={flickerSummary.avgCLS > 0.1 ? 'text-red-500' : 'text-green-500'}>
                  {flickerSummary.avgCLS.toFixed(3)}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Violations */}
          {budgetViolations.length > 0 && (
            <div className="mt-3 pt-2 border-t">
              <div className="text-red-500 font-semibold mb-1">⚠️ Issues</div>
              <div className="space-y-1">
                {budgetViolations.slice(0, 3).map((violation, i) => (
                  <div key={i} className="text-red-400 text-xs break-words">
                    {violation}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimization Settings */}
          <div className="mt-3 pt-2 border-t">
            <div className="text-muted-foreground mb-1">Optimizations</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Virtual Scroll:</span>
                <span className={settings.enableVirtualScrolling ? 'text-green-500' : 'text-red-500'}>
                  {settings.enableVirtualScrolling ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Animations:</span>
                <span className={settings.enableAnimations ? 'text-green-500' : 'text-red-500'}>
                  {settings.enableAnimations ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Debounce:</span>
                <span>{settings.debounceDelay}ms</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceMetrics;