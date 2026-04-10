import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { 
  BookOpen, 
  Scale, 
  Sparkles, 
  ChevronRight, 
  FileText, 
  BrainCircuit, 
  ShieldCheck, 
  Zap, 
  Plus,
  Users,
  Briefcase,
  History,
  TrendingUp,
  Fingerprint,
  Info,
  Trash2,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface IntelligenceCenterProps {
  analysis: any
  caseId: string
  lawArticles: any[]
  precedents: any[]
  caseData?: any
  documents?: any[]
  entitlements?: any[]
  onDeleteDocument?: (docId: string) => void
  isDeletingDocument?: string | null
  onViewDocument?: (docId: string) => void
}

const IntelligenceCenter = ({
  analysis,
  caseId,
  lawArticles,
  precedents,
  caseData,
  documents = [],
  entitlements = [],
  onDeleteDocument,
  isDeletingDocument,
  onViewDocument,
}: IntelligenceCenterProps) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  if (!analysis && !caseData) return (
    <div className="p-12 text-center border-2 border-dashed border-border/40 rounded-3xl bg-white/50 w-full flex flex-col items-center gap-6 animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/30 border border-primary/10">
        <BrainCircuit className="w-8 h-8 animate-pulse"/>
      </div>
      <div>
        <h2 className="text-xl font-black text-foreground uppercase tracking-tight">{t('judge.workspace.intelligenceOffline', 'Intelligence Node Offline')}</h2>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-2 opacity-40 italic">Awaiting Synthesis Request</p>
      </div>
    </div>
  )

  return (
    <div className={cn("space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-32", isRTL ? "text-right" : "text-left")}>
      
      {/* 1. CASE SUMMARY CARD */}
      <section className="bg-white rounded-[3rem] border border-border shadow-soft overflow-hidden">
        <header className="p-8 border-b border-border/40 bg-neutral-50/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary text-on-primary rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center">
              <Briefcase className="w-6 h-6"/>
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight uppercase leading-none">{t('judge.workspace.caseSummaryModule', 'Case Summary')}</h2>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1.5 opacity-40">Holistic Judicial Synthesis</p>
            </div>
          </div>
          <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40 tracking-widest">{caseData?.case_number || '...' }</span>
        </header>

        <div className="divide-y divide-border/40">
           {/* Registry Profile & Narrative Content (No separate heading) */}
           <div className="p-8">
              <div className="grid grid-cols-12 gap-10">
                 <div className="col-span-12 lg:col-span-7 space-y-10">
                    <div className="flex items-center gap-8 justify-between p-8 bg-muted/5 rounded-[2.5rem] border border-border/60 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white border border-border shadow-xl rounded-full flex items-center justify-center z-10">
                        <span className="text-[11px] font-black text-muted-foreground/30 italic">VS</span>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                          <Users className="w-5 h-5"/>
                        </div>
                        <p className="text-[10px] font-black uppercase text-primary tracking-widest opacity-60">{t('judge.workspace.claimant', 'Claimant Party')}</p>
                        <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">{caseData?.claimant_name || '...'}</h3>
                      </div>
                      <div className="flex-1 space-y-3 text-right">
                        <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center text-muted-foreground mb-2 ml-auto">
                          <ShieldCheck className="w-5 h-5"/>
                        </div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-40">{t('judge.workspace.respondent', 'Respondent Party')}</p>
                        <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">{caseData?.respondent_name || '...'}</h3>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 px-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t('judge.workspace.factualContext', 'Factual Context')}</h4>
                      </div>
                      <div className="p-8 bg-neutral-50/30 rounded-[2.5rem] border border-border/60 relative group hover:border-primary/20 transition-all">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/5 rounded-l-[2.5rem]" />
                        <p className="text-[14px] font-medium leading-[1.7] text-foreground/80 italic antialiased">
                          {caseData?.description || t('judge.workspace.noDescription', 'No factual description provided for this case.')}
                        </p>
                      </div>
                    </div>

                    {/* Key Facts Section - Only show when ready */}
                    {analysis?.status === 'AIAnalysisReady' && analysis?.facts && analysis.facts.length > 0 && (
                      <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-3 px-2 mb-2">
                           <Zap className="w-3.5 h-3.5 text-amber-500 opacity-60 mb-0.5" />
                           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">{t('judge.workspace.keyCaseFacts', 'Key Case Facts')}</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                           {analysis.facts.map((fact: string, idx: number) => (
                             <div key={idx} className="flex gap-4 p-4 bg-amber-50/30 border border-amber-100/50 rounded-2xl group hover:bg-amber-50/50 transition-colors">
                                <div className="shrink-0 w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-[10px] font-bold">
                                   {idx + 1}
                                </div>
                                <p className="text-[12px] font-medium leading-relaxed text-amber-900/80">
                                   {fact}
                                </p>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}

                    {/* Logic: Show summary if it's NOT the placeholder. If it IS the placeholder, show reasoning. */}
                    {analysis?.status === 'AIAnalysisReady' ? (
                      analysis?.summary && analysis.summary !== "Analysis complete. See draft for details.." && analysis.summary.length > 5 ? (
                        <div className="space-y-4 pt-6 animate-in fade-in slide-in-from-top-2 duration-700 border-t border-border/40 mt-6">
                          <div className="flex items-center gap-3 px-2 mb-2">
                             <Sparkles className="w-3.5 h-3.5 text-primary opacity-60 mb-0.5" />
                             <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{t('judge.workspace.aiSynthesizedSummary', 'AI Synthesized Summary')}</h4>
                          </div>
                          <div className="p-8 bg-primary/[0.02] border border-primary/10 rounded-[2.5rem] relative group hover:bg-primary/[0.04] transition-colors">
                            <div className="absolute top-6 left-6">
                              <Sparkles className="w-4 h-4 text-primary opacity-30 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500"/>
                            </div>
                            <p className="text-[14px] font-medium leading-[1.6] text-foreground/90 antialiased pl-8">
                              {analysis.summary}
                            </p>
                          </div>
                        </div>
                      ) : (
                        analysis?.reasoning && (
                          <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-700">
                             <div className="flex items-center gap-3 px-2 mb-2">
                               <Zap className="w-3.5 h-3.5 text-primary opacity-60 mb-0.5" />
                               <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{t('judge.workspace.judicialReasoningNode', 'Judicial Reasoning Node')}</h4>
                            </div>
                            <div className={cn(
                              "p-8 rounded-[2.5rem] relative group transition-colors border",
                              analysis.reasoning.includes("Error:") 
                                ? "bg-rose-50/30 border-rose-100 text-rose-900" 
                                : "bg-primary/[0.02] border-primary/10 text-foreground/90"
                            )}>
                              <div className="absolute top-6 left-6">
                                {analysis.reasoning.includes("Error:") ? (
                                  <Info className="w-4 h-4 text-rose-400 opacity-60"/>
                                ) : (
                                  <Sparkles className="w-4 h-4 text-primary opacity-30 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500"/>
                                )}
                              </div>
                              <p className={cn(
                                "text-[14px] font-medium leading-[1.6] antialiased pl-8",
                                analysis.reasoning.includes("Error:") ? "italic opacity-80" : ""
                              )}>
                                {analysis.reasoning}
                              </p>
                              {analysis.reasoning.includes("Error:") && (
                                <div className="mt-4 pl-8 flex items-center gap-2">
                                  <Badge variant="outline" className="bg-rose-50 border-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                                    System Exception
                                  </Badge>
                                  <p className="text-[10px] font-black text-rose-400/60 uppercase tracking-widest">Retrying in background node...</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      /* Skeleton state while generating summary */
                      analysis?.status === 'AIAnalysisPending' && (
                        <div className="space-y-4 pt-8 animate-pulse text-center">
                           <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/10">
                              <Sparkles className="w-6 h-6 text-primary/20 animate-spin duration-[3000ms]" />
                           </div>
                           <p className="text-[10px] font-black text-primary/40 uppercase tracking-[.3em]">{t('judge.workspace.generatingSummary', 'Generating Judicial Summary...')}</p>
                           <div className="w-3/4 h-3 bg-muted/30 rounded-full mx-auto" />
                           <div className="w-1/2 h-3 bg-muted/20 rounded-full mx-auto" />
                        </div>
                      )
                    )}
                 </div>
                 
                 <div className="col-span-12 lg:col-span-5 space-y-3">
                    {[
                      { label: t('judge.workspace.claimValue', 'Total Claimed Value'), val: caseData?.claim_amount ? `AED ${Number(String(caseData.claim_amount).replace(/,/g, '')).toLocaleString('en-AE', { minimumFractionDigits: 2 })}` : 'AED 0.00', icon: TrendingUp, color: 'text-emerald-600' },
                      { label: t('judge.workspace.filingDate', 'Filing Registry Date'), val: caseData?.filing_date ? new Date(caseData.filing_date).toLocaleDateString() : 'N/A', icon: History, color: 'text-blue-600' },
                      { label: t('judge.workspace.caseType', 'Statutory Classification'), val: caseData?.case_type?.replace(/_/g, ' ') || 'LABOR DISPUTE', icon: Briefcase, color: 'text-amber-600' },
                      { label: t('judge.workspace.courtRef', 'Court Reference'), val: caseData?.court_number || 'DIFC-JUDICIAL', icon: Scale, color: 'text-slate-600' },
                    ].map((metric, i) => (
                      <div key={i} className="p-4 bg-white rounded-2xl border border-border flex items-center gap-4 hover:border-primary/30 transition-all shadow-sm group">
                        <div className={cn("w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center transition-all group-hover:scale-110", metric.color)}>
                          <metric.icon className="w-4.5 h-4.5"/>
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase text-muted-foreground/50 tracking-widest mb-0.5">{metric.label}</p>
                          <p className="text-xs font-black tracking-tight uppercase tabular-nums text-foreground">{metric.val}</p>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Entitlement Calculation */}
           {entitlements.length > 0 && entitlements.some((item: any) => {
              const amountStr = String(item.amount || '');
              const isZero = (amountStr.includes('0.00')) && !amountStr.match(/[1-9]/);
              return (item.title || item.name) && !isZero;
           }) && (
             <div className="p-5 space-y-4 border-t border-border/30 bg-muted/5">
                <div className="flex items-center gap-2.5 px-1">
                   <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                     <Scale className="w-3 h-3 text-primary"/>
                   </div>
                   <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider">{t('judge.workspace.entitlementCalculation', 'Entitlement Calculation')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   {entitlements
                    .filter((item: any) => {
                      const amountStr = String(item.amount || '');
                      const isZero = (amountStr.includes('0.00')) && !amountStr.match(/[1-9]/);
                      return (item.title || item.name) && !isZero;
                    })
                    .map((item: any, idx: number) => (
                      <div key={idx} className="p-3 flex items-center justify-between group bg-white border border-border/60 rounded-xl transition-all hover:border-primary/30">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-muted/20 flex items-center justify-center text-muted-foreground/40 group-hover:text-primary transition-colors">
                             <TrendingUp className="w-3 h-3"/>
                          </div>
                          <div>
                             <h5 className="text-[10px] font-black text-foreground uppercase tracking-tight">{item.title || item.name}</h5>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/5 rounded border border-primary/10 tabular-nums">
                          {typeof item.amount === 'number' ? `AED ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : item.amount}
                        </span>
                      </div>
                    ))}
                </div>
             </div>
           )}

           {/* Documents */}
           <div className="p-8 space-y-6 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                      <FileText className="w-5 h-5"/>
                   </div>
                   <div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{t('judge.workspace.documents', 'Case Documents')}</h3>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Digital Evidence Inventory</p>
                   </div>
                </div>
                <Badge variant="outline" className="opacity-40 text-[9px] font-black uppercase tracking-widest">
                  {documents.length} {t('judge.workspace.exhibits', 'Exhibits')}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                 {documents.length === 0 ? (
                   <div className="col-span-full py-16 text-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-neutral-50/50">
                     <BrainCircuit className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4"/>
                     <p className="text-[9px] font-black uppercase text-muted-foreground/40 tracking-[0.3em]">{t('judge.workspace.noExhibits', 'No Digital Exhibits Indexed')}</p>
                   </div>
                 ) : (
                    documents.map((doc: any, i: number) => (
                       <div 
                          key={i} 
                          className="p-5 bg-white border border-border/80 rounded-[2rem] flex flex-col gap-4 group hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                          onClick={() => onViewDocument?.(doc.id)}
                       >
                          <div className="flex items-center justify-between">
                             <div className="w-10 h-10 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                <FileText className="w-5 h-5"/>
                             </div>
                             {onDeleteDocument && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }} 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground/20 hover:text-rose-500 hover:bg-rose-50 transition-all" 
                                  disabled={isDeletingDocument === doc.id}
                                >
                                   {isDeletingDocument === doc.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Trash2 className="w-3.5 h-3.5"/>}
                                </button>
                             )}
                          </div>
                          <div>
                             <span className="text-[9px] font-black uppercase text-primary tracking-widest mb-1.5 block opacity-60">
                                {doc.document_type?.split(',')[0]?.replace(/_/g, ' ') || 'UNCLASSIFIED'}
                             </span>
                             <h5 className="text-[12px] font-black text-foreground uppercase tracking-tight leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                                {doc.file_name || doc.name}
                             </h5>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      </section>

       {/* 2. SIMILAR CASES CARD */}
      {precedents.length > 0 && (
        <section className={cn(
          "bg-white rounded-[3rem] border border-border shadow-soft overflow-hidden transition-all duration-700",
          analysis?.status !== 'AIAnalysisReady' && "opacity-30 pointer-events-none grayscale"
        )}>
          <header className="p-8 border-b border-border/40 bg-neutral-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center">
                 <History className="w-6 h-6"/>
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">{t('judge.workspace.similarCases', 'Similar Cases')}</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1.5 opacity-40">Judicial Precedents & Match Analysis</p>
              </div>
            </div>
            <Badge variant="outline" className="px-3 py-1 rounded-full border-border/60 text-[10px] font-black uppercase tracking-widest opacity-40 whitespace-nowrap">
              {precedents.length} {t('judge.workspace.matchesFound', 'Candidates Found')}
            </Badge>
          </header>

           <div className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {precedents
                .filter((item: any) => item.caseId || item.title)
                .map((item: any) => {
                 const pct = Math.round((item.similarityScore || 0) > 1 ? item.similarityScore : (item.similarityScore || 0) * 100)
                 return (
                   <Link 
                      key={item.caseId} 
                      to={`/judge/precedents/${item.caseId}`} 
                      state={{ fromCaseId: caseId }} 
                      className="group bg-white p-6 rounded-[2.5rem] border border-border/80 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 block relative overflow-hidden active:scale-[0.98] flex flex-col h-full"
                   >
                     {/* Decorative background element */}
                     <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[4rem] -translate-y-12 translate-x-12 group-hover:translate-y-0 group-hover:translate-x-0 transition-transform duration-700 pointer-events-none opacity-40" />
                     
                     <div className="flex items-start justify-between mb-5 relative z-10">
                       <div className="flex items-center gap-2.5">
                         <div className="w-8 h-8 rounded-2xl bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:rotate-12 duration-500">
                           <Scale className="w-4 h-4"/>
                         </div>
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black uppercase text-primary tracking-[0.15em] leading-none mb-0.5">
                             {item.caseId && item.caseId.length > 8 && item.caseId.includes('-') ? `REF: ${item.caseId.split('-')[0]}` : `REF: ${item.caseId || '...'}`}
                           </span>
                           <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40 tracking-widest leading-none">Legal Record</span>
                         </div>
                       </div>
                       <div className="flex flex-col items-end">
                         <div className="flex items-center gap-1.5 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10 transition-colors group-hover:bg-primary/10">
                           <Zap className="w-3 h-3 text-primary fill-current"/>
                           <span className="text-[12px] font-black text-primary tabular-nums leading-none">{pct}%</span>
                         </div>
                       </div>
                     </div>

                     <h4 className="text-[13px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2 leading-[1.3] mb-6 flex-1 relative z-10 antialiased">
                       {item.title}
                     </h4>

                     <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40 relative z-10">
                        <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] group-hover:text-primary/60 transition-colors">View Precedent</span>
                        <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center text-primary opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                           <ArrowRight className="w-3 h-3"/>
                        </div>
                     </div>
                   </Link>
                 )
               })}
            </div>
          </div>
        </section>
      )}

       {/* 3. LAW ARTICLES CARD */}
      {lawArticles.length > 0 && (
        <section className={cn(
          "bg-white rounded-[3rem] border border-border shadow-soft overflow-hidden transition-all duration-700",
          analysis?.status !== 'AIAnalysisReady' && "opacity-30 pointer-events-none grayscale"
        )}>
          <header className="p-8 border-b border-border/40 bg-neutral-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-400">
                 <BookOpen className="w-6 h-6"/>
              </div>
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">{t('judge.workspace.relatedLaws', 'Law Articles')}</h2>
            </div>
          </header>

           <div className="p-6">
            <div className="flex flex-row overflow-x-auto gap-4 pb-4 custom-scrollbar">
              {lawArticles
                .filter((art: any) => art.article_number || art.title || art.content || art.summary)
                .map((art: any, idx: number) => (
                <div key={idx} className="bg-white p-5 rounded-[2rem] border border-border shadow-sm hover:border-primary/30 min-w-[260px] max-w-[300px] transition-all duration-500 group flex flex-col gap-3 relative overflow-hidden shrink-0 hover:shadow-xl hover:shadow-primary/5">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                     <Zap className="w-24 h-24 text-primary fill-current"/>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300 border border-border/20">
                      <BookOpen className="w-5 h-5"/>
                    </div>
                    <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em]">{art.article_number || art.title || `Article ${idx + 1}`}</p>
                  </div>
                   <div className="min-w-0 flex-1 relative z-10 transition-all duration-500">
                     <h5 className="text-[12px] font-black text-foreground uppercase tracking-tight leading-tight mb-2.5 group-hover:text-primary transition-colors">{art.law_title || art.title}</h5>
                     
                     {/* HOVER SUMMARY EFFECT */}
                     {(art.content || art.summary) && (
                       <div className="relative h-24 overflow-hidden">
                          {/* Default VIEW: Law Title/Article only */}
                          <div className="absolute inset-0 flex flex-col justify-start opacity-100 group-hover:opacity-0 group-hover:-translate-y-4 transition-all duration-500 bg-white z-10">
                             <div className="p-3 bg-muted/20 rounded-xl border border-border/40 border-dashed animate-in fade-in zoom-in duration-300">
                                <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest text-center mt-4">Hover to review summary</p>
                             </div>
                          </div>

                          {/* HOVER VIEW: Concise Summary */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-4 transition-all duration-500 p-3.5 bg-primary/[0.03] rounded-xl border-l-[3px] border-primary/40 shadow-inner overflow-hidden">
                            <p className="text-[10px] font-semibold text-foreground/80 italic leading-relaxed antialiased line-clamp-4">
                              &ldquo;{art.content || art.summary}&rdquo;
                            </p>
                          </div>
                       </div>
                     )}
                   </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default IntelligenceCenter
