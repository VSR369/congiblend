import { useRef, useCallback, useEffect, useState } from 'react';

// Rendering Queue Manager for Batching Updates
class RenderQueueManager {
  private static instance: RenderQueueManager;
  private queue = new Set<string>();
  private callbacks = new Map<string, () => void>();
  private frameId: number | null = null;
  private isProcessing = false;

  static getInstance(): RenderQueueManager {
    if (!RenderQueueManager.instance) {
      RenderQueueManager.instance = new RenderQueueManager();
    }
    return RenderQueueManager.instance;
  }

  // Add component to render queue
  add(componentId: string, callback?: () => void): void {
    this.queue.add(componentId);
    
    if (callback) {
      this.callbacks.set(componentId, callback);
    }

    this.scheduleProcess();
  }

  // Remove component from queue
  remove(componentId: string): void {
    this.queue.delete(componentId);
    this.callbacks.delete(componentId);
  }

  // Schedule processing on next frame
  private scheduleProcess(): void {
    if (this.frameId || this.isProcessing) return;

    this.frameId = requestAnimationFrame(() => {
      this.process();
    });
  }

  // Process the queue
  private process(): void {
    this.isProcessing = true;
    this.frameId = null;

    // Process in batches to avoid blocking
    const batchSize = 10;
    const items = Array.from(this.queue).slice(0, batchSize);

    for (const componentId of items) {
      const callback = this.callbacks.get(componentId);
      
      try {
        callback?.();
      } catch (error) {
        console.error(`Render queue error for ${componentId}:`, error);
      }

      this.queue.delete(componentId);
      this.callbacks.delete(componentId);
    }

    this.isProcessing = false;

    // Schedule next batch if queue not empty
    if (this.queue.size > 0) {
      this.scheduleProcess();
    }
  }

  // Get queue size for debugging
  getQueueSize(): number {
    return this.queue.size;
  }

  // Clear all pending renders
  clear(): void {
    this.queue.clear();
    this.callbacks.clear();
    
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}

// Hook for using the render queue
export const useRenderQueue = () => {
  const queueManager = useRef(RenderQueueManager.getInstance());
  const componentId = useRef(`component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Queue a render for this component
  const queueRender = useCallback((callback?: () => void) => {
    queueManager.current.add(componentId.current, callback);
  }, []);

  // Remove this component from queue on unmount
  useEffect(() => {
    return () => {
      queueManager.current.remove(componentId.current);
    };
  }, []);

  return {
    queueRender,
    queueSize: queueManager.current.getQueueSize(),
    clearQueue: () => queueManager.current.clear(),
  };
};

// Batch state updates hook
export const useBatchedUpdates = <T>(
  initialState: T,
  updateDelay: number = 16 // ~60fps
) => {
  const [state, setState] = useState(initialState);
  const pendingUpdates = useRef<Partial<T>[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdates.current.push(updates);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (pendingUpdates.current.length > 0) {
        // Merge all pending updates
        const mergedUpdates = pendingUpdates.current.reduce(
          (acc, update) => ({ ...acc, ...update }),
          {}
        );

        setState(prev => ({ ...prev, ...mergedUpdates }));
        pendingUpdates.current = [];
      }
    }, updateDelay);
  }, [updateDelay]);

  // Immediate update (bypass batching)
  const immediateUpdate = useCallback((updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    batchUpdate,
    immediateUpdate,
    hasPendingUpdates: pendingUpdates.current.length > 0,
  };
};

// Performance-optimized state updater
export const useOptimizedState = <T>(initialState: T) => {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const updateQueue = useRef<((prev: T) => T)[]>([]);

  // Update ref when state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Batched state update
  const updateState = useCallback((updater: ((prev: T) => T) | T) => {
    const updateFn = typeof updater === 'function' 
      ? updater as (prev: T) => T
      : () => updater;

    updateQueue.current.push(updateFn);

    // Process queue on next tick
    Promise.resolve().then(() => {
      if (updateQueue.current.length === 0) return;

      const updates = updateQueue.current.splice(0);
      
      setState(currentState => {
        let newState = currentState;
        
        for (const update of updates) {
          newState = update(newState);
        }
        
        return newState;
      });
    });
  }, []);

  // Get current state without causing re-render
  const getCurrentState = useCallback(() => stateRef.current, []);

  return {
    state,
    updateState,
    getCurrentState,
  };
};