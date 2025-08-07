import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from './button';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ModalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Modal error:', error, errorInfo);
    // TODO: Send to error tracking service
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  private handleClose = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60">
          <div className="relative w-full max-w-md bg-background rounded-lg shadow-lg border">
            <div className="absolute right-4 top-4">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={this.handleClose}
                aria-label="Close error dialog"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mb-4">
                There was an error with the modal. Please try again.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-4 p-3 bg-muted rounded-md text-left">
                  <p className="text-xs text-muted-foreground mb-1">Error details:</p>
                  <p className="text-xs font-mono text-destructive">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry} 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.handleClose} 
                  variant="default" 
                  size="sm" 
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}