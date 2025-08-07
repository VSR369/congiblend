import { useEffect, useState, useCallback } from 'react';

interface BrowserInfo {
  name: string;
  version: string;
  isMobile: boolean;
  isTablet: boolean;
  supportsCSSGrid: boolean;
  supportsIntersectionObserver: boolean;
  supportsWebGL: boolean;
  deviceMemory?: number;
  hardwareConcurrency: number;
  connectionType?: string;
}

interface OptimizationSettings {
  enableVirtualScrolling: boolean;
  enableImageLazyLoading: boolean;
  enableAnimations: boolean;
  useHighPerformanceMode: boolean;
  debounceDelay: number;
  intersectionThreshold: number;
  maxConcurrentImages: number;
}

const getBrowserInfo = (): BrowserInfo => {
  const ua = navigator.userAgent;
  
  let browserName = 'Unknown';
  let browserVersion = '';
  
  // Detect browser
  if (ua.includes('Chrome')) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Firefox')) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Edge')) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edge\/(\d+)/)?.[1] || '';
  }

  // Detect device type
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?=.*Mobile)/i.test(ua) && window.innerWidth > 768;

  // Feature detection
  const supportsCSSGrid = CSS.supports('display', 'grid');
  const supportsIntersectionObserver = 'IntersectionObserver' in window;
  const supportsWebGL = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  })();

  return {
    name: browserName,
    version: browserVersion,
    isMobile,
    isTablet,
    supportsCSSGrid,
    supportsIntersectionObserver,
    supportsWebGL,
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    connectionType: (navigator as any).connection?.effectiveType
  };
};

const getOptimalSettings = (browserInfo: BrowserInfo): OptimizationSettings => {
  const isLowEndDevice = 
    browserInfo.deviceMemory !== undefined && browserInfo.deviceMemory <= 4 ||
    browserInfo.hardwareConcurrency <= 2 ||
    browserInfo.connectionType === 'slow-2g' ||
    browserInfo.connectionType === '2g';

  const isOldBrowser = 
    (browserInfo.name === 'Chrome' && parseInt(browserInfo.version) < 90) ||
    (browserInfo.name === 'Firefox' && parseInt(browserInfo.version) < 88) ||
    (browserInfo.name === 'Safari' && parseInt(browserInfo.version) < 14);

  return {
    enableVirtualScrolling: !isLowEndDevice && browserInfo.supportsIntersectionObserver,
    enableImageLazyLoading: browserInfo.supportsIntersectionObserver,
    enableAnimations: !isLowEndDevice && !browserInfo.isMobile,
    useHighPerformanceMode: isLowEndDevice || isOldBrowser,
    debounceDelay: isLowEndDevice ? 500 : browserInfo.isMobile ? 300 : 150,
    intersectionThreshold: isLowEndDevice ? 0.5 : 0.1,
    maxConcurrentImages: isLowEndDevice ? 3 : browserInfo.isMobile ? 6 : 10
  };
};

export const useBrowserOptimization = () => {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>(() => getBrowserInfo());
  const [settings, setSettings] = useState<OptimizationSettings>(() => getOptimalSettings(getBrowserInfo()));
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'high' | 'low'>('auto');

  // Monitor device performance
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const checkPerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = (frameCount * 1000) / (currentTime - lastTime);
        frameCount = 0;
        lastTime = currentTime;
        
        // Auto-adjust settings based on performance
        if (performanceMode === 'auto') {
          setSettings(prev => ({
            ...prev,
            enableAnimations: fps > 45,
            useHighPerformanceMode: fps < 30,
            debounceDelay: fps < 30 ? 500 : fps < 45 ? 300 : 150
          }));
        }
      }
      
      requestAnimationFrame(checkPerformance);
    };
    
    requestAnimationFrame(checkPerformance);
  }, [performanceMode]);

  // Apply CSS optimizations based on browser
  useEffect(() => {
    const root = document.documentElement;
    
    // Browser-specific optimizations
    if (browserInfo.name === 'Safari') {
      root.style.setProperty('--webkit-transform', 'translateZ(0)');
      root.style.setProperty('--webkit-backface-visibility', 'hidden');
    }
    
    if (browserInfo.isMobile) {
      root.style.setProperty('--mobile-scroll-behavior', 'smooth');
      root.style.setProperty('--mobile-overflow-scrolling', 'touch');
    }
    
    // Performance mode CSS
    if (settings.useHighPerformanceMode) {
      root.classList.add('high-performance-mode');
    } else {
      root.classList.remove('high-performance-mode');
    }
    
    // Animation settings
    if (!settings.enableAnimations) {
      root.style.setProperty('--animation-duration', '0s');
      root.style.setProperty('--transition-duration', '0s');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }
  }, [browserInfo, settings]);

  // Memory management
  const optimizeMemory = useCallback(() => {
    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
    
    // Clear unused images
    const images = document.querySelectorAll('img[data-lazy="loaded"]');
    images.forEach((img: HTMLImageElement) => {
      const rect = img.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight + 1000 && rect.bottom > -1000;
      
      if (!isVisible && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });
  }, []);

  // Throttle expensive operations
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay?: number
  ): T => {
    let timeoutId: NodeJS.Timeout;
    let lastExecTime = 0;
    
    return ((...args: any[]) => {
      const currentTime = Date.now();
      const timeSinceLastExec = currentTime - lastExecTime;
      const throttleDelay = delay || settings.debounceDelay;
      
      if (timeSinceLastExec > throttleDelay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, throttleDelay - timeSinceLastExec);
      }
    }) as T;
  }, [settings.debounceDelay]);

  // Batch DOM updates
  const batchDOMUpdates = useCallback((updates: (() => void)[]) => {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }, []);

  // Force performance mode
  const forcePerformanceMode = useCallback((mode: 'auto' | 'high' | 'low') => {
    setPerformanceMode(mode);
    
    if (mode === 'high') {
      setSettings(prev => ({
        ...prev,
        enableAnimations: false,
        useHighPerformanceMode: true,
        debounceDelay: 500,
        maxConcurrentImages: 3
      }));
    } else if (mode === 'low') {
      setSettings(prev => ({
        ...prev,
        enableAnimations: true,
        useHighPerformanceMode: false,
        debounceDelay: 100,
        maxConcurrentImages: 15
      }));
    } else {
      setSettings(getOptimalSettings(browserInfo));
    }
  }, [browserInfo]);

  return {
    browserInfo,
    settings,
    performanceMode,
    optimizeMemory,
    throttle,
    batchDOMUpdates,
    setPerformanceMode: forcePerformanceMode
  };
};