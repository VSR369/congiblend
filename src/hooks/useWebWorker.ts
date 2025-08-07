import { useRef, useCallback, useEffect } from 'react';

interface WorkerTask {
  id: string;
  type: string;
  data: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

interface WorkerPoolOptions {
  maxWorkers?: number;
  workerScript?: string;
}

class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private workerBusy = new Set<number>();
  private maxWorkers: number;
  private workerScript: string;

  constructor(options: WorkerPoolOptions = {}) {
    this.maxWorkers = options.maxWorkers || Math.min(4, navigator.hardwareConcurrency || 2);
    this.workerScript = options.workerScript || '/workers/contentProcessor.js';
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(this.workerScript, { type: 'module' });
        
        worker.onmessage = (e) => {
          const { id, result, error } = e.data;
          const task = this.activeTasks.get(id);
          
          if (task) {
            this.activeTasks.delete(id);
            this.workerBusy.delete(i);
            
            if (error) {
              task.reject(new Error(error));
            } else {
              task.resolve(result);
            }
            
            // Process next task in queue
            this.processNextTask();
          }
        };
        
        worker.onerror = (error) => {
          console.error('Worker error:', error);
          // Find and reject all tasks for this worker
          for (const [taskId, task] of this.activeTasks.entries()) {
            if (this.activeTasks.has(taskId)) {
              task.reject(new Error('Worker error'));
              this.activeTasks.delete(taskId);
            }
          }
          this.workerBusy.delete(i);
        };
        
        this.workers[i] = worker;
      } catch (error) {
        console.warn('Failed to create worker:', error);
      }
    }
  }

  private processNextTask() {
    if (this.taskQueue.length === 0) return;
    
    const availableWorkerIndex = this.findAvailableWorker();
    if (availableWorkerIndex === -1) return;
    
    const task = this.taskQueue.shift()!;
    this.workerBusy.add(availableWorkerIndex);
    this.activeTasks.set(task.id, task);
    
    this.workers[availableWorkerIndex].postMessage({
      id: task.id,
      type: task.type,
      data: task.data,
    });
  }

  private findAvailableWorker(): number {
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workerBusy.has(i)) {
        return i;
      }
    }
    return -1;
  }

  execute<T = any>(type: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2);
      const task: WorkerTask = { id, type, data, resolve, reject };
      
      const availableWorkerIndex = this.findAvailableWorker();
      
      if (availableWorkerIndex !== -1) {
        // Execute immediately
        this.workerBusy.add(availableWorkerIndex);
        this.activeTasks.set(id, task);
        this.workers[availableWorkerIndex].postMessage({
          id: task.id,
          type: task.type,
          data: task.data,
        });
      } else {
        // Queue for later
        this.taskQueue.push(task);
      }
    });
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
    this.workerBusy.clear();
  }
}

let globalWorkerPool: WorkerPool | null = null;

export function useWebWorker(options: WorkerPoolOptions = {}) {
  const workerPoolRef = useRef<WorkerPool | null>(null);

  useEffect(() => {
    // Use global worker pool or create new one
    if (!globalWorkerPool) {
      globalWorkerPool = new WorkerPool(options);
    }
    workerPoolRef.current = globalWorkerPool;

    return () => {
      // Don't terminate global pool, just clean up reference
      workerPoolRef.current = null;
    };
  }, []);

  const execute = useCallback(async <T = any>(type: string, data: any): Promise<T> => {
    if (!workerPoolRef.current) {
      throw new Error('Worker pool not initialized');
    }
    
    return workerPoolRef.current.execute<T>(type, data);
  }, []);

  return { execute };
}

// Specific hooks for common tasks
export function useSearchWorker() {
  const { execute } = useWebWorker();
  
  const search = useCallback(async (query: string, items: any[]) => {
    return execute('search', { query, items });
  }, [execute]);
  
  return { search };
}

export function useFilterWorker() {
  const { execute } = useWebWorker();
  
  const filter = useCallback(async (items: any[], filters: any) => {
    return execute('filter', { items, filters });
  }, [execute]);
  
  return { filter };
}

export function useAnalyticsWorker() {
  const { execute } = useWebWorker();
  
  const calculateAnalytics = useCallback(async (posts: any[]) => {
    return execute('analytics', { posts });
  }, [execute]);
  
  return { calculateAnalytics };
}