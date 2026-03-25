import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Scale, 
  BookOpen, 
  Calculator, 
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  BarChart3,
  Plus,
  History,
  AlertTriangle,
  Gavel,
  ShieldCheck,
  ListChecks,
  Eye,
  FilePlus,
  RotateCcw
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import JudgmentEditor from '../../components/judge/JudgmentEditor'
import CaseContextBar from '../../components/judge/workspace/CaseContextBar'
import DocumentsPanel from '../../components/judge/workspace/DocumentsPanel'
import IntelligenceCenter from '../../components/judge/workspace/IntelligenceCenter'
import DecisionSupport from '../../components/judge/workspace/DecisionSupport'
import { CATEGORY_DISPLAY_NAMES } from '../../constants/legal'
import {
  getCase,
  getCaseDocuments,
  runAnalysis,
  saveJudgment,
  submitFeedback,
  uploadCaseDocument,
  getPrecedent,
  deleteCase,
} from '../../api/judge'
import { useCaseAnalysisPolling } from '../../hooks/useCaseAnalysisPolling'
import type { DocumentType, FeedbackRequest, JudgmentRequest } from '../../types/judge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import StatCard from '@/components/StatCard'

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
  const { t, i18n } = useTranslation()
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
        let detail = error.response?.data?.detail
        if (typeof detail === 'object' && detail !== null) {
          detail = JSON.stringify(detail)
        }
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

  const deleteMutation = useMutation({
    mutationFn: () => deleteCase(id as string),
    onSuccess: () => navigate('/judge/cases'),
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

  const navigate = useNavigate()

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
      articles_cited: lawArticles.map((a: any) => typeof a === 'string' ? a : (a.title || a.law_name || a.article_number || 'Legal Article')),
    })
  }

  const handleFeedbackSubmit = async () => {
    await feedbackMutation.mutateAsync(feedback)
  }

  return (
    <PortalLayout 
      title={t('judge.workspace.title')} 
      subtitle={`${t('judge.workspace.caseId')}: ${caseQuery.data?.case_number ?? id}`}
      hideHeaderContent={true} // New flag to disable old header if logic allows it
    >
      <div className="flex flex-col min-h-screen">
        
        {/* 1. TOP STICKY CONTEXT BAR (NEW) */}
        <CaseContextBar 
          caseNumber={caseQuery.data?.case_number ?? id ?? ''}
          title={caseQuery.data?.title ?? ''}
          status={analysis?.status || caseQuery.data?.status || 'Active'}
          confidence={analysis?.confidence || 0}
          isActivelyLoading={isActivelyLoading}
          onRunAnalysis={() => runAnalysisMutation.mutate()}
          onFinalize={() => {
            const editorElem = document.getElementById('judgment-editor-workspace')
            editorElem?.scrollIntoView({ behavior: 'smooth' })
          }}
        />

        {/* Global Notifications Section */}
        {localMessage && (
          <div className={cn(
            "mx-8 mb-8 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm",
            messageType === 'error' ? "bg-error-container text-on-error-container border-error/20" : "bg-primary/10 border-primary/20 text-primary"
          )}>
            {messageType === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="font-bold text-sm uppercase tracking-tighter">{localMessage}</span>
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setLocalMessage('')}>
               <Plus className="w-4 h-4 rotate-45" />
            </Button>
          </div>
        )}

        {/* WORKSPACE GRID: 3-ZONE SYSTEM */}
        <div className="flex flex-col xl:flex-row gap-8 px-8 items-start mb-12">
          
          {/* ZONE 1: INPUT (Documents + AI Pipeline) */}
          <DocumentsPanel 
            documents={documentsQuery.data?.items ?? []}
            isActivelyLoading={isActivelyLoading}
            isReady={isReady}
            selectedDocType={selectedDocType}
            setSelectedDocType={setSelectedDocType}
            onFileSelect={handleDocumentChange}
            selectedFileName={selectedFile?.name || null}
            fileInputRef={fileInputRef}
            onUpload={handleUpload}
            isUploading={uploadMutation.isPending}
            pollingStatus={analysis?.status}
          />

          {/* ZONE 2: INTELLIGENCE CORE (Facts, Timeline, Laws, Metrics) */}
          <IntelligenceCenter 
            analysis={analysis}
            caseId={id ?? ''}
            lawArticles={lawArticles}
            precedents={precedents}
            entitlements={entitlements}
          />

          {/* ZONE 3: DECISION SUPPORT (Prophecy, Risks, Next Steps) */}
          <DecisionSupport 
            analysis={analysis}
            feedback={feedback}
            setFeedback={setFeedback}
            onFeedbackSubmit={handleFeedbackSubmit}
            isSubmittingFeedback={feedbackMutation.isPending}
          />

        </div>

        {/* JUDGMENT DRAFTING WORKSPACE (EXPANDED FOOTER SECTION) */}
        {isReady && (
          <div id="judgment-editor-workspace" className="px-8 pb-24 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="flex flex-col gap-2 border-l-4 border-primary pl-6">
                <div className="flex items-center gap-2">
                   <Gavel className="w-6 h-6 text-primary" />
                   <h3 className="text-2xl font-headline font-semibold tracking-tight text-on-surface">Final Judgment Orchestrator</h3>
                </div>
                <p className="text-on-surface-variant font-medium text-sm italic opacity-70">Synthesize all intelligence clusters into a legally binding draft.</p>
             </div>
             
             <JudgmentEditor
                draftText={analysis?.draftText ?? ''}
                confidence={analysis?.confidence ?? 0}
                isSubmitting={finalizeMutation.isPending}
                caseType={caseQuery.data?.case_type}
                caseNumber={caseQuery.data?.case_number}
                claimantName={caseQuery.data?.claimant_name ?? ''}
                respondentName={caseQuery.data?.respondent_name ?? ''}
                filingDate={caseQuery.data?.filing_date ?? ''}
                lawArticles={analysis?.lawArticles?.map((a: any) =>
                  typeof a === 'object' ? (a.title || '') : String(a)
                )}
                precedents={precedents.map(p => p.title)}
                outcome={analysis?.outcome}
                onRegenerate={async () => {
                  await runAnalysisMutation.mutateAsync()
                  await analysisQuery.refetch()
                }}
                onFinalize={handleFinalize}
              />
          </div>
        )}
        
        {/* State Placeholder for Initial View */}
        {!isActivelyLoading && !isReady && (
          <div className="flex flex-col items-center justify-center py-32 px-8 text-center bg-surface-container-low dark:bg-surface-container-high mx-8 rounded-[40px] border border-dashed border-outline-variant/30 mb-20 animate-in fade-in duration-500">
             <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-8 relative">
                <Sparkles className="w-12 h-12 text-primary/40 animate-pulse" />
                <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
             </div>
             <h2 className="text-3xl font-headline font-semibold text-primary mb-4 tracking-tight">Activate Legal Intelligence</h2>
             <p className="max-w-lg mx-auto text-on-surface-variant font-medium leading-relaxed italic mb-10">
               Click below to launch the reasoning cluster and populate this workspace with similar precedents, AI drafting suggestions, and entitlement calculations.
             </p>
             <Button 
               size="lg"
               className="h-14 px-12 rounded-2xl bg-primary text-on-primary font-bold uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all gap-3"
               onClick={() => runAnalysisMutation.mutate()}
             >
                <Sparkles className="w-5 h-5" />
                Launch AI Workbench
             </Button>
          </div>
        )}

      </div>
    </PortalLayout>
  )
}

export default CaseDetail
