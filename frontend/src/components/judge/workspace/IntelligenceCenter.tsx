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
    <div className={cn("space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20", isRTL ? "text-right" : "text-left")}>
      
      {/* 1. CASE DOSSIER - TOP LEVEL SNAPSHOT */}
      <section className="bg-white rounded-[2.5rem] border border-border shadow-2xl shadow-black/5 overflow-hidden transition-all hover:shadow-primary/5">
        <header className="p-8 border-b border-border/40 bg-gradient-to-br from-primary/[0.03] to-transparent flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary text-on-primary rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center shrink-0">
              <Fingerprint className="w-6 h-6"/>
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground tracking-tight uppercase leading-tight">
                {t('judge.workspace.caseDossier', 'Finalized Case Dossier')}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{caseData?.case_number || 'REGISTRY-PENDING'}</span>
                <div className="w-1 h-1 bg-border rounded-full" />
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{t('judge.workspace.consolidatedView', 'Consolidated Judicial Snapshot')}</span>
              </div>
            </div>
          </div>
          {analysis && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10">
                AI PRECISION: {analysis.confidence || 0}%
              </span>
              <p className="text-[8px] font-black text-muted-foreground uppercase opacity-30 tracking-tighter">V4.2 ORCHESTRATOR</p>
            </div>
          )}
        </header>

        <div className="p-8 grid grid-cols-12 gap-10">
          {/* Parties Visualization */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className="flex items-center gap-6 justify-between p-6 bg-muted/5 rounded-3xl border border-border/40 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-border rounded-full flex items-center justify-center z-10 shadow-sm">
                <span className="text-[10px] font-black text-muted-foreground/40 italic">VS</span>
              </div>
              
              <div className="flex-1 space-y-2">
                <p className="text-[9px] font-black uppercase text-primary tracking-widest">{t('judge.workspace.claimant', 'Claimant')}</p>
                <h3 className="text-lg font-black text-foreground">{caseData?.claimant_name || '...'}</h3>
              </div>

              <div className="flex-1 space-y-2 text-right">
                <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">{t('judge.workspace.respondent', 'Respondent')}</p>
                <h3 className="text-lg font-black text-foreground">{caseData?.respondent_name || '...'}</h3>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Info className="w-3 h-3 text-primary opacity-40"/>
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">{t('judge.workspace.narrativeContext', 'Narrative Context')}</h4>
              </div>
              <div className="p-6 bg-[#FBFBF9] rounded-2xl border border-border/40 relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                <p className="text-[13px] font-medium leading-relaxed text-foreground/80 italic antialiased">
                  {caseData?.description || t('judge.workspace.noDescription', 'Awaiting factual narrative from registry...')}
                </p>
              </div>
            </div>
          </div>

          {/* Core Metrics */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {[
              { label: t('judge.workspace.claimValue', 'Total Claimed Value'), val: `AED ${Number(caseData?.claim_amount || 0).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-primary' },
              { label: t('judge.workspace.filingDate', 'Filing Registry Date'), val: caseData?.filing_date ? new Date(caseData.filing_date).toLocaleDateString() : 'N/A', icon: History, color: 'text-muted-foreground' },
              { label: t('judge.workspace.caseType', 'Statutory Classification'), val: caseData?.case_type?.replace(/_/g, ' ') || 'LABOR DISPUTE', icon: Briefcase, color: 'text-muted-foreground' },
            ].map((metric, i) => (
              <div key={i} className="p-5 bg-white rounded-2xl border border-border flex items-center gap-4 group hover:border-primary/20 transition-all">
                <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                  <metric.icon className="w-5 h-5"/>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest mb-0.5">{metric.label}</p>
                  <p className={cn("text-sm font-black tracking-tight uppercase", metric.color)}>{metric.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-10">
        
        {/* 2. EVIDENCE INVENTORY & ENTITLEMENTS */}
        <div className="col-span-12 xl:col-span-7 space-y-10">
          
          {/* EVIDENCE INVENTORY */}
          <section className="space-y-6">
            <header className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/5">
                   <Zap className="w-4 h-4"/>
                </div>
                <h3 className="text-base font-black text-foreground uppercase tracking-tight">{t('judge.workspace.evidenceInventory', 'Evidence Inventory')}</h3>
              </div>
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest opacity-40 px-3 py-1 bg-white border-border/60">
                {documents.length} {t('judge.workspace.verifiedAttachments', 'Verified Attachments')}
              </Badge>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documents.length === 0 ? (
                <div className="col-span-2 p-12 text-center border-2 border-dashed border-border/40 rounded-3xl opacity-30 italic text-[11px] font-bold uppercase tracking-widest">
                  {t('judge.workspace.noEvidence', 'No digital evidence nodes detected in registry.')}
                </div>
              ) : (
                documents.map((doc: any, i: number) => (
                  <div key={i} className="bg-white p-5 rounded-2xl border border-border flex items-start gap-4 group hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden">
                    <div className="w-10 h-10 bg-muted/30 rounded-xl flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <FileText className="w-5 h-5"/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest mb-1 truncate">{doc.document_type?.split(',')[0] || 'GENERAL'}</p>
                      <h5 className="text-[12px] font-black text-foreground uppercase tracking-tight truncate leading-none">{doc.name}</h5>
                      <p className="text-[9px] font-bold text-muted-foreground/40 mt-1.5 uppercase font-mono">{doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    {onDeleteDocument && (
                       <button
                         onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }}
                         className="p-2 text-muted-foreground/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                         disabled={isDeletingDocument === doc.id}
                         title={t('common.delete', 'Delete')}
                       >
                         {isDeletingDocument === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                       </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ENTITLEMENT MATRIX */}
          <section className="space-y-6">
            <header className="flex items-center gap-3 px-2">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/5">
                 <TrendingUp className="w-4 h-4"/>
              </div>
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">{t('judge.workspace.entitlementMatrix', 'Entitlement Matrix')}</h3>
            </header>

            <div className="bg-white rounded-[2rem] border border-border shadow-sm overflow-hidden divide-y divide-border/20">
              {entitlements.length === 0 ? (
                <div className="p-16 text-center italic text-[11px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">{t('judge.workspace.noEntitlements', 'Awaiting Analysis Synthesis...')}</div>
              ) : (
                entitlements.map((item: any, idx: number) => (
                  <div key={idx} className="p-6 hover:bg-primary/[0.02] transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Scale className="w-5 h-5"/>
                      </div>
                      <div>
                        <h5 className="text-[12px] font-black text-foreground uppercase tracking-tight">{item.title || item.name}</h5>
                        <p className="text-[10px] font-bold text-muted-foreground/60 italic mt-0.5 antialiased">{item.reasoning || item.description || t('judge.workspace.calculatedReasoning', 'Validated statutory entitlement.')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-black text-primary px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
                        {typeof item.amount === 'number' ? `AED ${item.amount.toLocaleString()}` : item.amount}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* 3. AI STRATEGIC SUMMARY & LEGAL CONTEXT */}
        <div className="col-span-12 xl:col-span-5 space-y-10">
          
          {/* AI STRATEGIC SUMMARY */}
          <section className="bg-white p-8 rounded-[2rem] border border-border shadow-sm space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none"/>
            <header className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary border border-primary/10">
                <Sparkles className="w-5 h-5"/>
              </div>
              <div>
                <h2 className="text-base font-black text-foreground tracking-tight uppercase leading-none">{t('judge.workspace.aiSummary', 'Strategic Summary')}</h2>
                <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mt-1.5">{t('judge.workspace.syntheticReasoning', 'Synthetic Reasoning Node')}</p>
              </div>
            </header>
            <div className="p-6 bg-[#FBFBF9] rounded-2xl border border-border/40 group-hover:bg-white transition-all text-sm font-semibold leading-relaxed text-foreground/80 italic antialiased">
              {analysis?.summary || t('judge.workspace.waitingAnalysis', 'Analysis results will appear here once synthesis is complete.')}
            </div>
          </section>

          {/* RELATED LAWS */}
          <section className="space-y-6">
            <header className="flex items-center gap-3 px-2">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/5">
                 <BookOpen className="w-4 h-4"/>
              </div>
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">{t('judge.workspace.relatedLaws', 'Statutory Framework')}</h3>
            </header>
            <div className="bg-white rounded-[2rem] border border-border shadow-sm overflow-hidden divide-y divide-border/20">
              {lawArticles.length === 0 ? (
                <div className="p-12 text-center italic text-[11px] font-bold text-muted-foreground/30 uppercase tracking-widest">No statutory matches.</div>
              ) : (
                lawArticles.map((art: any, idx: number) => (
                  <div key={idx} className="p-6 hover:bg-primary/5 transition-all group flex items-start gap-4">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
                      <Zap className="w-4 h-4 fill-current opacity-20"/>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest leading-none mb-1.5">{art.article_number || art.title || `Article ${idx + 1}`}</p>
                      <h5 className="text-[11px] font-black text-foreground uppercase tracking-tight leading-tight mb-2 truncate">{art.law_title || 'UAELP LABOUR CODE'}</h5>
                      <p className="text-[10px] font-bold text-muted-foreground italic leading-relaxed opacity-60 line-clamp-2 antialiased">
                        &ldquo;{art.content || art.summary || "Statutory alignment identified in registry..."}&rdquo;
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* SIMILAR CASES */}
          <section className="space-y-6">
            <header className="flex items-center gap-3 px-2">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/5">
                 <Scale className="w-4 h-4"/>
              </div>
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">{t('judge.workspace.similarCases', 'Judicial Precedents')}</h3>
            </header>
            <div className="grid grid-cols-1 gap-4">
              {precedents.map((item) => {
                const pct = Math.round((item.similarityScore || 0) > 1 ? item.similarityScore : (item.similarityScore || 0) * 100)
                return (
                  <Link
                    key={item.caseId}
                    to={`/judge/precedents/${item.caseId}`}
                    state={{ fromCaseId: caseId }}
                    className="group bg-white p-5 rounded-2xl border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 block relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black uppercase text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10 tracking-widest font-mono">
                        {item.caseId}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">PROXIMITY</span>
                        <span className="text-sm font-black text-primary tabular-nums">{pct}%</span>
                      </div>
                    </div>
                    <h4 className="text-[12px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1 mb-2 leading-tight">{item.title}</h4>
                    <p className="text-[10px] font-semibold text-muted-foreground/60 line-clamp-2 italic antialiased leading-relaxed">
                      {item.summary || t('judge.workspace.legalAlignmentFound', 'High proximity alignment with current case facts.')}
                    </p>
                  </Link>
                )
              })}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

export default IntelligenceCenter
