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
import CaseComparison from '../../components/judge/CaseComparison'
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
    >
      
      {/* Action Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-3">
            <Link to="/judge/cases">
              <Button variant="ghost" size="sm" className="gap-2 font-bold hover:bg-primary/5">
                <ChevronLeft className="w-4 h-4" />
                {t('common.back')}
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              size="sm"
              className="gap-2 font-bold px-4 shadow-sm hover:scale-105 transition-all"
              onClick={() => { if (window.confirm('Delete this case?')) deleteMutation.mutate() }}
              disabled={deleteMutation.isPending}
            >
              <AlertCircle className="w-4 h-4 text-destructive-foreground" />
              {deleteMutation.isPending ? "Deleting..." : "Delete Case"}
            </Button>
        </div>
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
          "mb-8 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm",
          messageType === 'error' ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-primary/10 border-primary/20 text-primary"
        )}>
          {messageType === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span className="font-bold text-sm uppercase tracking-tighter">{localMessage}</span>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setLocalMessage('')}>
             <Plus className="w-4 h-4 rotate-45" />
          </Button>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Sidebar: Documents & Analysis Status */}
        <aside className="w-full xl:w-96 flex flex-col gap-6 sticky top-24 overflow-y-auto max-h-[calc(100vh-120px)] scrollbar-hide">
          <Card className="shadow-lg border-border/50 overflow-hidden">
            <CardHeader className="bg-muted/10 border-b py-4 px-6">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {t('judge.workspace.documents')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5 group">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest flex items-center gap-2">
                        <FileText className="w-3 h-3 text-primary" />
                        {t('judge.workspace.documentType')}
                      </label>
                      <select
                        className="w-full bg-background border border-border/50 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer font-bold"
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

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase text-muted-foreground ml-1">{t('judge.workspace.uploadDocument')}</label>
                      <div className="relative group">
                         <input 
                           ref={fileInputRef} 
                           type="file" 
                           className="absolute inset-0 opacity-0 cursor-pointer z-10"
                           onChange={handleDocumentChange}
                         />
                         <div className="flex items-center gap-2 w-full bg-background border border-dashed rounded-xl px-3 py-3 group-hover:border-primary/50 transition-colors">
                            <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                            <span className="truncate text-muted-foreground text-[11px] font-medium italic">
                              {selectedFile ? selectedFile.name : "Choose file..."}
                            </span>
                         </div>
                      </div>
                    </div>

                    <Button
                      className="w-full h-11 rounded-xl shadow-md"
                      onClick={handleUpload}
                      disabled={!selectedFile || uploadMutation.isPending}
                    >
                      {uploadMutation.isPending ? t('common.loading') : t('judge.workspace.uploadAndProcess')}
                    </Button>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    {(documentsQuery.data?.items ?? []).map((doc) => (
                      <div key={doc.id} className="group flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-card transition-all">
                        <div className="flex-1 min-w-0 ltr:pr-2 rtl:pl-2">
                          <div className="flex items-center gap-2 mb-0.5">
                             <FileText className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                             <h5 className="text-[11px] font-bold truncate">{doc.file_name}</h5>
                          </div>
                          <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-tight">{t(`judge.documentTypes.${doc.document_type}`)}</span>
                        </div>
                        <Badge 
                          variant={doc.processing_status === 'complete' ? 'success' : doc.processing_status === 'failed' ? 'destructive' : 'warning'}
                          className="px-2 h-5 text-[9px] font-black uppercase tracking-tighter"
                        >
                           {t(`judge.documentStatus.${doc.processing_status.toLowerCase()}`)}
                        </Badge>
                      </div>
                    ))}
                    {(!documentsQuery.data?.items || documentsQuery.data?.items.length === 0) && (
                      <div className="py-8 text-center text-[11px] text-muted-foreground italic bg-muted/10 rounded-xl">
                         {t('judge.workspace.noDocuments')}
                      </div>
                    )}
                  </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Workbench Status Card */}
          <Card className="shadow-lg border-border/50 bg-primary/5 border-primary/10 overflow-hidden">
              <CardHeader className="py-4 px-6 bg-primary/5">
                 <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {t('judge.workspace.aiStatus')}
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="space-y-5">
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-muted-foreground uppercase">{t('judge.workspace.analysisStatus')}</span>
                       <Badge variant={isReady ? "success" : "warning"} className="uppercase font-black text-[9px] tracking-widest px-2.5 py-0.5">
                          {isActivelyLoading ? t('judge.workspace.processing') : isReady ? t('judge.workspace.complete') : t('judge.workspace.initial')}
                       </Badge>
                    </div>
                    {isReady && (
                       <div className="space-y-2.5">
                          <div className="flex justify-between text-[11px] font-black uppercase text-muted-foreground">
                             <span>{t('judge.workspace.confidence')}</span>
                             <span className="text-primary font-black">
                                {Math.round((analysis?.confidence ?? 0) > 1 ? (analysis?.confidence ?? 0) : (analysis?.confidence ?? 0) * 100)}%
                             </span>
                          </div>
                          <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)] transition-all duration-1000" 
                               style={{ width: `${(analysis?.confidence ?? 0) * 100}%` }}
                             />
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed italic opacity-70">
                             Analysis based on {documentsQuery.data?.items.length ?? 0} ingested documents.
                          </p>
                       </div>
                    )}
                 </div>
              </CardContent>
          </Card>
        </aside>

        {/* Main Content: Analysis Results & Editor */}
        <main className="flex-1 space-y-8 w-full">
          {analysisQuery.error && (
            <div className="bg-destructive/10 text-destructive p-5 rounded-2xl border border-destructive/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
               <AlertCircle className="w-6 h-6 flex-shrink-0" />
               <span className="font-bold text-sm italic">{t('judge.workspace.analysisError')}</span>
            </div>
          )}

          {/* Analysis View - Conditional on Analysis Ready */}
          {isReady ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
               
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Precedents Card */}
              <Card className="shadow-lg border-border/50 overflow-hidden group">
                  <CardHeader className="flex flex-row items-center justify-between bg-primary/5 border-b py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-sm font-black uppercase tracking-widest">{t('judge.workspace.similarPrecedents')}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary px-2">{t('judge.workspace.top5')}</Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/20">
                      {precedents.map((item) => (
                        <Link 
                          key={item.caseId}
                          to={`/judge/precedents/${item.caseId}`} 
                          state={{ fromCaseId: id }}
                          className={cn(
                            "grid grid-cols-[1fr,auto] items-center p-6 transition-all group border-l-4 border-transparent",
                            "hover:bg-primary/5 hover:border-primary"
                          )}
                        >
                          <div className="flex-1 min-w-0 ltr:pr-6 rtl:pl-6">
                             <div className="flex items-center gap-3 mb-1.5">
                                <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold bg-background shrink-0 border-border/50 text-muted-foreground">{item.caseId}</Badge>
                                <span className="text-[14px] font-black group-hover:text-primary transition-colors truncate underline decoration-primary/10 underline-offset-4 decoration-2">
                                  {item.title}
                                </span>
                             </div>
                             <p className="text-[11px] text-muted-foreground font-bold flex items-center gap-2 opacity-60 uppercase tracking-tighter">
                                <Clock className="w-3.5 h-3.5" />
                                Decided Jan 2024
                             </p>
                          </div>
                          <div className="flex items-center gap-5 shrink-0">
                             <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black border border-primary/20 shadow-sm uppercase tracking-widest">
                                {Math.round((item.similarityScore || 0) * 100)}% Match
                             </div>
                             <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                          </div>
                        </Link>
                      ))}
                    </div>
                </CardContent>
              </Card>

              {/* Law Articles Card */}
              <Card className="shadow-lg border-border/50 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-amber-500/5 border-b py-4 px-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-amber-600" />
                    <CardTitle className="text-sm font-black uppercase tracking-widest">{t('judge.workspace.lawArticles')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 gap-4">
                      {lawArticles.map((article: any, idx: number) => {
                        const isObj = typeof article === 'object' && article !== null;
                        const title = isObj 
                          ? (article.title || article.law_name || article.article_number || `Article ${idx + 1}`) 
                          : String(article);
                        const content = isObj 
                          ? (article.content || article.text || article.description || "Article details mapped from Case Analysis.") 
                          : "Citations mapped from primary case analysis.";
                        
                        return (
                          <div key={idx} className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 p-4 rounded-2xl hover:shadow-lg transition-all group/article">
                            <div className="flex items-center gap-2.5 mb-2.5">
                               <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                               <h5 className="font-black text-amber-700 dark:text-amber-400 text-[11px] uppercase tracking-tight group-hover/article:text-primary transition-colors">
                                 {title.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                               </h5>
                            </div>
                            <p className="text-[12px] text-muted-foreground leading-relaxed italic font-medium line-clamp-3">
                              {content}
                            </p>
                          </div>
                        );
                      })}
                      {lawArticles.length === 0 && (
                        <div className="py-12 text-center flex flex-col items-center gap-3 bg-muted/5 rounded-2xl border border-dashed">
                           <BookOpen className="w-10 h-10 text-muted-foreground/20" />
                           <p className="text-xs text-muted-foreground font-bold italic">No relevant articles identified.</p>
                        </div>
                      )}
                    </div>
                </CardContent>
              </Card>

              {/* Entitlements Card */}
              <Card className="md:col-span-2 shadow-lg border-border/50 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-emerald-500/5 border-b py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-sm font-black uppercase tracking-widest">{t('judge.workspace.entitlementCalculation')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                    {entitlements.length > 0 && entitlements.every((e: any) => e.value.includes('0.00') || e.value === '0.00 years') && (
                      <div className="p-6 mx-8 my-6 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl text-xs text-amber-800 leading-relaxed italic flex items-start gap-4 shadow-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="font-medium">
                          Salary and employment dates were not found in the uploaded documents. 
                          Upload salary records or employment contracts to calculate entitlements accurately.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y divide-border/20 sm:divide-y-0">
                      {entitlements.map((entry, idx) => (
                        <div key={`${entry.label}-${idx}`} className="p-8 flex flex-col gap-2 hover:bg-primary/5 transition-colors border-r border-border/20 last:border-r-0">
                           <span className="text-[11px] font-black uppercase text-muted-foreground tracking-[0.1em]">{entry.label}</span>
                           <strong className="text-2xl text-primary font-black tracking-tighter">{entry.value}</strong>
                        </div>
                      ))}
                      {entitlements.length === 0 && (
                        <div className="col-span-full py-16 text-center text-muted-foreground font-bold italic bg-muted/5">
                           Calculation data unavailable for this case.
                        </div>
                      )}
                    </div>
                </CardContent>
              </Card>

              {/* Analysis Summary Card (Large) */}
              <Card className="md:col-span-2 shadow-lg border-border/50 overflow-hidden">
                  <CardHeader className="bg-muted/10 border-b py-5 px-8">
                    <CardTitle className="text-lg font-black tracking-tight flex items-center gap-3">
                       <Sparkles className="w-6 h-6 text-primary" />
                       Case Summary & Fact Synthesis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 prose prose-sm dark:prose-invert max-w-none">
                     <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10 mb-8 italic text-base leading-relaxed font-medium text-muted-foreground shadow-inner">
                        {analysis?.summary || "No analysis summary available."}
                     </div>
                     
                     <div className="grid grid-cols-1 gap-6">
                        {(analysis?.facts || []).map((fact: any, idx: number) => (
                           <div key={idx} className="flex gap-6 p-5 rounded-2xl hover:bg-muted/30 transition-all group border border-transparent hover:border-border/40">
                              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                 {idx + 1}
                              </div>
                              <p className="text-sm font-bold leading-relaxed m-0 text-foreground/80">{fact}</p>
                           </div>
                        ))}
                     </div>
                  </CardContent>
               </Card>
            </div>

            {/* AI Unavailability Warning */}
            {isUnavailable && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-8 flex gap-6 items-start shadow-xl animate-pulse-glow">
                <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-700 shadow-sm">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h5 className="font-black text-amber-900 text-lg mb-1.5 uppercase tracking-tighter italic">Reasoning Cluster Active</h5>
                  <p className="text-amber-800 text-sm leading-relaxed font-bold opacity-80">
                    The JAIS-7B reasoning nodes are currently synthesizing complex legal data. Deep legal analysis typically requires 2-5 minutes to reach high confidence.
                  </p>
                </div>
              </div>
            )}

            {/* Judgment Editor Workspace */}
            <div className="space-y-6 pt-6 border-t border-border/40">
               <div className="flex items-center gap-3 mb-2">
                  <Scale className="w-8 h-8 text-primary" />
                  <h3 className="text-2xl font-black tracking-tight text-gradient">Judgment Drafting Workspace</h3>
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
          </div>
          ) : (
            <Card className="shadow-lg border-border/50 border-dashed border-2 bg-muted/5 rounded-[40px] overflow-hidden">
               <CardContent className="py-40 text-center">
                  <div className="relative inline-block mb-8">
                    <BarChart3 className="w-20 h-20 text-muted-foreground/20 mx-auto" />
                    <Sparkles className="w-10 h-10 text-primary/30 absolute -top-4 -right-4 animate-bounce" />
                  </div>
                  <h4 className="text-2xl font-black mb-4 tracking-tight">Judicial Intelligence Workbench</h4>
                  <p className="max-w-md mx-auto text-muted-foreground text-base italic leading-relaxed font-medium">
                     {t('judge.workspace.waitingAnalysis')} Engage the reasoning engine to populate similar precedents, law articles, and drafting suggestions.
                  </p>
                  <Button 
                    size="lg"
                    className="mt-10 px-10 h-14 rounded-2xl shadow-[0_15px_40px_rgba(var(--primary),0.2)] hover:scale-105 active:scale-95 transition-all text-base font-black uppercase tracking-widest" 
                    disabled={isActivelyLoading}
                    onClick={() => runAnalysisMutation.mutate()}
                  >
                     <Sparkles className={cn("w-5 h-5 mr-3", isActivelyLoading && "animate-spin")} />
                     {isActivelyLoading ? "Synthesizing Case Context..." : "Enable AI Insights"}
                  </Button>
               </CardContent>
            </Card>
          )}

          {/* Feedback Section */}
          <Card className="shadow-2xl border-border/50 rounded-[40px] overflow-hidden">
            <CardHeader className="bg-muted/10 border-b py-6 px-10">
              <CardTitle className="text-xl font-black flex items-center gap-4">
                <MessageSquare className="w-7 h-7 text-primary" />
                {t('judge.workspace.feedbackTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-12">
              <div className="space-y-12">
                {/* Scoring Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                  {[
                    { id: 'legal_relevance_score', label: t('judge.feedback.legalRelevance'), icon: Scale },
                    { id: 'reasoning_quality_score', label: t('judge.feedback.reasoningQuality'), icon: Sparkles },
                    { id: 'explanation_clarity_score', label: t('judge.feedback.explanationClarity'), icon: BookOpen }
                  ].map((item) => (
                    <div key={item.id} className="space-y-6">
                       <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                          <span className="flex items-center gap-3">
                             <item.icon className="w-5 h-5 text-primary" />
                             {item.label}
                          </span>
                          <Badge variant="secondary" className="bg-primary/10 text-primary px-3 rounded-full font-black text-sm">{(feedback as any)[item.id]} / 5</Badge>
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
                        className="w-full h-2.5 bg-accent rounded-full appearance-none cursor-pointer accent-primary shadow-inner"
                      />
                    </div>
                  ))}
                </div>

                {/* Text Feedback */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-muted-foreground tracking-widest ml-1">{t('judge.feedback.feedbackText')}</label>
                    <textarea
                      rows={6}
                      className="w-full bg-muted/20 border-2 border-transparent focus:border-primary/20 rounded-[32px] p-8 text-sm leading-relaxed font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:italic shadow-inner"
                      value={feedback.feedback_text}
                      onChange={(event) => setFeedback((prev) => ({ ...prev, feedback_text: event.target.value }))}
                      placeholder="e.g. The legal synthesis aligns with UAE Labor Law standards..."
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-muted-foreground tracking-widest ml-1">{t('judge.feedback.suggestedImprovements')}</label>
                    <textarea
                      rows={6}
                      className="w-full bg-muted/20 border-2 border-transparent focus:border-primary/20 rounded-[32px] p-8 text-sm leading-relaxed font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:italic shadow-inner"
                      value={feedback.suggested_improvements}
                      onChange={(event) => setFeedback((prev) => ({ ...prev, suggested_improvements: event.target.value }))}
                      placeholder="e.g. Include article 22 of the 2024 implementation regulations..."
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-border/40 pt-12">
                  <Button
                    size="lg"
                    className="gap-4 px-16 h-14 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all group"
                    onClick={handleFeedbackSubmit}
                    disabled={feedbackMutation.isPending}
                  >
                    {feedbackMutation.isPending ? "Submitting Performance Data..." : (
                      <>
                        <ThumbsUp className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                        <span className="font-black uppercase tracking-[0.2em] text-xs pb-0.5">{t('judge.workspace.feedbackTitle')}</span>
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
