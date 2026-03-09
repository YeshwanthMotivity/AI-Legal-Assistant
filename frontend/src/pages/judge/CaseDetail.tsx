import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import LanguageToggle from '../../components/LanguageToggle'
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
  const isPending = analysisQuery.isPolling || runAnalysisMutation.isPending

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
    <div className="page-shell workspace-shell">
      <header className="page-header">
        <div>
          <h1>{t('judge.workspace.title')}</h1>
          <p>
            {t('judge.workspace.caseId')}: {caseQuery.data?.case_number ?? id}
          </p>
        </div>
        <div className="header-actions">
          <LanguageToggle />
          <Link className="btn-secondary" to="/judge/cases">
            {t('common.back')}
          </Link>
        </div>
      </header>

      {localMessage && <div className={messageType === 'error' ? 'error-banner' : 'success-banner'}>{localMessage}</div>}

      <div className="workspace-grid">
        <aside className="workspace-sidebar panel">
          <h3>{t('judge.workspace.documents')}</h3>

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
            <input ref={fileInputRef} type="file" onChange={handleDocumentChange} />
          </label>
          <p className="case-id">
            {selectedFile ? selectedFile.name : t('judge.workspace.noFileSelected')}
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {t('judge.workspace.uploadNow')}
          </button>

          {uploadMutation.isPending && <p>{t('common.loading')}</p>}

          <ul className="document-list">
            {(documentsQuery.data?.items ?? []).map((doc) => (
              <li key={doc.id}>
                <div>
                  <strong>{doc.file_name}</strong>
                  <p>{t(`judge.documentTypes.${doc.document_type}`)}</p>
                </div>
                <span className={getDocumentStatusClass(doc.processing_status)}>
                  {t(`judge.documentStatus.${doc.processing_status}`)}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="btn-primary"
            onClick={() => runAnalysisMutation.mutate()}
            disabled={runAnalysisMutation.isPending}
          >
            {t('judge.workspace.runAnalysis')}
          </button>

          {isPending && !isReady && <p>{t('judge.workspace.analysisPending')}</p>}
          {!isPending && isReady && <p>{t('judge.workspace.analysisReady')}</p>}
        </aside>

        <section className="workspace-main">
          {analysisQuery.error && <p className="error-text">{t('judge.workspace.analysisError')}</p>}

          <div className="panel">
            <h3>{t('judge.workspace.similarPrecedents')}</h3>
            {isReady ? (
              <ul>
                {precedents.map((item) => (
                  <li key={item.caseId} className="list-row">
                    <span>{item.title}</span>
                    <span>{item.similarityScore.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{t('judge.workspace.waitingAnalysis')}</p>
            )}
          </div>

          <div className="panel">
            <h3>{t('judge.workspace.lawArticles')}</h3>
            {isReady ? (
              <div className="tag-wrap">
                {lawArticles.map((article) => (
                  <span key={article} className="tag">
                    {article}
                  </span>
                ))}
              </div>
            ) : (
              <p>{t('judge.workspace.waitingAnalysis')}</p>
            )}
          </div>

          <div className="panel">
            <h3>{t('judge.workspace.entitlementCalculation')}</h3>
            {isReady ? (
              <div>
                {entitlements.map((entry) => (
                  <div className="list-row" key={`${entry.label}-${entry.value}`}>
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
                <div className="confidence-wrap">
                  <span>{t('judge.workspace.aiConfidence')}</span>
                  <div className="confidence-track">
                    <div className="confidence-fill" style={{ width: `${Math.round(analysis?.confidence ?? 0)}%` }} />
                  </div>
                  <span>{Math.round(analysis?.confidence ?? 0)}%</span>
                </div>
              </div>
            ) : (
              <p>{t('judge.workspace.waitingAnalysis')}</p>
            )}
          </div>

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

            <label>
              {t('judge.feedback.legalRelevance')}: {feedback.legal_relevance_score}
              <input
                type="range"
                min={1}
                max={5}
                value={feedback.legal_relevance_score}
                onChange={(event) =>
                  setFeedback((prev) => ({
                    ...prev,
                    legal_relevance_score: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label>
              {t('judge.feedback.reasoningQuality')}: {feedback.reasoning_quality_score}
              <input
                type="range"
                min={1}
                max={5}
                value={feedback.reasoning_quality_score}
                onChange={(event) =>
                  setFeedback((prev) => ({
                    ...prev,
                    reasoning_quality_score: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label>
              {t('judge.feedback.explanationClarity')}: {feedback.explanation_clarity_score}
              <input
                type="range"
                min={1}
                max={5}
                value={feedback.explanation_clarity_score}
                onChange={(event) =>
                  setFeedback((prev) => ({
                    ...prev,
                    explanation_clarity_score: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label>
              {t('judge.feedback.feedbackText')}
              <textarea
                rows={3}
                value={feedback.feedback_text}
                onChange={(event) => setFeedback((prev) => ({ ...prev, feedback_text: event.target.value }))}
              />
            </label>

            <label>
              {t('judge.feedback.suggestedImprovements')}
              <textarea
                rows={3}
                value={feedback.suggested_improvements}
                onChange={(event) =>
                  setFeedback((prev) => ({ ...prev, suggested_improvements: event.target.value }))
                }
              />
            </label>

            <div className="panel-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleFeedbackSubmit}
                disabled={feedbackMutation.isPending}
              >
                {feedbackMutation.isPending ? t('common.loading') : t('case.feedback')}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CaseDetail
