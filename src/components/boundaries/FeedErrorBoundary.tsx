import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level: 'feed' | 'post' | 'media' | 'ui';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
  lastErrorTime: number;
}

export class FeedErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 seconds

  public state: State = {
    hasError: false,
    retryCount: 0,
    lastErrorTime: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      lastErrorTime: Date.now(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.level}] Error Boundary caught error:`, error, errorInfo);
    
    // Report to error tracking service
    this.props.onError?.(error, errorInfo);
    
    // Track error analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'exception', {
        description: `${this.props.level}_error: ${error.message}`,
        fatal: false,
      });
    }

    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    const { retryCount, lastErrorTime } = this.state;
    const timeSinceError = Date.now() - lastErrorTime;
    
    // Prevent rapid retries
    if (timeSinceError < 1000) {
      return;
    }

    if (retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private renderErrorUI() {
    const { level } = this.props;
    const { error, retryCount } = this.state;

    // Minimal error UI for small components
    if (level === 'media' || level === 'ui') {
      return (
        <div className="w-full h-32 bg-destructive/5 border border-destructive/20 rounded-lg flex items-center justify-center">
          <div className="text-center p-4">
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive mb-2">Failed to load {level}</p>
            {retryCount < this.maxRetries && (
              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry ({this.maxRetries - retryCount} left)
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Post-level error UI
    if (level === 'post') {
      return (
        <Card className="w-full border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto mb-2 h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <CardTitle className="text-sm">Post Error</CardTitle>
            <CardDescription className="text-xs">
              This post couldn't be displayed properly.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {process.env.NODE_ENV === 'development' && error && (
              <div className="rounded-md bg-muted p-2">
                <pre className="text-xs text-muted-foreground overflow-auto max-h-20">
                  {error.message}
                </pre>
              </div>
            )}
            {retryCount < this.maxRetries && (
              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="w-full h-8"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Try Again ({this.maxRetries - retryCount} left)
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    // Feed-level error UI
    return (
      <div className="flex items-center justify-center min-h-96 p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Feed Error</CardTitle>
            <CardDescription>
              We're having trouble loading your feed. This might be a temporary issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && error && (
              <div className="rounded-md bg-muted p-4">
                <pre className="text-xs text-muted-foreground overflow-auto max-h-32">
                  {error.message}
                  {this.state.errorInfo && '\n\nStack trace:\n' + this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            
            <div className="space-y-2">
              {retryCount < this.maxRetries ? (
                <Button 
                  onClick={this.handleRetry} 
                  variant="default" 
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again ({this.maxRetries - retryCount} left)
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Still having trouble? Try refreshing the page or going home.
                  </p>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={this.handleGoHome} 
                      variant="default" 
                      className="flex-1"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Go Home
                    </Button>
                    <Button 
                      onClick={this.handleRefresh} 
                      variant="outline" 
                      className="flex-1"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return this.renderErrorUI();
    }

    return this.props.children;
  }

  public componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }
}

// Specialized error boundary components
export const PostErrorBoundary: React.FC<Omit<Props, 'level'>> = (props) => (
  <FeedErrorBoundary {...props} level="post" />
);

export const MediaErrorBoundary: React.FC<Omit<Props, 'level'>> = (props) => (
  <FeedErrorBoundary {...props} level="media" />
);

export const UIErrorBoundary: React.FC<Omit<Props, 'level'>> = (props) => (
  <FeedErrorBoundary {...props} level="ui" />
);