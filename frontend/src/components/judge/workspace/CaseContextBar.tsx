import { useTranslation } from 'react-i18next'
import { Sparkles, CheckCircle2, AlertCircle, Clock, Gavel, FileCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CaseContextBarProps {
  caseNumber: string
  title: string
  status: string
  confidence: number
  isActivelyLoading: boolean
  onRunAnalysis: () => void
  onFinalize: () => void
}

const CaseContextBar = ({
  caseNumber,
  title,
  status,
  confidence,
  isActivelyLoading,
  onRunAnalysis,
  onFinalize
}: CaseContextBarProps) => {
  const { t } = useTranslation()
  const confidencePct = Math.round(confidence > 1 ? confidence : confidence * 100)

  const getStatusConfig = (s: string) => {
    const normalized = s.toLowerCase()
    if (normalized.includes('ready') || normalized.includes('complete')) {
      return { label: 'Analysis Ready', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
    }
    if (normalized.includes('pending') || normalized.includes('processing')) {
      return { label: 'Processing', icon: Clock, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' }
    }
    return { label: 'Action Required', icon: AlertCircle, color: 'bg-error-container text-on-error-container border-error/20' }
  }

  const config = getStatusConfig(status)

  return (
    <div className="sticky top-0 z-40 w-full bg-surface-container/80 backdrop-blur-xl border-b border-outline-variant/30 px-8 py-4 mb-8 flex items-center justify-between shadow-sm rounded-b-2xl transition-all duration-300">
      <div className="flex items-center gap-6">
        <div>
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-0.5 block opacity-70">
            Case {caseNumber}
          </span>
          <h1 className="text-xl font-headline font-semibold text-primary dark:text-emerald-400 tracking-tight truncate max-w-md">
            {title}
          </h1>
        </div>

        <div className="h-10 w-px bg-outline-variant/20 mx-2" />

        <div className="flex items-center gap-4">
          <Badge className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border", config.color)}>
            <config.icon className="w-3.5 h-3.5" />
            {config.label}
          </Badge>

          <div className="flex flex-col gap-1">
             <div className="flex items-center justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                <span>AI Confidence</span>
                <span className="text-primary">{confidencePct}%</span>
             </div>
             <div className="h-1 w-32 bg-outline-variant/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)] transition-all duration-1000" 
                  style={{ width: `${confidencePct}%` }}
                />
             </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2 h-10 px-5 border-outline-variant/30 hover:bg-primary/5 text-primary text-[11px] font-bold uppercase tracking-widest transition-all"
          disabled={isActivelyLoading}
          onClick={onRunAnalysis}
        >
          <Sparkles className={cn("w-4 h-4", isActivelyLoading && "animate-spin text-tertiary")} />
          {isActivelyLoading ? "Synthesizing..." : "Run Analysis"}
        </Button>
        <Button 
          size="sm"
          className="gap-2 h-10 px-6 bg-primary text-on-primary text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          onClick={onFinalize}
        >
          <Gavel className="w-4 h-4" />
          Finalize Judgment
        </Button>
      </div>
    </div>
  )
}

export default CaseContextBar
