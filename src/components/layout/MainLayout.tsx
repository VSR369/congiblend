import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { useScrollManager } from '@/hooks/useScrollManager';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

export const MainLayout = () => {
  // Initialize global scroll manager for performance
  useScrollManager();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col">
      <Header showMenuButton={isMobile} onMenuToggle={() => setMobileOpen(true)} />
      
      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[85vw] sm:max-w-sm lg:hidden">
          <LeftSidebar />
        </SheetContent>
      </Sheet>

      <div className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] xl:grid-cols-[20rem_1fr_22rem]">
          <aside className="hidden lg:block border-r">
            <LeftSidebar />
          </aside>

          <ErrorBoundary>
            <main className="min-w-0 animate-fade-in">
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