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
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
// Debug components removed for production

// Lazy load pages for better performance
const MainLayout = lazy(() => import("@/components/layout/MainLayout").then(m => ({ default: m.MainLayout })));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component for Suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// App content component that uses context
const AppContent = () => {
  // Initialize performance monitoring inside context
  usePerformanceMonitor(process.env.NODE_ENV === 'development');

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
            </Route>
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
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
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
