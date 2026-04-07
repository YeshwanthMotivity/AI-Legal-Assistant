import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BookOpen, Scale, Sparkles, ChevronRight, FileText, BrainCircuit, ShieldCheck, Zap, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface IntelligenceCenterProps {
  analysis: any
  caseId: string
  lawArticles: any[]
  precedents: any[]
}

const IntelligenceCenter = ({
  analysis,
  caseId,
  lawArticles,
  precedents,
}: IntelligenceCenterProps) => {
  const { t } = useTranslation()

  if (!analysis) return (
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      {/* STRATEGIC SUMMARY */}
      <section className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-colors"/>
        <header className="flex items-center justify-between border-b border-border/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5"/>
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground tracking-tight uppercase leading-none">{t('judge.workspace.caseSummary', 'Case Summary')}</h2>
              <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mt-1.5">{t('judge.workspace.aiReasoning', 'AI Reasoning Node Active')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
                CONFIDENCE: {analysis.confidence || 0}%
              </span>
              <p className="text-[8px] font-black text-muted-foreground uppercase opacity-30 mt-1.5 tracking-tighter">MODEL: CYLIX-JUDICIAL-ORCHESTRATOR-V4.2</p>
            </div>
          </div>
        </header>
        <div className="p-6 bg-[#FBFBF9] rounded-2xl border border-border/40 relative z-10 group-hover:bg-white transition-all">
          <p className="text-[13px] font-semibold leading-relaxed text-foreground/80 italic antialiased antialiased">
            {analysis?.summary || t('judge.workspace.waitingAnalysis', 'Analysis results will appear here once synthesis is complete.')}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* PRECEDENTS */}
        <section className="col-span-12 xl:col-span-8 space-y-6">
          <header className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shadow-sm">
                 <Scale className="w-4 h-4"/>
              </div>
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">{t('judge.workspace.similarCases', 'Similar Material Facts')}</h3>
            </div>
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-30">{precedents.length} PRECEDENTS</span>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {precedents.map((item) => {
              const pct = Math.round((item.similarityScore || 0) > 1 ? item.similarityScore : (item.similarityScore || 0) * 100)
              return (
                <Link
                  key={item.caseId}
                  to={`/judge/precedents/${item.caseId}`}
                  state={{ fromCaseId: caseId }}
                  className="group bg-white p-5 rounded-2xl border border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 block relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10 tracking-widest font-mono truncate max-w-[140px]">
                        {item.caseId}
                      </span>
                      {pct >= 70 && (
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-on-primary animate-pulse shadow-lg shadow-primary/20">
                           <ShieldCheck className="w-3.5 h-3.5"/>
                        </div>
                      )}
                    </div>
                    <div className="min-h-[60px]">
                      <h4 className="text-[12px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2 leading-tight">{item.title}</h4>
                      <p className="text-[10px] font-semibold text-muted-foreground line-clamp-2 mt-2 leading-relaxed opacity-60 italic antialiased">
                        {item.summary?.substring(0, 100) || t('judge.workspace.legalAlignmentFound', 'High proximity alignment with current case facts.')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border/40">
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">PROXIMITY</span>
                        <div className="flex items-baseline gap-1">
                           <span className="text-sm font-black text-primary tabular-nums tracking-tighter">{pct}</span>
                           <span className="text-[9px] font-bold text-primary/40">%</span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
                         <ChevronRight className="w-4 h-4"/>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* LAWS */}
        <section className="col-span-12 xl:col-span-4 space-y-6">
          <header className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shadow-sm">
                 <BookOpen className="w-4 h-4"/>
              </div>
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">{t('judge.workspace.relatedLaws', 'Statutory Map')}</h3>
            </div>
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-30">{lawArticles.length} NODES</span>
          </header>

          <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden divide-y divide-border/20">
            {lawArticles.length === 0 ? (
              <div className="p-12 text-center italic text-[11px] font-bold text-muted-foreground/30 uppercase tracking-widest">No statutory matches.</div>
            ) : (
              lawArticles.map((art: any, idx: number) => {
                const title = art.article_number || art.title || `Article ${idx + 1}`
                return (
                  <div key={idx} className="p-6 hover:bg-primary/5 transition-all group cursor-pointer relative">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-primary/20">
                        <Zap className="w-4 h-4 fill-current opacity-20 group-hover:opacity-100 transition-opacity"/>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">{title}</span>
                        <h5 className="text-[11px] font-black text-foreground uppercase tracking-tight leading-tight truncate">{art.law_title || 'UAELP LABOUR CODE'}</h5>
                        <p className="text-[10px] font-bold text-muted-foreground italic leading-relaxed opacity-60 line-clamp-3 mt-1.5 antialiased">
                          &ldquo;{art.content?.substring(0, 100) || art.summary || "Statutory alignment identified in registry..."}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div className="p-5 bg-muted/5 flex items-center justify-center">
              <button className="flex items-center gap-2.5 text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary-hover transition-all py-1 px-3 bg-white border border-border rounded-lg shadow-sm">
                <Plus className="w-4 h-4"/> {t('judge.workspace.addLaw', 'Add Reference')}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default IntelligenceCenter
