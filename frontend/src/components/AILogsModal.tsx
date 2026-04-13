import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Terminal, 
  Clock, 
  Activity, 
  BrainCircuit, 
  Zap, 
  History,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { getCaseActivity, CaseActivityLog } from '@/api/audit'
import { cn } from '@/lib/utils'

interface AILogsModalProps {
  isOpen: boolean
  onClose: () => void
  caseId: string
  currentPhase: number
}

const AILogsModal = ({ isOpen, onClose, caseId, currentPhase }: AILogsModalProps) => {
  const { t } = useTranslation()
  const { data: logs, isLoading } = useQuery({
    queryKey: ['case-activity', caseId],
    queryFn: () => getCaseActivity(caseId),
    enabled: isOpen && !!caseId,
    refetchInterval: 5000
  })

  const getPhaseIcon = (action: string) => {
    if (action.includes('analysis') || action.includes('orchestrator')) return BrainCircuit
    if (action.includes('upload') || action.includes('document')) return History
    if (action.includes('create')) return Zap
    return Activity
  }

  const getPhaseColor = (action: string) => {
    if (action.includes('analysis')) return 'text-primary bg-primary/10 border-primary/20'
    if (action.includes('upload')) return 'text-amber-600 bg-amber-50 border-amber-100'
    if (action.includes('error')) return 'text-rose-600 bg-rose-50 border-rose-100'
    return 'text-slate-600 bg-slate-50 border-slate-200'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-border/40 bg-muted/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">AI Activity Node Ledger</DialogTitle>
              <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mt-1">
                Real-time execution logs for Case ID: {caseId.split('-')[0]}...
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
              <Terminal className="w-10 h-10 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Kernel Logs...</p>
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
              <History className="w-10 h-10 text-muted-foreground" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Activity Recorded</p>
            </div>
          ) : (
            <div className="relative space-y-1">
              {/* Timeline Thread */}
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-border/40" />
              
              {logs.map((log, idx) => {
                const Icon = getPhaseIcon(log.action)
                const colorClass = getPhaseColor(log.action)
                
                return (
                  <div key={log.id} className="relative pl-14 py-4 group animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                    {/* Timeline Node */}
                    <div className={cn(
                      "absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border-4 border-white shadow-sm z-10 transition-transform group-hover:scale-125",
                      log.action.includes('error') ? 'bg-rose-500' : 'bg-primary'
                    )} />
                    
                    <div className={cn("p-5 rounded-[1.5rem] border transition-all hover:shadow-xl hover:shadow-primary/5 group/card bg-white", 
                      log.action.includes('error') ? 'border-rose-100 hover:border-rose-300' : 'border-border/60 hover:border-primary/30'
                    )}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover/card:rotate-12", colorClass)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{log.action.replace(/_/g, ' ')}</p>
                            <div className="flex items-center gap-2 mt-0.5 opacity-40">
                              <Clock className="w-3 h-3" />
                              <span className="text-[9px] font-bold tabular-nums">{new Date(log.created_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter opacity-40 px-2 py-0 border-border/60">
                          {log.resource_type}
                        </Badge>
                      </div>
                      
                      <div className="flex items-start gap-2.5">
                        <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-primary opacity-30 shrink-0" />
                        <p className={cn(
                          "text-[11px] font-medium leading-relaxed font-mono",
                          log.action.includes('error') ? 'text-rose-600/80' : 'text-muted-foreground'
                        )}>
                          {log.extra_metadata?.description || `Action ${log.action} executed by node ${log.user_id}`}
                        </p>
                      </div>

                      {log.extra_metadata && Object.keys(log.extra_metadata).length > 1 && (
                        <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-4">
                           {Object.entries(log.extra_metadata)
                             .filter(([key]) => key !== 'description')
                             .map(([key, val]: [string, any]) => (
                             <div key={key}>
                               <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest mb-1">{key}</p>
                               <p className="text-[10px] font-bold text-foreground truncate">{String(val)}</p>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border/40 bg-muted/10 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Immutable Ledger Node Active</span>
           </div>
           <button 
             onClick={onClose}
             className="px-6 h-9 bg-foreground text-background text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity"
           >
             Close Kernel
           </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AILogsModal
