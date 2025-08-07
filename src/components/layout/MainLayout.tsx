import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ScrollToTop } from '@/components/ui/scroll-to-top';

export const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <ErrorBoundary>
        <main className="flex-1 animate-fade-in">
          <Outlet />
        </main>
      </ErrorBoundary>
      
      <Footer />
      <ScrollToTop />
    </div>
  );
};