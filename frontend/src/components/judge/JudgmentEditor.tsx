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
  Sparkles
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface JudgmentEditorProps {
  draftText: string
  confidence: number
  isSubmitting: boolean
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
  onRegenerate,
  onFinalize,
}: JudgmentEditorProps) => {
  const { t } = useTranslation()
  const [content, setContent] = useState(draftText)
  const [decision, setDecision] = useState('accept')
  const [compensationAmount, setCompensationAmount] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [error, setError] = useState('')

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
    <Card className="shadow-lg border-primary/10 overflow-hidden">
      <CardHeader className="bg-primary/5 border-b py-5 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
           <Scale className="w-5 h-5 text-primary" />
           <CardTitle className="text-lg">{t('judge.workspace.judgmentDraft')}</CardTitle>
        </div>
        
        <div className="flex items-center gap-3 bg-card px-4 py-1.5 rounded-full border shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">AI Confidence</span>
          </div>
          <div className="h-1.5 w-24 bg-accent rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                progress > 70 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : 
                progress > 40 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" : 
                "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]"
              )}
              style={{ width: `${progress}%` }} 
            />
          </div>
          <span className="text-xs font-black text-primary">{progress}%</span>
        </div>
      </CardHeader>

      <CardContent className="p-8">
        <div className="space-y-8">
          <div className="rounded-xl border bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <ReactQuill 
              theme="snow" 
              value={content} 
              onChange={setContent} 
              className="judgment-editor" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                {t('judge.judgment.decision')}
              </label>
              <select 
                className="w-full bg-muted/20 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-bold"
                value={decision} 
                onChange={(event) => setDecision(event.target.value)}
              >
                <option value="accept">{t('judge.judgment.accept')}</option>
                <option value="reject">{t('judge.judgment.reject')}</option>
                <option value="partial">{t('judge.judgment.partial')}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                <DollarSign className="w-3 h-3" />
                {t('judge.judgment.compensation')}
              </label>
              <input
                className="w-full bg-muted/20 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-bold placeholder:font-normal"
                value={compensationAmount}
                onChange={(event) => setCompensationAmount(event.target.value)}
                placeholder={t('judge.judgment.compensationPlaceholder')}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                {t('judge.judgment.reasoning')}
              </label>
              <textarea
                className="w-full bg-muted/20 border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[120px] transition-all placeholder:italic"
                rows={5}
                value={reasoning}
                onChange={(event) => setReasoning(event.target.value)}
                placeholder={t('judge.judgment.reasoningPlaceholder')}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3 text-destructive animate-in fade-in zoom-in-95">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-bold italic">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-6 border-t items-center">
            <Button 
              type="button" 
              variant="outline" 
              className="gap-2 border-primary/20 text-primary hover:bg-primary/5 h-11 px-6 shadow-sm"
              onClick={onRegenerate}
            >
              <RotateCcw className="w-4 h-4" />
              {t('judge.workspace.regenerate')}
            </Button>
            <Button 
              type="button" 
              className="gap-2 h-11 px-10 shadow-lg shadow-primary/20 font-bold"
              onClick={handleFinalize} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Finalizing..." : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {t('judge.workspace.finalize')}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default JudgmentEditor
