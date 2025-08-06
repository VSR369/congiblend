import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Search, Settings, User, Menu, Sun, Moon, PanelLeft } from 'lucide-react';

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

interface HeaderProps {
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export const Header = ({ onMenuToggle, showMenuButton = false }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useThemeStore();
  const { user, signOut } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Handle search logic
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full glass border-b border-glass-border"
    >
      <div className="container flex h-20 items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-10 w-10 rounded-xl hover-glow transition-all duration-300 glass-card border-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <Link to="/" className="flex items-center space-x-3 hover-glow transition-all duration-300 rounded-xl p-2">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="hidden sm:block font-bold text-xl gradient-text-hero">
              {APP_CONFIG.name}
            </span>
          </Link>
        </div>

        {/* Center Section - Enhanced Search */}
        <div className="flex-1 max-w-lg mx-6">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts, people, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 h-12 w-full glass-card border-0 text-lg placeholder:text-muted-foreground/70 focus:shadow-glow transition-all duration-300"
            />
          </form>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-12 w-12 rounded-xl hover-glow transition-all duration-300 glass-card border-0"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-12 w-12 rounded-xl hover-glow transition-all duration-300 glass-card border-0">
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
              <div className="p-4 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No new notifications</p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-12 w-12 rounded-xl hover-glow transition-all duration-300 glass-card border-0 p-0">
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
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={signOut} className="p-3 text-destructive">
                   Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" asChild className="h-12 px-6 rounded-xl button-glass">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild className="h-12 px-6 rounded-xl button-elegant">
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
};