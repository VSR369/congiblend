
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// Single subscription and initialization ref
let authSubscription: any = null;
let isInitializing = false;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  initialize: () => {
    // Prevent multiple initialization calls
    if (isInitializing || authSubscription) {
      return;
    }
    
    isInitializing = true;
    set({ isLoading: true, error: null });

    // Single auth state listener - Supabase handles everything
    authSubscription = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      
      set({
        session,
        user,
        isLoading: false,
        error: null,
      });
      
      isInitializing = false;
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        set({ 
          error: error.message,
          isLoading: false,
          user: null,
          session: null,
        });
        isInitializing = false;
        return;
      }

      const user = session?.user ?? null;
      set({
        session,
        user,
        isLoading: false,
        error: null,
      });
      isInitializing = false;
    });
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ 
          error: error.message,
          isLoading: false 
        });
        return { error };
      }

      // Auth state change will handle the rest
      return { error: null };
      
    } catch (error: any) {
      const errorMessage = error.message || 'Sign in failed';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      return { error: { message: errorMessage } };
    }
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        set({ 
          error: error.message,
          isLoading: false 
        });
        return { error };
      }

      // Auth state change will handle the rest
      return { error: null };
      
    } catch (error: any) {
      const errorMessage = error.message || 'Sign up failed';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      return { error: { message: errorMessage } };
    }
  },

  signOut: async () => {
    try {
      // Clean up subscription
      if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
      }
      
      isInitializing = false;
      await supabase.auth.signOut();
      
      // Auth state change will handle state reset
    } catch (error: any) {
      console.error('Sign out error:', error);
      set({ error: error.message || 'Sign out failed' });
    }
  },
}));
