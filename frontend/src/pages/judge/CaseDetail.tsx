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
            "mx-6 mt-6 p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm",
            messageType === 'error' ? "bg-terracotta-100 text-terracotta-800 border-terracotta-200" : "bg-emerald-50 border-emerald-100 text-emerald-800"
          )}>
            {messageType === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="font-bold text-sm">{localMessage}</span>
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 hover:bg-black/5" onClick={() => setLocalMessage('')}>
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
            <Card className="bg-white overflow-hidden rounded-2xl shadow-sm border border-slate-200">
              <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {t('judge.workspace.caseSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {analysis?.summary ? (
                  <p className="text-sm text-secondary leading-relaxed font-medium">
                    {analysis.summary}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 leading-relaxed italic font-medium">
                    {t('judge.workspace.activateIntelligenceDesc')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* SIMILAR PRECEDENTS */}
            {(isReady || precedents.length > 0) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mt-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-secondary">
                    <Scale className="w-4 h-4 text-primary" />
                    {t('judge.workspace.precedentAnalysis')}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                          className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all duration-300 block"
                        >
                          <div className="flex items-start justify-between gap-6">
                            <div className="flex-1 min-w-0 space-y-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                  {t('judge.workspace.rulingId')}: {item.caseId}
                                </span>
                                {isHighMatch && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-none text-[9px] font-heavy tracking-tighter uppercase px-2 h-5 rounded-md">
                                    {t('judge.workspace.strongMatch')}
                                  </Badge>
                                )}
                              </div>
                              <h5 className="text-lg font-headline font-bold text-secondary leading-snug group-hover:text-primary transition-colors">{item.title}</h5>
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                                {item.summary?.substring(0, 110) || t('judge.workspace.legalAlignmentFound')}
                              </p>
                            </div>
                            <div className="shrink-0 text-right space-y-2">
                              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                {t('judge.workspace.similarity')}
                              </div>
                              <div className="text-3xl font-black text-emerald-600">{pct}%</div>
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden ml-auto">
                                <div
                                  className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-slate-50">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">
                              {t('judge.workspace.detailView')}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
                <div className="flex items-center justify-between mt-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-secondary">
                    <BookOpen className="w-4 h-4 text-primary" />
                    {t('judge.workspace.legalFramework')}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {lawArticles.length} {t('judge.workspace.total')}
                  </span>
                </div>

                {lawArticles.length > 0 ? (
                  <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-50">
                        {lawArticles.map((art: any, idx: number) => {
                          const title = typeof art === 'string' ? art : (art.title || art.article_number || `Article ${idx + 1}`)
                          const content = typeof art === 'object' ? (art.content || '') : ''
                          return (
                            <div key={idx} className="px-6 py-6 hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center gap-5">
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-bold text-secondary block mb-1">
                                    {title}
                                  </span>
                                  {content && (
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{content}</p>
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
          <div id="judgment-editor-workspace" className="px-6 mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
             <div className="flex flex-col gap-2 border-l-4 border-primary pl-6 py-1">
                <div className="flex items-center gap-3">
                   <Gavel className="w-6 h-6 text-primary" />
                   <h3 className="text-3xl font-headline font-bold text-secondary">{t('judge.workspace.finalJudgmentOrchestrator')}</h3>
                </div>
                <p className="text-sm text-slate-500 font-medium">{t('judge.workspace.finalJudgmentOrchestratorDesc')}</p>
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
          <div className="mt-10 mx-6 p-12 text-center bg-white rounded-[2rem] border border-slate-200 shadow-sm animate-in fade-in duration-700">
             <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-8 relative">
                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
             </div>
             <h2 className="text-3xl font-headline font-bold text-secondary">{t('judge.workspace.activateIntelligence')}</h2>
             <p className="mt-4 text-sm text-slate-500 max-w-lg mx-auto font-medium leading-relaxed">
               {t('judge.workspace.activateIntelligenceDesc')}
             </p>
             <Button
               size="lg"
               className="mt-8 h-12 px-10 rounded-xl bg-primary hover:bg-emerald-700 text-white font-extrabold tracking-widest uppercase transition-all duration-300 gap-3 shadow-xl shadow-emerald-900/20"
               onClick={() => runAnalysisMutation.mutate()}
             >
                <Sparkles className="w-5 h-5" />
                {t('judge.workspace.launchWorkbench')}
             </Button>
          </div>
        )}

      </div>
    </PortalLayout>
  )
}

export default CaseDetail
