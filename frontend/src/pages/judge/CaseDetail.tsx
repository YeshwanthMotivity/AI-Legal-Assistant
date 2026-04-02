import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { 
  Sparkles, 
  CheckCircle2,
  AlertCircle,
  Plus,
  Gavel,
  Scale,
  BookOpen,
  ChevronRight,
  FileText
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import JudgmentEditor from '../../components/judge/JudgmentEditor'
import CaseContextBar from '../../components/judge/workspace/CaseContextBar'
import DocumentsPanel from '../../components/judge/workspace/DocumentsPanel'
import CaseWorkflowStepper from '../../components/layout/CaseWorkflowStepper'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
    mutationFn: () => runAnalysis(id as string, i18n.language),
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
  // Fix: use isFetching for active polling state, not isLoading (which is only true on first load)
  // Also only lock the button if we are actively communicating with the network or explicitly polling for a new request
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
          status={analysis?.status || caseQuery.data?.status}
          confidence={analysis?.confidence || 0}
          isActivelyLoading={isActivelyLoading}
          onRunAnalysis={() => runAnalysisMutation.mutate()}
          onFinalize={() => {
            const editorElem = document.getElementById('judgment-editor-workspace')
            editorElem?.scrollIntoView({ behavior: 'smooth' })
          }}
          onDelete={() => deleteMutation.mutate()}
        />

        <div className="px-6 mt-6">
          <CaseWorkflowStepper 
            status={caseQuery.data?.status} 
            role="judge" 
            onStepClick={(step) => {
              if (step === 2) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else if (step === 4 || step === 5) {
                document.getElementById('judgment-editor-workspace')?.scrollIntoView({ behavior: 'smooth' });
              }
            }} 
          />
        </div>

        {/* Global Notifications Section */}
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

        {/* WORKSPACE GRID: 2-ZONE SYSTEM */}
        <div className="grid grid-cols-12 gap-6 px-6 mt-8 items-start">

          {/* ZONE 1: INPUT (Documents + Entitlements) */}
          <div className="col-span-12 xl:col-span-4 space-y-8 h-full sticky top-24 self-start">
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

          {/* ZONE 2: INTELLIGENCE (Summary + Precedents + Laws) */}
          <div className="col-span-12 xl:col-span-8 space-y-8">

            {/* CASE SUMMARY */}
            <Card className="bg-surface-container-lowest dark:bg-surface-container overflow-hidden rounded-xl editorial-shadow border border-outline-variant/30">
              <CardHeader className="p-5 border-b border-outline-variant/20 bg-surface-container-low/40">
                <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {t('judge.workspace.caseSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {analysis?.summary ? (
                  <p className="text-sm text-on-surface leading-relaxed">
                    {analysis.summary}
                  </p>
                ) : (
                  <p className="text-sm text-on-surface-variant leading-relaxed italic">
                    {t('judge.workspace.activateIntelligenceDesc')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* SIMILAR PRECEDENTS */}
            {(isReady || precedents.length > 0) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-on-surface">
                    <Scale className="w-4 h-4 text-primary" />
                    {t('judge.workspace.precedentAnalysis')}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {precedents.length} {t('judge.workspace.total')}
                  </span>
                </div>

                {precedents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {precedents.map((item) => {
                      const pct = Math.round(
                        (item.similarityScore || 0) > 1
                          ? item.similarityScore
                          : (item.similarityScore || 0) * 100
                      )
                      const isHighMatch = pct >= 70
                      return (
                        <Link
                          key={item.caseId}
                          to={`/judge/precedents/${item.caseId}`}
                          state={{ fromCaseId: id }}
                          className="group bg-surface-container-low p-5 rounded-xl border border-outline-variant/30 hover:border-primary/40 hover:shadow-md transition-all duration-200 block"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  {t('judge.workspace.rulingId')}: {item.caseId}
                                </span>
                                {isHighMatch && (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold uppercase px-1.5 h-4">
                                    {t('judge.workspace.strongMatch')}
                                  </Badge>
                                )}
                              </div>
                              <h5 className="text-sm font-semibold text-on-surface leading-snug">{item.title}</h5>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {item.summary?.substring(0, 110) || t('judge.workspace.legalAlignmentFound')}
                              </p>
                            </div>
                            <div className="shrink-0 text-right space-y-1.5">
                              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {t('judge.workspace.similarity')}
                              </div>
                              <div className="text-2xl font-black text-emerald-600">{pct}%</div>
                              <div className="w-16 h-1.5 bg-outline-variant/20 rounded-full overflow-hidden ml-auto">
                                <div
                                  className="h-full bg-emerald-500 transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-outline-variant/20">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                              {t('judge.workspace.detailView')}
                            </span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-surface-container-low p-6 rounded-xl border border-dashed border-outline-variant/30 text-center flex flex-col items-center justify-center space-y-2">
                    <Scale className="w-6 h-6 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground italic">
                      {t('judge.workspace.noPrecedentsFound', 'No highly similar precedents found for this case.')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* LAW ARTICLES */}
            {(isReady || lawArticles.length > 0) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-on-surface">
                    <BookOpen className="w-4 h-4 text-primary" />
                    {t('judge.workspace.legalFramework')}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {lawArticles.length} {t('judge.workspace.total')}
                  </span>
                </div>

                {lawArticles.length > 0 ? (
                  <Card className="bg-surface-container-low border border-outline-variant/30 rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className="divide-y divide-outline-variant/20">
                        {lawArticles.map((art: any, idx: number) => {
                          const title = typeof art === 'string' ? art : (art.title || art.article_number || `Article ${idx + 1}`)
                          const content = typeof art === 'object' ? (art.content || '') : ''
                          return (
                            <div key={idx} className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                                    {title}
                                  </span>
                                  {content && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{content}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="bg-surface-container-low p-6 rounded-xl border border-dashed border-outline-variant/30 text-center flex flex-col items-center justify-center space-y-2">
                    <BookOpen className="w-6 h-6 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground italic">
                      {t('judge.workspace.noLawsFound', 'No specific laws were heavily cited in the AI determination.')}
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* JUDGMENT DRAFTING WORKSPACE (EXPANDED FOOTER SECTION) */}
        {isReady && (
          <div id="judgment-editor-workspace" className="px-6 mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
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
        
        {/* State Placeholder for Initial View */}
        {!isActivelyLoading && !isReady && (
          <div className="mt-8 mx-6 p-6 text-center bg-surface-container-low dark:bg-surface-container-high rounded-3xl border border-dashed border-outline-variant/30 animate-in fade-in duration-500">
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
