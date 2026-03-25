import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  Sparkles, 
  CheckCircle2,
  AlertCircle,
  Plus,
  Gavel
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
  uploadCaseDocument,
  deleteCase,
} from '../../api/judge'
import { useCaseAnalysisPolling } from '../../hooks/useCaseAnalysisPolling'
import type { DocumentType, JudgmentRequest } from '../../types/judge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CaseDetail = () => {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('other')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [analysisRequested, setAnalysisRequested] = useState(false)
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

  const deleteMutation = useMutation({
    mutationFn: () => deleteCase(id as string),
    onSuccess: () => navigate('/judge/cases'),
  })

  const analysis = analysisQuery.analysis?.analysis
  const isReady = analysis?.status === 'AIAnalysisReady'
  const isActivelyLoading = runAnalysisMutation.isPending || (analysisQuery.isPolling && analysisRequested)
  const lawArticles = analysis?.lawArticles ?? []
  const precedents = useMemo(() => (analysis?.similarPrecedents ?? []).slice(0, 5), [analysis?.similarPrecedents])
  const entitlements = analysis?.entitlementBreakdown ?? []

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
      articles_cited: lawArticles.map((a: any) => typeof a === 'string' ? a : (a.title || a.law_name || a.article_number || 'Legal Article')),
    })
  }

  return (
    <PortalLayout 
      title={t('judge.workspace.title')} 
      subtitle={`${t('judge.workspace.caseId')}: ${caseQuery.data?.case_number ?? id}`}
      hideHeaderContent={true}
    >
      <div className="flex flex-col min-h-screen">
        
        <CaseContextBar
          caseNumber={caseQuery.data?.case_number ?? id ?? ''}
          title={caseQuery.data?.title ?? ''}
          status={analysis?.status || caseQuery.data?.status}
          confidence={analysis?.confidence || 0}
          isActivelyLoading={isActivelyLoading}
          onRunAnalysis={() => runAnalysisMutation.mutate()}
          onFinalize={() => {
            const editorElem = document.getElementById('judgment-editor-workspace')
            editorElem?.scrollIntoView({ behavior: 'smooth' })
          }}
          onDelete={() => {
            if (window.confirm(t('judge.workspace.confirmDeleteCase') || 'Delete this case?')) {
              deleteMutation.mutate()
            }
          }}
        />

        {localMessage && (
          <div className={cn(
            "mx-6 mt-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm",
            messageType === 'error' ? "bg-error-container text-on-error-container border-error/20" : "bg-primary/10 border-primary/20 text-primary"
          )}>
            {messageType === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="font-semibold text-sm">{localMessage}</span>
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setLocalMessage('')}>
               <Plus className="w-4 h-4 rotate-45" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6 px-6 mt-8 items-start">

          <div className="col-span-12 xl:col-span-4">
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
              entitlements={entitlements}
            />
          </div>

          <div className="col-span-12 xl:col-span-8">
            <IntelligenceCenter
              analysis={analysis}
              caseId={id ?? ''}
              lawArticles={lawArticles}
              precedents={precedents}
            />
            <div className="mt-6">
              <DecisionSupport 
                caseId={id ?? ''} 
                onFeedbackSuccess={() => {
                  setMessageType('success')
                  setLocalMessage(t('judge.workspace.feedbackSuccess'))
                }}
              />
            </div>
          </div>

        </div>

        {isReady && (
          <div id="judgment-editor-workspace" className="px-6 mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
             <div className="flex flex-col gap-2 border-l-2 border-primary pl-4">
                <div className="flex items-center gap-2">
                   <Gavel className="w-5 h-5 text-primary" />
                   <h3 className="text-lg font-semibold text-on-surface">{t('judge.workspace.finalJudgmentOrchestrator')}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{t('judge.workspace.finalJudgmentOrchestratorDesc')}</p>
             </div>
             
             <JudgmentEditor
                draftText={analysis?.draftText ?? ''}
                confidence={analysis?.confidence ?? 0}
                isSubmitting={finalizeMutation.isPending}
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
        
        {!isActivelyLoading && !isReady && (
          <div className="mt-8 mx-6 p-6 text-center bg-surface-container-low dark:bg-surface-container-high rounded-3xl border border-dashed border-outline-variant/30 animate-in fade-in duration-500 mb-20">
             <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-6 relative">
                <Sparkles className="w-8 h-8 text-primary/40 animate-pulse" />
                <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
             </div>
             <h2 className="text-lg font-semibold text-primary">{t('judge.workspace.activateIntelligence')}</h2>
             <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto">
               {t('judge.workspace.activateIntelligenceDesc')}
             </p>
             <Button
               size="lg"
               className="mt-6 h-10 px-6 rounded-lg bg-primary text-on-primary font-semibold transition-all duration-200 gap-2"
               onClick={() => runAnalysisMutation.mutate()}
             >
                <Sparkles className="w-4 h-4" />
                {t('judge.workspace.launchWorkbench')}
             </Button>
          </div>
        )}

      </div>
    </PortalLayout>
  )
}

export default CaseDetail
