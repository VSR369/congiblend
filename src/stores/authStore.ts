import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { useRef } from 'react';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

let authSubscription: any = null;
let isInitializing = false;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    if (isInitializing || get().isInitialized) {
      console.log('Auth already initializing or initialized, skipping...');
      return;
    }
    
    isInitializing = true;
    console.log('Initializing auth store...');
    
    try {
      set({ isLoading: true });
      
      // Clean up any existing subscription
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      
      // Set up SINGLE auth state listener
      authSubscription = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, !!session);
        
        // Add small delay to prevent rapid state changes causing navigation loops
        setTimeout(() => {
          set({
            session,
            user: session?.user ?? null,
            isAuthenticated: !!session,
            isLoading: false,
            isInitialized: true,
          });
        }, 10);
      });
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false, isInitialized: true });
    } finally {
      isInitializing = false;
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ isLoading: false });
    }
    
    return { error };
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true });
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      set({ isLoading: false });
    }
    
    return { error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      isAuthenticated: false,
    });
  },

  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: { ...currentUser, ...userData },
      });
    }
  },
}));