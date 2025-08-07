import React, { memo, useRef, useLayoutEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface StableContainerProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: number;
  preserveAspectRatio?: boolean;
  aspectRatio?: string;
  id?: string;
  onResize?: (dimensions: { width: number; height: number }) => void;
}

// Stable Container Component with Fixed Dimensions
const StableContainer = memo(React.forwardRef<HTMLDivElement, StableContainerProps>(({
  children,
  className,
  minHeight = 0,
  preserveAspectRatio = false,
  aspectRatio = '1/1',
  id,
  onResize
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Initialize ResizeObserver for stable dimension tracking
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // Create ResizeObserver for efficient dimension tracking
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Only update if dimensions actually changed
        setDimensions(prev => {
          if (prev.width === width && prev.height === height) {
            return prev;
          }
          
          const newDimensions = { width, height };
          onResize?.(newDimensions);
          return newDimensions;
        });
      }
    });

    resizeObserverRef.current.observe(element);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [onResize]);

  // Stable styles to prevent layout shifts
  const stableStyles = {
    minHeight: `${minHeight}px`,
    aspectRatio: preserveAspectRatio ? aspectRatio : undefined,
    containIntrinsicSize: dimensions.width > 0 && dimensions.height > 0 
      ? `${dimensions.width}px ${dimensions.height}px` 
      : 'none',
  };

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      id={id}
      className={cn(
        // Base stable container styles
        'stable-container',
        'relative',
        // Remove overflow:hidden to allow comments expansion
        // Remove CSS containment that causes overlapping
        // Prevent layout shifts
        'will-change-auto',
        className
      )}
      style={stableStyles}
    >
      {children}
    </div>
  );
}));

StableContainer.displayName = 'StableContainer';

export { StableContainer };