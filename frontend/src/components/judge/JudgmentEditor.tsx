import { useEffect, useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { useTranslation } from 'react-i18next'
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Scale,
  DollarSign,
  MessageSquare,
  Sparkles,
  FileText,
  ChevronDown,
  BookOpen
} from 'lucide-react'
import { buildTemplate, TEMPLATE_LABELS, TEMPLATE_LABELS_AR } from '@/constants/judgmentTemplates'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface JudgmentEditorProps {
  draftText: string
  confidence: number
  isSubmitting: boolean
  caseNumber?: string
  claimantName?: string
  respondentName?: string
  filingDate?: string
  lawArticles?: string[]
  precedents?: string[]
  outcome?: string
  onRegenerate: () => Promise<void>
  onFinalize: (payload: {
    judgmentText: string
    decision: string
    compensationAmount?: string
    reasoning?: string
  }) => Promise<void>
}

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, '').trim()

const JudgmentEditor = ({
  draftText,
  confidence,
  isSubmitting,
  caseNumber,
  claimantName,
  respondentName,
  filingDate,
  lawArticles,
  precedents,
  outcome,
  onRegenerate,
  onFinalize,
}: JudgmentEditorProps) => {
  const { t, i18n } = useTranslation()
  const [content, setContent] = useState(draftText)
  const [decision, setDecision] = useState('accept')
  const [compensationAmount, setCompensationAmount] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [error, setError] = useState('')
  const [showTemplatePanel, setShowTemplatePanel] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  useEffect(() => {
    setContent(draftText)
  }, [draftText])

  const progress = useMemo(() => Math.max(0, Math.min(100, Math.round(confidence))), [confidence])

  const handleFinalize = async () => {
    const plainText = stripHtml(content)
    if (!plainText) {
      setError(t('judge.judgment.validationEmpty'))
      return
    }

    setError('')
    await onFinalize({
      judgmentText: content,
      decision,
      compensationAmount: compensationAmount || undefined,
      reasoning: reasoning || undefined,
    })
  }


  return (
    <Card className="shadow-2xl border-outline-variant/30 overflow-hidden rounded-3xl bg-surface-container-lowest dark:bg-surface-container">
      <CardHeader className="bg-surface-container-low dark:bg-surface-container-high border-b border-outline-variant/20 py-6 px-10 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-xl font-headline font-semibold tracking-tight text-on-surface">{t('judge.judgment.judicialRecordEditor')}</CardTitle>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60">{t('judge.judgment.manualReviewFinalization')}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-surface-container-lowest dark:bg-surface-container px-4 py-2 rounded-xl border border-outline-variant/30 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest">{t('judge.judgment.logicConfidence')}</span>
            </div>
            <div className="h-1.5 w-24 bg-outline-variant/20 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  progress > 70 ? "bg-emerald-500" : progress > 40 ? "bg-amber-500" : "bg-error"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-black text-primary">{progress}%</span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="gap-2 h-10 px-4 text-[11px] font-bold uppercase tracking-widest border-outline-variant/30 text-primary hover:bg-primary/5 rounded-xl shadow-sm"
            onClick={() => setShowTemplatePanel(!showTemplatePanel)}
          >
            <FileText className="w-4 h-4" />
            {t('judge.judgment.legalTemplates')}
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showTemplatePanel && "rotate-180")} />
          </Button>
        </div>

        {showTemplatePanel && (
          <div className="absolute top-[80px] right-10 z-[60] w-72 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-outline-variant/20 bg-surface-container-low">
              <p className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest">{t('judge.judgment.selectCaseBlueprint')}</p>
            </div>
            <div className="p-3 space-y-2">
              {Object.entries(i18n.language === 'ar' ? TEMPLATE_LABELS_AR : TEMPLATE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-sm font-semibold tracking-tight transition-all duration-200 hover:bg-primary/5 hover:text-primary",
                    selectedTemplate === key && "bg-primary/10 text-primary"
                  )}
                  onClick={() => {
                    const html = buildTemplate(key, {
                      caseNumber: caseNumber || '',
                      claimantName: claimantName || '',
                      respondentName: respondentName || '',
                      filingDate: filingDate || '',
                      outcome,
                      reasoning: undefined,
                      lawArticles,
                      precedents,
                    })
                    setContent(html)
                    setSelectedTemplate(key)
                    setShowTemplatePanel(false)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 divide-x divide-outline-variant/20">


          {/* RIGHT: EDITOR */}
          <div className="p-8 space-y-8">
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-inner" dir="ltr">
              <ReactQuill
                theme="snow"
                value={content}
                onChange={setContent}
                className="judgment-editor min-h-[500px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant tracking-widest ml-1 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  {t('judge.judgment.judicialDecision')}
                </label>
                <select
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-bold text-on-surface"
                  value={decision}
                  onChange={(event) => setDecision(event.target.value)}
                >
                  <option value="accept">{t('judge.judgment.accept')}</option>
                  <option value="reject">{t('judge.judgment.reject')}</option>
                  <option value="partial">{t('judge.judgment.partial')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant tracking-widest ml-1 flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  {t('judge.judgment.compensationAward')}
                </label>
                <input
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold placeholder:italic text-on-surface"
                  value={compensationAmount}
                  onChange={(event) => setCompensationAmount(event.target.value)}
                  placeholder={t('judge.judgment.compensationPlaceholder')}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant tracking-widest ml-1 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  {t('judge.judgment.judicialLogicSynthesis')}
                </label>
                <textarea
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-5 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[140px] transition-all placeholder:italic text-on-surface"
                  rows={5}
                  value={reasoning}
                  onChange={(event) => setReasoning(event.target.value)}
                  placeholder={t('judge.judgment.summarizeReasoningPlaceholder')}
                />
              </div>
            </div>

            {error && (
              <div className="p-5 rounded-2xl bg-error-container/10 border border-error/20 flex items-center gap-4 text-on-error-container animate-in fade-in zoom-in-95">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-bold italic">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-5 pt-8 border-t border-outline-variant/20 items-center">
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-outline-variant/30 text-primary hover:bg-primary/5 h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-sm"
                onClick={onRegenerate}
              >
                <RotateCcw className="w-4 h-4" />
                {t('judge.workspace.regenerate')}
              </Button>
              <Button
                type="button"
                className="gap-2 h-12 px-12 rounded-xl bg-primary text-on-primary font-bold uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all"
                onClick={handleFinalize}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    {t('judge.judgment.processingFinalRecord')}
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {t('judge.judgment.finalizeDecision')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default JudgmentEditor
