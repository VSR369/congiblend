
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  initialize: () => void;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

// Stable subscription management
let authSubscription: any = null;
let isInitializing = false;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  error: null,
  isInitialized: false,

  clearError: () => set({ error: null }),

  initialize: () => {
    // Prevent multiple initialization calls
    if (isInitializing || authSubscription) {
      console.log('Auth already initializing or initialized');
      return;
    }
    
    console.log('Initializing auth store...');
    isInitializing = true;
    set({ isLoading: true, error: null });

    try {
      // SINGLE source of truth - only use onAuthStateChange
      authSubscription = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        const user = session?.user ?? null;
        
        set({
          session,
          user,
          isLoading: false,
          error: null,
          isInitialized: true,
        });
        
        isInitializing = false;
      });

      // Handle subscription errors
      if (!authSubscription) {
        throw new Error('Failed to create auth subscription');
      }

    } catch (error: any) {
      console.error('Auth initialization error:', error);
      set({ 
        error: error.message || 'Auth initialization failed',
        isLoading: false,
        isInitialized: true,
      });
      isInitializing = false;
    }
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
      console.log('Signing out...');
      
      // Clean up subscription first
      if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
      }
      
      // Reset initialization flags
      isInitializing = false;
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Reset state immediately for faster UI response
      set({
        user: null,
        session: null,
        isLoading: false,
        error: null,
        isInitialized: true,
      });
      
    } catch (error: any) {
      console.error('Sign out error:', error);
      set({ error: error.message || 'Sign out failed' });
    }
  },
}));
