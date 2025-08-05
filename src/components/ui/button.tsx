import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90 active:scale-95",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-95",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-95",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-95",
        ghost: "hover:bg-accent hover:text-accent-foreground active:scale-95",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-primary text-white shadow-lg hover:shadow-glow active:scale-95",
        premium: "bg-gradient-secondary text-white shadow-lg hover:shadow-glow active:scale-95 relative overflow-hidden before:absolute before:inset-0 before:bg-white/10 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        floating: "bg-background/80 backdrop-blur-sm border shadow-lg hover:shadow-xl hover:bg-background/90 active:scale-95",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-9 w-9",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // When using asChild (Slot), we need to ensure we only pass one child
    const buttonContent = loading ? (
      <>
        <Loader2 className="animate-spin" />
        {loadingText || "Loading..."}
      </>
    ) : children

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {buttonContent}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
