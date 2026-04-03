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
 <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

 {/* STRATEGIC SUMMARY */}
 <section className="bg-[var(--bg-card)] p-12 rounded-[3.5rem] border border-border shadow-[0_4px_30px_rgba(0,0,0,0.02)] space-y-10 relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)]/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-[var(--primary)]/10 transition-colors"/>
 <header className="flex items-center justify-between border-b border-border/40 pb-8">
 <div className="flex items-center gap-6">
 <div className="w-16 h-16 bg-[var(--primary)] text-white rounded-[1.75rem] shadow-xl shadow-[var(--primary)]/20 flex items-center justify-center">
 <Sparkles className="w-8 h-8"/>
 </div>
 <div>
 <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">Case Summary</h2>
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-3 bg-muted/40 w-fit px-3 py-1 rounded-full border border-border/40">AI Analysis</p>
 </div>
 </div>
 <div className="flex flex-col items-end gap-2">
 <span className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest px-3 py-1 bg-[var(--primary)]/10 rounded-full border border-[var(--primary)]/20">CONFIDENCE: {analysis.confidence || 0}%</span>
 <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">MODEL: CYLIX-JUDICIAL-V4.2</p>
 </div>
 </header>
 <div className="p-10 bg-[var(--bg-surface)] rounded-[2.5rem] border border-[var(--border-color)] relative z-10 group-hover:bg-[var(--primary)]/5 transition-all">
 <p className="text-base font-bold leading-relaxed text-foreground/80 first-letter:text-4xl first-letter:font-black first-letter:float-left first-letter:mr-3 first-letter:text-[var(--primary)]">
 {analysis?.summary || t('judge.workspace.waitingAnalysis')}
 </p>
 </div>
 </section>

 <div className="grid grid-cols-12 gap-10">
 {/* PRECEDENTS */}
 <section className="col-span-12 lg:col-span-7 space-y-10">
 <header className="flex items-center justify-between px-2">
 <div className="flex items-center gap-3">
 <Scale className="w-6 h-6 text-[var(--primary)]"/>
 <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">Similar Cases</h3>
 </div>
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{precedents.length} Cases Found</span>
 </header>

 <div className="grid grid-cols-1 gap-6">
 {precedents.map((item) => {
 const pct = Math.round((item.similarityScore || 0) > 1 ? item.similarityScore : (item.similarityScore || 0) * 100)
 return (
 <Link
 key={item.caseId}
 to={`/judge/precedents/${item.caseId}`}
 state={{ fromCaseId: caseId }}
 className="group bg-[var(--bg-card)] p-8 rounded-[2.5rem] border border-border/80 hover:border-[var(--primary)]/30 hover:shadow-2xl hover:shadow-[var(--primary)]/5 transition-all duration-500 block relative overflow-hidden"
 >
 <div className="flex items-start justify-between gap-8 relative z-10">
 <div className="flex-1 min-w-0 space-y-4">
 <div className="flex items-center gap-3">
 <span className="text-[9px] font-black uppercase text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-full border border-[var(--primary)]/20">
 Case: {item.caseId}
 </span>
 {pct >= 70 && (
 <div className="flex items-center gap-1.5 text-[var(--primary)]">
 <ShieldCheck className="w-4 h-4"/>
 <span className="text-[9px] font-black uppercase tracking-widest">Strong Match</span>
 </div>
 )}
 </div>
 <h5 className="text-lg font-black text-foreground uppercase tracking-tight group-hover:text-[var(--primary)] transition-colors">{item.title}</h5>
 <p className="text-xs font-semibold text-muted-foreground line-clamp-2 leading-relaxed opacity-60">
 {item.summary?.substring(0, 150) || t('judge.workspace.legalAlignmentFound')}
 </p>
 </div>
 <div className="shrink-0 flex flex-col items-end gap-3 bg-[var(--bg-surface)] p-4 rounded-3xl border border-border group-hover:bg-[var(--primary)] group-hover:border-[var(--primary)] transition-all">
 <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-50 group-hover:text-white transition-all">SIMILARITY</span>
 <span className="text-3xl font-black text-[var(--primary)] group-hover:text-white tabular-nums transition-all">{pct}%</span>
 <div className="w-12 h-1 bg-muted group-hover:bg-white/20 rounded-full overflow-hidden">
 <div className={cn("h-full transition-all duration-1000", pct >= 70 ?"bg-[var(--primary)]":"bg-[var(--primary)] group-hover:bg-[var(--bg-card)]")} style={{ width: `${pct}%` }} />
 </div>
 </div>
 </div>
 <div className="mt-8 pt-8 border-t border-border/40 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl bg-muted/20 flex items-center justify-center text-[var(--primary)]/40 group-hover:text-[var(--primary)] transition-all"><FileText className="w-4 h-4"/></div>
 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-[var(--primary)] transition-colors">View Full Case</span>
 </div>
 <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all"/>
 </div>
 </Link>
 )
 })}
 </div>
 </section>

 {/* LAWS */}
 <section className="col-span-12 lg:col-span-5 space-y-10">
 <header className="flex items-center justify-between px-2">
 <div className="flex items-center gap-3">
 <BookOpen className="w-6 h-6 text-[var(--primary)]"/>
 <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">Related Laws</h3>
 </div>
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{lawArticles.length} Nodes</span>
 </header>

 <div className="bg-[var(--bg-card)] rounded-[3.5rem] border border-border/80 shadow-[0_4px_30px_rgba(0,0,0,0.02)] overflow-hidden">
 <div className="p-8 border-b border-border/40 bg-muted/10">
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[.25em] opacity-40">Referenced Articles</p>
 </div>
 <div className="divide-y divide-border/40">
 {lawArticles.map((art: any, idx: number) => {
 const title = art.article_number || art.title || `Article ${idx + 1}`
 return (
 <div key={idx} className="p-10 hover:bg-[var(--primary)]/5 transition-colors group">
 <div className="flex items-start gap-6">
 <div className="shrink-0 w-12 h-12 rounded-[1.25rem] bg-[var(--bg-card)] border border-border shadow-sm flex items-center justify-center text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all">
 <Zap className="w-5 h-5"/>
 </div>
 <div className="space-y-3">
 <span className="text-[10px] font-black uppercase tracking-[.2em] text-[var(--primary)]/60">{title}</span>
 <h5 className="text-sm font-black text-foreground uppercase tracking-tight leading-tight">UAELP LABOUR CODE 2021-033-A</h5>
 <p className="text-[11px] font-semibold text-muted-foreground italic leading-relaxed opacity-60">"Termination for cause necessitates corroborated evidentiary mapping against secondary notice protocols."</p>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 <div className="p-10 bg-muted/5 flex items-center justify-center border-t border-border/40">
 <button className="flex items-center gap-2 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest hover:opacity-70 transition-all">
 <Plus className="w-4 h-4"/> Add Law Reference
 </button>
 </div>
 </div>
 </section>
 </div>

 </div>
 )
}

export default IntelligenceCenter
