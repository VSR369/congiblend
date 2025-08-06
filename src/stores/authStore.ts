
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
}

let authSubscription: any = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
      error: null,

      clearError: () => set({ error: null }),

      initialize: async () => {
        const state = get();
        
        if (state.isInitialized) {
          console.log('Auth already initialized');
          set({ isLoading: false });
          return;
        }

        console.log('Starting auth initialization...');
        
        try {
          set({ isLoading: true, error: null });

          // Clean up any existing subscription
          if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
          }

          // Get initial session first
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting initial session:', error);
            set({ 
              error: error.message,
              isLoading: false,
              isInitialized: true,
              user: null,
              session: null,
              isAuthenticated: false
            });
            return;
          }

          // Set initial state
          const initialUser = session?.user ?? null;
          const initialIsAuth = !!session?.user;

          set({
            session,
            user: initialUser,
            isAuthenticated: initialIsAuth,
            isLoading: false,
            isInitialized: true,
            error: null,
          });

          console.log('Initial auth state set. Authenticated:', initialIsAuth);

          // Set up auth state listener after initial state
          authSubscription = supabase.auth.onAuthStateChange(
            (event, session) => {
              console.log('Auth state change:', event, !!session?.user);
              
              const newUser = session?.user ?? null;
              const newIsAuthenticated = !!session?.user;

              set({
                session,
                user: newUser,
                isAuthenticated: newIsAuthenticated,
                isLoading: false,
                error: null,
              });
            }
          );

          console.log('Auth initialization complete');
          
        } catch (error: any) {
          console.error('Auth initialization error:', error);
          set({ 
            error: error.message || 'Authentication initialization failed',
            isLoading: false, 
            isInitialized: true,
            user: null,
            session: null,
            isAuthenticated: false
          });
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

          // Don't set loading to false here - let the auth state change handle it
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

          // Don't set loading to false here - let the auth state change handle it
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
          // Clean up subscription first
          if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
          }
          
          await supabase.auth.signOut();
          
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: false,
            error: null,
          });
          
        } catch (error: any) {
          console.error('Sign out error:', error);
          set({ error: error.message || 'Sign out failed' });
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        // Only persist minimal user info, let Supabase handle session
        user: state.user ? {
          id: state.user.id,
          email: state.user.email,
          user_metadata: state.user.user_metadata
        } : null,
      }),
    }
  )
);
