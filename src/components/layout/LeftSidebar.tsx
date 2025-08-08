
import React from 'react';
import { 
  Home, 
  Users, 
  BarChart3, 
  User, 
  Settings, 
  Plus,
  MessageCircle,
  Eye,
  FileText,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { UserStatsCard } from '@/components/ui/user-stats-card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import KnowledgeSparksPanel from '@/components/knowledge-sparks/KnowledgeSparksPanel';

const navigationItems = [
  { title: 'Mission Control', url: '/', icon: Home },
  { title: 'Articles', url: '/articles', icon: FileText },
  { title: 'Messages', url: '/messages', icon: MessageCircle },
];

export const LeftSidebar = () => {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="w-80 h-screen overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background to-muted/30">
      {/* User Stats Card */}
      <div className="animate-fade-in">
        <UserStatsCard />
      </div>

      {/* PHASE 1: Navigation Menu with CSS animations */}
      <div className="space-y-2 stable-animation">
        {navigationItems.map((item, index) => (
          <div 
            key={item.title}
            className="debounced-enter"
            style={{ animationDelay: `${100 + index * 50}ms` }}
          >
            <Link 
              to={item.url}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 
                ${location.pathname === item.url 
                  ? 'bg-primary/10 text-primary border border-primary/30' 
                  : 'text-foreground hover:bg-muted hover:text-primary'
                }
              `}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.title}</span>
            </Link>
          </div>
        ))}

        {/* Knowledge Sparks entry (opens panel in a Sheet - no route changes) */}
        <div className="debounced-enter" style={{ animationDelay: `300ms` }}>
          <Sheet open={open} onOpenChange={(v) => { console.log('KnowledgeSparks Sheet onOpenChange:', v); setOpen(v); }}>
            <SheetTrigger asChild>
              <button
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-foreground hover:bg-muted hover:text-primary"
                aria-label="Open Knowledge Sparks"
                onClick={() => { console.log('KnowledgeSparks: trigger clicked'); setOpen(true); }}
              >
                <Lightbulb className="h-5 w-5" />
                <span className="font-medium">Knowledge Sparks</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-3xl p-0">
              <SheetHeader className="px-6 py-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Knowledge Sparks
                </SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-4rem)]">
                <KnowledgeSparksPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {/* Footer Card */}
      <div className="glass-card p-3 rounded-lg border border-white/10 animate-fade-in">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">
            Professional Network
          </p>
          <div className="text-xs font-medium text-primary">
            🎯 Level up your connections
          </div>
        </div>
      </div>
    </div>
  );
};
