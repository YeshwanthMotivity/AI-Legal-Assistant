import { ReactNode } from 'react'

interface ModuleCardProps {
  title: string
  icon: ReactNode
  items?: string[]
  className?: string
}

const ModuleCard = ({ title, icon, items, className = '' }: ModuleCardProps) => {
  return (
    <div 
      className={`group relative overflow-hidden rounded-2xl bg-bg-surface border border-border-subtle p-6 transition-all duration-500 hover:border-text-accent/40 hover:-translate-y-1.5 shadow-sm hover:shadow-xl ${className}`}
    >
      {/* Subtle Gold Hover Glow */}
      <div className="absolute inset-0 bg-text-accent opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700 blur-2xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-primary/5 border border-border-subtle flex items-center justify-center text-primary-royal group-hover:text-text-accent group-hover:bg-text-accent/5 transition-all duration-300">
            {icon}
          </div>
          <h3 className="font-headline font-bold text-text-primary text-xl tracking-tight">{title}</h3>
        </div>
        
        {items && items.length > 0 && (
          <ul className="space-y-3 mt-4">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-text-secondary font-medium leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-text-accent/40 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default ModuleCard
