
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
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

let authStateSubscription: any = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,

      initialize: async () => {
        const state = get();
        
        // Prevent multiple initializations
        if (state.isInitialized) {
          console.log('Auth already initialized, skipping...');
          set({ isLoading: false });
          return;
        }

        console.log('Initializing auth...');
        
        try {
          set({ isLoading: true });
          
          // Clean up any existing subscription
          if (authStateSubscription) {
            authStateSubscription.unsubscribe();
          }

          // Set up auth state listener FIRST
          authStateSubscription = supabase.auth.onAuthStateChange(
            (event, session) => {
              console.log('Auth state changed:', event, !!session);
              
              // Prevent infinite loops by checking if state actually changed
              const currentState = get();
              const newIsAuthenticated = !!session;
              
              if (currentState.isAuthenticated !== newIsAuthenticated || 
                  currentState.session?.access_token !== session?.access_token) {
                set({
                  session,
                  user: session?.user ?? null,
                  isAuthenticated: newIsAuthenticated,
                  isLoading: false,
                });
              }
            }
          );

          // THEN check for existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session:', error);
          }

          set({
            session,
            user: session?.user ?? null,
            isAuthenticated: !!session,
            isLoading: false,
            isInitialized: true,
          });

          console.log('Auth initialization complete');
          
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ 
            isLoading: false, 
            isInitialized: true 
          });
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
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
