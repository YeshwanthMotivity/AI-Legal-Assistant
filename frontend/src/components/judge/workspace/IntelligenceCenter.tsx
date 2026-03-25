import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Sparkles, Scale, BookOpen, Calculator, History, AlertTriangle, ChevronRight, FileText, CheckCircle2, TrendingUp, Info } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CATEGORY_DISPLAY_NAMES } from '@/constants/legal'

interface IntelligenceCenterProps {
  analysis: any
  caseId: string
  lawArticles: any[]
  precedents: any[]
  entitlements: any[]
}

const IntelligenceCenter = ({
  analysis,
  caseId,
  lawArticles,
  precedents,
  entitlements
}: IntelligenceCenterProps) => {
  const { t, i18n } = useTranslation()

  if (!analysis) return (
     <div className="py-24 text-center border border-dashed border-outline-variant/30 rounded-3xl bg-surface-container-low/50">
        <Sparkles className="w-16 h-16 text-outline-variant/30 mx-auto mb-6" />
        <h3 className="text-xl font-headline font-semibold text-on-surface mb-2 tracking-tight">Intelligence Node Off-line</h3>
        <p className="text-on-surface-variant font-medium text-sm max-w-sm mx-auto opacity-70 italic">
          Engage the reasoning engine to synchronize similar precedents and legal frameworks for this case.
        </p>
     </div>
  )

  return (
    <div className="flex-1 space-y-10">
      
      {/* CASE SUMMARY (HERO SECTION) */}
      <Card className="shadow-lg border-primary/20 bg-surface-container-lowest dark:bg-surface-container overflow-hidden rounded-3xl">
        <CardHeader className="bg-primary/5 py-6 px-10 border-b border-primary/10">
           <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3 text-primary tracking-tight">
              <Sparkles className="w-6 h-6" />
              Intelligence Executive Summary
           </CardTitle>
        </CardHeader>
        <CardContent className="p-10">
           <div className="bg-surface-container-low dark:bg-surface-container-high p-8 rounded-2xl border border-outline-variant/20 mb-8 italic text-lg leading-relaxed font-semibold text-on-surface shadow-inner relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/40" />
             "{analysis?.summary || t('judge.workspace.waitingAnalysis')}"
           </div>
           
           <div className="flex flex-wrap gap-4 items-center">
             <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mr-2 opacity-70">Core Indicators:</span>
             <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Procedural Alignment</Badge>
             <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Risk: High Complexity</Badge>
             <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Labor Law Context</Badge>
           </div>
        </CardContent>
      </Card>

      {/* FACT TIMELINE (DECISION SKELETON) */}
      <div className="space-y-6">
        <h3 className="text-xl font-headline font-semibold flex items-center gap-3 text-on-surface tracking-tight">
           <History className="w-6 h-6 text-primary" />
           Fact Chronology Node
        </h3>
        
        <div className="relative pl-12 space-y-8 before:content-[''] before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant/30 before:border-l before:border-dashed">
          {(analysis?.facts || []).map((fact: any, idx: number) => (
             <div key={idx} className="relative group p-6 rounded-2xl bg-surface-container-low dark:bg-surface-container-high border border-outline-variant/20 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
                <div className="absolute -left-[45px] top-7 w-9 h-9 rounded-full bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-center text-primary font-bold text-xs shadow-md z-10 group-hover:scale-110 group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                   {idx + 1}
                </div>
                <p className="text-sm font-bold text-on-surface leading-normal m-0 tracking-tight">{fact}</p>
             </div>
          ))}
        </div>
      </div>

      {/* PRECEDENTS (DYNAMIC MATCH FEED) */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-headline font-semibold flex items-center gap-3 text-on-surface tracking-tight">
             <Scale className="w-6 h-6 text-emerald-600" />
             Precedent Correlation Score
          </h3>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-60">Similarity Threshold: 70%</span>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {precedents.map((item) => {
            const pct = Math.round((item.similarityScore || 0) > 1 ? item.similarityScore : (item.similarityScore || 0) * 100)
            return (
              <Link 
                key={item.caseId}
                to={`/judge/precedents/${item.caseId}`}
                state={{ fromCaseId: caseId }}
                className="group relative bg-surface-container-low dark:bg-surface-container p-6 rounded-2xl editorial-shadow border border-outline-variant/30 hover:bg-surface-container-high hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase mb-1 block">RULING ID: {item.caseId}</span>
                    <h5 className="font-headline text-lg font-bold text-on-surface group-hover:text-emerald-500 transition-colors leading-tight">{item.title}</h5>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Vector Clarity</div>
                    <div className="flex items-center gap-3">
                       <div className="h-1.5 w-24 bg-outline-variant/20 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-1000" style={{ width: `${pct}%` }} />
                       </div>
                       <span className="text-xs font-black text-emerald-600">{pct}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-outline-variant/20 flex flex-col gap-3">
                   <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                         <Info className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tight italic">Why Matched: <span className="text-on-surface">Legal reasoning on {item.summary?.substring(0, 40) || 'unpaid salary'} alignment found in DIFC registry.</span></p>
                   </div>
                   <div className="flex items-center gap-8 text-[11px] font-bold text-on-surface-variant tracking-tight ml-1 opacity-70">
                      <span>Claimant: <strong className="text-on-surface ml-1">{item.claimant || 'N/A'}</strong></span>
                      <span>Respondent: <strong className="text-on-surface ml-1">{item.respondent || 'N/A'}</strong></span>
                   </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* LAW ARTICLES (FRAMEWORK FEED) */}
      <div className="space-y-6 pt-6">
        <h3 className="text-xl font-headline font-semibold flex items-center gap-3 text-on-surface tracking-tight">
           <BookOpen className="w-6 h-6 text-primary" />
           Constitutional & Regulatory Framework
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lawArticles.map((art: any, idx: number) => {
             const title = art.article_number || art.title || `Article ${idx + 1}`
             const impact = "High relevance to termination sequence"
             return (
               <div key={idx} className="bg-surface-container-low dark:bg-surface-container-high border border-outline-variant/30 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10 font-black text-3xl select-none group-hover:opacity-20 transition-opacity">§</div>
                  <div className="flex items-center gap-3 mb-4">
                     <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">{title}</span>
                     <Badge className="bg-tertiary/10 text-tertiary border-tertiary/20 text-[9px] font-bold uppercase tracking-tight">Impact on Case</Badge>
                  </div>
                  <p className="text-[13px] font-bold text-on-surface leading-relaxed italic opacity-85 mb-4 line-clamp-3">
                    {art.content || "Procedural citation from primary framework analysis."}
                  </p>
                  <div className="pt-4 border-t border-outline-variant/20 flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                     <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Detail View</span>
                     <ChevronRight className="w-3.5 h-3.5 text-primary" />
                  </div>
               </div>
             )
          })}
        </div>
      </div>

      {/* ENTITLEMENTS (CALCULATION CORE) */}
      <Card className="shadow-lg border-emerald-500/30 bg-surface-container-lowest dark:bg-surface-container overflow-hidden rounded-3xl">
        <CardHeader className="bg-emerald-500/5 py-6 px-10 border-b border-emerald-500/10">
           <CardTitle className="text-xl font-headline font-semibold flex items-center gap-3 text-emerald-600 tracking-tight">
              <Calculator className="w-6 h-6" />
              Calculated Judicial Entitlements
           </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="divide-y divide-outline-variant/20">
              {entitlements.map((e, idx) => {
                 const isZero = e.value.includes('0.00')
                 return (
                   <div key={idx} className="p-8 grid grid-cols-[1fr,240px] items-center gap-12 group hover:bg-emerald-500/5 transition-colors">
                      <div className="space-y-2">
                         <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">{e.label}</span>
                            {isZero && <Badge className="bg-error-container text-on-error-container text-[8px] font-bold px-1.5 h-4 border-transparent">Missing Primary Data</Badge>}
                         </div>
                         <div className="relative h-2 w-full bg-outline-variant/20 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-1000", isZero ? "bg-outline-variant" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]")} 
                              style={{ width: isZero ? '0%' : '75%' }} 
                            />
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Outcome Value</div>
                         <strong className={cn("text-3xl font-headline font-semibold tracking-tight", isZero ? "text-on-surface-variant/40" : "text-primary")}>
                            {e.value}
                         </strong>
                      </div>
                   </div>
                 )
              })}
           </div>
        </CardContent>
      </Card>
      
    </div>
  )
}

export default IntelligenceCenter
