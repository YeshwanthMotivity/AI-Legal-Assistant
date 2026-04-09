import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = ({ children, open, onOpenChange }: { children: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) => {
  if (open === false) return null;
  return <>{children}</>;
}

const DialogTrigger = ({ children, asChild, onClick }: { children: React.ReactNode, asChild?: boolean, onClick?: () => void }) => {
  return <div onClick={onClick} className="cursor-pointer">{children}</div>;
}

const DialogContent = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={cn("relative bg-background p-6 shadow-lg rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300", className)}>
        {children}
      </div>
    </div>
  )
}

const DialogHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)}>{children}</div>
)

const DialogFooter = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)}>{children}</div>
)

const DialogTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h2>
)

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
}
