import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const Select = ({ children, onValueChange, defaultValue, value }: { children: React.ReactNode, onValueChange?: (value: string) => void, defaultValue?: string, value?: string }) => {
  return <div className="relative w-full">{children}</div>;
}

const SelectTrigger = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}>
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </div>
  )
}

const SelectValue = ({ placeholder, value }: { placeholder?: string, value?: string }) => {
  return <span className="truncate">{value || placeholder}</span>;
}

const SelectContent = ({ children }: { children: React.ReactNode }) => {
  return <div className="absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in zoom-in-95">{children}</div>;
}

const SelectItem = ({ children, value, onClick }: { children: React.ReactNode, value: string, onClick?: () => void }) => {
  return (
    <div 
      className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-muted"
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
}
