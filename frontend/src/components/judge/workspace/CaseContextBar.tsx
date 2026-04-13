import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Gavel, Trash2, AlertTriangle, ChevronRight, PlayCircle, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import LanguageToggle from '../../LanguageToggle'

interface CaseContextBarProps {
  caseId: string
  caseNumber: string
  title: string
  status?: string
  confidence?: number
  isActivelyLoading: boolean
  isDeleting?: boolean
  onRunAnalysis?: () => void
  onFinalize?: () => void
  onDelete: () => void
  onOpenActivity?: () => void
}

const CaseContextBar = ({
  caseId,
  caseNumber,
  title,
  status,
  confidence,
  isActivelyLoading,
  isDeleting = false,
  onRunAnalysis,
  onFinalize,
  onDelete,
  onOpenActivity,
}: CaseContextBarProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDeleteClick = () => setShowConfirm(true)
  const handleConfirm = () => {
    setShowConfirm(false)
    onDelete()
  }
  const handleCancel = () => setShowConfirm(false)

 return (
 <>
  <header className="border-b border-[var(--border-color)] bg-[var(--bg-surface)] shrink-0">
    <div className="max-w-[1640px] mx-auto px-6">
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
          <button 
            onClick={onOpenActivity}
            className="flex items-center gap-2 text-[10px] font-black text-primary hover:text-primary/70 transition-colors uppercase tracking-[0.2em]"
          >
            <Activity className="w-3.5 h-3.5" />
            {t('judge.workspace.aiActivityLogs', 'AI Activity Logs')}
          </button>
          <div className="w-px h-4 bg-border/40" />
          <div className="flex items-center gap-3 mr-2 bg-[var(--primary)]/5 px-2 py-1 rounded-md border border-[var(--primary)]/10">
            <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40">AI Grounding:</span>
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm",
                confidence ? "bg-[var(--primary)] text-white" : "bg-[var(--primary)] text-white animate-pulse"
              )}>
                {confidence ? `${Math.round(confidence)}% PRECISION` : 'ANALYZING...'}
              </span>
            </div>
          </div>
          <LanguageToggle />
        </div>
      </div>

      {/* Row 2: title + action buttons */}
      <div className="flex justify-between items-center h-12">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="text-lg font-black text-foreground truncate max-w-[540px] uppercase tracking-tight">
            {title || 'Initializing Case...'}
          </h1>
          <Badge variant="outline" className="shrink-0 text-[9px] font-black border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/5 px-2.5 h-6 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mr-2 animate-pulse"/>
            Live Session
          </Badge>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onRunAnalysis && (
          <Button
            variant="outline"
            className="h-9 px-5 text-[10px] font-black border-2 border-[var(--border-color)] rounded-xl hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 flex items-center gap-2.5 uppercase tracking-widest transition-all shadow-sm"
            disabled={isActivelyLoading}
            onClick={onRunAnalysis}
          >
            <Sparkles className={cn("w-4 h-4 text-[var(--primary)]", isActivelyLoading && "animate-spin")} />
            {isActivelyLoading ? t('judge.workspace.analysing', 'Analysing...') : 'Run Analysis'}
          </Button>
          )}

          {onFinalize && (
            <Button
              className="h-9 px-5 text-[10px] font-black bg-[var(--primary)] text-white rounded-xl flex items-center gap-2.5 uppercase tracking-widest hover:bg-[var(--primary-hover)] transition-all shadow-md shadow-[var(--primary)]/20"
              onClick={onFinalize}
            >
              <Gavel className="w-4 h-4"/>
              Finalize Judgment
            </Button>
          )}

          <Button
            variant="outline"
            className="h-9 w-9 p-0 border-2 border-[var(--border-color)] rounded-xl flex items-center justify-center hover:border-red-400/40 hover:text-red-500 hover:bg-red-50 transition-all text-muted-foreground shadow-sm"
            disabled={isDeleting}
            onClick={handleDeleteClick}
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin"/>
            ) : (
              <Trash2 className="w-4 h-4"/>
            )}
          </Button>
        </div>
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
 Delete Case?
 </h3>
 <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
 This will permanently delete all files and information for this case.
 </p>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4 mt-10">
 <Button
 variant="outline"
 className="h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] border-border"
 onClick={handleCancel}
 >
 Cancel
 </Button>
 <Button
 className="h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-red-500/20"
 onClick={handleConfirm}
 >
 Confirm Delete
 </Button>
 </div>
 </div>
 </div>
 )}
 </>
 )
}

export default CaseContextBar
