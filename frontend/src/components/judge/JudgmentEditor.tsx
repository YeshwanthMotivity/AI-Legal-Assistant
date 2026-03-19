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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ margin: 0 }}>{t('judge.workspace.judgmentDraft')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--emerald-50)', padding: '0.5rem 1rem', borderRadius: '999px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--emerald-800)' }}>{t('judge.workspace.aiConfidence')}</span>
          <div className="confidence-track" style={{ width: '100px', margin: 0 }}>
            <div className="confidence-fill" style={{ width: `${progress}%`, height: '100%' }} />
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--emerald-700)' }}>{progress}%</span>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <ReactQuill theme="snow" value={content} onChange={setContent} className="judgment-editor" />
      </div>

      <div className="decision-row">
        <label>
          <span style={{ marginBottom: '0.75rem', display: 'block' }}>{t('judge.judgment.decision')}</span>
          <select value={decision} onChange={(event) => setDecision(event.target.value)}>
            <option value="accept">{t('judge.judgment.accept')}</option>
            <option value="reject">{t('judge.judgment.reject')}</option>
            <option value="partial">{t('judge.judgment.partial')}</option>
          </select>
        </label>

        <label>
          <span style={{ marginBottom: '0.75rem', display: 'block' }}>{t('judge.judgment.compensation')}</span>
          <input
            value={compensationAmount}
            onChange={(event) => setCompensationAmount(event.target.value)}
            placeholder={t('judge.judgment.compensationPlaceholder')}
          />
        </label>
      </div>

      <div className="form-grid" style={{ marginTop: '2rem' }}>
        <label className="full-width">
          <span style={{ marginBottom: '0.75rem', display: 'block' }}>{t('judge.judgment.reasoning')}</span>
          <textarea
            rows={5}
            value={reasoning}
            onChange={(event) => setReasoning(event.target.value)}
            placeholder={t('judge.judgment.reasoningPlaceholder')}
          />
        </label>
      </div>

      {error && <p className="error-text" style={{ color: 'var(--danger)', marginTop: '1rem', fontWeight: '600' }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
        <button type="button" className="btn btn-secondary" onClick={onRegenerate}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
          {t('judge.workspace.regenerate')}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleFinalize} disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {t('judge.workspace.finalize')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default JudgmentEditor
