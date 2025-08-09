import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FeedErrorBoundary } from "@/components/boundaries/FeedErrorBoundary";
import { useThemeStore } from "@/stores/themeStore";
import { useAuthStore } from "@/stores/authStore";
import { useSimplePerformance } from "@/hooks/useSimplePerformance";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Lazy load pages for better performance
const MainLayout = lazy(() => import("@/components/layout/MainLayout").then(m => ({ default: m.MainLayout })));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Messages = lazy(() => import("./pages/Messages"));
const KnowledgeSparks = lazy(() => import("./pages/KnowledgeSparks"));
const KnowledgeSparkCreate = lazy(() => import("./pages/KnowledgeSparkCreate"));
const KnowledgeSparkView = lazy(() => import("./pages/KnowledgeSparkView"));

// React Query client
const queryClient = new QueryClient();

// Loading component for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// App content component that uses context
const AppContent = () => {
  // Minimal performance monitoring for development only
  useSimplePerformance(process.env.NODE_ENV === 'development');

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={
              <FeedErrorBoundary level="feed">
                <MainLayout />
              </FeedErrorBoundary>
            }>
              <Route index element={<Index />} />
              <Route path="knowledge-sparks" element={<KnowledgeSparks />} />
              <Route path="knowledge-sparks/new" element={<KnowledgeSparkCreate />} />
              <Route path="knowledge-sparks/:slug" element={<KnowledgeSparkView />} />
            </Route>
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      
      {/* Debug components removed for stable performance */}
    </TooltipProvider>
  );
};

// Performance-optimized App component
const App = () => {
  const { theme } = useThemeStore();
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on app start
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Apply theme on mount with smooth transition
    const html = document.documentElement;
    
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
