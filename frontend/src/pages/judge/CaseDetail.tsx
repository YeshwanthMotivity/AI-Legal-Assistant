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
    >
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 bg-white/40 backdrop-blur-xl p-8 rounded-[40px] border border-white/40 shadow-2xl shadow-primary/5">
        <div className="flex items-center gap-6">
            <Link to="/judge/cases">
              <Button variant="ghost" size="sm" className="gap-2 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary/5 rounded-2xl px-6 h-12 transition-all">
                <ChevronLeft className="w-5 h-5" />
                {t('common.back')}
              </Button>
            </Link>
            <div className="h-10 w-[2px] bg-border/20 mx-2 hidden md:block" />
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight text-deep-green leading-none mb-1">
                {caseQuery.data?.title || "Case Workspace"}
              </h1>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-3 h-3 text-primary" />
                DIFC Protocol — Employment Standard v2.4
              </span>
            </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
           <Button 
            variant="outline" 
            className="flex-1 md:flex-none gap-3 border-primary/20 hover:bg-primary/5 text-primary rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[11px] shadow-sm active:scale-95 transition-all"
            disabled={isActivelyLoading}
            onClick={() => runAnalysisMutation.mutate()}
           >
              <Sparkles className={cn("w-5 h-5", isActivelyLoading && "animate-spin")} />
              {t('judge.workspace.runAnalysis')}
           </Button>
           <Button className="flex-1 md:flex-none rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/30 group">
              <CheckCircle2 className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
              Finalize Judgment
           </Button>
        </div>
      </div>

      {localMessage && (
        <div className={cn(
          "mb-10 p-6 rounded-[32px] border-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-8 duration-500 shadow-2xl",
          messageType === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-600" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
        )}>
          {messageType === 'error' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-black text-xs uppercase tracking-widest flex-1">{localMessage}</span>
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-black/5 rounded-full shrink-0" onClick={() => setLocalMessage('')}>
             <Plus className="w-6 h-6 rotate-45" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[420px,1fr] gap-10 items-start">
        
        {/* SIDEBAR: Documents & AI Metrics */}
        <aside className="flex flex-col gap-8 sticky top-24">
          
          {/* AI Metrics Card (Prominent Status) */}
          <Card className="rounded-[40px] shadow-2xl border-white/40 overflow-hidden bg-deep-green text-white group border-[4px]">
             <CardHeader className="p-8 pb-4">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-primary">
                  <Sparkles className="w-5 h-5" />
                  AI Intelligence Metrics
                </CardTitle>
             </CardHeader>
             <CardContent className="p-8 pt-4 space-y-8">
                <div className="flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Analysis Status</span>
                      <Badge variant={isReady ? "success" : "warning"} className="w-fit uppercase font-black text-[9px] tracking-widest px-3 py-1 rounded-lg">
                        {isActivelyLoading ? t('judge.workspace.processing') : isReady ? t('judge.workspace.complete') : t('judge.workspace.initial')}
                      </Badge>
                   </div>
                   <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Confidence</span>
                      <strong className="text-3xl font-black text-primary tracking-tighter">
                         {Math.round((analysis?.confidence ?? 0) > 1 ? (analysis?.confidence ?? 0) / 100 : (analysis?.confidence ?? 0) * 100)}%
                      </strong>
                   </div>
                </div>
                
                <div className="space-y-3">
                   <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden shadow-inner p-[2px]">
                      <div 
                        className="h-full bg-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.6)] transition-all duration-1000 ease-out" 
                        style={{ width: `${Math.round((analysis?.confidence ?? 0) > 1 ? (analysis?.confidence ?? 0) / 100 : (analysis?.confidence ?? 0) * 100)}%` }}
                      />
                   </div>
                   <p className="text-[10px] text-white/40 font-bold italic leading-relaxed text-center">
                     Core model nodes synthesizing sectoral legal data.
                   </p>
                </div>
             </CardContent>
          </Card>

          {/* Documents Section (Original Flow) */}
          <Card className="rounded-[40px] shadow-2xl border-white/60 overflow-hidden bg-white/60 backdrop-blur-xl">
            <CardHeader className="p-8 pb-4 border-b border-border/20 bg-muted/10">
              <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground">
                <FileText className="w-5 h-5 text-primary" />
                {t('judge.workspace.documents')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Category & File Selection */}
              <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('judge.workspace.documentType')}</label>
                    <select
                      className="w-full bg-white border-2 border-border/50 rounded-2xl px-5 py-4 text-xs font-black outline-none focus:border-primary/40 focus:ring-8 focus:ring-primary/5 transition-all cursor-pointer shadow-sm"
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

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{t('judge.workspace.uploadDocument')}</label>
                    <div className="relative group overflow-hidden rounded-[32px] border-2 border-dashed border-border/60 hover:border-primary/40 transition-all">
                       <input 
                         ref={fileInputRef} 
                         type="file" 
                         className="absolute inset-0 opacity-0 cursor-pointer z-10"
                         onChange={handleDocumentChange}
                       />
                       <div className="flex flex-col items-center justify-center p-10 bg-muted/10 group-hover:bg-primary/5 transition-colors">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                             <Upload className="w-6 h-6 text-primary/60" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center line-clamp-1 px-4 italic opacity-60">
                            {selectedFile ? selectedFile.name : "Drop or select case files"}
                          </span>
                       </div>
                    </div>
                  </div>

                  <Button
                    className="w-full h-16 rounded-[24px] shadow-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-primary/20 group overflow-hidden relative"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadMutation.isPending}
                  >
                    <span className="relative z-10">{uploadMutation.isPending ? "PROCESSING DATA..." : "INGEST INTO WORKSPACE"}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-hover opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
              </div>

              {/* Document List */}
              <div className="pt-6 border-t border-border/20 space-y-4">
                {(documentsQuery.data?.items ?? []).map((doc) => (
                  <div key={doc.id} className="group flex items-center justify-between p-5 rounded-[24px] bg-white border-2 border-transparent hover:border-primary/20 hover:shadow-xl hover:shadow-black/5 transition-all">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3 mb-1">
                         <FileText className="w-4 h-4 text-primary/60" />
                         <h5 className="text-[12px] font-black truncate">{doc.file_name}</h5>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{t(`judge.documentTypes.${doc.document_type}`)}</span>
                    </div>
                    <Badge 
                      variant={doc.processing_status === 'complete' ? 'success' : doc.processing_status === 'failed' ? 'destructive' : 'warning'}
                      className="px-3 h-6 text-[8px] font-black uppercase tracking-widest rounded-full"
                    >
                       {t(`judge.documentStatus.${doc.processing_status.toLowerCase()}`)}
                    </Badge>
                  </div>
                ))}
                {(!documentsQuery.data?.items || documentsQuery.data?.items.length === 0) && (
                  <div className="py-12 text-center text-[11px] text-muted-foreground font-bold italic bg-muted/5 rounded-[32px] border-2 border-dashed border-border/20">
                     No documents currently synchronized.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* MAIN AREA: Analysis Results -> editor -> feedback */}
        <main className="flex flex-col gap-10">
          
          {/* Analysis View */}
          {isReady ? (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
               
               {/* 1. Case Summary Card */}
              <Card className="rounded-[48px] shadow-2xl border-white/60 overflow-hidden bg-white/60 backdrop-blur-xl group">
                  <CardHeader className="p-10 pb-6 border-b border-border/20 bg-emerald-500/5">
                    <CardTitle className="text-xl font-black tracking-tight flex items-center gap-4 text-deep-green">
                       <Sparkles className="w-8 h-8 text-primary" />
                       Case Summary & Fact Synthesis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-12 space-y-12">
                     <div className="bg-white p-10 rounded-[40px] border-2 border-primary/10 italic text-[16px] leading-[1.8] font-bold text-muted-foreground/80 shadow-inner relative overflow-hidden group-hover:border-primary/30 transition-all">
                        <div className="absolute left-0 top-0 w-2 h-full bg-primary" />
                        {analysis?.summary && !analysis.summary.trim().startsWith('{') && !analysis.summary.trim().startsWith('json')
                          ? analysis.summary
                          : "Synthesis protocols complete. Mapping jurisdictional precedents from DIFC legal repository."}
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(analysis?.facts || [])
                          .filter((fact: any) => {
                            const s = String(fact).trim()
                            return !s.startsWith('{') && !s.startsWith('json') && !s.startsWith('"outcome"') && s.length > 10
                          })
                          .map((fact: any, idx: number) => (
                           <div key={idx} className="flex gap-6 p-6 rounded-[32px] bg-white/50 border-2 border-transparent hover:border-primary/20 hover:bg-white transition-all shadow-sm hover:shadow-xl hover:shadow-black/5 group/fact">
                              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm shrink-0 group-hover/fact:bg-primary group-hover/fact:text-white transition-all">
                                 {idx + 1}
                              </div>
                              <p className="text-[14px] font-bold leading-relaxed m-0 text-foreground/70 group-hover/fact:text-foreground transition-colors">{fact}</p>
                           </div>
                        ))}
                     </div>
                  </CardContent>
               </Card>

              {/* 2. Results Grid: Precedents & Laws */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Precedents */}
                 <Card className="rounded-[40px] shadow-2xl border-white/60 overflow-hidden bg-white/40 backdrop-blur-xl">
                    <CardHeader className="p-8 pb-4 border-b border-border/20 flex flex-row items-center justify-between">
                       <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground">
                          <Scale className="w-5 h-5 text-primary" />
                          Similar Precedents
                       </CardTitle>
                       <Badge className="bg-primary/10 text-primary border-primary/20 font-black">TOP 5</Badge>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                       {precedents.map((item) => (
                         <Link 
                           key={item.caseId}
                           to={`/judge/precedents/${item.caseId}`} 
                           className="flex items-center justify-between p-6 rounded-[32px] bg-white border-2 border-transparent hover:border-primary/30 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all group"
                         >
                            <div className="flex flex-col gap-1 min-w-0 pr-4">
                               <h5 className="font-black text-[13px] group-hover:text-primary transition-colors truncate">{item.title}</h5>
                               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">REF: {item.caseId}</span>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                               <span className="text-[11px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-full uppercase tracking-tighter">
                                 {item.similarityScore > 1 ? item.similarityScore : Math.round(item.similarityScore * 100)}% Match
                               </span>
                               <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                            </div>
                         </Link>
                       ))}
                    </CardContent>
                 </Card>

                 {/* Law Articles */}
                 <Card className="rounded-[40px] shadow-2xl border-white/60 overflow-hidden bg-white/40 backdrop-blur-xl">
                    <CardHeader className="p-8 pb-4 border-b border-border/20 flex flex-row items-center justify-between">
                       <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground">
                          <BookOpen className="w-5 h-5 text-primary" />
                          Legal Framework
                       </CardTitle>
                       <Badge variant="outline" className="text-secondary font-black border-secondary/20 bg-secondary/5">ARTICLE MAPPING</Badge>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                       {lawArticles.map((article: any, idx: number) => {
                         const title = typeof article === 'object' ? (article.article_number || article.title || 'Legal Reference') : String(article);
                         return (
                           <div key={idx} className="p-6 rounded-[32px] bg-white border-2 border-transparent hover:border-emerald-500/30 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 transition-all group/art cursor-help">
                              <div className="flex items-center gap-3 mb-2">
                                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                 <h5 className="font-black text-[13px] uppercase tracking-wide group-hover/art:text-emerald-700 transition-colors">{title}</h5>
                              </div>
                              <p className="text-[11px] text-muted-foreground font-bold leading-relaxed italic line-clamp-2">
                                {typeof article === 'object' ? (article.content || "Contextual jurisdictional article mapped to current case facts.") : "Referenced during AI reasoning phase."}
                              </p>
                           </div>
                         );
                       })}
                    </CardContent>
                 </Card>
              </div>

              {/* 3. Entitlement Calculation (StatCards) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {entitlements.map((entry, idx) => (
                    <div key={idx} className="bg-white/60 backdrop-blur-xl p-10 rounded-[48px] border-2 border-white/80 shadow-2xl hover:shadow-primary/10 transition-all group relative overflow-hidden text-center">
                       <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                       <div className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-6 flex flex-col items-center gap-3">
                          {entry.label}
                          {(entry.value.includes('0.00') || entry.value === '0.00 years') && (
                            <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px] font-black uppercase tracking-tighter px-2 h-5">
                               Missing Primary Data
                            </Badge>
                          )}
                       </div>
                       <strong className="text-4xl font-black text-deep-green tracking-tighter group-hover:text-primary transition-colors block leading-none">
                          {entry.value}
                       </strong>
                    </div>
                 ))}
              </div>

               {/* 4. Judgment Workspace */}
               <div className="pt-10 border-t-2 border-dashed border-border/30">
                  <div className="flex items-center gap-5 mb-8">
                     <div className="w-16 h-16 rounded-[28px] bg-primary/10 flex items-center justify-center text-primary shadow-xl shadow-primary/5">
                        <Scale className="w-8 h-8" />
                     </div>
                     <div>
                        <h3 className="text-4xl font-black tracking-tighter text-deep-green leading-none mb-1">Judgment Workspace</h3>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">DIFC AI AGENT COLLABORATION STRAND</span>
                     </div>
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

               {/* 5. Validation Feedback */}
               <Card className="rounded-[48px] shadow-2xl border-white/60 overflow-hidden bg-white/60 backdrop-blur-xl">
                  <CardHeader className="p-10 pb-4 border-b border-border/20">
                     <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Performance Validation Feedback
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-10">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-10">
                        {[
                          { id: 'legal_relevance_score', label: 'Legal Relevance', icon: Scale },
                          { id: 'reasoning_quality_score', label: 'Reasoning Synthesis', icon: Sparkles },
                          { id: 'explanation_clarity_score', label: 'Contextual Clarity', icon: BookOpen }
                        ].map((item) => (
                          <div key={item.id} className="space-y-6">
                             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <span className="flex items-center gap-3"><item.icon className="w-4 h-4 text-primary" /> {item.label}</span>
                                <span className="text-primary text-sm">{(feedback as any)[item.id]} / 5</span>
                             </div>
                             <div className="flex gap-2">
                                {[1,2,3,4,5].map(n => (
                                  <div 
                                    key={n} 
                                    className={cn(
                                      "flex-1 h-10 rounded-xl flex items-center justify-center text-[10px] font-black cursor-pointer transition-all",
                                      (feedback as any)[item.id] >= n ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-white border-2 border-border/20 text-muted-foreground hover:border-primary/40"
                                    )}
                                    onClick={() => setFeedback(prev => ({ ...prev, [item.id]: n }))}
                                  >
                                    {n}
                                  </div>
                                ))}
                             </div>
                          </div>
                        ))}
                     </div>
                     <Button 
                       className="w-full h-16 rounded-[24px] bg-deep-green text-white font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl shadow-deep-green/20 hover:scale-[1.01] active:scale-95 transition-all"
                       onClick={handleFeedbackSubmit}
                       disabled={feedbackMutation.isPending}
                     >
                        Commit Performance Metrics
                     </Button>
                  </CardContent>
               </Card>
            </div>
          ) : (
            <div className="h-[700px] flex flex-col items-center justify-center bg-white/40 backdrop-blur-xl rounded-[60px] border-4 border-dashed border-white/60 p-20 text-center shadow-2xl group">
               <div className="w-32 h-32 rounded-[40px] bg-white shadow-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500 animate-pulse-glow">
                  <Sparkles className="w-14 h-14 text-primary" />
               </div>
               <h2 className="text-[36px] font-black tracking-tighter text-deep-green mb-4">Judicial Intelligence Workbench</h2>
               <p className="text-muted-foreground text-[16px] max-w-sm mx-auto italic font-bold opacity-60">
                  Synchronize case documentation to initiate deep legal synthesis and outcome prophecy.
               </p>
               <Button 
                size="lg" 
                className="mt-12 h-20 px-16 rounded-[32px] text-sm font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all"
                onClick={() => runAnalysisMutation.mutate()}
                disabled={isActivelyLoading}
               >
                 <Sparkles className={cn("w-6 h-6 mr-4", isActivelyLoading && "animate-spin")} />
                 {isActivelyLoading ? "Synthesizing..." : "Enable Core Reasoning"}
               </Button>
            </div>
          )}
        </main>
      </div>
    </PortalLayout>
  )
}

export default CaseDetail
