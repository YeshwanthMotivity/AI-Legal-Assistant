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
      
      {/* Action Header */}
      <div className="flex justify-between items-center mb-10 bg-white/50 backdrop-blur-md p-6 rounded-[32px] border border-white/20 shadow-xl shadow-primary/5">
        <div className="flex gap-4">
            <Link to="/judge/cases">
              <Button variant="ghost" size="sm" className="gap-2 font-black uppercase tracking-widest text-[10px] hover:bg-primary/5 rounded-2xl px-6 h-12 transition-all">
                <ChevronLeft className="w-5 h-5" />
                {t('common.back')}
              </Button>
            </Link>
            <div className="h-12 w-[1px] bg-border/40 mx-2" />
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Current Protocol</span>
              <Badge variant="outline" className="text-[11px] font-black border-primary/20 text-primary bg-primary/5 px-3 py-1 rounded-lg">
                DIFC Employment Standard v2.4
              </Badge>
            </div>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3 bg-emerald-500/10 px-6 py-3 rounded-2xl border border-emerald-500/20">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">
                {isActivelyLoading ? t('judge.workspace.processing') : isReady ? t('judge.workspace.complete') : t('judge.workspace.initial')}
              </span>
           </div>
           
           <div className="flex flex-col items-end ltr:mr-4 rtl:ml-4">
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">AI Confidence</span>
                 <span className="text-sm font-black text-primary">
                    {Math.round((analysis?.confidence ?? 0) > 1 ? (analysis?.confidence ?? 0) / 100 : (analysis?.confidence ?? 0) * 100)}%
                 </span>
              </div>
              <div className="w-32 h-1.5 bg-border/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-1000" 
                  style={{ width: `${Math.round((analysis?.confidence ?? 0) > 1 ? (analysis?.confidence ?? 0) / 100 : (analysis?.confidence ?? 0) * 100)}%` }}
                />
              </div>
           </div>

           <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="gap-2 border-primary/20 hover:bg-primary/5 text-primary rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[11px] shadow-sm active:scale-95 transition-all"
                disabled={isActivelyLoading}
                onClick={() => runAnalysisMutation.mutate()}
              >
                  <Sparkles className={cn("w-5 h-5", isActivelyLoading && "animate-spin")} />
                  {t('judge.workspace.runAnalysis')}
              </Button>
              <Button className="rounded-2xl h-14 px-10 font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/30 group">
                  <CheckCircle2 className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                  Finalize Judgment
              </Button>
           </div>
        </div>
      </div>

      {localMessage && (
        <div className={cn(
          "mb-8 p-6 rounded-[32px] border-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-6 shadow-2xl",
          messageType === 'error' ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-primary/10 border-primary/20 text-primary"
        )}>
          {messageType === 'error' ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          <span className="font-black text-xs uppercase tracking-widest">{localMessage}</span>
          <Button variant="ghost" size="icon" className="ml-auto h-10 w-10 hover:bg-black/5 rounded-full" onClick={() => setLocalMessage('')}>
             <Plus className="w-6 h-6 rotate-45" />
          </Button>
        </div>
      )}

      {/* Main Premium Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr,380px] gap-8 items-start">
        
        {/* LEFT COLUMN: Workspace Context & Pipeline */}
        <aside className="flex flex-col gap-8 sticky top-24">
          
          {/* Workspace Context Card */}
          <Card className="rounded-[40px] shadow-2xl border-white/40 overflow-hidden bg-white/60 backdrop-blur-xl group hover:shadow-primary/5 transition-all">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground/80">
                <FileText className="w-5 h-5 text-primary/60" />
                Workspace Context
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-8">
              {/* Data Completeness */}
              <div className="bg-muted/30 p-6 rounded-[32px] border border-border/40">
                <div className="flex justify-between items-center mb-3">
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data Completeness</span>
                   <span className="text-xs font-black text-primary">25%</span>
                </div>
                <div className="h-3 w-full bg-white/50 rounded-full overflow-hidden shadow-inner">
                   <div className="h-full bg-gradient-to-r from-primary to-primary-hover w-[25%] rounded-full shadow-[0_0_15px_rgba(var(--primary),0.3)]" />
                </div>
                <p className="text-[9px] text-muted-foreground mt-4 italic font-bold opacity-60">Additional documents required for high precision.</p>
              </div>

              {/* Categorize Entry */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Categorize Entry</label>
                <select
                  className="w-full bg-white border-2 border-border/50 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:border-primary/40 focus:ring-8 focus:ring-primary/5 transition-all appearance-none cursor-pointer"
                  value={selectedDocType}
                  onChange={(event) => setSelectedDocType(event.target.value as DocumentType)}
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt} value={dt}>{t(`judge.documentTypes.${dt}`)}</option>
                  ))}
                </select>
              </div>

              {/* Upload Zone */}
              <div className="relative group">
                 <input 
                   ref={fileInputRef} 
                   type="file" 
                   className="absolute inset-0 opacity-0 cursor-pointer z-20"
                   onChange={handleDocumentChange}
                 />
                 <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border/60 rounded-[32px] bg-muted/10 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all duration-300">
                    <div className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                       <Upload className="w-7 h-7 text-primary/60" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground text-center line-clamp-1 px-4">
                      {selectedFile ? selectedFile.name : "Drag file or browse"}
                    </span>
                 </div>
              </div>

              <Button
                className="w-full h-16 rounded-[24px] shadow-xl text-[11px] font-black uppercase tracking-[0.2em] shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "INGESTING DATA..." : "SYNC WORKSPACE"}
              </Button>
            </CardContent>
          </Card>

          {/* Intelligence Pipeline (Vertical Stepper) */}
          <Card className="rounded-[40px] shadow-2xl border-white/40 overflow-hidden bg-white/40 backdrop-blur-xl">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground/80">
                  <Sparkles className="w-5 h-5 text-primary/60" />
                  Intelligence Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                 <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/40">
                    {[
                      { id: 'ingestion', label: 'Ingestion', status: 'Validation Finished', done: true },
                      { id: 'parsing', label: 'Parsing', status: 'Validation Finished', done: true },
                      { id: 'reasoning', label: 'Reasoning', status: isReady ? 'Synthesis Complete' : 'Synthesizing...', active: !isReady && isActivelyLoading, done: isReady }
                    ].map((step) => (
                      <div key={step.id} className="flex gap-6 relative z-10">
                         <div className={cn(
                           "w-9 h-9 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-all",
                           step.done ? "bg-emerald-500" : step.active ? "bg-primary animate-pulse" : "bg-border/60"
                         )}>
                            {step.done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-white/40" />}
                         </div>
                         <div className="flex flex-col justify-center">
                            <h4 className="text-[12px] font-black uppercase tracking-wider text-foreground">{step.label}</h4>
                            <span className="text-[10px] font-bold text-muted-foreground italic opacity-60 leading-none mt-1">{step.status}</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </CardContent>
          </Card>
        </aside>

        {/* MIDDLE COLUMN: Stats & Summary */}
        <main className="flex flex-col gap-10">
           {/* Center Statistics (Vertical) */}
           <div className="grid grid-cols-1 gap-6">
              {[
                { label: 'Monthly Salary', value: entitlements.find(e => e.label.includes('Salary'))?.value || 'AED 0.00', missing: !(entitlements.find(e => e.label.includes('Salary'))?.value?.includes('AED') && !entitlements.find(e => e.label.includes('Salary'))?.value?.includes('0.00')) },
                { label: 'Years of Service', value: entitlements.find(e => e.label.includes('Service'))?.value || '0.00 years', missing: !entitlements.find(e => e.label.includes('Service'))?.value?.includes('years') || entitlements.find(e => e.label.includes('Service'))?.value?.includes('0.00') },
                { label: 'Gratuity Estimate', value: entitlements.find(e => e.label.includes('Gratuity'))?.value || 'AED 0.00', missing: !(entitlements.find(e => e.label.includes('Gratuity'))?.value?.includes('AED') && !entitlements.find(e => e.label.includes('Gratuity'))?.value?.includes('0.00')) }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/40 backdrop-blur-md p-10 rounded-[48px] border border-white/40 flex flex-col items-center justify-center text-center shadow-xl hover:shadow-primary/5 transition-all group overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-all" />
                   <div className="flex items-center gap-3 mb-4">
                      <span className="text-[12px] font-black uppercase tracking-[0.3em] text-muted-foreground/70">{stat.label}</span>
                      {stat.missing && (
                        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 text-[9px] font-black uppercase tracking-tighter px-2 h-5">
                          Missing Primary Data
                        </Badge>
                      )}
                   </div>
                   <strong className="text-[48px] font-black tracking-tighter text-foreground/90 group-hover:text-primary transition-colors leading-tight">
                      {stat.value}
                   </strong>
                </div>
              ))}
           </div>

           {/* Analysis Content */}
           {isReady ? (
             <Card className="rounded-[40px] shadow-2xl border-white/40 overflow-hidden bg-white/60 backdrop-blur-xl">
                  <CardHeader className="p-10 pb-6 border-b border-border/40">
                    <CardTitle className="text-xl font-black tracking-tight flex items-center gap-4">
                       <Sparkles className="w-8 h-8 text-primary shadow-primary/20" />
                       Case Summary & Fact Synthesis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-12 space-y-12">
                     <div className="bg-primary/5 p-10 rounded-[40px] border-2 border-primary/10 italic text-[15px] leading-[1.8] font-bold text-muted-foreground/80 shadow-inner relative overflow-hidden">
                        <div className="absolute left-0 top-0 w-2 h-full bg-primary" />
                        {analysis?.summary && !analysis.summary.trim().startsWith('{') && !analysis.summary.trim().startsWith('json')
                          ? analysis.summary
                          : "Case synthesis protocols complete. Reviewing jurisdictional precedents for outcome alignment."}
                     </div>
                     
                     <div className="grid grid-cols-1 gap-6">
                        {(analysis?.facts || [])
                          .filter((fact: any) => {
                            const s = String(fact).trim()
                            return !s.startsWith('{') && !s.startsWith('json') && !s.startsWith('"outcome"') && s.length > 10
                          })
                          .map((fact: any, idx: number) => (
                           <div key={idx} className="flex gap-8 p-8 rounded-[32px] hover:bg-white transition-all group border border-transparent hover:border-border/40 hover:shadow-xl hover:shadow-black/5">
                              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                 {idx + 1}
                              </div>
                              <p className="text-[15px] font-bold leading-relaxed m-0 text-foreground/70 group-hover:text-foreground transition-colors">{fact}</p>
                           </div>
                        ))}
                     </div>

                     {/* Precedents Section - Integrated in middle column for better flow */}
                     <div className="pt-8 space-y-8">
                        <div className="flex items-center justify-between">
                           <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Similar Jurisdictional Precedents</h3>
                           <Badge className="bg-primary/10 text-primary border-primary/20 font-black">TOP 5 MATCHES</Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                           {precedents.map((item) => (
                             <Link 
                               key={item.caseId}
                               to={`/judge/precedents/${item.caseId}`} 
                               className="p-6 rounded-[28px] bg-white border border-border/20 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 transition-all group flex items-center justify-between"
                             >
                                <div className="flex gap-4 items-center">
                                   <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                      <Scale className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                   </div>
                                   <div>
                                      <h5 className="font-black text-[13px] group-hover:text-primary transition-colors">{item.title}</h5>
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">REF: {item.caseId}</span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-4">
                                   <span className="text-xs font-black text-primary bg-primary/5 px-3 py-1 rounded-full uppercase tracking-tighter">
                                     {item.similarityScore > 1 ? item.similarityScore : Math.round(item.similarityScore * 100)}% Match
                                   </span>
                                   <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                                </div>
                             </Link>
                           ))}
                        </div>
                     </div>
                  </CardContent>
             </Card>
           ) : (
             <div className="h-[800px] flex flex-col items-center justify-center bg-white/40 backdrop-blur-md rounded-[60px] border-4 border-dashed border-white/60 p-20 text-center">
                <div className="w-32 h-32 rounded-[40px] bg-white shadow-2xl flex items-center justify-center mb-10 animate-bounce">
                   <Sparkles className="w-14 h-14 text-primary" />
                </div>
                <h2 className="text-[32px] font-black tracking-tight mb-4">Judicial Intelligence Workbench</h2>
                <p className="text-muted-foreground text-[16px] max-w-md mx-auto italic font-bold">
                   Load workspace documents and initiate the reasoning engine for deep legal synthesis.
                </p>
                <Button 
                  size="lg" 
                  className="mt-12 h-20 px-12 rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                  onClick={() => runAnalysisMutation.mutate()}
                  disabled={isActivelyLoading}
                >
                  {isActivelyLoading ? "Synthesizing Pipeline..." : "Enable Core Reasoning"}
                </Button>
             </div>
           )}
        </main>

        {/* RIGHT COLUMN: Prophecy & Risks */}
        <aside className="flex flex-col gap-8 sticky top-24">
           
           {/* Intelligence Core Prophecy */}
           <Card className="rounded-[40px] shadow-2xl border-deep-green overflow-hidden bg-white group border-[4px]">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-deep-green">
                  <CheckCircle2 className="w-5 h-5" />
                  Intelligence Core Prophecy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                 <div className="bg-primary/5 p-8 rounded-[32px] border border-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl -mr-8 -mt-8" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6 block">Probable Outcome Score</span>
                    <div className="flex justify-between items-end">
                       <h3 className="text-[32px] font-black leading-none text-deep-green">{analysis?.outcome || "Pending"}</h3>
                       <strong className="text-[28px] font-black text-primary leading-none tracking-tighter">
                          {Math.round((analysis?.confidence ?? 0) > 1 ? (analysis?.confidence ?? 0) / 100 : (analysis?.confidence ?? 0) * 100)}%
                       </strong>
                    </div>
                    <div className="mt-8 h-2 w-full bg-border/40 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-deep-green rounded-full shadow-[0_0_15px_rgba(2,44,34,0.4)] transition-all duration-1000"
                         style={{ width: `${Math.round((analysis?.confidence ?? 0) > 1 ? (analysis?.confidence ?? 0) / 100 : (analysis?.confidence ?? 0) * 100)}%` }}
                       />
                    </div>
                 </div>
              </CardContent>
           </Card>

           {/* Inherent Litigation Risks */}
           <Card className="rounded-[40px] shadow-2xl border-white/40 overflow-hidden bg-white/60 backdrop-blur-xl">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground/80">
                  <AlertCircle className="w-5 h-5 text-destructive/60" />
                  Inherent Litigation Risks
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                 <div className="p-6 rounded-[32px] bg-destructive/5 border border-destructive/20 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center shrink-0">
                       <Scale className="w-5 h-5 text-destructive/60" />
                    </div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-destructive">Ambiguous Precedent</h4>
                 </div>
              </CardContent>
           </Card>

           {/* Optimal Sequential Protocol */}
           <Card className="rounded-[40px] shadow-2xl border-white/40 overflow-hidden bg-white/60 backdrop-blur-xl">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground/80">
                  <BarChart3 className="w-5 h-5 text-primary/60" />
                  Optimal Sequential Protocol
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 h-32 flex items-center justify-center text-center">
                 <div className="w-full h-2 bg-muted/40 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/20 animate-shimmer shadow-[inset_0_0_10px_rgba(var(--primary),0.1)]" />
                 </div>
              </CardContent>
           </Card>

           {/* Validation Feedback */}
           <Card className="rounded-[40px] shadow-2xl border-white/40 overflow-hidden bg-white/60 backdrop-blur-xl">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground/80">
                  <MessageSquare className="w-5 h-5 text-primary/60" />
                  Validation Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                 <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reasoning Score</span>
                    <div className="flex gap-2">
                       {[1,2,3,4,5].map(n => (
                         <div key={n} className={cn(
                           "w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm cursor-pointer transition-all active:scale-90",
                           feedback.reasoning_quality_score >= n ? "bg-primary text-white scale-110 shadow-primary/30" : "bg-white border border-border/60 hover:border-primary/40 text-muted-foreground"
                         )} onClick={() => setFeedback(prev => ({ ...prev, reasoning_quality_score: n }))}>
                            {n}
                         </div>
                       ))}
                    </div>
                 </div>
                 <Button 
                   className="w-full h-14 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800"
                   onClick={handleFeedbackSubmit}
                   disabled={feedbackMutation.isPending}
                 >
                   Send Performance Metrics
                 </Button>
              </CardContent>
           </Card>

        </aside>
      </div>

      {/* Judgment Drafting Workspace (Expands to full width below) */}
      <div className="mt-12 space-y-8 pt-12 border-t-2 border-dashed border-border/40">
         <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-[20px] bg-primary/10 flex items-center justify-center">
               <Scale className="w-7 h-7 text-primary" />
            </div>
            <div>
               <h3 className="text-[28px] font-black tracking-tight text-gradient leading-none mb-1">Judgment Drafting Workspace</h3>
               <span className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-50">DIFC AI AGENT COLLABORATION v1.0</span>
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
    </PortalLayout>
  )
}

export default CaseDetail
