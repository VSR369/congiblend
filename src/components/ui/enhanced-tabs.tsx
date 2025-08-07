import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const EnhancedTabs = TabsPrimitive.Root;

const EnhancedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: 'default' | 'pills' | 'underline' | 'segment';
  }
>(({ className, variant = 'default', ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center text-muted-foreground',
      variant === 'default' && 'h-10 rounded-md bg-muted p-1',
      variant === 'pills' && 'h-10 gap-2 p-1',
      variant === 'underline' && 'h-10 gap-6 border-b border-border',
      variant === 'segment' && 'h-12 bg-muted/50 rounded-lg p-1',
      className
    )}
    {...props}
  />
));
EnhancedTabsList.displayName = TabsPrimitive.List.displayName;

const EnhancedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: 'default' | 'pills' | 'underline' | 'segment';
  }
>(({ className, variant = 'default', children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      variant === 'default' && 'rounded-sm px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      variant === 'pills' && 'rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
      variant === 'underline' && 'border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:text-foreground',
      variant === 'segment' && 'rounded-md px-4 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      {children}
    </div>
  </TabsPrimitive.Trigger>
));
EnhancedTabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const EnhancedTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  >
    <div className="animate-fade-in">
      {children}
    </div>
  </TabsPrimitive.Content>
));
EnhancedTabsContent.displayName = TabsPrimitive.Content.displayName;

export { EnhancedTabs, EnhancedTabsList, EnhancedTabsTrigger, EnhancedTabsContent };