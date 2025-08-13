import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const location = useLocation();
  // Auto-close mobile sheet on route change to avoid overlay blocking content
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);
    if (mobileRightOpen) setMobileRightOpen(false);
  }, [location.pathname]);
  // Ensure sheet is closed and unmounted on desktop to prevent invisible overlay
  useEffect(() => {
    if (!isMobile && mobileOpen) setMobileOpen(false);
    if (!isMobile && mobileRightOpen) setMobileRightOpen(false);
  }, [isMobile, mobileOpen, mobileRightOpen]);
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header showMenuButton={isMobile} onMenuToggle={() => setMobileOpen(true)} showDiscoverButton={isMobile} onDiscoverToggle={() => setMobileRightOpen(true)} />
      
      {/* Mobile sidebar sheets - render only on mobile to avoid overlay issues */}
      {isMobile ? (
        <>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="p-0 w-[85vw] sm:max-w-sm lg:hidden">
              <LeftSidebar />
            </SheetContent>
          </Sheet>
          <Sheet open={mobileRightOpen} onOpenChange={setMobileRightOpen}>
            <SheetContent side="right" className="p-0 w-[85vw] sm:max-w-sm lg:hidden">
              <RightSidebar />
            </SheetContent>
          </Sheet>
        </>
      ) : null}

      <div className="flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr_22rem] max-w-screen-2xl w-full mx-auto">
          <aside className="hidden lg:block border-r">
            <LeftSidebar />
          </aside>

          <ErrorBoundary>
            <main className="min-w-0 w-full overflow-x-hidden animate-fade-in">
              <Outlet />
            </main>
          </ErrorBoundary>

          <aside className="hidden lg:block border-l">
            <RightSidebar />
          </aside>
        </div>
      </div>
      
      <Footer />
      <ScrollToTop />
    </div>
  );
};