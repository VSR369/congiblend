import { useEffect, useState } from 'react';

// Minimal performance tracking for essential metrics only
export const useSimplePerformance = (enabled: boolean = false) => {
  const [isEnabled] = useState(enabled);

  useEffect(() => {
    if (!isEnabled) return;

    // Basic FPS monitoring without overhead
    let frameCount = 0;
    let lastTime = performance.now();

    const trackFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 5000) { // Check every 5 seconds
        const fps = (frameCount * 1000) / (currentTime - lastTime);
        
        if (fps < 30) {
          console.warn(`Low FPS: ${Math.round(fps)}fps`);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(trackFPS);
    };

    const rafId = requestAnimationFrame(trackFPS);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isEnabled]);

  return {
    isMonitoring: isEnabled,
  };
};