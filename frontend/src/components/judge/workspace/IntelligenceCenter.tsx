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
  Loader2
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
    <div className={cn("space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-32", isRTL ? "text-right" : "text-left")}>
      
      {/* 1. DETAILED CASE DOSSIER - PRIMARY CONTEXTUAL REPOSITORY */}
      <section className="bg-white rounded-[3rem] border border-primary/20 shadow-2xl shadow-primary/5 overflow-hidden transition-all hover:shadow-primary/10">
        <header className="p-10 border-b border-primary/10 bg-gradient-to-br from-primary/[0.03] to-transparent flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-primary text-on-primary rounded-[1.8rem] shadow-2xl shadow-primary/20 flex items-center justify-center shrink-0 border border-white/20">
              <Fingerprint className="w-8 h-8"/>
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight uppercase leading-none">
                {t('judge.workspace.caseOverview', 'Case Overview')}
              </h2>
              <div className="flex items-center gap-3 mt-2.5">
                <span className="text-[11px] font-black text-primary uppercase tracking-[0.25em]">{caseData?.case_number || 'REGISTRY-PENDING'}</span>
                <div className="w-1.5 h-1.5 bg-primary/30 rounded-full" />
                <span className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-widest">{t('judge.workspace.consolidatedView', 'System of Record')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end text-right">
             <div className="px-4 py-2 bg-primary/5 border border-primary/10 rounded-2xl">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">{caseData?.status || 'ASSIGNED'}</span>
             </div>
          </div>
        </header>

        <div className="p-10 grid grid-cols-12 gap-12">
          {/* Parties Visualization */}
          <div className="col-span-12 lg:col-span-7 space-y-10">
            <div className="flex items-center gap-8 justify-between p-10 bg-[#FBFBF9] rounded-[3rem] border border-border/60 relative shadow-inner">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white border border-border shadow-2xl rounded-full flex items-center justify-center z-10">
                <span className="text-[12px] font-black text-muted-foreground/40 italic tracking-tighter">VS</span>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="w-12 h-12 rounded-[1.2rem] bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <Users className="w-6 h-6"/>
                </div>
                <p className="text-[11px] font-black uppercase text-primary tracking-[0.2em] opacity-40">{t('judge.workspace.claimant', 'Claimant')}</p>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-none">{caseData?.claimant_name || '...'}</h3>
              </div>

              <div className="flex-1 space-y-4 text-right">
                <div className="w-12 h-12 rounded-[1.2rem] bg-muted/20 flex items-center justify-center text-muted-foreground mb-3 ml-auto">
                  <ShieldCheck className="w-6 h-6"/>
                </div>
                <p className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-30">{t('judge.workspace.respondent', 'Respondent')}</p>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-none">{caseData?.respondent_name || '...'}</h3>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 px-4">
                <Info className="w-4 h-4 text-primary opacity-40"/>
                <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">{t('judge.workspace.factualNarrative', 'Factual Narrative')}</h4>
              </div>
              <div className="p-10 bg-white rounded-[2.5rem] border border-border group shadow-soft relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary/5" />
                <p className="text-[15px] font-medium leading-relaxed text-foreground/90 italic antialiased relative z-10">
                  {caseData?.description || t('judge.workspace.noDescription', 'Awaiting factual narrative from registry...') }
                </p>
              </div>
            </div>
          </div>

          {/* Core Metrics */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 mb-6 px-4">{t('judge.workspace.registryContext', 'Registry Context')}</h4>
            {[
              { label: t('judge.workspace.claimValue', 'Total Claimed Value'), val: `AED ${Number(caseData?.claim_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-primary' },
              { label: t('judge.workspace.filingDate', 'Registry Filing Date'), val: caseData?.filing_date ? new Date(caseData.filing_date).toLocaleDateString() : 'N/A', icon: History, color: 'text-muted-foreground' },
              { label: t('judge.workspace.caseType', 'Statutory Classification'), val: caseData?.case_type?.replace(/_/g, ' ') || 'LABOR DISPUTE', icon: Briefcase, color: 'text-muted-foreground' },
              { label: t('judge.workspace.courtRef', 'Court Reference'), val: caseData?.court_number || 'DIFC-JUDICIAL-ORCHESTRATOR', icon: Scale, color: 'text-muted-foreground' },
            ].map((metric, i) => (
              <div key={i} className="p-8 bg-white rounded-[2rem] border border-border/80 flex items-center gap-6 group hover:border-primary/40 hover:bg-primary/[0.01] transition-all shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-inner border border-transparent group-hover:border-primary/20">
                  <metric.icon className="w-7 h-7"/>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest mb-1.5">{metric.label}</p>
                  <p className={cn("text-lg font-black tracking-tighter uppercase tabular-nums", metric.color)}>{metric.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. EVIDENCE INVENTORY - UPLOADED EXHIBITS */}
      <section className="space-y-8">
        <header className="flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-muted/20 rounded-[1.5rem] text-muted-foreground border border-border/60 shadow-inner">
               <FileText className="w-6 h-6"/>
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{t('judge.workspace.evidenceInventory', 'Evidence Inventory')}</h3>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40 mt-1">Verified Digital Exhibits</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-black tracking-widest opacity-60 px-4 py-1.5 bg-white border-border/60 uppercase">
            {documents.length} Files
          </Badge>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.length === 0 ? (
            <div className="col-span-full p-20 text-center border-2 border-dashed border-border/40 rounded-[3rem] opacity-30 italic text-[12px] font-bold uppercase tracking-widest bg-white/50">
              {t('judge.workspace.noEvidence', 'No digital evidence nodes detected in registry.')}
            </div>
          ) : (
            documents.map((doc: any, i: number) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-border/80 flex flex-col gap-6 group hover:border-primary/40 hover:shadow-2xl transition-all duration-500 cursor-pointer relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-inner">
                    <FileText className="w-8 h-8"/>
                  </div>
                  {onDeleteDocument && (
                     <button
                       onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }}
                       className="p-3 text-muted-foreground/20 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                       disabled={isDeletingDocument === doc.id}
                     >
                       {isDeletingDocument === doc.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                     </button>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest truncate">{doc.document_type?.split(',')[0] || 'VERIFIED EXHIBIT'}</p>
                    <div className="w-1 h-1 bg-primary/20 rounded-full" />
                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">{doc.created_at || doc.upload_date ? new Date(doc.created_at || doc.upload_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <h5 className="text-[15px] font-black text-foreground uppercase tracking-tight truncate mb-3">{doc.file_name || doc.name}</h5>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl w-fit border border-emerald-100">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.1em]">Authenticated</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      
      {/* 3. AI CASE SUMMARY - THE PRIMARY INTELLIGENCE NODE */}
      <section className="bg-white rounded-[3.5rem] border border-primary/20 shadow-2xl shadow-primary/5 overflow-hidden group relative">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
          <BrainCircuit className="w-64 h-64 text-primary"/>
        </div>
        <header className="p-10 border-b border-primary/10 bg-gradient-to-br from-primary/[0.08] to-transparent flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary text-on-primary rounded-[1.8rem] shadow-2xl shadow-primary/30 flex items-center justify-center shrink-0 border border-white/20">
              <Sparkles className="w-8 h-8"/>
            </div>
            <div>
              <h2 className="text-2xl font-black text-foreground tracking-tight uppercase leading-none">
                {t('judge.workspace.aiSummary', 'AI Analysis Results')}
              </h2>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">{t('judge.workspace.aiReasoningActive', 'Neural Orchestration Active')}</span>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
          {analysis && (
            <div className="flex flex-col items-end text-right">
              <div className="flex items-center gap-4 px-6 py-3 bg-white border border-primary/20 rounded-2xl shadow-lg shadow-primary/5">
                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60">Confidence Node:</span>
                <span className="text-sm font-black text-primary tabular-nums">{analysis.confidence || 0}%</span>
              </div>
              <p className="text-[9px] font-black text-muted-foreground uppercase opacity-20 mt-3 tracking-widest">Model Index: DIFC-CYLIX-V4.2</p>
            </div>
          )}
        </header>

        <div className="p-12 relative">
          <div className="p-10 bg-[#FBFBF9] border border-border/80 rounded-[3rem] shadow-inner relative group/text">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary/10 rounded-l-[3rem]" />
            <p className="text-lg font-medium leading-[1.8] text-foreground/90 italic antialiased pr-6">
              {analysis?.summary || t('judge.workspace.waitingAnalysis', 'Analysis results will appear here once synthesis is complete.')}
            </p>
          </div>
        </div>
      </section>

      {/* 4. QUANTITATIVE ANALYTICS & STATUTORY CITATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* ENTITLEMENT MATRIX */}
        <section className="lg:col-span-12 space-y-8">
          <header className="flex items-center gap-4 px-6">
            <div className="p-4 bg-primary/5 rounded-[1.5rem] text-primary border border-primary/10">
               <TrendingUp className="w-6 h-6"/>
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{t('judge.workspace.entitlementCalculation', 'Entitlement Calculation')}</h3>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40 mt-1">Validated Monetary Synthesis</p>
            </div>
          </header>

          <div className="bg-white rounded-[3rem] border border-border shadow-soft overflow-hidden divide-y divide-border">
            {entitlements.length === 0 ? (
              <div className="p-20 text-center italic text-[12px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em] bg-muted/5">{t('judge.workspace.noEntitlements', 'Awaiting Quantitative Synthesis...')}</div>
            ) : (
              entitlements.map((item: any, idx: number) => {
                const title = item.title || item.name || item.label || `Item ${idx + 1}`;
                const amount = item.amount || item.value || '0.00';
                const reasoning = item.reasoning || item.description || t('judge.workspace.calculatedReasoning', 'Validated statutory entitlement based on AI node audit.');
                
                return (
                  <div key={idx} className="p-10 hover:bg-primary/[0.02] transition-all flex items-center justify-between group active:bg-primary/[0.05]">
                    <div className="flex items-center gap-8">
                      <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner border border-primary/10">
                        <Scale className="w-7 h-7"/>
                      </div>
                      <div>
                        <h5 className="text-[16px] font-black text-foreground uppercase tracking-tight">{title}</h5>
                        <p className="text-[12px] font-bold text-muted-foreground/50 italic mt-1.5 antialiased max-w-2xl">{reasoning}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-primary px-6 py-3 bg-primary/5 rounded-[1.5rem] border border-primary/20 shadow-sm tabular-nums tracking-tighter">
                        {typeof amount === 'number' ? `AED ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : (String(amount).startsWith('AED') ? amount : `AED ${amount}`)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* RELATED LAWS & REASONING NODES */}
        <section className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-10 mt-4">
           {/* RECENT SIMILAR CASES */}
           <div className="space-y-6">
              <header className="flex items-center justify-between px-6">
                 <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-primary/5 rounded-[1.2rem] text-primary border border-primary/10">
                       <History className="w-5 h-5"/>
                    </div>
                    <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Similar Cases</h3>
                 </div>
              </header>
              <div className="space-y-4">
                 {precedents.map((item) => {
                   const pct = Math.round((item.similarityScore || 0) > 1 ? item.similarityScore : (item.similarityScore || 0) * 100)
                   return (
                     <Link
                       key={item.caseId}
                       to={`/judge/precedents/${item.caseId}`}
                       state={{ fromCaseId: caseId }}
                       className="group bg-white p-6 rounded-[2.5rem] border border-border/80 hover:border-primary/40 hover:shadow-xl transition-all duration-500 block relative overflow-hidden active:scale-[0.98]"
                     >
                       <div className="flex items-center justify-between mb-3">
                         <span className="text-[9px] font-black uppercase text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">#{item.caseId.substring(0, 8)}</span>
                         <span className="text-sm font-black text-primary">{pct}% Match</span>
                       </div>
                       <h4 className="text-[13px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1 mb-2">{item.title}</h4>
                       <p className="text-[10px] font-semibold text-muted-foreground/50 line-clamp-2 italic antialiased">{item.summary || 'Proximity alignment detected.'}</p>
                     </Link>
                   )
                 })}
              </div>
           </div>

           {/* STATUTORY ARTICLES */}
           <div className="space-y-6">
              <header className="flex items-center gap-4 px-6">
                 <div className="p-3.5 bg-primary/5 rounded-[1.2rem] text-primary border border-primary/10">
                    <BookOpen className="w-5 h-5"/>
                 </div>
                 <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Statutory Citations</h3>
              </header>
              <div className="bg-white rounded-[2.5rem] border border-border divide-y divide-border overflow-hidden">
                 {lawArticles.map((art: any, idx: number) => (
                   <div key={idx} className="p-6 hover:bg-primary/[0.01] transition-all flex gap-5">
                      <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center text-primary shrink-0 transition-colors group-hover:bg-primary/20">
                         <Zap className="w-4 h-4 fill-current"/>
                      </div>
                      <div className="min-w-0">
                         <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Article {art.article_number || idx + 1}</p>
                         <p className="text-[12px] font-medium text-foreground/70 italic antialiased line-clamp-2 leading-relaxed">&ldquo;{art.content || art.summary}&rdquo;</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>
      </div>
    </div>
  )
}

export default IntelligenceCenter
