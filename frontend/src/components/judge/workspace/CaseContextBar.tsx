import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Gavel, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CaseContextBarProps {
  caseNumber: string
  title: string
  status?: string
  confidence?: number
  isActivelyLoading: boolean
  isDeleting?: boolean
  onRunAnalysis: () => void
  onFinalize: () => void
  onDelete: () => void
}

const CaseContextBar = ({
  caseNumber,
  title,
  isActivelyLoading,
  isDeleting = false,
  onRunAnalysis,
  onFinalize,
  onDelete,
}: CaseContextBarProps) => {
  const { t } = useTranslation()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDeleteClick = () => setShowConfirm(true)
  const handleConfirm = () => {
    setShowConfirm(false)
    onDelete()
  }
  const handleCancel = () => setShowConfirm(false)

  return (
    <>
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
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-9 px-3 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 rounded-lg"
              disabled={isDeleting}
              onClick={handleDeleteClick}
            >
              {isDeleting ? (
                <div className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
              )}
              {t('judge.workspace.deleteCase')}
            </Button>
          </div>

        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">
                  {t('judge.workspace.deleteCaseTitle')}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('judge.workspace.deleteCaseDesc')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 border-outline-variant/30 text-xs font-bold uppercase tracking-wider rounded-lg"
                onClick={handleCancel}
              >
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                className="h-9 px-4 bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg gap-2"
                onClick={handleConfirm}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('judge.workspace.confirmDelete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CaseContextBar
