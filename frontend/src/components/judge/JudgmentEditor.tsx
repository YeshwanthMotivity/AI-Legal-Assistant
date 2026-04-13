import { Terminal, Scale, History, User, Sparkles, Gavel, Target, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface JudgmentEditorProps {
  draftText: string
  onDraftChange: (text: string) => void
  confidence?: number
  caseNumber?: string
  claimantName?: string
  respondentName?: string
  filingDate?: string
  lawArticles?: string[]
  precedents?: string[]
  decision: string
  onDecisionChange: (val: string) => void
  compensation: string
  onCompensationChange: (val: string) => void
  onRegenerate: () => Promise<void>
}

const JudgmentEditor = ({
  draftText,
  onDraftChange,
  confidence,
  caseNumber,
  claimantName,
  respondentName,
  lawArticles = [],
  precedents = [],
  decision,
  onDecisionChange,
  compensation,
  onCompensationChange,
  onRegenerate,
}: JudgmentEditorProps) => {
  const { i18n, t } = useTranslation()
  const isAR = i18n.language === 'ar'

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Strategic Selection Workbench */}
      <div className="grid grid-cols-12 gap-10">
        
        {/* Left: Metadata Node */}
         <div className={cn("col-span-12 lg:col-span-8 bg-white p-12 rounded-[4rem] border border-border shadow-[0_4px_30px_rgba(0,0,0,0.02)] space-y-12", isAR ? "order-1" : "order-1")}>
            <header className={cn("flex items-center justify-between border-b border-border/40 pb-8", isAR ? "flex-row-reverse" : "flex-row")}>
               <div className={cn("flex items-center gap-6", isAR ? "flex-row-reverse" : "flex-row")}>
                 <div className="w-16 h-16 bg-[var(--primary)]/5 text-[var(--primary)] rounded-[1.75rem] border border-[var(--primary)]/10 flex items-center justify-center">
                   <Target className="w-8 h-8" />
                 </div>
                 <div className={isAR ? "text-right" : "text-left"}>
                   <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">{t('judge.workspace.judgmentWorkbench', 'Determination Workbench')}</h2>
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-3 bg-muted/40 w-fit px-3 py-1 rounded-full border border-border/40 ml-0 mr-auto">{t('judge.workspace.finalReasonedSynthesis', 'Final Reasoned Synthesis')}</p>
                 </div>
               </div>
               <div className={cn("flex flex-col gap-2", isAR ? "items-start" : "items-end")}>
                  <span className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest px-3 py-1 bg-[var(--primary)]/10 rounded-full border border-[var(--primary)]/20">{t('judge.workspace.confidence', 'CONFIDENCE')}: {Math.round(confidence || 0)}%</span>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">PROTOCOL: JUDICIAL-DETERMINATION-4.0</p>
               </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
               <div className="space-y-4">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block", isAR ? "text-right" : "text-left")}>{t('judge.workspace.finalOutcomeLabel', 'Final Directive Outcome')}</label>
                  <select 
                     className="w-full bg-muted/20 border border-border rounded-2xl px-6 h-16 text-sm font-black uppercase tracking-tight focus:border-[var(--primary)] outline-none transition-all cursor-pointer"
                     value={decision}
                     onChange={(e) => onDecisionChange(e.target.value)}
                  >
                     <option value="Awarded">{t('common.awarded', 'Awarded (Full/Partial)')}</option>
                     <option value="Dismissed">{t('common.dismissed', 'Dismissed (No Cause)')}</option>
                     <option value="Stayed">{t('common.stayed', 'Stayed (Pending Evidence)')}</option>
                     <option value="Settled">{t('common.settled', 'Settled (Mutual Consent)')}</option>
                  </select>
               </div>

               <div className="space-y-4">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block", isAR ? "text-right" : "text-left")}>{t('judge.workspace.awardedCompensation', 'Awarded Compensation (AED)')}</label>
                  <div className="relative group">
                     <input 
                       type="text" 
                       value={compensation}
                       onChange={(e) => onCompensationChange(e.target.value)}
                       className={cn("w-full bg-muted/20 border border-border rounded-2xl px-6 h-16 text-sm font-black uppercase tracking-tight focus:border-[var(--primary)] outline-none transition-all placeholder:opacity-30", isAR ? "text-right pr-6 pl-12" : "text-left pl-6 pr-12")}
                       placeholder="e.g. 50,000.00"
                     />
                     <div className={cn("absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]", isAR ? "left-4" : "right-4")}><CheckCircle2 className="w-4 h-4" /></div>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className={cn("text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block", isAR ? "text-right" : "text-left")}>{t('judge.workspace.verificationBadge', 'Verification Badge')}</label>
                  <div className={cn("h-16 flex items-center gap-4 bg-[var(--primary)]/10 rounded-2xl border border-[var(--primary)]/20 px-6", isAR ? "flex-row-reverse" : "flex-row")}>
                     <ShieldCheck className="w-6 h-6 text-[var(--primary)]" />
                     <div className={cn("font-black tracking-tighter uppercase leading-none", isAR ? "text-right" : "text-left")}>
                        <p className="text-[8px] opacity-60 text-[var(--primary)] mb-1">{t('judge.workspace.humanValidation', 'Human Validation')}</p>
                        <p className="text-[10px] text-[var(--primary)]">{t('judge.workspace.officerConfirmed', 'Officer Confirmed')}</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <label className={cn("text-[10px] font-black uppercase tracking-widest text-[var(--primary)] flex items-center gap-3", isAR ? "flex-row-reverse" : "flex-row")}>
                  <Terminal className="w-4 h-4" /> {t('judge.workspace.reasonedConsensus', 'Reasoned Finality Corpus')}
               </label>
              <div className="rounded-[2rem] border border-border overflow-hidden bg-white shadow-inner quill-dashboard-wrapper">
                <style>{`
                  .quill-dashboard-wrapper .ql-toolbar { border: none; border-bottom: 1px solid #f1f5f9; background: #fafafa; padding: 15px; border-radius: 2rem 2rem 0 0; }
                  .quill-dashboard-wrapper .ql-container { 
                    border: none; 
                    font-family: ${isAR ? "'Cairo', sans-serif" : "'JetBrains Mono', monospace"}; 
                    font-size: 13px; 
                    line-height: 1.8; 
                    color: #1e293b; 
                    padding: 20px; 
                    min-height: 400px;
                    direction: ${isAR ? 'rtl' : 'ltr'};
                    text-align: ${isAR ? 'right' : 'left'};
                  }
                  .quill-dashboard-wrapper .ql-editor { font-weight: 500; font-style: ${isAR ? 'normal' : 'italic'}; }
                `}</style>
                <ReactQuill 
                  theme="snow" 
                  value={draftText} 
                  onChange={onDraftChange}
                  placeholder={isAR ? "بدء صياغة الحكم..." : "Initiating reasoned drafting node..."}
                  style={{ direction: isAR ? 'rtl' : 'ltr' }}
                />
              </div>
           </div>
        </div>

        {/* Right: Synthesis Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-10 order-2">
           <div className="bg-white p-12 rounded-[4rem] border border-border shadow-[0_4px_30px_rgba(0,0,0,0.02)] space-y-10">
              <h3 className={cn("text-[10px] font-black uppercase tracking-[0.25em] text-[var(--primary)] flex items-center gap-3", isAR ? "flex-row-reverse" : "flex-row")}>
                <History className="w-4 h-4" /> {t('judge.workspace.caseGrounding', 'Case Grounding Check')}
              </h3>
              <div className="space-y-10">
                 <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Designated Registry ID</p>
                    <p className="text-xl font-black tracking-tighter text-foreground uppercase tabular-nums">{caseNumber}</p>
                 </div>
                 <div className="space-y-8">
                    <div>
                       <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 mb-3 uppercase">Claimant Presence</p>
                       <p className="text-sm font-black text-foreground uppercase tracking-tight">{claimantName}</p>
                    </div>
                    <div className="w-10 h-px bg-muted/60" />
                    <div>
                       <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 mb-3 uppercase">Respondent Status</p>
                       <p className="text-sm font-black text-foreground uppercase tracking-tight">{respondentName}</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-[#F8FAFC] p-12 rounded-[4rem] border border-[var(--border-color)] space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:scale-150 transition-transform duration-1000 rotate-12">
                 <Scale className="w-24 h-24 text-[var(--primary)]" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--primary)]">Referenced Corpus</h3>
              <div className="space-y-8 relative z-10">
                 <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 italic">Statutory Citation Mapping</p>
                    <div className="flex flex-wrap gap-2">
                       {lawArticles.map((art, i) => (
                         <Badge key={i} className="bg-white border-border text-foreground font-black text-[9px] h-8 px-3 rounded-xl uppercase tracking-widest shadow-sm">
                            {art}
                         </Badge>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40 italic">Matched Precedent Analysis</p>
                    <div className="flex flex-col gap-3">
                       {precedents.map((p, i) => (
                         <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-border shadow-sm group-hover:border-[var(--primary)]/30 transition-all">
                            <div className="p-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg"><Gavel className="w-3 h-3" /></div>
                            <span className="text-[10px] font-bold text-foreground uppercase tracking-tight truncate">{p}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>

    </div>
  )
}

export default JudgmentEditor
