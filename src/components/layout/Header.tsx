import * as React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Search, Settings, User, Menu, Sun, Moon, PanelLeft, Lightbulb, Home, Sparkles, FileText, BarChart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { APP_CONFIG } from '@/utils/constants';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  onDiscoverToggle?: () => void;
  showDiscoverButton?: boolean;
}

export const Header = React.memo(({ onMenuToggle, showMenuButton = false, onDiscoverToggle, showDiscoverButton = false }: HeaderProps) => {
  // Performance monitoring
  const renderCountRef = React.useRef(0);
  const lastRenderTime = React.useRef(Date.now());
  
  React.useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    console.log('🎯 Header re-render:', {
      count: renderCountRef.current,
      timeSinceLastRender: now - lastRenderTime.current,
      timestamp: now
    });
    lastRenderTime.current = now;
  });

  const [searchQuery, setSearchQuery] = React.useState('');
  const { theme, toggleTheme } = useThemeStore();
  const { user, isAuthenticated, signOut } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { markAllAsRead } = useRealtimeNotifications();

  // Notifications dropdown state and data
  type NotificationRow = {
    id: string;
    type: string | null;
    payload: any;
    read: boolean;
    created_at: string;
  };
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [loadingNotifs, setLoadingNotifs] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);

  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;
    setLoadingNotifs(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id,type,payload,read,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error) setNotifications(data as NotificationRow[]);
    setLoadingNotifs(false);
  }, [user]);

  React.useEffect(() => {
    if (notifOpen && isAuthenticated) {
      fetchNotifications();
    }
  }, [notifOpen, isAuthenticated, fetchNotifications]);

  const handleMarkOneAsRead = React.useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const handleSearch = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('🔍 Header search executed:', searchQuery);
    }
  }, [searchQuery]);

  const handleThemeToggle = React.useCallback(() => {
    console.log('🎨 Theme toggling from:', theme);
    toggleTheme();
  }, [theme, toggleTheme]);

  const handleSignOut = React.useCallback(() => {
    console.log('🚪 User logging out');
    signOut();
  }, [signOut]);

  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-glass-border animate-slide-down pt-safe px-safe">
      
      <div className="container flex items-center justify-between h-14 md:h-20 gap-2">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="lg:hidden h-10 w-10 rounded-xl hover-glow transition-all duration-300 glass-card border-0"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <Link to="/" className="flex items-center space-x-3 hover-glow transition-all duration-300 rounded-xl p-2">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
              <span className="text-foreground font-bold text-lg">{APP_CONFIG.name.charAt(0)}</span>
            </div>
            <span className="hidden sm:block font-bold text-xl gradient-text-hero">
              {APP_CONFIG.name}
            </span>
          </Link>

          <Button asChild variant="secondary" size="sm" className="hidden md:inline-flex h-10 md:h-12 rounded-xl"> 
            <Link to="/" aria-label="Back Home" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>Back Home</span>
            </Link>
          </Button>
        </div>

        {/* Center Section - Enhanced Search */}
        <div className="flex-1 min-w-0 max-w-[56vw] sm:max-w-lg mx-2 sm:mx-6">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts, people, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-10 md:h-12 w-full glass-card border-0 text-sm md:text-base placeholder:text-muted-foreground/70 focus:shadow-glow transition-all duration-300"
            />
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Discover (mobile) */}
          {showDiscoverButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscoverToggle}
              className="lg:hidden h-10 w-10 md:h-12 md:w-12 rounded-xl hover-glow transition-all duration-300 glass-card border-0"
              aria-label="Open Discover"
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThemeToggle}
            className="h-10 w-10 md:h-12 md:w-12 rounded-xl hover-glow transition-all duration-300 glass-card border-0"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications */}
          <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-10 w-10 md:h-12 md:w-12 rounded-xl hover-glow transition-all duration-300 glass-card border-0">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs font-bold animate-pulse-glow"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 glass-card border-glass-border">
              <DropdownMenuLabel className="text-lg font-semibold">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{unreadCount} unread</span>
                  <Button size="sm" variant="secondary" onClick={markAllAsRead}>Mark all as read</Button>
                </div>
                {loadingNotifs ? (
                  <div className="space-y-2">
                    <div className="h-4 w-5/6 rounded-md bg-muted/50" />
                    <div className="h-4 w-4/6 rounded-md bg-muted/50" />
                    <div className="h-4 w-3/6 rounded-md bg-muted/50" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">No notifications yet</div>
                ) : (
                  <ul className="space-y-2 max-h-80 overflow-auto pr-1">
                    {notifications.map((n) => {
                      const link = (n as any)?.payload?.link as string | undefined;
                      const excerpt = (n as any)?.payload?.excerpt as string | undefined;
                      const version = (n as any)?.payload?.version_number as number | undefined;
                      const label = n.type === 'mention'
                        ? 'You were mentioned'
                        : n.type === 'spark_edit'
                          ? `Spark updated${version ? ` to v${version}` : ''}`
                          : (n.type || 'Notification');
                      return (
                        <li key={n.id}>
                          <button
                            onClick={async () => {
                              await handleMarkOneAsRead(n.id);
                              if (link) window.location.href = link;
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${n.read ? 'bg-transparent hover:bg-muted/30' : 'bg-primary/10 hover:bg-primary/20'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{label}</span>
                              {!n.read && <Badge variant="secondary" className="text-[10px]">New</Badge>}
                            </div>
                            {excerpt && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{excerpt}</p>
                            )}
                            <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 w-10 md:h-12 md:w-12 rounded-xl hover-glow transition-all duration-300 glass-card border-0 p-0">
                   {user.user_metadata?.avatar_url ? (
                     <img
                       src={user.user_metadata.avatar_url}
                       alt={user.user_metadata?.full_name || user.email}
                       className="h-8 w-8 rounded-lg object-cover"
                     />
                   ) : (
                     <User className="h-5 w-5" />
                   )}
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-64 glass-card border-glass-border">
                 <DropdownMenuLabel>
                   <div className="flex items-center space-x-3 p-2">
                     {user.user_metadata?.avatar_url ? (
                       <img
                         src={user.user_metadata.avatar_url}
                         alt={user.user_metadata?.full_name || user.email}
                         className="h-10 w-10 rounded-lg object-cover"
                       />
                     ) : (
                       <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                         <User className="h-5 w-5 text-white" />
                       </div>
                     )}
                     <div className="flex flex-col">
                       <p className="font-semibold leading-none">{user.user_metadata?.full_name || user.email}</p>
                       <p className="text-sm text-muted-foreground mt-1">
                         {user.email}
                       </p>
                     </div>
                   </div>
                 </DropdownMenuLabel>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem asChild className="p-3">
                   <Link to="/profile" className="flex items-center">
                     <User className="mr-3 h-5 w-5" />
                     Profile
                   </Link>
                 </DropdownMenuItem>
                 <DropdownMenuItem asChild className="p-3">
                   <Link to="/settings" className="flex items-center">
                     <Settings className="mr-3 h-5 w-5" />
                     Settings
                   </Link>
                 </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3">
                    <Link
                      to="/knowledge-sparks"
                      className="flex items-center"
                      onMouseEnter={() => { import("../../pages/KnowledgeSparks"); }}
                      onFocus={() => { import("../../pages/KnowledgeSparks"); }}
                    >
                      <Lightbulb className="mr-3 h-5 w-5" />
                      Knowledge Sparks
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3">
                    <Link to="/articles" className="flex items-center">
                      <FileText className="mr-3 h-5 w-5" />
                      Articles
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-3">
                    <Link to="/polls" className="flex items-center">
                      <BarChart className="mr-3 h-5 w-5" />
                      Polls
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={handleSignOut} className="p-3 text-destructive">
                   Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" asChild className="h-10 md:h-12 px-4 md:px-6 rounded-xl button-glass">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild className="h-10 md:h-12 px-4 md:px-6 rounded-xl button-elegant">
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}, (prevProps, nextProps) => {
// Shallow comparison for Header props
return prevProps.onMenuToggle === nextProps.onMenuToggle &&
       prevProps.showMenuButton === nextProps.showMenuButton &&
       prevProps.onDiscoverToggle === nextProps.onDiscoverToggle &&
       prevProps.showDiscoverButton === nextProps.showDiscoverButton;
});

Header.displayName = "Header";