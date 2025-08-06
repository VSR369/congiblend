
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';

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

// Simplified edge function calls using Supabase client directly
export async function invokeEdgeFunction(
  functionName: string,
  payload: any
) {
  const { session } = useAuthStore.getState();
  
  if (!session) {
    throw new Error('Authentication required for this operation');
  }

  // Use Supabase client directly - it handles auth automatically
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    console.error(`Edge function ${functionName} error:`, error);
    throw error;
  }

  return data;
}
