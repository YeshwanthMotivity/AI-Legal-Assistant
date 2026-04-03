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
      className={`group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 p-5 transition-all duration-300 hover:border-tertiary/40 hover:-translate-y-1 ${className}`}
    >
      {/* Subtle Gold Hover Glow */}
      <div className="absolute inset-0 bg-tertiary opacity-0 group-hover:opacity-5 transition-opacity duration-500 blur-xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-primary group-hover:text-tertiary transition-colors">
            {icon}
          </div>
          <h3 className="font-headline font-semibold text-on-surface text-lg">{title}</h3>
        </div>
        
        {items && items.length > 0 && (
          <ul className="space-y-2 mt-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-on-surface-variant/80 font-light leading-relaxed">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/40 flex-shrink-0" />
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
