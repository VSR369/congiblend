interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'count' | 'memory' | 'size';
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private metadata: Map<string, Record<string, any>> = new Map();

  startTimer(name: string, metadata?: Record<string, any>) {
    this.timers.set(name, performance.now());
    if (metadata) {
      this.metadata.set(name, metadata);
    }
  }

  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    const metadata = this.metadata.get(name);
    
    this.addMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      type: 'timing',
      metadata
    });

    this.timers.delete(name);
    this.metadata.delete(name);
    
    return duration;
  }

  addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log performance issues
    if (metric.type === 'timing' && metric.value > 5000) {
      console.warn(`Slow operation detected: ${metric.name} took ${metric.value}ms`);
    }
  }

  getMetrics(type?: string, limit = 100): PerformanceMetric[] {
    let filtered = this.metrics;
    if (type) {
      filtered = this.metrics.filter(m => m.type === type);
    }
    return filtered.slice(-limit);
  }

  measureMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.addMetric({
        name: 'memory_usage',
        value: memory.usedJSHeapSize,
        timestamp: Date.now(),
        type: 'memory',
        metadata: {
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        }
      });
    }
  }

  measureBundleSize() {
    // Estimate bundle size by counting loaded scripts
    const scripts = document.querySelectorAll('script[src]') as NodeListOf<HTMLScriptElement>;
    let totalSize = 0;
    
    scripts.forEach(script => {
      // This is an approximation - in a real app you'd get actual sizes
      totalSize += script.src.length;
    });

    this.addMetric({
      name: 'estimated_bundle_size',
      value: totalSize,
      timestamp: Date.now(),
      type: 'size',
      metadata: { scriptCount: scripts.length }
    });
  }

  generateReport() {
    const timings = this.getMetrics('timing');
    const memory = this.getMetrics('memory');
    const errors = this.getMetrics('count');

    return {
      performance_summary: {
        avg_post_creation_time: this.calculateAverage(timings.filter(m => m.name === 'post_creation')),
        avg_page_load_time: this.calculateAverage(timings.filter(m => m.name === 'page_load')),
        avg_file_upload_time: this.calculateAverage(timings.filter(m => m.name === 'file_upload')),
        memory_usage_trend: memory.map(m => ({ timestamp: m.timestamp, value: m.value })),
        error_count: errors.filter(m => m.name === 'error').length,
        total_metrics: this.metrics.length
      },
      recent_timings: timings.slice(-10),
      performance_issues: timings.filter(m => m.value > 3000),
      memory_leaks: this.detectMemoryLeaks(memory)
    };
  }

  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  private detectMemoryLeaks(memory: PerformanceMetric[]): boolean {
    if (memory.length < 10) return false;
    
    const recent = memory.slice(-10);
    const growth = recent[recent.length - 1].value - recent[0].value;
    return growth > 10 * 1024 * 1024; // 10MB growth indicates potential leak
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Auto-measure memory every 30 seconds
setInterval(() => {
  performanceMonitor.measureMemoryUsage();
}, 30000);

// Measure bundle size on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    performanceMonitor.measureBundleSize();
    performanceMonitor.addMetric({
      name: 'page_load',
      value: performance.now(),
      timestamp: Date.now(),
      type: 'timing'
    });
  });
}
