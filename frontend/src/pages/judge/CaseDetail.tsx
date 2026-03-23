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
  Plus
} from 'lucide-react'
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
      
      {/* Action Header */}
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={() => navigate('/judge/cases')} className="gap-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </Button>
        <div className="flex gap-3">
           <Button 
            variant="outline" 
            className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
            disabled={isActivelyLoading}
            onClick={() => runAnalysisMutation.mutate()}
           >
              <Sparkles className={cn("w-4 h-4", isActivelyLoading && "animate-pulse")} />
              {t('judge.workspace.runAnalysis')}
           </Button>
           <Button className="shadow-lg shadow-primary/20">
              Finalize Judgment
           </Button>
        </div>
      </div>

      {localMessage && (
        <div className={cn(
          "mb-8 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4",
          messageType === 'error' ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
        )}>
          {messageType === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span className="font-bold text-sm">{localMessage}</span>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setLocalMessage('')}>
             <Plus className="w-4 h-4 rotate-45" />
          </Button>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Sidebar: Documents & Analysis Status */}
        <aside className="w-full xl:w-96 flex flex-col gap-6 sticky top-24">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/10 border-b py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {t('judge.workspace.documents')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5 text-xs">
                    <label className="font-black uppercase text-muted-foreground ml-1">{t('judge.workspace.documentType')}</label>
                    <select
                      className="w-full bg-background border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                      value={selectedDocType}
                      onChange={(event) => setSelectedDocType(event.target.value as DocumentType)}
                    >
                      {DOCUMENT_TYPES.map((docType) => (
                        <option key={docType} value={docType}>
                          {t(`judge.documentTypes.${docType}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="font-black uppercase text-muted-foreground ml-1">{t('judge.workspace.uploadDocument')}</label>
                    <div className="relative group">
                       <input 
                         ref={fileInputRef} 
                         type="file" 
                         className="absolute inset-0 opacity-0 cursor-pointer z-10"
                         onChange={handleDocumentChange}
                       />
                       <div className="flex items-center gap-2 w-full bg-background border border-dashed rounded-lg px-3 py-2.5 group-hover:border-primary/50 transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                          <span className="truncate text-muted-foreground text-xs font-medium italic">
                            {selectedFile ? selectedFile.name : "Choose file..."}
                          </span>
                       </div>
                    </div>
                  </div>

                  <Button
                    className="w-full h-10 shadow-sm"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? "Uploading..." : "Upload & Process"}
                  </Button>
                </div>

                <div className="pt-4 border-t space-y-2">
                  {(documentsQuery.data?.items ?? []).map((doc) => (
                    <div key={doc.id} className="group flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-card transition-all">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-0.5">
                           <FileText className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                           <h5 className="text-[11px] font-bold truncate">{doc.file_name}</h5>
                        </div>
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">{t(`judge.documentTypes.${doc.document_type}`)}</span>
                      </div>
                      <Badge 
                        variant={doc.processing_status === 'complete' ? 'success' : doc.processing_status === 'failed' ? 'destructive' : 'warning'}
                        className="px-1.5 h-4 text-[9px] font-black uppercase tracking-tighter"
                      >
                         {t(`judge.documentStatus.${doc.processing_status.toLowerCase()}`)}
                      </Badge>
                    </div>
                  ))}
                  {(!documentsQuery.data?.items || documentsQuery.data?.items.length === 0) && (
                    <div className="py-8 text-center text-[11px] text-muted-foreground italic bg-muted/10 rounded-lg">
                       No documents uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Workbench Status */}
          <Card className="shadow-sm border-border/50 bg-primary/5 border-primary/10">
             <CardHeader className="py-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-primary" />
                   AI Workspace Status
                </CardTitle>
             </CardHeader>
             <CardContent className="pb-6">
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Analysis Status</span>
                      <Badge variant={isReady ? "default" : "warning"} className="uppercase font-black text-[9px]">
                         {isActivelyLoading ? "Processing" : isReady ? "Complete" : "Initial"}
                      </Badge>
                   </div>
                   {isReady && (
                      <div className="space-y-2">
                         <div className="flex justify-between text-[10px] font-black uppercase text-muted-foreground">
                            <span>Confidence Level</span>
                            <span className="text-primary">
                               {Math.round((analysis?.confidence ?? 0) > 1 ? (analysis?.confidence ?? 0) : (analysis?.confidence ?? 0) * 100)}%
                            </span>
                         </div>
                         <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all duration-1000" 
                              style={{ width: `${(analysis?.confidence ?? 0) * 100}%` }}
                            />
                         </div>
                      </div>
                   )}
                </div>
             </CardContent>
          </Card>
        </aside>

        {/* Main Content: Analysis Results & Editor */}
        <main className="flex-1 space-y-8 w-full">
          {analysisQuery.error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 flex items-center gap-3">
               <AlertCircle className="w-5 h-5" />
               <span className="font-bold text-sm italic">{t('judge.workspace.analysisError')}</span>
            </div>
          )}

          {/* Analysis View - Conditional on Analysis Ready */}
          {isReady ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Precedents Card */}
              <Card className="shadow-sm border-border/50 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-muted/10 border-b py-4">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-indigo-500" />
                    <CardTitle className="text-sm">{t('judge.workspace.similarPrecedents')}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Top 5</Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/30">
                      {precedents.map((item) => (
                        <Link 
                          key={item.caseId}
                          to={`/judge/precedents/${item.caseId}`}
                          className="flex items-center justify-between p-5 hover:bg-muted/40 transition-all group"
                        >
                          <div className="flex-1 min-w-0 pr-6">
                             <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-black bg-background shrink-0 uppercase tracking-tighter border-primary/20 text-primary/70">Ref: {item.caseId}</Badge>
                                <h6 className="text-[13px] font-extrabold group-hover:text-primary transition-colors truncate">{item.title}</h6>
                             </div>
                             <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                                <Scale className="w-3 h-3 opacity-50" />
                                Official DIFC Judicial Record
                             </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                             <div className="flex flex-col items-end">
                                <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-black border border-emerald-500/20 shadow-sm">
                                   {Math.round((item.similarityScore || 0) * 100)}% Match
                                </div>
                             </div>
                             <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </div>
                        </Link>
                      ))}
                   </div>
                </CardContent>
              </Card>

              {/* Law Articles Card */}
              <Card className="shadow-sm border-border/50 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-muted/10 border-b py-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <CardTitle className="text-sm">{t('judge.workspace.lawArticles')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 gap-4">
                      {lawArticles.map((article: any, idx: number) => (
                        <div key={idx} className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                          <div className="flex items-center gap-2 mb-2">
                             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                             <h5 className="font-black text-amber-900 text-xs uppercase tracking-tight">
                               {typeof article === 'string' ? article : article.title || article.article_number || 'Article'}
                             </h5>
                          </div>
                          <p className="text-[11px] text-amber-800/80 leading-relaxed italic font-medium">
                            {typeof article === 'object' ? article.content || article.text : "Citations mapped from primary case analysis."}
                          </p>
                        </div>
                      ))}
                      {lawArticles.length === 0 && (
                        <div className="py-10 text-center flex flex-col items-center gap-2 bg-muted/5 rounded-xl border border-dashed">
                           <BookOpen className="w-8 h-8 text-muted-foreground/20" />
                           <p className="text-xs text-muted-foreground italic">No relevant articles identified.</p>
                        </div>
                      )}
                    </div>
                </CardContent>
              </Card>

              {/* Entitlements Card */}
              <Card className="md:col-span-2 shadow-sm border-border/50 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-muted/10 border-b py-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-500" />
                    <CardTitle className="text-sm">{t('judge.workspace.entitlementCalculation')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y divide-border/50 sm:divide-y-0">
                      {entitlements.map((entry, idx) => (
                        <div key={`${entry.label}-${idx}`} className="p-6 flex flex-col gap-1 hover:bg-muted/10 transition-colors border-r border-border/50 last:border-r-0">
                           <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">{entry.label}</span>
                           <strong className="text-lg text-primary font-bold">{entry.value}</strong>
                        </div>
                      ))}
                      {entitlements.length === 0 && (
                        <div className="col-span-full py-10 text-center text-muted-foreground italic bg-muted/5">
                           Calculation data unavailable for this case.
                        </div>
                      )}
                    </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="shadow-sm border-border/50 border-dashed border-2 bg-muted/5">
               <CardContent className="py-24 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h4 className="text-lg font-bold mb-2">Analysis Workspace</h4>
                  <p className="max-w-md mx-auto text-muted-foreground text-sm italic">
                     {t('judge.workspace.waitingAnalysis')} Run the AI Analysis to populate similar precedents, law articles, and entitlement calculations.
                  </p>
                  <Button 
                    className="mt-6 shadow-md shadow-primary/10" 
                    variant="outline"
                    disabled={isActivelyLoading}
                    onClick={() => runAnalysisMutation.mutate()}
                  >
                     <Sparkles className="w-4 h-4 mr-2" />
                     {isActivelyLoading ? "Analyzing Case Data..." : "Run AI Case Analysis"}
                  </Button>
               </CardContent>
            </Card>
          )}

          {/* AI Unavailability Warning */}
          {isUnavailable && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 flex gap-4 items-start shadow-sm">
              <div className="p-2 bg-amber-500/20 rounded-lg text-amber-700">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-amber-900 text-sm mb-1 uppercase tracking-tighter">AI Reasoning in Progress</h5>
                <p className="text-amber-800 text-xs leading-relaxed opacity-90">
                  The reasoning engine (JAIS-7B) is synthesizing complex legal data. This deep analysis may take 2-5 minutes to complete. Please keep this page open; your draft will appear automatically once ready.
                </p>
              </div>
            </div>
          )}

          {/* Judgment Editor Workspace */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Scale className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold tracking-tight">Judgment Drafting Workspace</h3>
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
          </div>

          {/* Feedback Section */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/10 border-b py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                {t('judge.workspace.feedbackTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-8">
                {/* Scoring Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {[
                    { id: 'legal_relevance_score', label: t('judge.feedback.legalRelevance'), icon: Scale },
                    { id: 'reasoning_quality_score', label: t('judge.feedback.reasoningQuality'), icon: Sparkles },
                    { id: 'explanation_clarity_score', label: t('judge.feedback.explanationClarity'), icon: BookOpen }
                  ].map((item) => (
                    <div key={item.id} className="space-y-4">
                       <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-muted-foreground uppercase flex items-center gap-2">
                             <item.icon className="w-3.5 h-3.5 text-primary" />
                             {item.label}
                          </span>
                          <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-black">{(feedback as any)[item.id]} / 5</span>
                       </div>
                       <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={(feedback as any)[item.id]}
                        onChange={(event) =>
                          setFeedback((prev) => ({
                            ...prev,
                            [item.id]: Number(event.target.value),
                          }))
                        }
                        className="w-full h-1.5 bg-accent rounded-full appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  ))}
                </div>

                {/* Text Feedback */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-muted-foreground ml-1">{t('judge.feedback.feedbackText')}</label>
                    <textarea
                      rows={4}
                      className="w-full bg-muted/20 border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:italic"
                      value={feedback.feedback_text}
                      onChange={(event) => setFeedback((prev) => ({ ...prev, feedback_text: event.target.value }))}
                      placeholder="e.g. The legal reasoning aligns perfectly with recent DIFC precedents..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase text-muted-foreground ml-1">{t('judge.feedback.suggestedImprovements')}</label>
                    <textarea
                      rows={4}
                      className="w-full bg-muted/20 border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:italic"
                      value={feedback.suggested_improvements}
                      onChange={(event) => setFeedback((prev) => ({ ...prev, suggested_improvements: event.target.value }))}
                      placeholder="e.g. Include citations for the recent commercial law amendments..."
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t pt-6">
                  <Button
                    className="gap-2 px-8 shadow-md"
                    onClick={handleFeedbackSubmit}
                    disabled={feedbackMutation.isPending}
                  >
                    {feedbackMutation.isPending ? "Submitting..." : (
                      <>
                        <ThumbsUp className="w-4 h-4" />
                        {t('judge.workspace.feedbackTitle')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </PortalLayout>
  )
}

export default CaseDetail
