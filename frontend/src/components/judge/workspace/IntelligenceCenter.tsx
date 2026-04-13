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

  // GLOBAL SYNCHRONIZED LOADING: If analysis is pending, show a unified high-fidelity loader
  if (analysis?.status === 'AIAnalysisPending') return (
    <div className="p-24 text-center border-2 border-dashed border-primary/20 rounded-[3rem] bg-white w-full flex flex-col items-center gap-8 animate-in fade-in duration-500 shadow-inner">
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-primary/5 flex items-center justify-center text-primary/40 border border-primary/10 animate-pulse">
          <BrainCircuit className="w-12 h-12" />
        </div>
        <div className="absolute -top-2 -right-2">
           <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-bounce shadow-lg shadow-primary/20">
              <Sparkles className="w-3 h-3 text-white" />
           </div>
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">{t('judge.workspace.analysing', 'ANALYSING...')}</h2>
        <p className="text-[11px] font-black text-primary uppercase tracking-[0.4em] italic opacity-60">Deep Judicial Analysis Active...</p>
      </div>
      <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/20 rounded-full border border-border/40">
         <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
         <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Logic Nodes: 12/12 Indexed</span>
      </div>
    </div>
  )

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
    <div className={cn("space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-32", isRTL ? "text-right" : "text-left")}>
      
      {/* 1. CASE SUMMARY CARD */}
      <section className="imperial-card overflow-hidden">
        <header className="p-8 border-b border-border/10 bg-muted/5 flex items-center justify-between">
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
           {/* Registry Profile & Narrative Content */}
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
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 px-3 text-primary/60">
                         <div className="w-2 h-2 rounded-full bg-primary/20 animate-pulse" />
                         <h4 className="text-[11px] font-black uppercase tracking-[0.4em]">{t('judge.workspace.factualContext', 'Factual Context')}</h4>
                      </div>
                      <div className="p-8 bg-white border border-border/60 rounded-[2.5rem] relative group hover:border-primary/20 transition-all shadow-inner">
                        <div className="absolute top-0 left-0 w-2 h-full bg-primary/5 rounded-l-[2.5rem]" />
                        <p className="text-[14px] font-medium leading-[1.8] text-foreground antialiased font-serif italic">
                          {caseData?.description || t('judge.workspace.noDescription', 'No factual description provided for this case.')}
                        </p>
                      </div>
                    </div>
                 </div>
                 
                 <div className="col-span-12 lg:col-span-5 space-y-3">
                    {[
                      { label: t('judge.workspace.claimValue', 'Total Claimed Value'), val: caseData?.claim_amount ? `AED ${Number(String(caseData.claim_amount).replace(/,/g, '')).toLocaleString('en-AE', { minimumFractionDigits: 2 })}` : 'AED 0.00', icon: TrendingUp, color: 'text-primary' },
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

           {/* SECOND ROW: FACTS AND SUMMARY (Full Width side-by-side) */}
           {analysis?.status === 'AIAnalysisReady' && (
              <div className="p-8 border-t border-border/40 bg-muted/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                    {/* Key Facts Section */}
                    {analysis?.facts && analysis.facts.length > 0 && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-3 px-2 mb-2">
                           <Zap className="w-4 h-4 text-accent animate-pulse" />
                           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-accent font-black">{t('judge.workspace.keyCaseFacts', 'Key Case Facts')}</h4>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                           {analysis.facts.map((fact: string, idx: number) => (
                             <div key={idx} className="flex gap-4 p-5 bg-accent/5 border border-accent/10 rounded-[2rem] group hover:bg-accent/10 transition-colors shadow-sm">
                                <div className="shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[#111] text-[10px] font-black shadow-lg shadow-accent/20">
                                   {idx + 1}
                                </div>
                                <p className="text-[13px] font-black leading-relaxed text-foreground/80 antialiased">
                                   {fact}
                                </p>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}

                    {/* AI Analysis Summary */}
                    {analysis?.summary && analysis.summary !== "Analysis complete. See draft for details.." && analysis.summary.length > 5 ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-700">
                        <div className="flex items-center gap-3 px-2 mb-2">
                           <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary font-black">{t('judge.workspace.aiSummary', 'AI Synthesized Summary')}</h4>
                        </div>
                        <div className="p-8 bg-primary/5 border border-primary/10 rounded-[2.5rem] relative group hover:bg-primary/10 transition-colors shadow-sm h-full">
                          <div className="absolute bottom-6 right-6 opacity-40">
                             <Sparkles className="w-12 h-12 text-primary opacity-20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500"/>
                          </div>
                          <div className="text-[14px] font-black leading-[1.8] text-foreground antialiased whitespace-pre-wrap relative z-10">
                            {analysis.summary}
                          </div>
                        </div>
                      </div>
                    ) : (
                      analysis?.reasoning && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-700">
                           <div className="flex items-center gap-3 px-2 mb-2">
                             <Zap className="w-4 h-4 text-primary opacity-60 mb-0.5" />
                             <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{t('judge.workspace.judicialReasoningNode', 'Judicial Reasoning Node')}</h4>
                          </div>
                          <div className={cn(
                            "p-8 rounded-[2.5rem] relative group transition-colors border shadow-sm h-full font-serif italic",
                            analysis.reasoning.includes("Error:") 
                              ? "bg-rose-50/30 border-rose-100 text-rose-900" 
                              : "bg-primary/[0.02] border-primary/10 text-foreground/90"
                          )}>
                            {analysis.reasoning}
                          </div>
                        </div>
                      )
                    )}
                </div>
              </div>
           )}

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
          "imperial-card overflow-hidden transition-all duration-700",
          analysis?.status !== 'AIAnalysisReady' && "opacity-30 pointer-events-none grayscale"
        )}>
          <header className="p-8 border-b border-border/10 bg-muted/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-accent/20 text-accent rounded-2xl shadow-inner border border-accent/10 flex items-center justify-center">
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
          "imperial-card overflow-hidden transition-all duration-700",
          analysis?.status !== 'AIAnalysisReady' && "opacity-30 pointer-events-none grayscale"
        )}>
          <header className="p-8 border-b border-border/10 bg-muted/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-center text-primary">
                 <BookOpen className="w-6 h-6"/>
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">{t('judge.workspace.relatedLaws', 'Law Articles')}</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-1.5 opacity-40">Statutory Framework Index</p>
              </div>
            </div>
          </header>

           <div className="p-5">
            <div className="flex flex-row overflow-x-auto gap-4 pb-4 custom-scrollbar">
              {lawArticles
                .filter((art: any) => art.article_number || art.title || art.content || art.summary)
                .map((art: any, idx: number) => (
                  <div key={idx} className="bg-white p-3 rounded-[1.5rem] border border-border shadow-sm hover:border-primary/30 min-w-[160px] max-w-[200px] transition-all duration-500 group flex flex-col gap-2 relative overflow-visible shrink-0 hover:shadow-xl hover:shadow-primary/5">
                   <div className="absolute top-0 right-0 p-3 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                      <Zap className="w-16 h-16 text-primary fill-current"/>
                   </div>
                   <div className="flex items-center gap-2">
                     <div className="shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 border border-primary/10">
                       <BookOpen className="w-3.5 h-3.5"/>
                     </div>
                     <p className="text-[7.5px] font-black uppercase text-primary tracking-[0.15em] line-clamp-1">
                       {(art.article_number || art.title || `Article ${idx + 1}`).split('|')[0].trim()}
                     </p>
                   </div>
                    <div className="min-w-0 flex-1 relative z-10 transition-all duration-500">
                      <h5 className="text-[10px] font-black text-foreground uppercase tracking-tight leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">{art.law_title || art.title}</h5>
                      
                      {/* Summary shown on hover — replaces decorative bars */}
                      {(art.content || art.summary) ? (
                        <>
                          <p className="text-[9px] font-medium text-foreground/70 leading-relaxed italic line-clamp-2 max-h-0 overflow-hidden opacity-0 group-hover:max-h-[60px] group-hover:opacity-100 transition-all duration-500 mt-1">
                            {art.summary || art.content}
                          </p>
                          {/* Decorative bars — hidden on hover */}
                          <div className="mt-2 space-y-1.5 opacity-[0.1] group-hover:opacity-0 group-hover:max-h-0 group-hover:mt-0 overflow-hidden transition-all duration-300">
                             <div className="w-16 h-1 bg-primary rounded-full" />
                             <div className="w-20 h-1 bg-primary rounded-full opacity-60" />
                             <div className="w-12 h-1 bg-primary rounded-full opacity-40" />
                          </div>
                        </>
                      ) : (
                        <div className="mt-2 space-y-1.5 opacity-[0.1]">
                           <div className="w-16 h-1 bg-primary rounded-full" />
                           <div className="w-20 h-1 bg-primary rounded-full opacity-60" />
                           <div className="w-12 h-1 bg-primary rounded-full opacity-40" />
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
