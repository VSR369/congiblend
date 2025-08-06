// Client-side profile caching utility for performance optimization
interface CachedProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_verified: boolean;
  cached_at: number;
}

class ProfileCache {
  private cache = new Map<string, CachedProfile>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  set(profile: any): void {
    this.cache.set(profile.id, {
      id: profile.id,
      username: profile.username || '',
      display_name: profile.display_name || '',
      avatar_url: profile.avatar_url,
      is_verified: profile.is_verified || false,
      cached_at: Date.now()
    });
  }

  get(userId: string): CachedProfile | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() - cached.cached_at > this.CACHE_DURATION) {
      this.cache.delete(userId);
      return null;
    }
    
    return cached;
  }

  setMultiple(profiles: any[]): void {
    const now = Date.now();
    profiles.forEach(profile => {
      this.cache.set(profile.id, {
        id: profile.id,
        username: profile.username || '',
        display_name: profile.display_name || '',
        avatar_url: profile.avatar_url,
        is_verified: profile.is_verified || false,
        cached_at: now
      });
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.cached_at > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache size for monitoring
  size(): number {
    return this.cache.size;
  }
}

export const profileCache = new ProfileCache();

// Auto-cleanup every 10 minutes
setInterval(() => {
  profileCache.cleanup();
}, 10 * 60 * 1000);