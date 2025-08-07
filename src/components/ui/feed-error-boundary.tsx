import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface FeedErrorBoundaryProps {
  children: React.ReactNode;
}

function FeedErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        {error.message || 'There was an error loading the feed. Please try again.'}
      </p>
      <Button onClick={resetErrorBoundary} className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

export const FeedErrorBoundary: React.FC<FeedErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary FallbackComponent={FeedErrorFallback}>
      {children}
    </ErrorBoundary>
  );
};