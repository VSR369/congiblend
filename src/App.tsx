
import React from "react";
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
// Articles
const ArticleCreate = lazy(() => import("./pages/ArticleCreate"));
const ArticleView = lazy(() => import("./pages/ArticleView"));

// React Query client
const queryClient = new QueryClient();

// Loading component for Suspense
const PageLoader: React.FC = () => {
  const [showHint, setShowHint] = React.useState(false);
  React.useEffect(() => {
    const t = window.setTimeout(() => setShowHint(true), 6000);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" aria-label="Loading" />
        {showHint && (
          <div className="text-xs text-muted-foreground">
            Still loading… <button onClick={() => window.location.reload()} className="underline">Reload</button>
          </div>
        )}
      </div>
    </div>
  );
};
// App content component that uses context
const AppContent = () => {
  // Minimal performance monitoring for development only
  useSimplePerformance(process.env.NODE_ENV === 'development');

  // Warm up critical routes to avoid long Suspense hangs on first navigation
  useEffect(() => {
    const id = window.setTimeout(() => {
      Promise.allSettled([
        import("./pages/KnowledgeSparks"),
        import("./pages/KnowledgeSparkView"),
      ]);
    }, 800);
    return () => window.clearTimeout(id);
  }, []);

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
              {/* Articles */}
              <Route path="articles/new" element={<ArticleCreate />} />
              <Route path="articles/:id" element={<ArticleView />} />
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
    // Log React version to confirm React initialized (helps diagnose bundling/init issues)
    console.log('React initialized, version:', (React as any)?.version || 'unknown');
  }, []);

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

