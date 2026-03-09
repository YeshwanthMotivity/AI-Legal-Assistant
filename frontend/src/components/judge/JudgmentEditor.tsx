import { useEffect, useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { useTranslation } from 'react-i18next'

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
    <div className="panel">
      <div className="panel-title-row">
        <h3>{t('judge.workspace.judgmentDraft')}</h3>
        <div className="confidence-wrap">
          <span>{t('judge.workspace.aiConfidence')}</span>
          <div className="confidence-track">
            <div className="confidence-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>
      </div>

      <ReactQuill theme="snow" value={content} onChange={setContent} className="judgment-editor" />

      <div className="decision-row">
        <label>
          {t('judge.judgment.decision')}
          <select value={decision} onChange={(event) => setDecision(event.target.value)}>
            <option value="accept">{t('judge.judgment.accept')}</option>
            <option value="reject">{t('judge.judgment.reject')}</option>
            <option value="partial">{t('judge.judgment.partial')}</option>
          </select>
        </label>

        <label>
          {t('judge.judgment.compensation')}
          <input
            value={compensationAmount}
            onChange={(event) => setCompensationAmount(event.target.value)}
            placeholder={t('judge.judgment.compensationPlaceholder')}
          />
        </label>
      </div>

      <label>
        {t('judge.judgment.reasoning')}
        <textarea
          rows={3}
          value={reasoning}
          onChange={(event) => setReasoning(event.target.value)}
          placeholder={t('judge.judgment.reasoningPlaceholder')}
        />
      </label>

      {error && <p className="error-text">{error}</p>}

      <div className="panel-actions">
        <button type="button" className="btn-secondary" onClick={onRegenerate}>
          {t('judge.workspace.regenerate')}
        </button>
        <button type="button" className="btn-primary" onClick={handleFinalize} disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : t('judge.workspace.finalize')}
        </button>
      </div>
    </div>
  )
}

export default JudgmentEditor
