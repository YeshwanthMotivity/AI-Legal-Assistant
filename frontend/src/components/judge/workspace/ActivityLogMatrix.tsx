import React from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Activity, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Terminal,
  BrainCircuit,
  Search,
  Zap,
  Cpu,
  Database,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditLog {
  id: string
  action: string
  extra_metadata: any
  created_at: string
}

interface ActivityLogMatrixProps {
  logs: AuditLog[]
  onClose: () => void
  isOpen: boolean
  isLoading?: boolean
}

const ActivityLogMatrix = ({ logs, onClose, isOpen, isLoading }: ActivityLogMatrixProps) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  if (!isOpen) return null

  const handleDownload = () => {
    const headers = ["ID", "Phase", "Action", "Node", "Description", "Timestamp"]
    const rows = logs.map(log => {
      const phase = log.extra_metadata?.phase || 'General'
      const description = log.extra_metadata?.description || log.action.replace(/_/g, ' ')
      const node = log.extra_metadata?.node || 'N/A'
      return [
        log.id,
        phase,
        log.action,
        node,
        `"${description.replace(/"/g, '""')}"`,
        log.created_at
      ]
    })

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `audit_report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getPhaseIcon = (phase: string) => {
    switch (phase?.toLowerCase()) {
      case 'case_creation':
        return <FileText className="w-4 h-4" />
      case 'evidence_upload':
        return <Database className="w-4 h-4" />
      case 'evidence_discovery':
        return <Search className="w-4 h-4" />
      case 'vector_retrieval':
        return <Cpu className="w-4 h-4" />
      case 'precedent_analysis':
        return <ShieldCheck className="w-4 h-4" />
      case 'legal_validation':
        return <CheckCircle2 className="w-4 h-4" />
      case 'numerical_analysis':
        return <Zap className="w-4 h-4" />
      case 'legal_reasoning':
        return <BrainCircuit className="w-4 h-4" />
      case 'judgment_drafting':
        return <Terminal className="w-4 h-4" />
      case 'judicial_review':
        return <ShieldCheck className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getPhaseColor = (phase: string) => {
    switch (phase?.toLowerCase()) {
      case 'case_creation':
        return 'text-blue-500 bg-blue-50 border-blue-100'
      case 'evidence_upload':
        return 'text-amber-500 bg-amber-50 border-amber-100'
      case 'evidence_discovery':
        return 'text-emerald-500 bg-emerald-50 border-emerald-100'
      case 'vector_retrieval':
        return 'text-purple-500 bg-purple-50 border-purple-100'
      case 'precedent_analysis':
        return 'text-indigo-500 bg-indigo-50 border-indigo-100'
      case 'legal_validation':
        return 'text-green-500 bg-green-50 border-green-100'
      case 'numerical_analysis':
        return 'text-rose-500 bg-rose-50 border-rose-100'
      case 'legal_reasoning':
        return 'text-cyan-500 bg-cyan-50 border-cyan-100'
      case 'judgment_drafting':
        return 'text-slate-500 bg-slate-50 border-slate-100'
      case 'judicial_review':
        return 'text-amber-500 bg-amber-50 border-amber-100'
      default:
        return 'text-primary bg-primary/5 border-primary/10'
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-white animate-in slide-in-from-right duration-500 shadow-2xl", isRTL ? "text-right" : "text-left")}>
      <header className="p-8 border-b border-border/10 bg-muted/5 flex items-center justify-between">
        <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
          <div className="w-12 h-12 bg-primary text-on-primary rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight uppercase leading-none">Activity Logs</h2>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1.5 opacity-40">High-Fidelity Audit Trail</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 shadow-lg shadow-primary/10 transition-all"
            disabled={logs.length === 0}
          >
            <Clock className="w-3.5 h-3.5" />
            Download Report
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100">Close</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {isLoading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
             <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Synchronizing Matrix...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
             <Activity className="w-16 h-16 mb-4 animate-pulse" />
             <p className="text-xs font-black uppercase tracking-[0.4em]">Awaiting Analysis Events...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {logs.map((log, i) => {
              const phase = log.extra_metadata?.phase || 'General'
              const description = log.extra_metadata?.description || log.action.replace(/_/g, ' ')
              // Ensure the timestamp is treated as UTC if it doesn't have a timezone suffix
              const utcDateString = log.created_at.includes('T') ? 
                (log.created_at.endsWith('Z') || log.created_at.includes('+') ? log.created_at : `${log.created_at}Z`) :
                `${log.created_at.replace(' ', 'T')}Z`
              
              const timestamp = new Date(utcDateString)
              const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

              return (
                <div key={log.id} className={cn("group relative pl-8 border-l border-border/60 hover:border-primary/40 transition-colors", isRTL && "pl-0 pr-8 border-l-0 border-r")}>
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute top-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center shadow-md group-hover:scale-125 transition-transform",
                    isRTL ? "right-[-9px]" : "left-[-9px]",
                    i === 0 ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                  )} />
                  
                  <div className="space-y-3">
                    <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                       <div className={cn(
                         "flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest leading-none",
                         getPhaseColor(phase)
                       )}>
                          {getPhaseIcon(phase)}
                          {phase.replace(/_/g, ' ')}
                       </div>
                       <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest tabular-nums">
                          <Clock className="w-3 h-3" />
                          {timeStr}
                       </div>
                    </div>
                    
                    <div className="bg-muted/5 border border-border/40 p-4 rounded-2xl group-hover:border-primary/20 transition-all group-hover:shadow-lg group-hover:shadow-primary/5">
                       <p className="text-[13px] font-bold text-foreground leading-relaxed antialiased">
                          {description}
                       </p>
                       {log.extra_metadata?.node && (
                         <div className={cn("mt-3 flex items-center gap-2", isRTL && "flex-row-reverse")}>
                            <Zap className="w-2.5 h-2.5 text-primary opacity-40" />
                            <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] opacity-60">
                               Logical Node: {log.extra_metadata.node}
                            </span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <footer className="p-6 border-t border-border/10 bg-muted/5">
         <div className={cn("flex items-center justify-between text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]", isRTL && "flex-row-reverse")}>
            <span>System Status: Online</span>
            <span>Total Events: {logs.length}</span>
         </div>
      </footer>
    </div>
  )
}

export default ActivityLogMatrix
