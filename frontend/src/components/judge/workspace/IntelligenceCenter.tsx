import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BookOpen, Scale, Sparkles, ChevronRight, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
    <div className="p-10 text-center border border-dashed border-outline-variant/30 rounded-xl bg-surface-container-low/50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-surface-container-low border border-outline-variant/20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-outline-variant/40" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold text-on-surface">{t('judge.workspace.intelligenceOffline')}</h3>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            {t('judge.workspace.intelligenceOfflineDesc')}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 space-y-8">

      {/* CASE SUMMARY */}
      <Card className="bg-surface-container-lowest dark:bg-surface-container overflow-hidden rounded-xl editorial-shadow border border-outline-variant/30">
        <CardHeader className="p-5 border-b border-outline-variant/20 bg-surface-container-low/40">
          <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            {t('judge.workspace.caseSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-sm text-on-surface leading-relaxed">
            {analysis?.summary || t('judge.workspace.waitingAnalysis')}
          </p>
        </CardContent>
      </Card>

      {/* PRECEDENTS */}
      {precedents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-on-surface">
              <Scale className="w-4 h-4 text-primary" />
              {t('judge.workspace.precedentAnalysis')}
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {precedents.length} {t('judge.workspace.total')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {precedents.map((item) => {
              const pct = Math.round(
                (item.similarityScore || 0) > 1
                  ? item.similarityScore
                  : (item.similarityScore || 0) * 100
              )
              const isHighMatch = pct >= 70
              return (
                <Link
                  key={item.caseId}
                  to={`/judge/precedents/${item.caseId}`}
                  state={{ fromCaseId: caseId }}
                  className="group bg-surface-container-low p-5 rounded-xl border border-outline-variant/30 hover:border-primary/40 hover:shadow-md transition-all duration-200 block"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {t('judge.workspace.rulingId')}: {item.caseId}
                        </span>
                        {isHighMatch && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold uppercase px-1.5 h-4">
                            {t('judge.workspace.strongMatch')}
                          </Badge>
                        )}
                      </div>
                      <h5 className="text-sm font-semibold text-on-surface leading-snug">{item.title}</h5>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.summary?.substring(0, 110) || t('judge.workspace.legalAlignmentFound')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t('judge.workspace.similarity')}
                      </div>
                      <div className="text-2xl font-black text-emerald-600">{pct}%</div>
                      <div className="w-16 h-1.5 bg-outline-variant/20 rounded-full overflow-hidden ml-auto">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-outline-variant/20">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                      {t('judge.workspace.detailView')}
                    </span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* LAWS */}
      {lawArticles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-on-surface">
              <BookOpen className="w-4 h-4 text-primary" />
              {t('judge.workspace.legalFramework')}
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {lawArticles.length} {t('judge.workspace.total')}
            </span>
          </div>

          <Card className="bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-outline-variant/20">
                {lawArticles.map((art: any, idx: number) => {
                  const title = art.article_number || art.title || `Article ${idx + 1}`
                  return (
                    <div key={idx} className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                          {title}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}

export default IntelligenceCenter
