import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from './Header';
import { Footer } from './Footer';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { PerformanceDashboard } from '@/components/ui/performance-dashboard';
import { usePageLoadTracking } from '@/hooks/usePerformanceTracking';

export const MainLayout = () => {
  usePageLoadTracking('main_layout');
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <ErrorBoundary>
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1"
        >
          <Outlet />
        </motion.main>
      </ErrorBoundary>
      
      <Footer />
      <ScrollToTop />
      <PerformanceDashboard />
    </div>
  );
};