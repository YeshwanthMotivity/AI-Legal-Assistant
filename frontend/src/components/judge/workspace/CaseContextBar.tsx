import { useTranslation } from 'react-i18next'
import { Sparkles, Gavel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CaseContextBarProps {
  caseNumber: string
  title: string
  status?: string
  confidence?: number
  isActivelyLoading: boolean
  onRunAnalysis: () => void
  onFinalize: () => void
}

const CaseContextBar = ({
  caseNumber,
  title,
  isActivelyLoading,
  onRunAnalysis,
  onFinalize
}: CaseContextBarProps) => {
  const { t } = useTranslation()

  return (
    <div className="sticky top-0 z-40 w-full border-b border-outline-variant/20 bg-surface-container-lowest/90 dark:bg-surface-container/90 backdrop-blur-xl shadow-sm">
      <div className="px-6 py-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

        {/* LEFT: Case Identity */}
        <div className="space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/70 block">
            {t('judge.workspace.caseLabel')} · {caseNumber}
          </span>
          <h1 className="text-base font-bold text-on-surface truncate max-w-lg leading-snug">
            {title}
          </h1>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-9 px-4 border-outline-variant/30 hover:bg-primary/5 text-primary text-xs font-bold uppercase tracking-wider transition-all duration-200 rounded-lg"
            disabled={isActivelyLoading}
            onClick={onRunAnalysis}
          >
            <Sparkles className={cn('w-3.5 h-3.5', isActivelyLoading && 'animate-spin')} />
            {isActivelyLoading ? t('judge.workspace.synthesizing') : t('judge.workspace.runAnalysisShort')}
          </Button>
          <Button
            size="sm"
            className="gap-2 h-9 px-4 bg-primary text-on-primary text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
            onClick={onFinalize}
          >
            <Gavel className="w-3.5 h-3.5" />
            {t('judge.workspace.finalizeJudgment')}
          </Button>
        </div>

      </div>
    </div>
  )
}

export default CaseContextBar
