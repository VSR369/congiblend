import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-accent text-accent-foreground shadow hover:bg-accent/90",
        warning: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/90",
        info: "border-transparent bg-accent text-accent-foreground shadow hover:bg-accent/90",
        count: "border-transparent bg-destructive text-destructive-foreground shadow min-w-[1.25rem] h-5 rounded-full px-1",
      },
      size: {
        default: "text-xs",
        sm: "text-xs px-2 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean
  onRemove?: () => void
  count?: number
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, removable = false, onRemove, count, children, ...props }, ref) => {
    const content = count !== undefined ? count : children

    return (
      <div className={cn(badgeVariants({ variant, size }), className)} ref={ref} {...props}>
        {content}
        {removable && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-1 -mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/20 focus:outline-none"
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }
)
Badge.displayName = "Badge"

// Pre-built badge components
export const StatusBadge = ({ 
  status, 
  ...props 
}: { status: 'active' | 'inactive' | 'pending' | 'error' } & Omit<BadgeProps, 'variant'>) => {
  const statusVariants = {
    active: 'success',
    inactive: 'secondary',
    pending: 'warning',
    error: 'destructive',
  } as const

  return <Badge variant={statusVariants[status]} {...props} />
}

export const CountBadge = ({ 
  count, 
  max = 99, 
  ...props 
}: { count: number; max?: number } & Omit<BadgeProps, 'variant' | 'count'>) => {
  const displayCount = count > max ? `${max}+` : count.toString()
  
  return (
    <Badge variant="count" {...props}>
      {displayCount}
    </Badge>
  )
}

export { Badge, badgeVariants }