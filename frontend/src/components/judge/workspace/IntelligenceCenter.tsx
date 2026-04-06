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
    <div className="p-16 text-center border-2 border-dashed border-border/80 rounded-2xl bg-[var(--bg-card)] shadow-inner w-full flex flex-col items-center gap-6">
      <div className="w-24 h-24 rounded-[2.5rem] bg-[var(--primary)]/5 flex items-center justify-center text-[var(--primary)]/30">
        <BrainCircuit className="w-12 h-12 animate-pulse"/>
      </div>
      <div>
        <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">{t('judge.workspace.intelligenceOffline')}</h3>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-3 opacity-60 italic">Reasoning Node: IDLE</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-12">
      {/* STRATEGIC SUMMARY - COMPACT VERSION */}
      <section className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors"/>
        <header className="flex items-center justify-between border-b border-border/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-white rounded-lg shadow-lg shadow-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5"/>
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground tracking-tight uppercase leading-none">Case Summary</h2>
              <p className="text-[8px] font-black text-primary/60 uppercase tracking-widest mt-1">{t('judge.workspace.aiReasoning', 'AI Reasoning Node Active')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest px-2 py-0.5 bg-primary/5 rounded-md border border-primary/10">
                CONFIDENCE: {analysis.confidence || 0}%
              </span>
              <p className="text-[7px] font-bold text-muted-foreground uppercase opacity-40 mt-0.5">MODEL: CYLIX-JUDICIAL-V4.2</p>
            </div>
          </div>
        </header>
        <div className="p-4 bg-muted/5 rounded-xl border border-border/40 relative z-10 group-hover:bg-white transition-all">
          <p className="text-sm font-semibold leading-relaxed text-foreground/80">
            {analysis?.summary || t('judge.workspace.waitingAnalysis')}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* PRECEDENTS */}
        <section className="col-span-12 lg:col-span-12 xl:col-span-8 space-y-4">
          <header className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary"/>
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">Similar Cases</h3>
            </div>
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{precedents.length} Cases Found</span>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {precedents.map((item) => {
              const pct = Math.round((item.similarityScore || 0) > 1 ? item.similarityScore : (item.similarityScore || 0) * 100)
              return (
                <Link
                  key={item.caseId}
                  to={`/judge/precedents/${item.caseId}`}
                  state={{ fromCaseId: caseId }}
                  className="group bg-white p-5 rounded-xl border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 block relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                        {item.caseId}
                      </span>
                      {pct >= 70 && (
                        <ShieldCheck className="w-3.5 h-3.5 text-primary animate-pulse"/>
                      )}
                    </div>
                    <div>
                      <h5 className="text-[12px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-1">{item.title}</h5>
                      <p className="text-[9px] font-medium text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed opacity-60 italic">
                        {item.summary?.substring(0, 100) || t('judge.workspace.legalAlignmentFound')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground opacity-40">SIMILARITY</span>
                        <span className="text-[12px] font-black text-primary tabular-nums">{pct}%</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-all"/>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* LAWS */}
        <section className="col-span-12 lg:col-span-12 xl:col-span-4 space-y-4">
          <header className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary"/>
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">Related Laws</h3>
            </div>
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{lawArticles.length} Nodes</span>
          </header>

          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border/20">
            {lawArticles.length === 0 ? (
              <div className="p-8 text-center italic text-xs text-muted-foreground opacity-40">No statutory matches identified.</div>
            ) : (
              lawArticles.map((art: any, idx: number) => {
                const title = art.article_number || art.title || `Article ${idx + 1}`
                return (
                  <div key={idx} className="p-5 hover:bg-primary/5 transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                        <Zap className="w-4 h-4"/>
                      </div>
                      <div className="space-y-1 min-w-0">
                        <span className="text-[8px] font-black uppercase tracking-widest text-primary/60">{title}</span>
                        <h5 className="text-[10px] font-black text-foreground uppercase tracking-tight leading-tight truncate">UAELP LABOUR CODE</h5>
                        <p className="text-[9px] font-semibold text-muted-foreground italic leading-relaxed opacity-60 line-clamp-2 mt-1">
                          &ldquo;{art.content?.substring(0, 80) || "Statutory alignment identified in registry..."}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div className="p-4 bg-muted/5 flex items-center justify-center">
              <button className="flex items-center gap-2 text-[8px] font-black text-primary uppercase tracking-widest hover:opacity-70 transition-all">
                <Plus className="w-3.5 h-3.5"/> Add Law Reference
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default IntelligenceCenter
