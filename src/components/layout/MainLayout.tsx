import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { useScrollManager } from '@/hooks/useScrollManager';

export const MainLayout = () => {
  // Initialize global scroll manager for performance
  useScrollManager();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] xl:grid-cols-[20rem_1fr_22rem]">
          <aside className="hidden lg:block border-r">
            <LeftSidebar />
          </aside>

          <ErrorBoundary>
            <main className="animate-fade-in">
              <Outlet />
            </main>
          </ErrorBoundary>

          <aside className="hidden xl:block border-l">
            <RightSidebar />
          </aside>
        </div>
      </div>
      
      <Footer />
      <ScrollToTop />
    </div>
  );
};