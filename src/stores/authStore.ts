
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      let authSubscription: any = null;
      let isUpdating = false;

      return {
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: true,
        isInitialized: false,

        initialize: async () => {
          const state = get();
          
          // Prevent multiple initializations
          if (state.isInitialized || authSubscription) {
            console.log('Auth already initialized, skipping...');
            set({ isLoading: false });
            return;
          }

          console.log('Initializing auth...');
          
          try {
            set({ isLoading: true });

            // Set up auth state listener with proper debouncing
            authSubscription = supabase.auth.onAuthStateChange(
              async (event, session) => {
                // Prevent concurrent updates
                if (isUpdating) {
                  console.log('Update already in progress, skipping...');
                  return;
                }

                isUpdating = true;
                console.log('Auth state changed:', event, !!session);
                
                try {
                  const currentState = get();
                  const newIsAuthenticated = !!session;
                  
                  // Only update if something actually changed
                  const sessionChanged = currentState.session?.access_token !== session?.access_token;
                  const authStatusChanged = currentState.isAuthenticated !== newIsAuthenticated;
                  
                  if (sessionChanged || authStatusChanged || currentState.isLoading) {
                    set({
                      session,
                      user: session?.user ?? null,
                      isAuthenticated: newIsAuthenticated,
                      isLoading: false,
                    });
                    console.log('Auth state updated successfully');
                  } else {
                    console.log('No actual state change, skipping update');
                  }
                } finally {
                  isUpdating = false;
                }
              }
            );

            // Get initial session
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('Error getting session:', error);
            }

            // Set initial state
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
          // Clean up subscription before signing out
          if (authSubscription) {
            authSubscription.unsubscribe();
            authSubscription = null;
          }
          
          await supabase.auth.signOut();
          
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isInitialized: false, // Reset initialization flag
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
      };
    },
    {
      name: 'auth-store',
      partialize: (state) => ({
        // Don't persist isInitialized to prevent initialization confusion
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
