
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useThemeStore } from "@/stores/themeStore";
import { useAuthStore } from "@/stores/authStore";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { LoadingPage } from "@/components/ui/loading";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

const App = () => {
  const { theme } = useThemeStore();
  const { initialize, user, isLoading, error } = useAuthStore();

  // Initialize auth once when app mounts
  useEffect(() => {
    initialize();
  }, []);

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Show loading while initializing
  if (isLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LoadingPage message="Initializing..." />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show error state if there's an auth error
  if (error) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">Authentication Error</h1>
              <p className="text-muted-foreground mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded"
              >
                Reload App
              </button>
            </div>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  console.log('App: Rendering with auth state:', { user: !!user });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={
                user ? (
                  <MainLayout />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            >
              <Route index element={<Index />} />
            </Route>
            <Route 
              path="/login" 
              element={
                !user ? (
                  <Auth />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route 
              path="/register" 
              element={
                !user ? (
                  <Auth />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
