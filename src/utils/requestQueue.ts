// Request queuing and deduplication for performance optimization
interface QueuedRequest {
  id: string;
  promise: Promise<any>;
  timestamp: number;
}

class RequestQueue {
  private queue = new Map<string, QueuedRequest>();
  private readonly DEDUP_TIMEOUT = 1000; // 1 second

  // Deduplicate requests with same key
  async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    const existing = this.queue.get(key);
    
    if (existing && Date.now() - existing.timestamp < this.DEDUP_TIMEOUT) {
      console.log(`Deduplicating request: ${key}`);
      return existing.promise as Promise<T>;
    }

    const promise = requestFn();
    this.queue.set(key, {
      id: key,
      promise,
      timestamp: Date.now()
    });

    try {
      const result = await promise;
      this.queue.delete(key);
      return result;
    } catch (error) {
      this.queue.delete(key);
      throw error;
    }
  }

  // Batch multiple requests
  async batchRequests<T>(requests: Array<{ key: string; fn: () => Promise<T> }>): Promise<T[]> {
    const promises = requests.map(req => 
      this.deduplicateRequest(req.key, req.fn)
    );
    return Promise.all(promises);
  }

  // Clear expired requests
  cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.queue.entries()) {
      if (now - request.timestamp > this.DEDUP_TIMEOUT * 2) {
        this.queue.delete(key);
      }
    }
  }

  size(): number {
    return this.queue.size;
  }
}

export const requestQueue = new RequestQueue();

// Auto-cleanup every 30 seconds
setInterval(() => {
  requestQueue.cleanup();
}, 30000);