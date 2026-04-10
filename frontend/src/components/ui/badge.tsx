import * as React from"react"
import { cva, type VariantProps } from"class-variance-authority"
import { cn } from"@/lib/utils"

const badgeVariants = cva(
"inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
 {
 variants: {
 variant: {
 default:
"border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/80",
 secondary:
"border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
 destructive:
"border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
 outline:"text-foreground border-border/50",
 success:"border-transparent bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
 warning:"border-transparent bg-amber-500/10 text-amber-600 border-amber-500/20",
 },
 },
 defaultVariants: {
 variant:"default",
 },
 }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> {
  children?: React.ReactNode;
}

function Badge({ className, variant, ...props }: BadgeProps) {
 return (
 <div className={cn(badgeVariants({ variant }), className)} {...props} />
 )
}

export { Badge, badgeVariants }
