import React, { createContext, useContext, useReducer, useEffect, useMemo, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useFeedStore } from '@/stores/feedStore';
import { useThemeStore } from '@/stores/themeStore';
import type { Post, User } from '@/types/feed';
import type { FeedFilters } from '@/stores/feedStore';

// Global App State Interface
interface AppState {
  // UI State
  isScrolling: boolean;
  isNavigating: boolean;
  renderingQueue: string[];
  
  // Data State
  posts: Post[];
  users: User[];
  currentUser: User | null;
  
  // Loading States
  loading: {
    posts: boolean;
    users: boolean;
    navigation: boolean;
  };
  
  // Error States
  errors: {
    posts: string | null;
    users: string | null;
    global: string | null;
  };
  
  // Filters and Settings
  filters: FeedFilters;
  theme: 'light' | 'dark';
}

// Action Types for Reducer
type AppAction =
  | { type: 'SET_SCROLLING'; payload: boolean }
  | { type: 'SET_NAVIGATING'; payload: boolean }
  | { type: 'ADD_TO_RENDER_QUEUE'; payload: string }
  | { type: 'PROCESS_RENDER_QUEUE' }
  | { type: 'SET_POSTS'; payload: Post[] }
  | { type: 'ADD_POSTS'; payload: Post[] }
  | { type: 'UPDATE_POST'; payload: { id: string; updates: Partial<Post> } }
  | { type: 'REMOVE_POST'; payload: string }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_CURRENT_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: { key: keyof AppState['loading']; value: boolean } }
  | { type: 'SET_ERROR'; payload: { key: keyof AppState['errors']; value: string | null } }
  | { type: 'SET_FILTERS'; payload: Partial<FeedFilters> }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'BATCH_UPDATE'; payload: Partial<AppState> };

// Initial State
const initialState: AppState = {
  isScrolling: false,
  isNavigating: false,
  renderingQueue: [],
  posts: [],
  users: [],
  currentUser: null,
  loading: {
    posts: false,
    users: false,
    navigation: false,
  },
  errors: {
    posts: null,
    users: null,
    global: null,
  },
  filters: {
    userFilter: 'all',
    contentTypes: ['text', 'image', 'video', 'article', 'poll', 'event', 'job'],
    timeRange: 'all'
  },
  theme: 'light'
};

// App Reducer with Batching Support
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SCROLLING':
      return { ...state, isScrolling: action.payload };
    
    case 'SET_NAVIGATING':
      return { ...state, isNavigating: action.payload };
    
    case 'ADD_TO_RENDER_QUEUE':
      return { 
        ...state, 
        renderingQueue: [...state.renderingQueue, action.payload] 
      };
    
    case 'PROCESS_RENDER_QUEUE':
      return { ...state, renderingQueue: [] };
    
    case 'SET_POSTS':
      return { 
        ...state, 
        posts: action.payload,
        errors: { ...state.errors, posts: null }
      };
    
    case 'ADD_POSTS':
      // Deduplicate posts by ID
      const existingIds = new Set(state.posts.map(p => p.id));
      const newPosts = action.payload.filter(p => !existingIds.has(p.id));
      return { 
        ...state, 
        posts: [...state.posts, ...newPosts],
        errors: { ...state.errors, posts: null }
      };
    
    case 'UPDATE_POST':
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === action.payload.id
            ? { ...post, ...action.payload.updates }
            : post
        )
      };
    
    case 'REMOVE_POST':
      return {
        ...state,
        posts: state.posts.filter(post => post.id !== action.payload)
      };
    
    case 'SET_USERS':
      return { ...state, users: action.payload };
    
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.value }
      };
    
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };
    
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'BATCH_UPDATE':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

// Context Interface
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Computed Values
  isLoading: boolean;
  hasErrors: boolean;
  filteredPosts: Post[];
  
  // Actions
  batchUpdate: (updates: Partial<AppState>) => void;
  clearErrors: () => void;
  queueRender: (componentId: string) => void;
}

// Create Context
const AppContext = createContext<AppContextValue | null>(null);

// Rendering Queue Manager
let renderQueue = new Set<string>();
let renderTimeout: NodeJS.Timeout | null = null;

// Query Client with Optimized Settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});

// App Context Provider
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user, isAuthenticated } = useAuthStore();
  const { theme } = useThemeStore();

  // Sync with existing stores (transition period)
  useEffect(() => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
  }, [user]);

  useEffect(() => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, [theme]);

  // Computed Values with Memoization
  const isLoading = useMemo(
    () => Object.values(state.loading).some(Boolean),
    [state.loading]
  );

  const hasErrors = useMemo(
    () => Object.values(state.errors).some(Boolean),
    [state.errors]
  );

  const filteredPosts = useMemo(() => {
    let posts = state.posts;

    // Apply user filter
    if (state.filters.userFilter === 'my_posts' && state.currentUser) {
      posts = posts.filter(post => post.author.id === state.currentUser?.id);
    } else if (state.filters.userFilter === 'others' && state.currentUser) {
      posts = posts.filter(post => post.author.id !== state.currentUser?.id);
    }

    // Apply content type filter
    if (state.filters.contentTypes.length > 0) {
      posts = posts.filter(post => state.filters.contentTypes.includes(post.type));
    }

    // Apply time range filter
    if (state.filters.timeRange !== 'all') {
      const now = new Date();
      const timeMap = {
        recent: 24 * 60 * 60 * 1000, // 1 day
        week: 7 * 24 * 60 * 60 * 1000, // 1 week
        month: 30 * 24 * 60 * 60 * 1000, // 1 month
      };
      
      const timeLimit = timeMap[state.filters.timeRange as keyof typeof timeMap];
      if (timeLimit) {
        posts = posts.filter(post => 
          now.getTime() - post.createdAt.getTime() < timeLimit
        );
      }
    }

    return posts;
  }, [state.posts, state.filters, state.currentUser]);

  // Optimized Actions
  const batchUpdate = useMemo(
    () => (updates: Partial<AppState>) => {
      dispatch({ type: 'BATCH_UPDATE', payload: updates });
    },
    []
  );

  const clearErrors = useMemo(
    () => () => {
      dispatch({
        type: 'BATCH_UPDATE',
        payload: {
          errors: { posts: null, users: null, global: null }
        }
      });
    },
    []
  );

  const queueRender = useMemo(
    () => (componentId: string) => {
      renderQueue.add(componentId);
      
      if (renderTimeout) {
        clearTimeout(renderTimeout);
      }
      
      renderTimeout = setTimeout(() => {
        if (renderQueue.size > 0) {
          dispatch({ type: 'PROCESS_RENDER_QUEUE' });
          renderQueue.clear();
        }
      }, 16); // ~60fps
    },
    []
  );

  // Context Value
  const contextValue = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch,
      isLoading,
      hasErrors,
      filteredPosts,
      batchUpdate,
      clearErrors,
      queueRender,
    }),
    [state, isLoading, hasErrors, filteredPosts, batchUpdate, clearErrors, queueRender]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={contextValue}>
        <Suspense fallback={<div className="app-loading">Loading...</div>}>
          {children}
        </Suspense>
      </AppContext.Provider>
    </QueryClientProvider>
  );
};

// Hook to use App Context
export const useAppContext = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Selector Hooks for Performance
export const useAppState = () => {
  const { state } = useAppContext();
  return state;
};

export const usePosts = () => {
  const { filteredPosts } = useAppContext();
  return filteredPosts;
};

export const useCurrentUser = () => {
  const { state } = useAppContext();
  return state.currentUser;
};

export const useAppLoading = () => {
  const { isLoading } = useAppContext();
  return isLoading;
};

export const useAppErrors = () => {
  const { state, clearErrors } = useAppContext();
  return { errors: state.errors, clearErrors };
};