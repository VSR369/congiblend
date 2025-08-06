
import { useAuthStore } from '@/stores/authStore';

// Simplified authenticated request wrapper using AuthStore session
export async function makeAuthenticatedRequest<T>(
  requestFn: (token: string) => Promise<T>
): Promise<T> {
  const { session } = useAuthStore.getState();
  
  if (!session?.access_token) {
    throw new Error('No valid authentication token available');
  }

  return await requestFn(session.access_token);
}

// Simplified edge function calls using AuthStore session
export async function invokeEdgeFunction(
  functionName: string,
  payload: any,
  options: { retries?: number } = {}
) {
  const { session } = useAuthStore.getState();
  
  if (!session?.access_token) {
    throw new Error('Authentication required for this operation');
  }

  const { supabase } = await import('@/integrations/supabase/client');
  
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    console.error(`Edge function ${functionName} error:`, error);
    throw error;
  }

  return data;
}
