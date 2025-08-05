import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from './Header';
import { Footer } from './Footer';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ScrollToTop } from '@/components/ui/scroll-to-top';

export const MainLayout = () => {
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
    </div>
  );
};