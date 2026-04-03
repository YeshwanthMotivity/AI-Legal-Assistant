import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Gavel, Sparkles, AlertTriangle, CheckCircle2, Verified, Scale, History, User, Terminal, ChevronRight, PlayCircle, Target, ShieldCheck } from 'lucide-react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface JudgmentEditorProps {
  draftText: string
  confidence?: number
  isSubmitting?: boolean
  caseId?: string
  caseNumber?: string
  claimantName?: string
  respondentName?: string
  filingDate?: string
  lawArticles?: string[]
  precedents?: string[]
  outcome?: string
  onRegenerate: () => Promise<void>
  onFinalize: (payload: any) => Promise<void>
}

const JudgmentEditor = ({
  draftText,
  confidence,
  isSubmitting,
  caseNumber,
  claimantName,
  respondentName,
  lawArticles = [],
  precedents = [],
  outcome: initialOutcome,
  onRegenerate,
  onFinalize,
}: JudgmentEditorProps) => {
  const { t } = useTranslation()
  const [text, setText] = useState(draftText)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [decision, setDecision] = useState(initialOutcome || 'Awarded')
  const [compensation, setCompensation] = useState('AED 0.00')

  useEffect(() => {
    setText(draftText)
  }, [draftText])

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      await onRegenerate()
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleFinalize = () => {
    onFinalize({
      judgmentText: text,
      decision,
      compensationAmount: compensation,
      reasoning: 'Finalized by judicial officer via workbench.'
    })
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Strategic Selection Workbench */}
      <div className="grid grid-cols-12 gap-10">
        
        {/* Left: Metadata Node */}
        <div className="col-span-12 lg:col-span-8 bg-white p-12 rounded-[4rem] border border-border shadow-[0_4px_30px_rgba(0,0,0,0.02)] space-y-12">
           <header className="flex items-center justify-between border-b border-border/40 pb-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-emerald-600/5 text-emerald-600 rounded-[1.75rem] border border-emerald-600/10 flex items-center justify-center">
                  <Target className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">Determination Workbench</h2>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-3 bg-muted/40 w-fit px-3 py-1 rounded-full border border-border/40">Final Reasoned Synthesis</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">CONFIDENCE: {Math.round(confidence || 0)}%</span>
                 <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">PROTOCOL: JUDICIAL-DETERMINATION-4.0</p>
              </div>
           </header>

           <div className="grid grid-cols-3 gap-10">
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block">Final Directive Outcome</label>
                 <select 
                    className="w-full bg-muted/20 border border-border rounded-2xl px-6 h-16 text-sm font-black uppercase tracking-tight focus:border-emerald-600 outline-none transition-all cursor-pointer"
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                 >
                    <option value="Awarded">Awarded (Full/Partial)</option>
                    <option value="Dismissed">Dismissed (No Cause)</option>
                    <option value="Stayed">Stayed (Pending Evidence)</option>
                    <option value="Settled">Settled (Mutual Consent)</option>
                 </select>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block">Awarded Compensation (AED)</label>
                 <div className="relative group">
                    <input 
                      type="text" 
                      value={compensation}
                      onChange={(e) => setCompensation(e.target.value)}
                      className="w-full bg-muted/20 border border-border rounded-2xl px-6 h-16 text-sm font-black uppercase tracking-tight focus:border-emerald-600 outline-none transition-all placeholder:opacity-30"
                      placeholder="e.g. 50,000.00"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"><CheckCircle2 className="w-4 h-4" /></div>
                 </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block">Verification Badge</label>
                 <div className="h-16 flex items-center gap-4 bg-emerald-50 rounded-2xl border border-emerald-100 px-6">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                    <div className="text-left font-black tracking-tighter uppercase leading-none">
                       <p className="text-[8px] opacity-60 text-emerald-800 mb-1">Human Validation</p>
                       <p className="text-[10px] text-emerald-800">Officer Confirmed</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-3">
                 <Terminal className="w-4 h-4" /> Reasoned Finality Corpus
              </label>
              <div className="rounded-[2rem] border border-border overflow-hidden bg-white shadow-inner quill-dashboard-wrapper">
                <style>{`
                  .quill-dashboard-wrapper .ql-toolbar { border: none; border-bottom: 1px solid #f1f5f9; background: #fafafa; padding: 15px; border-radius: 2rem 2rem 0 0; }
                  .quill-dashboard-wrapper .ql-container { border: none; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.8; color: #1e293b; padding: 20px; min-height: 400px; }
                  .quill-dashboard-wrapper .ql-editor { font-weight: 500; font-style: italic; }
                `}</style>
                <ReactQuill 
                  theme="snow" 
                  value={text} 
                  onChange={setText}
                  placeholder="Initiating reasoned drafting node..."
                />
              </div>
           </div>

           <div className="flex gap-4 pt-10 border-t border-border/40">
              <Button 
                className="h-16 px-10 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all flex-1"
                onClick={handleFinalize}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Redacting Final Response...' : 'Authorize and Store Verdict'}
              </Button>
              <Button 
                variant="outline"
                className="h-16 px-10 rounded-2xl font-black uppercase tracking-[0.2em] border-border hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                    <span>Synchronizing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4" />
                    <span>Cylix Regenerate</span>
                  </div>
                )}
              </Button>
           </div>
        </div>

        {/* Right: Synthesis Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-10">
           <div className="bg-white p-12 rounded-[4rem] border border-border shadow-[0_4px_30px_rgba(0,0,0,0.02)] space-y-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 flex items-center gap-3">
                <History className="w-4 h-4" /> Case Grounding Check
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

           <div className="bg-[#F8FAFC] p-12 rounded-[4rem] border border-emerald-100/40 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:scale-150 transition-transform duration-1000 rotate-12">
                 <Scale className="w-24 h-24 text-emerald-600" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600">Referenced Corpus</h3>
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
                         <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-border shadow-sm group-hover:border-emerald-600/30 transition-all">
                            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Gavel className="w-3 h-3" /></div>
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
