import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"

// Spinner Component
const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
      variant: {
        default: "text-primary",
        muted: "text-muted-foreground",
        white: "text-white",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  icon?: 'loader' | 'rotate'
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, icon = 'loader', ...props }, ref) => {
    const IconComponent = icon === 'loader' ? Loader2 : RotateCw
    
    return (
      <div ref={ref} {...props}>
        <IconComponent className={cn(spinnerVariants({ size, variant, className }))} />
      </div>
    )
  }
)
Spinner.displayName = "Spinner"

// Progress Bar Component
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
  showValue?: boolean
  animated?: boolean
}

const progressVariants = {
  size: {
    sm: "h-2",
    default: "h-3",
    lg: "h-4",
  },
  variant: {
    default: "bg-primary",
    success: "bg-accent",
    warning: "bg-primary",
    error: "bg-destructive",
  },
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value = 0, 
    max = 100, 
    size = 'default',
    variant = 'default',
    showValue = false,
    animated = false,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div className="space-y-2">
        {showValue && (
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <div
          ref={ref}
          className={cn(
            "w-full bg-muted rounded-full overflow-hidden",
            progressVariants.size[size],
            className
          )}
          {...props}
        >
          <div
            className={cn(
              "h-full rounded-full smooth-transition",
              progressVariants.variant[variant],
              animated && "animate-pulse"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }
)
Progress.displayName = "Progress"

// Full Page Loading Component
export interface LoadingPageProps {
  message?: string
  spinner?: boolean
}

export const LoadingPage = ({ message = "Loading...", spinner = true }: LoadingPageProps) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center space-y-4">
      {spinner && <Spinner size="xl" />}
      <p className="text-lg text-muted-foreground">{message}</p>
    </div>
  </div>
)

// Loading Overlay Component
export interface LoadingOverlayProps {
  loading: boolean
  children: React.ReactNode
  message?: string
  className?: string
}

export const LoadingOverlay = ({ 
  loading, 
  children, 
  message = "Loading...",
  className 
}: LoadingOverlayProps) => (
  <div className={cn("relative", className)}>
    {children}
    {loading && (
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 animate-fade-in">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    )}
  </div>
)

export { spinnerVariants }