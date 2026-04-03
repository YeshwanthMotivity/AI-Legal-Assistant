import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Gavel, Trash2, AlertTriangle, ChevronRight, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import LanguageToggle from '../../LanguageToggle'

interface CaseContextBarProps {
 caseNumber: string
 title: string
 status?: string
 confidence?: number
 isActivelyLoading: boolean
 isDeleting?: boolean
 onRunAnalysis: () => void
 onFinalize: () => void
 onDelete: () => void
}

const CaseContextBar = ({
 caseNumber,
 title,
 status,
 confidence,
 isActivelyLoading,
 isDeleting = false,
 onRunAnalysis,
 onFinalize,
 onDelete,
}: CaseContextBarProps) => {
 const { t } = useTranslation()
 const [showConfirm, setShowConfirm] = useState(false)

 const handleDeleteClick = () => setShowConfirm(true)
 const handleConfirm = () => {
 setShowConfirm(false)
 onDelete()
 }
 const handleCancel = () => setShowConfirm(false)

 return (
 <>
  <header className="px-6 py-0 border-b border-[var(--border-color)] bg-[var(--bg-surface)] sticky top-0 z-40 shrink-0">
    {/* Row 1: breadcrumb + actions */}
    <div className="flex justify-between items-center h-10 border-b border-[var(--border-color)]/40">
      <nav className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        <span>Judicial</span>
        <ChevronRight className="w-3 h-3 opacity-40"/>
        <span>Case Portfolio</span>
        <ChevronRight className="w-3 h-3 opacity-40"/>
        <span className="text-[var(--primary)]">{caseNumber}</span>
      </nav>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 mr-2">
          <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">AI Grounding:</span>
          <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-tight">
            {confidence ? `${Math.round(confidence)}% Precision` : 'Analyzing...'}
          </span>
        </div>
        <LanguageToggle />
      </div>
    </div>

    {/* Row 2: title + action buttons */}
    <div className="flex justify-between items-center h-12">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base font-bold text-foreground truncate max-w-[480px]">
          {title || 'Initializing Case...'}
        </h1>
        <Badge variant="outline" className="shrink-0 text-[10px] font-black border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/5 px-2.5 h-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mr-1.5 animate-pulse"/>
          Live Session
        </Badge>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          className="h-8 px-4 text-[10px] font-bold border border-[var(--border-color)] rounded-lg hover:border-[var(--primary)]/40 flex items-center gap-2 uppercase tracking-widest transition-all"
          disabled={isActivelyLoading}
          onClick={onRunAnalysis}
        >
          <Sparkles className={cn("w-3.5 h-3.5 text-[var(--primary)]", isActivelyLoading && "animate-spin")} />
          {isActivelyLoading ? 'Synthesizing...' : 'Run Analysis'}
        </Button>

        <Button
          className="h-8 px-4 text-[10px] font-bold bg-[var(--primary)] text-white rounded-lg flex items-center gap-2 uppercase tracking-widest hover:bg-[var(--primary-hover)] transition-all"
          onClick={onFinalize}
        >
          <Gavel className="w-3.5 h-3.5"/>
          Finalize Outcome
        </Button>

        <Button
          variant="outline"
          className="h-8 w-8 p-0 border border-[var(--border-color)] rounded-lg flex items-center justify-center hover:border-red-400/40 hover:text-red-500 transition-all text-muted-foreground"
          disabled={isDeleting}
          onClick={handleDeleteClick}
        >
          {isDeleting ? (
            <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"/>
          ) : (
            <Trash2 className="w-3.5 h-3.5"/>
          )}
        </Button>
      </div>
    </div>
  </header>

 {/* Confirmation Dialog (matching dashboard style) */}
 {showConfirm && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
 <div className="bg-[var(--bg-surface)] border border-border rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full mx-4 animate-in zoom-in-95 duration-300">
 <div className="flex flex-col items-center text-center gap-6">
 <div className="w-20 h-20 rounded-[2rem] bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
 <AlertTriangle className="w-10 h-10 text-red-600"/>
 </div>
 <div className="space-y-2">
 <h3 className="text-xl font-black text-foreground uppercase tracking-tight">
 Tear Down Workspace?
 </h3>
 <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
 This will permanently redact all digital footprints and evidence associated with this proceeding.
 </p>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4 mt-10">
 <Button
 variant="outline"
 className="h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] border-border"
 onClick={handleCancel}
 >
 Abort
 </Button>
 <Button
 className="h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-red-500/20"
 onClick={handleConfirm}
 >
 Confirm Redaction
 </Button>
 </div>
 </div>
 </div>
 )}
 </>
 )
}

export default CaseContextBar
