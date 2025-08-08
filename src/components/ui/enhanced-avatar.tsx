import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        sm: "h-8 w-8",
        default: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
        "2xl": "h-20 w-20",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const avatarImageVariants = cva("aspect-square h-full w-full object-cover")

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium",
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
        xl: "text-lg",
        "2xl": "text-xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface EnhancedAvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  fallback?: string
  status?: 'online' | 'offline' | 'away' | 'busy'
  showStatus?: boolean
}

const EnhancedAvatar = React.forwardRef<HTMLDivElement, EnhancedAvatarProps>(
  ({ className, size, src, alt, fallback, status, showStatus = false, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)
    
    const getInitials = (name?: string) => {
      if (!name) return ""
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }

    const statusColors = {
      online: "bg-accent",
      offline: "bg-muted-foreground/60",
      away: "bg-primary",
      busy: "bg-destructive",
    }

    return (
      <div 
        className={cn(avatarVariants({ size, className }))} 
        ref={ref} 
        {...props}
      >
        {src && !imageError ? (
          <img
            className={avatarImageVariants()}
            src={src}
            alt={alt || "Avatar"}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={avatarFallbackVariants({ size })}>
            {fallback ? (
              getInitials(fallback)
            ) : (
              <User className={cn(
                "text-muted-foreground",
                size === "sm" && "h-3 w-3",
                size === "default" && "h-4 w-4",
                size === "lg" && "h-5 w-5",
                size === "xl" && "h-6 w-6",
                size === "2xl" && "h-8 w-8"
              )} />
            )}
          </div>
        )}
        
        {showStatus && status && (
          <div
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-2 border-background",
              statusColors[status],
              size === "sm" && "h-2 w-2",
              size === "default" && "h-3 w-3",
              size === "lg" && "h-3 w-3",
              size === "xl" && "h-4 w-4",
              size === "2xl" && "h-5 w-5"
            )}
          />
        )}
      </div>
    )
  }
)
EnhancedAvatar.displayName = "EnhancedAvatar"

export { EnhancedAvatar, avatarVariants }