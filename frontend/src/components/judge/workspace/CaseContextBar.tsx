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
 <header className="px-10 py-6 border-b border-border flex justify-between items-center bg-[var(--bg-surface)]/70 backdrop-blur-md sticky top-0 z-40">
 <div className="flex-1 min-w-0">
 <nav className="flex items-center gap-2 text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-[0.2em]">
 <span>Judicial</span>
 <ChevronRight className="w-3 h-3 opacity-30"/>
 <span>Case Portfolio</span>
 <ChevronRight className="w-3 h-3 opacity-30"/>
 <span className="text-[var(--primary)] truncate">{caseNumber}</span>
 </nav>
 <div className="flex items-center gap-4">
 <h1 className="text-2xl font-black tracking-tight text-foreground truncate max-w-2xl leading-none">
 {title || 'Initializing Case...'}
 </h1>
 <Badge variant="outline"className="text-[10px] uppercase font-black border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/5 px-2 h-6">
 <PlayCircle className="w-3 h-3 mr-1.5"/> LIVE SESSION
 </Badge>
 </div>
 </div>

 <div className="flex items-center gap-4 shrink-0">
 <div className="flex items-center gap-2 border-r border-border/40 pr-4 mr-2">
 <LanguageToggle />
 </div>
 <div className="flex flex-col items-end mr-4 border-r border-border pr-6">
 <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">AI Grounding</span>
 <span className="text-xs font-black text-[var(--primary)]">{confidence ? `${Math.round(confidence)}% Precision` : 'Analyzing...'}</span>
 </div>

 <Button
 variant="outline"
 className="gap-2 h-11 px-5 border-border bg-[var(--bg-surface)] shadow-sm hover:bg-muted font-black text-[11px] uppercase tracking-widest transition-all rounded-xl"
 disabled={isActivelyLoading}
 onClick={onRunAnalysis}
 >
 <Sparkles className={cn('w-4 h-4 text-[var(--primary)]', isActivelyLoading && 'animate-spin')} />
 {isActivelyLoading ? 'Synthesizing...' : 'Run Synthesis'}
 </Button>

 <Button
 className="gap-2 h-11 px-6 bg-[var(--primary)] text-white shadow-lg hover:bg-[var(--primary-hover)] hover:scale-[1.02] active:scale-[0.98] font-black text-[11px] uppercase tracking-widest transition-all rounded-xl"
 onClick={onFinalize}
 >
 <Gavel className="w-4 h-4"/>
 Finalize Outcome
 </Button>

 <Button
 variant="outline"
 className="w-11 h-11 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 border-border rounded-xl transition-all"
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
