// Browser Testing Utilities for Flickering Detection

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  timestamp: number;
  browser: string;
  metrics?: Record<string, number>;
}

interface BrowserTestSuite {
  runAllTests: () => Promise<TestResult[]>;
  runFlickerTests: () => Promise<TestResult[]>;
  runPerformanceTests: () => Promise<TestResult[]>;
  runCompatibilityTests: () => Promise<TestResult[]>;
  generateReport: (results: TestResult[]) => string;
}

const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  return browser;
};

const measureLayoutStability = (): Promise<number> => {
  return new Promise((resolve) => {
    let cls = 0;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          cls += (entry as any).value;
        }
      }
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
    
    setTimeout(() => {
      observer.disconnect();
      resolve(cls);
    }, 5000);
  });
};

const measureFPS = (): Promise<number> => {
  return new Promise((resolve) => {
    let frameCount = 0;
    const startTime = performance.now();
    
    const countFrames = () => {
      frameCount++;
      const elapsed = performance.now() - startTime;
      
      if (elapsed >= 1000) {
        resolve(Math.round(frameCount));
      } else {
        requestAnimationFrame(countFrames);
      }
    };
    
    requestAnimationFrame(countFrames);
  });
};

const measureMemoryUsage = (): number => {
  const memory = (performance as any).memory;
  return memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0;
};

const testScrollPerformance = (): Promise<{ fps: number; dropped: number }> => {
  return new Promise((resolve) => {
    let frameCount = 0;
    let droppedFrames = 0;
    let lastFrameTime = performance.now();
    
    const container = document.querySelector('.content-feed') || document.body;
    const startScrollTop = container.scrollTop;
    
    const measureFrame = () => {
      const currentTime = performance.now();
      const frameDuration = currentTime - lastFrameTime;
      
      frameCount++;
      if (frameDuration > 20) { // Dropped frame threshold (50fps)
        droppedFrames++;
      }
      
      lastFrameTime = currentTime;
      
      if (frameCount < 60) { // Test for 1 second
        requestAnimationFrame(measureFrame);
      } else {
        // Restore scroll position
        container.scrollTop = startScrollTop;
        resolve({ fps: 60 - droppedFrames, dropped: droppedFrames });
      }
    };
    
    // Start smooth scroll test
    container.scrollBy({ top: 1000, behavior: 'smooth' });
    requestAnimationFrame(measureFrame);
  });
};

const testImageLoading = (): Promise<{ loadTime: number; failures: number }> => {
  return new Promise((resolve) => {
    const images = document.querySelectorAll('img');
    const startTime = performance.now();
    let loadedCount = 0;
    let failureCount = 0;
    
    if (images.length === 0) {
      resolve({ loadTime: 0, failures: 0 });
      return;
    }
    
    const checkComplete = () => {
      if (loadedCount + failureCount === images.length) {
        resolve({
          loadTime: performance.now() - startTime,
          failures: failureCount
        });
      }
    };
    
    images.forEach(img => {
      if (img.complete) {
        loadedCount++;
      } else {
        img.addEventListener('load', () => {
          loadedCount++;
          checkComplete();
        });
        
        img.addEventListener('error', () => {
          failureCount++;
          checkComplete();
        });
      }
    });
    
    checkComplete();
  });
};

const createBrowserTestSuite = (): BrowserTestSuite => {
  const browser = getBrowserInfo();
  
  return {
    async runFlickerTests() {
      const results: TestResult[] = [];
      
      // Test 1: Layout Stability
      const cls = await measureLayoutStability();
      results.push({
        testName: 'Layout Stability (CLS)',
        passed: cls < 0.1,
        message: `Cumulative Layout Shift: ${cls.toFixed(3)} (target: < 0.1)`,
        timestamp: Date.now(),
        browser,
        metrics: { cls }
      });
      
      // Test 2: Scroll Performance
      const scrollPerf = await testScrollPerformance();
      results.push({
        testName: 'Scroll Performance',
        passed: scrollPerf.fps >= 50,
        message: `Scroll FPS: ${scrollPerf.fps}, Dropped frames: ${scrollPerf.dropped}`,
        timestamp: Date.now(),
        browser,
        metrics: { fps: scrollPerf.fps, droppedFrames: scrollPerf.dropped }
      });
      
      // Test 3: Image Loading
      const imagePerf = await testImageLoading();
      results.push({
        testName: 'Image Loading Performance',
        passed: imagePerf.failures === 0 && imagePerf.loadTime < 3000,
        message: `Load time: ${imagePerf.loadTime.toFixed(0)}ms, Failures: ${imagePerf.failures}`,
        timestamp: Date.now(),
        browser,
        metrics: { loadTime: imagePerf.loadTime, failures: imagePerf.failures }
      });
      
      return results;
    },
    
    async runPerformanceTests() {
      const results: TestResult[] = [];
      
      // Test 1: FPS Measurement
      const fps = await measureFPS();
      results.push({
        testName: 'Frame Rate',
        passed: fps >= 55,
        message: `FPS: ${fps} (target: >= 55)`,
        timestamp: Date.now(),
        browser,
        metrics: { fps }
      });
      
      // Test 2: Memory Usage
      const memory = measureMemoryUsage();
      results.push({
        testName: 'Memory Usage',
        passed: memory < 100,
        message: `Memory: ${memory}MB (target: < 100MB)`,
        timestamp: Date.now(),
        browser,
        metrics: { memory }
      });
      
      // Test 3: DOM Size
      const domNodes = document.querySelectorAll('*').length;
      results.push({
        testName: 'DOM Complexity',
        passed: domNodes < 2000,
        message: `DOM nodes: ${domNodes} (target: < 2000)`,
        timestamp: Date.now(),
        browser,
        metrics: { domNodes }
      });
      
      return results;
    },
    
    async runCompatibilityTests() {
      const results: TestResult[] = [];
      
      // Test 1: CSS Grid Support
      const supportsGrid = CSS.supports('display', 'grid');
      results.push({
        testName: 'CSS Grid Support',
        passed: supportsGrid,
        message: supportsGrid ? 'CSS Grid supported' : 'CSS Grid not supported',
        timestamp: Date.now(),
        browser
      });
      
      // Test 2: Intersection Observer
      const supportsIO = 'IntersectionObserver' in window;
      results.push({
        testName: 'Intersection Observer Support',
        passed: supportsIO,
        message: supportsIO ? 'Intersection Observer supported' : 'Intersection Observer not supported',
        timestamp: Date.now(),
        browser
      });
      
      // Test 3: Performance API
      const supportsPerf = 'PerformanceObserver' in window;
      results.push({
        testName: 'Performance API Support',
        passed: supportsPerf,
        message: supportsPerf ? 'Performance API supported' : 'Performance API not supported',
        timestamp: Date.now(),
        browser
      });
      
      // Test 4: Local Storage
      let supportsLS = false;
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        supportsLS = true;
      } catch {
        supportsLS = false;
      }
      
      results.push({
        testName: 'Local Storage Support',
        passed: supportsLS,
        message: supportsLS ? 'Local Storage supported' : 'Local Storage not supported',
        timestamp: Date.now(),
        browser
      });
      
      return results;
    },
    
    async runAllTests() {
      const flickerTests = await this.runFlickerTests();
      const performanceTests = await this.runPerformanceTests();
      const compatibilityTests = await this.runCompatibilityTests();
      
      return [...flickerTests, ...performanceTests, ...compatibilityTests];
    },
    
    generateReport(results: TestResult[]) {
      const passed = results.filter(r => r.passed).length;
      const total = results.length;
      const score = Math.round((passed / total) * 100);
      
      let report = `# Browser Test Report\n\n`;
      report += `**Browser:** ${browser}\n`;
      report += `**Timestamp:** ${new Date().toISOString()}\n`;
      report += `**Score:** ${score}% (${passed}/${total} tests passed)\n\n`;
      
      // Group by category
      const categories = {
        'Flicker Tests': results.filter(r => r.testName.includes('Layout') || r.testName.includes('Scroll') || r.testName.includes('Image')),
        'Performance Tests': results.filter(r => r.testName.includes('Frame') || r.testName.includes('Memory') || r.testName.includes('DOM')),
        'Compatibility Tests': results.filter(r => r.testName.includes('Support'))
      };
      
      for (const [category, tests] of Object.entries(categories)) {
        report += `## ${category}\n\n`;
        
        for (const test of tests) {
          const status = test.passed ? '✅' : '❌';
          report += `${status} **${test.testName}**: ${test.message}\n`;
        }
        
        report += '\n';
      }
      
      // Recommendations
      const failedTests = results.filter(r => !r.passed);
      if (failedTests.length > 0) {
        report += `## Recommendations\n\n`;
        
        for (const test of failedTests) {
          if (test.testName.includes('Layout')) {
            report += `- Reduce layout shifts by setting explicit dimensions for dynamic content\n`;
          }
          if (test.testName.includes('Frame')) {
            report += `- Optimize animations and reduce DOM complexity for better frame rates\n`;
          }
          if (test.testName.includes('Memory')) {
            report += `- Implement memory cleanup and reduce memory-intensive operations\n`;
          }
          if (test.testName.includes('Support')) {
            report += `- Implement fallbacks for unsupported browser features\n`;
          }
        }
      }
      
      return report;
    }
  };
};

// Global test runner
export const runBrowserTests = async () => {
  const testSuite = createBrowserTestSuite();
  const results = await testSuite.runAllTests();
  const report = testSuite.generateReport(results);
  
  console.group('🧪 Browser Test Results');
  console.log(report);
  console.table(results);
  console.groupEnd();
  
  return { results, report };
};

// Automated flickering detection
export const startFlickerMonitoring = () => {
  console.log('🔍 Starting flicker monitoring...');
  
  let flickerCount = 0;
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'layout-shift' && (entry as any).value > 0.1) {
        flickerCount++;
        console.warn(`⚠️ Flicker detected! CLS: ${(entry as any).value.toFixed(3)} (total: ${flickerCount})`);
      }
    }
  });
  
  observer.observe({ entryTypes: ['layout-shift'] });
  
  return () => {
    observer.disconnect();
    console.log(`✅ Flicker monitoring stopped. Total flickers detected: ${flickerCount}`);
  };
};

export default createBrowserTestSuite;