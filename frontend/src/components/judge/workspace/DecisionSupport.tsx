import { useTranslation } from 'react-i18next'
import { Gavel, AlertTriangle, ListChecks, ArrowRight, ShieldCheck, Sparkles, AlertCircle, FilePlus, Eye, MessageSquare, ThumbsUp, BookOpen, Scale } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DecisionSupportProps {
  analysis: any
  feedback: any
  setFeedback: (f: any) => void
  onFeedbackSubmit: () => void
  isSubmittingFeedback: boolean
}

const DecisionSupport = ({
  analysis,
  feedback,
  setFeedback,
  onFeedbackSubmit,
  isSubmittingFeedback
}: DecisionSupportProps) => {
  const { t } = useTranslation()

  if (!analysis) return null

  const outcome = analysis.outcome || 'Synthetic Validation Pending'
  const confidence = Math.round((analysis.confidence || 0) * 100)

  return (
    <aside className="w-full xl:w-96 flex flex-col gap-8 sticky top-24 overflow-y-auto max-h-[calc(100vh-120px)] scrollbar-hide">
      
      {/* JUDGE DECISION PANEL */}
      <Card className="shadow-2xl border-primary/20 bg-primary/5 dark:bg-primary/10 overflow-hidden relative rounded-3xl group">
        <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
        <CardHeader className="py-6 px-10 bg-primary/5 border-b border-primary/10">
           <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
              <ShieldCheck className="w-5 h-5" />
              Intelligence Core Prophecy
           </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
           <div className="space-y-6">
              <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">Probable Outcome Score</span>
                 <div className="flex items-center justify-between">
                    <h4 className="text-2xl font-headline font-semibold text-primary tracking-tight">{outcome}</h4>
                    <span className="text-xl font-headline font-bold text-primary">{confidence}%</span>
                 </div>
                 <div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary shadow-[0_0_12px_rgba(var(--primary),0.5)] transition-all duration-1000" style={{ width: `${confidence}%` }} />
                 </div>
              </div>

              <div className="pt-6 border-t border-primary/10">
                 <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Reasoning Core Validation</span>
                 </div>
                 <p className="text-[12px] font-bold text-on-surface leading-relaxed italic border-l-2 border-primary/20 pl-4">
                   The claimant's core arguments on Article 14 alignment found high correlation within the DIFC vector space.
                 </p>
              </div>

              <Button className="w-full bg-primary text-on-primary shadow-lg shadow-primary/30 h-11 rounded-xl font-bold uppercase tracking-widest text-[11px] group-hover:scale-[1.02] transition-all">
                 Generate Formal Draft
                 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
           </div>
        </CardContent>
      </Card>

      {/* RISK & CONFLICT ANALYSIS */}
      <Card className="shadow-lg border-error/20 bg-error-container/5 overflow-hidden rounded-3xl">
        <CardHeader className="bg-error-container/10 py-5 px-8 border-b border-error/20">
           <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-on-error-container">
              <AlertTriangle className="w-4 h-4" />
              Inherent Litigation Risks
           </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
           <div className="space-y-4">
              <div className="flex gap-4 items-start pb-4 border-b border-error/10">
                 <div className="w-8 h-8 rounded-lg bg-error-container/20 flex items-center justify-center text-on-error-container shrink-0 border border-error/20">
                    <BookOpen className="w-4 h-4" />
                 </div>
                 <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-on-error-container uppercase tracking-widest">Ambiguous Precedent</h5>
                    <p className="text-[11px] text-on-surface-variant font-medium leading-normal italic">Case #1229 showed conflicting reasoning regarding termination notice periods.</p>
                 </div>
              </div>
              <div className="flex gap-4 items-start opacity-70">
                 <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0 border border-outline-variant/30">
                    <Scale className="w-4 h-4" />
                 </div>
                 <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Procedural Check</h5>
                    <p className="text-[11px] text-on-surface-variant font-medium leading-normal italic">All necessary evidence clusters are validated and cross-referenced.</p>
                 </div>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* NEXT BEST ACTION */}
      <Card className="shadow-lg border-outline-variant/30 bg-surface-container-low overflow-hidden rounded-3xl">
        <CardHeader className="py-5 px-8 border-b border-outline-variant/30">
           <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-on-surface">
              <ListChecks className="w-4 h-4" />
              Optimal Sequential Protocol
           </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
           <div className="flex flex-col gap-3">
              <button className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest hover:border-primary/50 transition-all text-left group">
                 <div className="flex items-center gap-3">
                    <FilePlus className="w-4 h-4 text-primary" />
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Inject Salary Records</span>
                 </div>
                 <ArrowRight className="w-3.5 h-3.5 text-on-surface-variant opacity-30 group-hover:translate-x-1 transition-all" />
              </button>
              <button className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-lowest hover:border-primary/50 transition-all text-left group">
                 <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Audit Precedent #1229</span>
                 </div>
                 <ArrowRight className="w-3.5 h-3.5 text-on-surface-variant opacity-30 group-hover:translate-x-1 transition-all" />
              </button>
           </div>
        </CardContent>
      </Card>

      {/* AI Alignment Feedback (Collapsible in theory, integrated here) */}
      <Card className="shadow-lg border-outline-variant/10 bg-surface-container-lowest dark:bg-surface-container overflow-hidden rounded-3xl mt-4">
         <CardHeader className="py-4 px-8 border-b border-outline-variant/20 bg-tertiary/5">
            <CardTitle className="text-[10px] font-bold text-tertiary uppercase tracking-widest flex items-center gap-2">
               <MessageSquare className="w-3.5 h-3.5" />
               Validation Feedback
            </CardTitle>
         </CardHeader>
         <CardContent className="p-8">
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Reasoning Score</span>
                  <div className="flex gap-2">
                     {[1,2,3,4,5].map(n => (
                        <button 
                           key={n} 
                           onClick={() => setFeedback({...feedback, reasoning_quality_score: n})}
                           className={cn("w-6 h-6 rounded-md border text-[10px] font-bold transition-all", feedback.reasoning_quality_score >= n ? "bg-tertiary text-on-tertiary border-tertiary" : "bg-surface-container-low text-on-surface-variant border-outline-variant/30")}
                        >
                           {n}
                        </button>
                     ))}
                  </div>
               </div>
               <textarea 
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-tertiary/20 placeholder:italic transition-all resize-none h-24"
                  placeholder="Additional context for AI improvement..."
                  value={feedback.feedback_text}
                  onChange={(e) => setFeedback({...feedback, feedback_text: e.target.value})}
               />
               <Button 
                  className="w-full bg-tertiary text-on-tertiary h-10 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-tertiary/20"
                  onClick={onFeedbackSubmit}
                  disabled={isSubmittingFeedback}
               >
                  <ThumbsUp className="w-3.5 h-3.5 mr-2" />
                  Submit Validation
               </Button>
            </div>
         </CardContent>
      </Card>

    </aside>
  )
}

export default DecisionSupport
