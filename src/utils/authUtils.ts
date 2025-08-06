import { supabase } from '@/integrations/supabase/client';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 5000   // 5 seconds
};

// Enhanced token management with automatic refresh
export class AuthManager {
  private static tokenRefreshPromise: Promise<string | null> | null = null;

  static async getValidToken(): Promise<string | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }

      if (!session) {
        console.log('No active session');
        return null;
      }

      // Check if token is about to expire (within 5 minutes)
      const now = Date.now() / 1000;
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;

      // If token expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 300) {
        console.log('Token expiring soon, refreshing...');
        return await this.refreshToken();
      }

      return session.access_token;
    } catch (error) {
      console.error('Error in getValidToken:', error);
      return null;
    }
  }

  static async refreshToken(): Promise<string | null> {
    // Prevent multiple concurrent refresh attempts
    if (this.tokenRefreshPromise) {
      return await this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this._doRefreshToken();
    
    try {
      const result = await this.tokenRefreshPromise;
      return result;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private static async _doRefreshToken(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing token:', error);
        return null;
      }

      if (!data.session) {
        console.error('No session after refresh');
        return null;
      }

      console.log('Token refreshed successfully');
      return data.session.access_token;
    } catch (error) {
      console.error('Error in refreshToken:', error);
      return null;
    }
  }
}

// Enhanced HTTP request wrapper with retry logic and token refresh
export async function makeAuthenticatedRequest<T>(
  requestFn: (token: string) => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay } = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Get a valid token (with automatic refresh if needed)
      const token = await AuthManager.getValidToken();
      
      if (!token) {
        throw new Error('No valid authentication token available');
      }

      // Execute the request
      return await requestFn(token);
      
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors unless it's a token expiry
      if (error.message?.includes('JWT') || error.message?.includes('401')) {
        console.log(`Auth error on attempt ${attempt + 1}, refreshing token...`);
        await AuthManager.refreshToken();
      } else if (attempt === maxRetries) {
        // Last attempt, don't retry
        break;
      }
      
      // Calculate delay with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        console.log(`Request failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Request failed after all retries');
}

// Utility for edge function calls with enhanced error handling
export async function invokeEdgeFunction(
  functionName: string,
  payload: any,
  options: { retries?: number } = {}
) {
  return makeAuthenticatedRequest(
    async (token) => {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        console.error(`Edge function ${functionName} error:`, error);
        throw error;
      }

      return data;
    },
    { maxRetries: options.retries || 2 }
  );
}