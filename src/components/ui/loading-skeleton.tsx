import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button';
  lines?: number;
}

export const LoadingSkeleton = ({ 
  className, 
  variant = 'default',
  lines = 1 
}: LoadingSkeletonProps) => {
  const baseClasses = 'loading-shimmer rounded-md';

  const variants = {
    default: 'h-4 w-full',
    card: 'h-48 w-full',
    text: 'h-4',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24',
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              variants.text,
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(baseClasses, variants[variant], className)} />
  );
};

// Pre-built skeleton components
export const CardSkeleton = () => (
  <div className="space-y-4 p-6 border rounded-lg">
    <div className="flex items-center space-x-4">
      <LoadingSkeleton variant="avatar" />
      <div className="space-y-2 flex-1">
        <LoadingSkeleton className="h-4 w-1/4" />
        <LoadingSkeleton className="h-3 w-1/2" />
      </div>
    </div>
    <LoadingSkeleton variant="text" lines={3} />
    <LoadingSkeleton variant="button" />
  </div>
);

export const ListSkeleton = ({ items = 5 }: { items?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <LoadingSkeleton variant="avatar" />
        <div className="space-y-2 flex-1">
          <LoadingSkeleton className="h-4 w-1/3" />
          <LoadingSkeleton className="h-3 w-full" />
        </div>
        <LoadingSkeleton variant="button" />
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-2">
    {/* Header */}
    <div className="flex space-x-4 p-4 border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4 p-4 border-b">
        {Array.from({ length: cols }).map((_, j) => (
          <LoadingSkeleton key={j} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// Feed skeleton for post loading
export const FeedSkeleton = () => (
  <div className="space-y-6">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="bg-card border border-border rounded-lg p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <LoadingSkeleton variant="avatar" />
          <div className="space-y-1">
            <LoadingSkeleton className="h-4 w-32" />
            <LoadingSkeleton className="h-3 w-20" />
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-4 w-3/4" />
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-4 pt-2">
          <LoadingSkeleton variant="button" className="w-16" />
          <LoadingSkeleton variant="button" className="w-16" />
          <LoadingSkeleton variant="button" className="w-16" />
        </div>
      </div>
    ))}
  </div>
);