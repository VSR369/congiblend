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
import { useIsBelowLg } from '@/hooks/useBreakpoint';

export const MainLayout = () => {
  // Initialize global scroll manager for performance
  useScrollManager();
  const isCompactNav = useIsBelowLg();
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
    if (!isCompactNav && mobileOpen) setMobileOpen(false);
    if (!isCompactNav && mobileRightOpen) setMobileRightOpen(false);
  }, [isCompactNav, mobileOpen, mobileRightOpen]);
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header showMenuButton={isCompactNav} onMenuToggle={() => setMobileOpen(true)} showDiscoverButton={isCompactNav} onDiscoverToggle={() => setMobileRightOpen(true)} />
      
      {/* Mobile/Tablet sidebar sheets - render on widths below lg */}
      {isCompactNav ? (
        <>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="p-0 w-[85vw] sm:max-w-sm md:max-w-md lg:hidden">
              <LeftSidebar />
            </SheetContent>
          </Sheet>
          <Sheet open={mobileRightOpen} onOpenChange={setMobileRightOpen}>
            <SheetContent side="right" className="p-0 w-[85vw] sm:max-w-sm md:max-w-lg lg:hidden">
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