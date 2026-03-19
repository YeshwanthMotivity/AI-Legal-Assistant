import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import PortalLayout from '../../components/layout/PortalLayout'
import JudgmentEditor from '../../components/judge/JudgmentEditor'
import {
  getCase,
  getCaseDocuments,
  runAnalysis,
  saveJudgment,
  submitFeedback,
  uploadCaseDocument,
} from '../../api/judge'
import { useCaseAnalysisPolling } from '../../hooks/useCaseAnalysisPolling'
import type { DocumentType, FeedbackRequest, JudgmentRequest } from '../../types/judge'

const DOCUMENT_TYPES: DocumentType[] = [
  'contract',
  'financial_record',
  'termination_notice',
  'witness_statement',
  'employment_contract',
  'salary_records',
  'termination_letter',
  'evidence',
  'court_order',
  'other',
]

const CaseDetail = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()

  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('other')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [analysisRequested, setAnalysisRequested] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackRequest>({
    legal_relevance_score: 3,
    reasoning_quality_score: 3,
    explanation_clarity_score: 3,
    feedback_text: '',
    suggested_improvements: '',
  })
  const [localMessage, setLocalMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    setAnalysisRequested(false)
    setLocalMessage('')
  }, [id])

  useEffect(() => {
    if (!localMessage) return
    const timer = setTimeout(() => setLocalMessage(''), 5000)
    return () => clearTimeout(timer)
  }, [localMessage])

  const caseQuery = useQuery({
    queryKey: ['judge-case', id],
    queryFn: () => getCase(id as string),
    enabled: Boolean(id),
  })

  const documentsQuery = useQuery({
    queryKey: ['case-documents', id],
    queryFn: () => getCaseDocuments(id as string),
    enabled: Boolean(id),
    refetchInterval: 4000,
  })

  const shouldPoll =
    analysisRequested || caseQuery.data?.status === 'AIAnalysisPending' || caseQuery.data?.status === 'AIAnalysisReady'
  const analysisQuery = useCaseAnalysisPolling(id, shouldPoll)

  const uploadMutation = useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: DocumentType }) =>
      uploadCaseDocument(id as string, file, documentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-documents', id] })
      queryClient.invalidateQueries({ queryKey: ['judge-case', id] })
      setMessageType('success')
      setLocalMessage(t('judge.workspace.uploadSuccess'))
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    onError: (error) => {
      setMessageType('error')
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const detail = error.response?.data?.detail
        if (status || detail) {
          setLocalMessage(`${t('judge.workspace.uploadError')} (${status ?? 'ERR'}${detail ? `: ${detail}` : ''})`)
          return
        }
      }
      setLocalMessage(t('judge.workspace.uploadError'))
    },
  })

  const runAnalysisMutation = useMutation({
    mutationFn: () => runAnalysis(id as string),
    onSuccess: async () => {
      setAnalysisRequested(true)
      await analysisQuery.refetch()
      queryClient.invalidateQueries({ queryKey: ['judge-case', id] })
    },
    onError: (error) => {
      setMessageType('error')
      setLocalMessage(t('common.error') + ': ' + (error instanceof Error ? error.message : String(error)))
    }
  })
  const finalizeMutation = useMutation({
    mutationFn: (payload: JudgmentRequest) => saveJudgment(id as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-case', id] })
      setMessageType('success')
      setLocalMessage(t('judge.workspace.judgmentFinalized'))
    },
  })

  const feedbackMutation = useMutation({
    mutationFn: (payload: FeedbackRequest) => submitFeedback(id as string, payload),
    onSuccess: () => {
      setMessageType('success')
      setLocalMessage(t('judge.workspace.feedbackSuccess'))
    },
  })

  const analysis = analysisQuery.analysis?.analysis
  const isReady = analysis?.status === 'AIAnalysisReady'
  // Fix: use isFetching for active polling state, not isLoading (which is only true on first load)
  // Also only lock the button if we are actively communicating with the network or explicitly polling for a new request
  const isActivelyLoading = runAnalysisMutation.isPending || (analysisQuery.isPolling && analysisRequested)
  const isUnavailable = isReady && (analysis?.reasoning_status === 'reasoning_unavailable' || !analysis?.reasoning)

  const lawArticles = analysis?.lawArticles ?? []
  const precedents = useMemo(() => (analysis?.similarPrecedents ?? []).slice(0, 5), [analysis?.similarPrecedents])
  const entitlements = analysis?.entitlementBreakdown ?? []

  const getDocumentStatusClass = (status: string) => {
    const normalized = String(status).toLowerCase()
    if (normalized.includes('complete') || normalized.includes('embedded')) return 'status-badge done'
    if (normalized.includes('failed')) return 'status-badge failed'
    if (normalized.includes('partial')) return 'status-badge warning'
    if (normalized.includes('processing') || normalized.includes('uploaded') || normalized.includes('pending')) {
      return 'status-badge pending'
    }
    return 'status-badge active'
  }

  const handleDocumentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
  }

  const handleUpload = () => {
    if (!selectedFile || !id) return
    setLocalMessage('')
    uploadMutation.mutate({ file: selectedFile, documentType: selectedDocType })
  }

  const handleFinalize = async (payload: {
    judgmentText: string
    decision: string
    compensationAmount?: string
    reasoning?: string
  }) => {
    await finalizeMutation.mutateAsync({
      judgment_text: payload.judgmentText,
      decision: payload.decision,
      compensation_amount: payload.compensationAmount,
      reasoning: payload.reasoning,
      legal_precedents: precedents.map((item) => item.caseId),
      articles_cited: lawArticles,
    })
  }

  const handleFeedbackSubmit = async () => {
    await feedbackMutation.mutateAsync(feedback)
  }

  return (
    <PortalLayout 
      title={t('judge.workspace.title')} 
      subtitle={`${t('judge.workspace.caseId')}: ${caseQuery.data?.case_number ?? id}`}
    >
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div /> {/* Spacer */}
        <Link className="btn btn-secondary" to="/judge/cases">
          <svg style={{ transform: 'rotate(180deg)' }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          {t('common.back')}
        </Link>
      </div>

      {localMessage && (
        <div className={messageType === 'error' ? 'error-banner' : 'success-banner'} style={{ marginBottom: '2rem' }}>
          {localMessage}
        </div>
      )}

      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <div className="panel">
            <h3>{t('judge.workspace.documents')}</h3>

            <div className="form-grid">
              <label>
                {t('judge.workspace.documentType')}
                <select
                  value={selectedDocType}
                  onChange={(event) => setSelectedDocType(event.target.value as DocumentType)}
                >
                  {DOCUMENT_TYPES.map((docType) => (
                    <option key={docType} value={docType}>
                      {t(`judge.documentTypes.${docType}`)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="upload-label">
                {t('judge.workspace.uploadDocument')}
                <div style={{ position: 'relative' }}>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    onChange={handleDocumentChange}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }}
                  />
                  <div className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {selectedFile ? selectedFile.name : t('judge.workspace.noFileSelected')}
                  </div>
                </div>
              </label>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? t('common.loading') : t('judge.workspace.uploadNow')}
              </button>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <ul className="document-list" style={{ listStyle: 'none', padding: 0 }}>
                {(documentsQuery.data?.items ?? []).map((doc) => (
                  <li key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ overflow: 'hidden', marginRight: '1rem' }}>
                      <strong style={{ fontSize: '0.9rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t(`judge.documentTypes.${doc.document_type}`)}</span>
                    </div>
                    <span className={getDocumentStatusClass(doc.processing_status)}>
                      {t(`judge.documentStatus.${doc.processing_status}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '1rem' }}
                onClick={() => runAnalysisMutation.mutate()}
                disabled={isActivelyLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                {t('judge.workspace.runAnalysis')}
              </button>
              
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                {isActivelyLoading && <p className="mono" style={{ fontSize: '0.85rem', color: 'var(--emerald-600)' }}>{t('judge.workspace.analysisPending')}</p>}
                {!isActivelyLoading && isReady && <p className="mono" style={{ fontSize: '0.85rem', color: 'var(--success)' }}>{t('judge.workspace.analysisReady')}</p>}
              </div>
            </div>
          </div>
        </aside>

        <section className="workspace-main">
          {analysisQuery.error && <div className="error-banner">{t('judge.workspace.analysisError')}</div>}

          <div className="panel">
            <h3>{t('judge.workspace.similarPrecedents')}</h3>
            {isReady ? (
              <div className="grid-dashboard" style={{ gridTemplateColumns: '1fr' }}>
                {precedents.map((item) => (
                <article key={item.caseId} className="case-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link 
                      to={`/judge/precedents/${item.caseId}`}
                      className="judicial-title"
                      style={{ fontSize: '1.1rem', textDecoration: 'none', color: 'var(--emerald-800)' }}
                    >
                      {item.title}
                    </Link>
                    <span className="badge-emerald" style={{ padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
                      {(item.similarityScore * 100).toFixed(0)}% match
                    </span>
                  </div>
                </article>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>{t('judge.workspace.waitingAnalysis')}</p>
            )}
          </div>

          <div className="panel">
            <h3>{t('judge.workspace.lawArticles')}</h3>
            {isReady ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {lawArticles.map((article) => (
                  <span key={article} className="badge-emerald" style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--emerald-200)' }}>
                    {article}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>{t('judge.workspace.waitingAnalysis')}</p>
            )}
          </div>

          <div className="panel">
            <h3>{t('judge.workspace.entitlementCalculation')}</h3>
            {isReady ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {entitlements.map((entry) => (
                  <div key={`${entry.label}-${entry.value}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontWeight: '500' }}>{entry.label}</span>
                    <strong style={{ color: 'var(--emerald-800)' }}>{entry.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>{t('judge.workspace.waitingAnalysis')}</p>
            )}
          </div>

          {isUnavailable && (
            <div className="warning-banner" style={{ marginBottom: '2rem', background: '#fff9db', border: '1px solid #ffec99', color: '#947600', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>AI Reasoning Unavailable</strong>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>The AI models are currently busy or disconnected. Basic analysis data is shown above, but a full judgment draft could not be generated.</p>
              </div>
            </div>
          )}

          <JudgmentEditor
            draftText={analysis?.draftText ?? ''}
            confidence={analysis?.confidence ?? 0}
            isSubmitting={finalizeMutation.isPending}
            onRegenerate={async () => {
              await runAnalysisMutation.mutateAsync()
              await analysisQuery.refetch()
            }}
            onFinalize={handleFinalize}
          />

          <div className="panel">
            <h3>{t('judge.workspace.feedbackTitle')}</h3>

            <div className="form-grid">
              <div className="decision-row" style={{ margin: 0, padding: '1.5rem 0', background: 'none', border: 'none', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem' }}>
                <label>
                  <span style={{ display: 'block', marginBottom: '1rem' }}>{t('judge.feedback.legalRelevance')}: <strong style={{ color: 'var(--emerald-700)' }}>{feedback.legal_relevance_score}</strong></span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={feedback.legal_relevance_score}
                    onChange={(event) =>
                      setFeedback((prev) => ({
                        ...prev,
                        legal_relevance_score: Number(event.target.value),
                      }))
                    }
                    style={{ height: '6px', background: 'var(--emerald-100)', borderRadius: '999px', appearance: 'none', padding: 0 }}
                  />
                </label>

                <label>
                   <span style={{ display: 'block', marginBottom: '1rem' }}>{t('judge.feedback.reasoningQuality')}: <strong style={{ color: 'var(--emerald-700)' }}>{feedback.reasoning_quality_score}</strong></span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={feedback.reasoning_quality_score}
                    onChange={(event) =>
                      setFeedback((prev) => ({
                        ...prev,
                        reasoning_quality_score: Number(event.target.value),
                      }))
                    }
                    style={{ height: '6px', background: 'var(--emerald-100)', borderRadius: '999px', appearance: 'none', padding: 0 }}
                  />
                </label>

                <label>
                   <span style={{ display: 'block', marginBottom: '1rem' }}>{t('judge.feedback.explanationClarity')}: <strong style={{ color: 'var(--emerald-700)' }}>{feedback.explanation_clarity_score}</strong></span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={feedback.explanation_clarity_score}
                    onChange={(event) =>
                      setFeedback((prev) => ({
                        ...prev,
                        explanation_clarity_score: Number(event.target.value),
                      }))
                    }
                    style={{ height: '6px', background: 'var(--emerald-100)', borderRadius: '999px', appearance: 'none', padding: 0 }}
                  />
                </label>
              </div>

              <label className="full-width">
                {t('judge.feedback.feedbackText')}
                <textarea
                  rows={4}
                  value={feedback.feedback_text}
                  onChange={(event) => setFeedback((prev) => ({ ...prev, feedback_text: event.target.value }))}
                  placeholder="Share your feedback on the AI results..."
                />
              </label>

              <label className="full-width">
                {t('judge.feedback.suggestedImprovements')}
                <textarea
                  rows={4}
                  value={feedback.suggested_improvements}
                  onChange={(event) =>
                    setFeedback((prev) => ({ ...prev, suggested_improvements: event.target.value }))
                  }
                  placeholder="How can we improve the accuracy of this analysis?"
                />
              </label>

              <div className="panel-actions full-width" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackMutation.isPending}
                >
                  {feedbackMutation.isPending ? t('common.loading') : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                      {t('judge.workspace.feedbackTitle')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PortalLayout>
  )
}

export default CaseDetail
