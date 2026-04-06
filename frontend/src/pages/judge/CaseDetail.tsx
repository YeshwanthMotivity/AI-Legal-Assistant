import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Sparkles, 
  CheckCircle2,
  Plus,
  Gavel,
  FileText,
  Upload,
  BrainCircuit,
  MessagesSquare,
  Check,
  ChevronRight,
  TrendingUp,
  Scale,
  User,
  History as HistoryIcon,
  ArrowRight,
  ArrowLeft,
  Terminal,
  Verified,
  PanelRightClose,
  LayoutDashboard,
  X as XIcon,
  Activity as ActivityIcon
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import JudgmentEditor from '../../components/judge/JudgmentEditor'
import CaseContextBar from '../../components/judge/workspace/CaseContextBar'
import DocumentsPanel from '../../components/judge/workspace/DocumentsPanel'
import IntelligenceCenter from '../../components/judge/workspace/IntelligenceCenter'
import {
  getCase,
  getCaseDocuments,
  runAnalysis,
  getAnalysis,
  saveJudgment,
  uploadCaseDocument,
  deleteCase,
  submitFeedback
} from '../../api/judge'
import { useCaseAnalysisPolling } from '../../hooks/useCaseAnalysisPolling'
import type { DocumentType, JudgmentRequest } from '../../types/judge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CaseWorkflow = ({ viewedIdx, currentIdx, stages, onStageClick }: { viewedIdx: number, currentIdx: number, stages: any[], onStageClick: (idx: number) => void }) => {
  return (
    <div className="w-full px-6 py-3 bg-[var(--bg-card)] border-b border-border shadow-sm relative z-50 sticky top-0">
      <div className="w-full flex items-start justify-between relative px-2">
        {/* Continuous background line */}
        <div className="absolute top-5 left-6 right-6 h-[1px] bg-border z-0"/>
  
        {stages.map((stage, i) => {
          const isReached = i <= currentIdx;
          const isViewed = i === viewedIdx;
          const isCompleted = i < currentIdx;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col group flex-1 items-center">
              {/* Progress Line segments (Active) */}
              {isCompleted && i < stages.length - 1 && (
                <div className="absolute top-5 left-[50%] right-[-50%] h-[2px] bg-[var(--primary)] z-0"/>
              )}
              {isViewed && i < currentIdx && i < stages.length - 1 && (
                <div className="absolute top-5 left-[50%] right-[-50%] h-[2px] bg-[var(--primary)] z-0"/>
              )}
  
              <button 
                className={cn(
                  "flex flex-col items-center gap-4 transition-all duration-300 w-full outline-none",
                  isReached ?"cursor-pointer":"cursor-not-allowed"
                )}
                onClick={() => isReached && onStageClick(i)}
              >
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 bg-[var(--bg-card)] relative z-10",
                    isViewed ?"border-[var(--primary)] text-[var(--primary)] shadow-[0_0_20px_rgba(5,150,105,0.2)] scale-110": 
                    isCompleted ?"border-[var(--primary)] text-[var(--primary)] shadow-sm": 
                    isReached ?"border-[var(--primary)]/30 text-[var(--primary)] hover:border-[var(--primary)]/60":
                    "border-muted text-muted-foreground/40 opacity-40"
                  )}
                >
                  {isCompleted && !isViewed ? <Check className="w-4 h-4 stroke-[3px]"/> : <stage.icon className="w-4 h-4"/>}
                  {isViewed && (
                    <div className="absolute inset-0 rounded-full border border-[var(--primary)] animate-ping opacity-20"/>
                  )}
                </div>
                <div className="text-center px-2">
                  <p className={cn(
                    "text-[11px] font-semibold tracking-wide uppercase mb-1 transition-colors", 
                    viewedIdx === i ?"text-[var(--primary)]": isReached ?"text-[var(--primary)]/60":"text-muted-foreground/30"
                  )}>
                    Phase {stage.id}
                  </p>
                  <p className={cn(
                    "text-[11px] font-bold uppercase tracking-tight w-28 truncate transition-colors", 
                    viewedIdx === i ?"text-foreground": isReached ?"text-foreground/70":"text-muted-foreground/40"
                  )}>
                    {stage.label}
                  </p>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FeedbackForm = ({ caseId, onSubmit }: { caseId: string, onSubmit: (data: any) => Promise<void> }) => {
  const { t } = useTranslation()
  const [feedback, setFeedback] = useState({
    legal_relevance_score: 8,
    reasoning_quality_score: 8,
    explanation_clarity_score: 8,
    feedback_text: ''
  });

  return (
    <div className="w-full bg-[var(--bg-card)] p-10 rounded-[2rem] border border-border shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
      <header className="flex items-center gap-5 border-b border-border/50 pb-6 mb-8">
        <div className="p-3 bg-[var(--primary)] rounded-xl shadow-sm flex items-center justify-center">
          <MessagesSquare className="w-5 h-5 text-white"/>
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tighter text-foreground uppercase leading-none">{t('judge.feedback.title', 'Judge Feedback')}</h2>
          <p className="text-[10px] font-black text-[var(--primary)]/70 uppercase tracking-[0.2em] mt-1.5">{t('judge.feedback.subtitle', 'Rate AI Performance')}</p>
        </div>
      </header>
  
      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-5 space-y-8 pr-6 border-r border-border/40">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-6">{t('judge.feedback.quantitative', 'Quantitative Metrics')}</h3>
          {['legal_relevance_score', 'reasoning_quality_score', 'explanation_clarity_score'].map((field) => (
            <div key={field} className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-tight text-foreground">{t(`judge.feedback.fields.${field}`, field.replace(/_/g, ' '))}</label>
                <span className="text-[10px] font-black tracking-[0.1em] px-2 py-1 bg-[var(--bg-surface)] border border-border/80 rounded-md text-[var(--primary)]">
                  {(feedback as any)[field]}/10
                </span>
              </div>
              <div className="relative pt-2">
                <input 
                  type="range" min="1" max="10"
                  className="w-full accent-[var(--primary)] h-1 bg-muted rounded-full appearance-none cursor-pointer"
                  value={(feedback as any)[field]}
                  onChange={(e) => setFeedback({...feedback, [field]: parseInt(e.target.value)})}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-7 flex flex-col h-full">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-6">{t('judge.feedback.qualitative', 'Qualitative Analysis')}</h3>
          <div className="flex-1 flex flex-col gap-6">
            <textarea 
              className="w-full flex-1 min-h-[160px] p-5 bg-[var(--bg-surface)] border border-border/80 rounded-xl text-sm font-medium focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all placeholder:italic placeholder:opacity-50"
              placeholder={t('judge.feedback.placeholder', 'Log anomalies, edge cases, or override justifications here...')}
              value={feedback.feedback_text}
              onChange={(e) => setFeedback({...feedback, feedback_text: e.target.value})}
            />
            <Button 
              className="w-full h-12 bg-[var(--primary)] text-white font-black uppercase tracking-[0.15em] text-[11px] rounded-xl hover:bg-[var(--primary-hover)] transition-all shadow-md shadow-[var(--primary)]/10 shrink-0"
              onClick={() => onSubmit(feedback)}
            >
              {t('common.submit', 'Submit Feedback')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CaseDetail = () => {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('other')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [analysisRequested, setAnalysisRequested] = useState(false)
  const [localMessage, setLocalMessage] = useState<{ text: string, phase: number } | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const [viewedIdx, setViewedIdx] = useState(0)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const stages = [
    { id: 1, label: t('judge.stages.creation', 'Case Creation'), sub: 'Details confirmation', icon: FileText, statuses: ['Created'] },
    { id: 2, label: t('judge.stages.evidence', 'Evidence Upload'), sub: 'Documents & Evidence', icon: Upload, statuses: ['DocumentsUploaded'] },
    { id: 3, label: t('judge.stages.analysis', 'AI - Analysis'), sub: 'Research & Synthesis', icon: BrainCircuit, statuses: ['AIAnalysisPending', 'AIAnalysisReady'] },
    { id: 4, label: t('judge.stages.review', 'Judicial Review'), sub: 'Judgment drafting', icon: Gavel, statuses: ['DraftGenerated'] },
    { id: 5, label: t('judge.stages.feedback', 'Feedback'), sub: 'Outcome learning', icon: MessagesSquare, statuses: ['Finalized'] },
  ];

  const caseQuery = useQuery({
    queryKey: ['judge-case', id],
    queryFn: () => getCase(id as string),
    enabled: Boolean(id),
  })

  const caseData = caseQuery.data;

  useEffect(() => {
    setViewedIdx(0)
  }, [id])

  const currentIdx = useMemo(() => {
    const status = caseData?.status || 'Created';
    const idx = stages.findIndex(s => s.statuses.includes(status));
    return idx === -1 ? (status === 'Finalized' ? 4 : 0) : idx;
  }, [caseData?.status]);

  const documentsQuery = useQuery({
    queryKey: ['case-documents', id],
    queryFn: () => getCaseDocuments(id as string),
    enabled: Boolean(id),
  })

  const shouldPoll = analysisRequested || caseData?.status === 'AIAnalysisPending';
  const analysisQuery = useCaseAnalysisPolling(id, shouldPoll)

  const deleteMutation = useMutation({
    mutationFn: () => deleteCase(id as string),
    onSuccess: () => navigate('/judge/cases'),
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: DocumentType }) =>
      uploadCaseDocument(id as string, file, documentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-documents', id] })
      queryClient.invalidateQueries({ queryKey: ['judge-case', id] })
      setMessageType('success')
      setLocalMessage({ text: t('judge.workspace.uploadSuccess'), phase: 1 })
      setSelectedFile(null)
    },
    onError: (error) => {
      setMessageType('error')
      setLocalMessage({ text: t('judge.workspace.uploadError'), phase: 1 })
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
      setLocalMessage({ text: t('common.error'), phase: 2 })
    }
  })

  const finalizeMutation = useMutation({
    mutationFn: (payload: JudgmentRequest) => saveJudgment(id as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-case', id] })
      setMessageType('success')
      setLocalMessage({ text: t('judge.workspace.judgmentFinalized'), phase: 3 })
    },
  })

  const feedbackMutation = useMutation({
    mutationFn: (payload: any) => submitFeedback(id as string, payload),
    onSuccess: () => {
      setMessageType('success')
      setLocalMessage({ text: t('judge.feedback.submitted', 'Feedback submitted successfully.'), phase: 4 })
      navigate('/judge/dashboard')
    }
  })

  const analysis = analysisQuery.analysis?.analysis
  const isReady = analysis?.status === 'AIAnalysisReady'
  const isActivelyLoading = runAnalysisMutation.isPending || (analysisQuery.isPolling && analysisRequested)
  const lawArticles = analysis?.lawArticles ?? []
  const precedents = useMemo(() => (analysis?.similarPrecedents ?? []).slice(0, 5), [analysis?.similarPrecedents])
  const entitlements = analysis?.entitlementBreakdown ?? []

  const handleDocumentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setSelectedFile(file)
  }
  
  const handleUpload = () => {
    if (selectedFile && id) uploadMutation.mutate({ file: selectedFile, documentType: selectedDocType })
  }

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    const currentStage = stages[viewedIdx]?.label || 'Unknown Phase';
    const systemPrompt = `You are Cylix, an AI judicial assistant. The user is reviewing Case: ${caseData?.title} (${caseData?.case_number}).
    Current Phase being viewed: ${currentStage}.
    Case Status: ${caseData?.status}.
    Context: The user is in the ${currentStage} stage of the judicial workflow.
    Respond as a helpful legal assistant. ${i18n.language === 'ar' ? 'Always respond in Arabic.' : 'Always respond in English.'}`;

    try {
      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:1.5b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
            { role: 'user', content: userMsg }
          ],
          stream: false
        })
      });
      const data = await response.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.message.content }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Unable to connect to AI model.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const getAssistantContent = () => {
    switch (viewedIdx) {
      case 0:
        return {
          title: t('judge.assistant.overviewTitle', "Case Overview"),
          insight: t('judge.assistant.overviewInsight', "Detecting party mapping. Claimant indicates possible labor breach under Federal Law."),
          actions: [t('judge.assistant.verifyClaimant', "Verify Claimant ID"), t('judge.assistant.checkRespondent', "Check Respondent License")]
        };
      case 1:
        return {
          title: t('judge.assistant.uploadTitle', "Upload Documents"),
          insight: t('judge.assistant.uploadInsight', "Missing Notice Period notification. Recommend scanning for email correspondence exhibits."),
          actions: [t('judge.assistant.scanOcr', "Scan PDF OCR"), t('judge.assistant.crossLink', "Cross-link Exhibits")]
        };
      case 2:
        return {
          title: t('judge.assistant.analysisTitle', "AI Analysis"),
          insight: t('judge.assistant.analysisInsight', "Statutory interest calculation initialized based on labor law standards."),
          actions: [t('judge.assistant.exportPrecedents', "Export Precedents"), t('judge.assistant.verifyEntitlements', "Verify Entitlements")]
        };
      case 3:
        return {
          title: t('judge.assistant.reviewTitle', "Judgment Review"),
          insight: t('judge.assistant.reviewInsight', "Judgment logic consistent with Article 144. Suggest adding Article 146 citation."),
          actions: [t('judge.assistant.critique', "Critique Reasoning"), t('judge.assistant.checkConsistency', "Check Consistency")]
        };
      case 4:
        return {
          title: t('judge.assistant.feedbackTitle', "Feedback"),
          insight: t('judge.assistant.feedbackInsight', "Your feedback will refine the judicial reasoning node for future cases."),
          actions: [t('judge.assistant.analyzeFeedback', "Analyze Feedback"), t('judge.assistant.exportLearning', "Export Learning")]
        };
      default:
        return {
          title: "Cylix Assistant",
          insight: "Awaiting workspace context.",
          actions: ["Search case history"]
        };
    }
  };

  const assistant = getAssistantContent() as { title: string; insight: string; actions: string[] };

  const handleFinalize = async (payload: any) => {
    await finalizeMutation.mutateAsync({
      judgment_text: payload.judgmentText,
      decision: payload.decision,
      compensation_amount: payload.compensationAmount,
      reasoning: payload.reasoning,
      legal_precedents: precedents.map(p => p.caseId),
      articles_cited: lawArticles.map((a: any) => typeof a === 'object' ? a.title : String(a)),
    })
  };

  if (caseQuery.isLoading) {
    return (
      <PortalLayout title={t('judge.workspace.orchestrator', "Case Orchestrator")} hideHeaderContent>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="w-16 h-16 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin"/>
          <p className="text-xs font-black uppercase tracking-[.3em] text-[var(--primary)]/60">{t('judge.workspace.initializing', 'Initializing Judicial Node...')}</p>
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout title={t('judge.workspace.orchestrator', "Case Orchestrator")} hideHeaderContent>
      <div className="flex h-screen overflow-hidden bg-[#F8F8F5]">
        <div className="flex-1 flex flex-col overflow-hidden relative w-full">
          <CaseContextBar
            caseNumber={caseData?.case_number ?? '...'}
            title={caseData?.title ?? ''}
            status={caseData?.status}
            confidence={analysis?.confidence}
            isActivelyLoading={runAnalysisMutation.isPending}
            isDeleting={deleteMutation.isPending}
            onRunAnalysis={() => { runAnalysisMutation.mutate(undefined as any) }}
            onFinalize={() => setViewedIdx(3)}
            onDelete={() => { deleteMutation.mutate(undefined as any) }}
          />
  
          <div className="flex-1 overflow-y-auto w-full flex flex-col">
            <CaseWorkflow 
              viewedIdx={viewedIdx} 
              currentIdx={currentIdx} 
              stages={stages} 
              onStageClick={(idx) => setViewedIdx(idx)} 
            />

            {localMessage && localMessage.phase === viewedIdx && (
              <div className="mx-6 mt-4 p-4 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 flex items-center justify-between animate-in zoom-in duration-500">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-[var(--primary)]"/>
                  <span className="text-xs font-bold text-foreground">{localMessage.text}</span>
                </div>
                <button onClick={() => setLocalMessage(null)} className="text-muted-foreground hover:text-foreground">
                  <XIcon className="w-4 h-4"/>
                </button>
              </div>
            )}

            <div className="px-4 pt-1.5 pb-0 w-full space-y-2 flex flex-col flex-1">
              {viewedIdx === 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans flex flex-col h-full">
                  <header className="flex items-center gap-4 pb-2 border-b border-border/10 sticky top-0 bg-[#F8F8F5] z-10 py-2">
                    <div className="w-8 h-8 bg-white border border-border/40 shadow-sm rounded-lg flex items-center justify-center text-[var(--primary)] shrink-0">
                      <Scale className="w-4 h-4"/>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground tracking-tight">{t('judge.workspace.caseOverview', 'Case Overview')}</h2>
                      <p className="text-xs text-muted-foreground font-medium mt-1">{t('judge.workspace.caseInfo', 'Case Information')}</p>
                    </div>
                    <div className="ml-auto">
                      <button 
                        className="flex items-center gap-2 h-9 px-4 text-[10px] font-bold bg-muted hover:bg-muted/80 rounded-lg transition-all border border-transparent hover:border-border uppercase tracking-widest"
                        onClick={() => navigate(`/judge/cases/${id}/activity`)}
                      >
                        <ActivityIcon className="w-3.5 h-3.5" /> {t('judge.workspace.activityLogs', 'Activity Logs')}
                      </button>
                    </div>
                  </header>

                  <div className="grid grid-cols-3 gap-3 pt-1 shrink-0">
                    <div className="bg-white p-3.5 rounded-lg border border-border shadow-sm flex flex-col justify-between h-[90px] relative overflow-hidden group">
                      <div className="flex flex-col gap-1 pb-0">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[var(--primary)] opacity-40 shrink-0"/>
                          <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">{t('judge.workspace.caseTitle', 'Case Title')}</label>
                        </div>
                        <p className="text-sm font-bold text-foreground leading-tight tracking-tight normal-case group-hover:text-[var(--primary)] transition-colors">{caseData?.title}</p>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-border shadow-sm flex flex-col justify-start h-[90px] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-40 transition-opacity">
                        <Terminal className="w-5 h-5 text-[var(--primary)]"/>
                      </div>
                      <div className="flex flex-col gap-1 pb-0">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">{t('judge.workspace.refId', 'Reference ID')}</label>
                        <p className="text-sm font-bold font-mono tracking-tighter text-foreground uppercase group-hover:text-[var(--primary)] transition-colors">{caseData?.case_number}</p>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-border shadow-sm flex flex-col justify-start h-[90px] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-40 transition-opacity">
                        <Scale className="w-5 h-5 text-[var(--primary)]"/>
                      </div>
                      <div className="flex flex-col gap-1 pb-0">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground opacity-60">{t('judge.workspace.claimValue', 'Claim Value')}</label>
                        <p className="text-sm font-bold text-foreground leading-tight tracking-tight uppercase group-hover:text-[var(--primary)] transition-colors">
                          {caseData?.claim_amount ? 
                            `AED ${Number(caseData.claim_amount).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
                            'AED 0.00'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4 items-stretch mt-1.5 flex-1 min-h-full">
                    <div className="col-span-8 space-y-3 flex flex-col h-full">
                      <section className="bg-white p-4 rounded-2xl border border-border/80 shadow-sm space-y-2 flex flex-col flex-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] flex items-center gap-2">
                          <HistoryIcon className="w-3 h-3"/> {t('judge.workspace.background', 'Case Background')}
                        </label>
                        <div className="p-4 bg-muted/5 rounded-xl border border-dashed border-border/60 relative overflow-hidden group flex-1 flex flex-col justify-center">
                          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)] opacity-20"/>
                          <p className="text-xs font-semibold leading-relaxed text-foreground/80 italic">
                            {caseData?.description || t('judge.workspace.noBackground', 'No background information has been added.')}
                          </p>
                        </div>
                      </section>

                      <section className="grid grid-cols-3 gap-3 pt-1 mb-12">
                        {[
                          { label: t('judge.workspace.courtRef', 'Court Ref'), val: caseData?.court_number || 'DIFC-MAIN', icon: LayoutDashboard },
                          { label: t('judge.workspace.filingDate', 'Filing Date'), val: caseData?.filing_date ? new Date(caseData.filing_date).toDateString() : 'N/A', icon: HistoryIcon },
                          { label: t('judge.workspace.caseType', 'Case Type'), val: caseData?.case_type?.replace(/_/g, ' ') || 'OTHER', icon: Gavel }
                        ].map((item, i) => (
                          <div key={i} className="p-4 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-2 group hover:border-[var(--primary)]/20 transition-all duration-300">
                            <item.icon className="w-3.5 h-3.5 text-[var(--primary)]/40 group-hover:text-[var(--primary)] transition-colors"/>
                            <div>
                              <p className="text-[8px] font-black uppercase text-muted-foreground opacity-40 mb-0.5 tracking-widest">{item.label}</p>
                              <p className="text-[10px] font-black text-foreground uppercase tracking-tight truncate">{item.val}</p>
                            </div>
                          </div>
                        ))}
                      </section>
                    </div>

                    <div className="col-span-4 flex flex-col h-full">
                      <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col gap-4 relative overflow-visible group flex-1">
                        <div className="absolute top-0 right-0 p-4">
                          <User className="w-4 h-4 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:text-[var(--primary)] transition-all"/>
                        </div>
                        <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 leading-none">{t('judge.workspace.parties', 'Litigation Parties')}</h3>
                        <div className="flex flex-col gap-3 relative z-10 mt-2">
                          <div className="space-y-0.5">
                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--primary)] opacity-60">{t('judge.workspace.claimant', 'Claimant')}</p>
                            <p className="text-sm font-bold tracking-tight text-foreground normal-case leading-tight">{caseData?.claimant_name}</p>
                          </div>
                          <div className="flex items-center gap-3 py-1">
                            <div className="h-px bg-border flex-1 opacity-50"/>
                            <span className="text-[7px] font-black uppercase tracking-[0.5em] opacity-20">VERSUS</span>
                            <div className="h-px bg-border flex-1 opacity-50"/>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{t('judge.workspace.respondent', 'Respondent')}</p>
                            <div className="overflow-visible pr-2">
                              <p className="text-sm font-bold tracking-tight text-foreground normal-case leading-tight whitespace-normal">{caseData?.respondent_name}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewedIdx === 1 && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <header className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-[var(--bg-card)] border border-border shadow-sm rounded-xl flex items-center justify-center text-[var(--primary)]">
                      <Upload className="w-6 h-6"/>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-foreground tracking-tight uppercase leading-none">{t('judge.stages.evidence', 'Upload Documents')}</h2>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mt-2 opacity-50">Case File Storage Repository</p>
                    </div>
                  </header>
                  <div className="bg-[var(--bg-card)] p-8 rounded-2xl shadow-sm border border-border/80">
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
                </div>
              )}

              {viewedIdx === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <IntelligenceCenter
                    analysis={analysis}
                    caseId={id ?? ''}
                    lawArticles={lawArticles}
                    precedents={precedents}
                  />
                  {!isReady && !isActivelyLoading && (
                    <div className="mt-6 text-center p-16 bg-[var(--bg-card)] border-2 border-dashed border-border/80 rounded-2xl shadow-inner w-full group hover:border-[var(--primary)]/30 transition-all">
                      <div className="w-24 h-24 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform">
                        <BrainCircuit className="w-12 h-12 text-[var(--primary)] animate-pulse"/>
                      </div>
                      <h3 className="text-3xl font-black text-foreground uppercase tracking-tight">{t('judge.workspace.runAnalysis', 'Run AI Analysis')}</h3>
                      <p className="text-sm font-bold text-muted-foreground mt-6 italic max-w-lg mx-auto opacity-70">Activate the Cylix synthesis engine to perform high-precision cross-statutory reconciliation and automated precedent discovery.</p>
                      <Button 
                        className="mt-12 h-16 px-14 bg-[var(--primary)] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 hover:bg-[var(--primary-hover)] hover:scale-105 active:scale-95 transition-all"
                        onClick={() => runAnalysisMutation.mutate()}
                      >
                        <Sparkles className="w-4 h-4 mr-3"/> {t('judge.workspace.runAnalysis', 'Run AI Analysis')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {viewedIdx === 3 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
                  <header className="flex items-center gap-6 mb-12">
                    <div className="w-16 h-16 bg-[var(--bg-card)] border border-border shadow-2xl rounded-[1.75rem] flex items-center justify-center text-[var(--primary)]">
                      <Gavel className="w-8 h-8"/>
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">{t('judge.workspace.draftTitle', 'Draft Determination')}</h2>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-3 bg-muted/40 w-fit px-3 py-1 rounded-full border border-border/40">Manual Precision Calibration</p>
                    </div>
                  </header>
                  <div className="bg-[var(--bg-card)] p-12 rounded-[4rem] shadow-sm border border-border/80 overflow-hidden">
                    <JudgmentEditor
                      draftText={analysis?.draftText ?? caseData?.judgment_text ?? ''}
                      confidence={analysis?.confidence ?? 0}
                      isSubmitting={finalizeMutation.isPending}
                      caseNumber={caseData?.case_number}
                      claimantName={caseData?.claimant_name ?? ''}
                      respondentName={caseData?.respondent_name ?? ''}
                      filingDate={caseData?.filing_date ?? ''}
                      lawArticles={analysis?.lawArticles?.map((a: any) => typeof a === 'object' ? a.title : String(a))}
                      precedents={precedents.map(p => p.title)}
                      outcome={analysis?.outcome}
                      onRegenerate={async () => { await runAnalysisMutation.mutateAsync() }}
                      onFinalize={handleFinalize}
                    />
                  </div>
                </div>
              )}

              {viewedIdx === 4 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
                  <FeedbackForm 
                    caseId={id!} 
                    onSubmit={async (data) => { await feedbackMutation.mutateAsync(data) }} 
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border bg-[var(--bg-card)] shrink-0">
            <div className="w-full flex items-center justify-between h-16 px-6">
              <Button
                variant="outline"
                className="h-10 px-6 rounded-xl gap-2 font-black uppercase tracking-widest disabled:opacity-20 transition-all border-border hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] text-[10px]"
                disabled={viewedIdx === 0}
                onClick={() => {
                  setLocalMessage(null)
                  setViewedIdx(prev => Math.max(0, prev - 1))
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5"/>
                {stages[viewedIdx - 1]?.label || t('common.back', 'Back')}
              </Button>

              <div className="flex items-center gap-6">
                <div className="flex gap-1.5 items-center">
                  {stages.map((_, i) => (
                    <button
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-500 ease-out",
                        i === viewedIdx ?"bg-[var(--primary)] w-7":
                        i < currentIdx ?"bg-emerald-400 w-4":
                        "bg-muted w-4"
                      )}
                      onClick={() => {
                        if (i <= currentIdx) {
                          setLocalMessage(null)
                          setViewedIdx(i)
                        }
                      }}
                    />
                  ))}
                </div>
                <button
                  title={t('judge.workspace.precisionConfidence', 'AI Analysis')}
                  className={cn(
                    "w-10 h-10 rounded-xl transition-all duration-300 border flex items-center justify-center group relative",
                    isAiPanelOpen
                    ?"bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-emerald-500/20"
                    :"bg-[var(--bg-card)] border-border text-muted-foreground hover:border-[var(--primary)]/30 hover:text-[var(--primary)]"
                  )}
                  onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                >
                  {isAiPanelOpen ? <PanelRightClose className="w-4 h-4"/> : <Sparkles className="w-4 h-4"/>}
                </button>
              </div>

              <Button
                disabled={viewedIdx === 4 || (viewedIdx >= currentIdx && viewedIdx !== 3)}
                className="h-10 px-7 rounded-xl gap-2 bg-[var(--primary)] text-white font-black uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:bg-[var(--primary-hover)] hover:scale-105 active:scale-95 transition-all text-[10px]"
                onClick={() => {
                  setLocalMessage(null)
                  setViewedIdx(prev => Math.min(4, prev + 1))
                }}
              >
                {stages[viewedIdx + 1]?.label || t('common.complete', 'Complete')} <ArrowRight className="w-3.5 h-3.5"/>
              </Button>
            </div>
          </div>
        </div>

        <aside
          className={cn(
            "h-full border-l border-border bg-[var(--bg-card)] transition-all duration-500 overflow-hidden flex flex-col",
            isAiPanelOpen ?"w-[400px] opacity-100":"w-0 opacity-0"
          )}
        >
          <div className="p-6 border-b border-border flex justify-between items-center bg-[var(--bg-surface)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[var(--primary)] rounded-xl shadow-md shadow-emerald-500/20">
                <Sparkles className="w-4 h-4 text-white"/>
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight uppercase leading-none">{assistant.title}</h3>
                <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest mt-1.5">{t('judge.assistant.nodeActive', 'Precision Node Active')}</p>
              </div>
            </div>
            <button onClick={() => setIsAiPanelOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-muted-foreground"/>
            </button>
          </div>

          <div className="p-6 border-b border-border bg-[var(--primary)] text-white relative overflow-hidden shrink-0">
            <div className="absolute -right-10 -top-10 w-36 h-36 bg-white/10 rounded-full blur-3xl pointer-events-none"/>
            <p className="text-[9px] font-black uppercase tracking-[.25em] mb-3 opacity-60">{t('judge.assistant.synthesis', 'Strategic Synthesis')}</p>
            <h4 className="text-[13px] font-bold italic leading-relaxed tracking-tight underline underline-offset-4 decoration-white/20">
              &ldquo;{assistant.insight}&rdquo;
            </h4>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1 max-w-[200px] h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                  style={{ width: caseData?.ai_precision_score ? `${caseData.ai_precision_score}%` : (analysis?.confidence ? `${Math.round(analysis.confidence * 100)}%` : '30%') }} 
                />
              </div>
              <span className="text-[14px] font-black tabular-nums text-white">
                {caseData?.ai_precision_score ? `${caseData.ai_precision_score}%` : (analysis?.confidence ? `${Math.round(analysis.confidence * 100)}%` : '--')}
              </span>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">{t('judge.workspace.precisionConfidence', 'AI PRECISION CONFIDENCE')}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <div className="space-y-4">
              <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-50">{t('judge.assistant.protocols', 'Phase Protocols')}</h4>
              <div className="flex flex-col gap-3">
                {assistant.actions.map((action, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-4 py-3 bg-[var(--bg-surface)] hover:bg-[var(--primary)]/5 group rounded-lg border border-border/40 transition-all flex items-center justify-between"
                  >
                    <span className="text-[11px] font-bold text-foreground group-hover:text-[var(--primary)] uppercase tracking-tight">{action}</span>
                    <div className="p-1.5 bg-background group-hover:bg-[var(--primary)]/10 rounded-lg border border-border/20 transition-colors">
                      <Plus className="w-3 h-3 text-muted-foreground group-hover:text-[var(--primary)] transition-colors"/>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-50">{t('judge.assistant.dialogue', 'Reasoning Dialogue')}</h4>
              <div className="space-y-4">
                {chatHistory.map((msg, i) => (
                  <div key={i} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'bg-muted border-border/40' : 'bg-primary/10 border-primary/20'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-muted-foreground"/> : <Sparkles className="w-4 h-4 text-primary"/>}
                    </div>
                    <div className={`${msg.role === 'user' ? 'bg-muted/20 border-border/20' : 'bg-primary/5 border-primary/10 shadow-sm shadow-primary/5'} p-4 rounded-2xl rounded-tl-none border`}>
                      <p className="text-xs font-medium text-foreground/90 leading-relaxed antialiased">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isChatLoading && <div className="text-[10px] text-muted-foreground animate-pulse font-bold uppercase tracking-widest">{t('thinking', 'Thinking...')}</div>}
                
                {chatHistory.length === 0 && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 animate-pulse">
                      <Sparkles className="w-4 h-4 text-primary"/>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-2xl rounded-tl-none border border-primary/10 shadow-sm shadow-primary/5">
                      <p className="text-xs font-medium text-foreground/90 leading-relaxed antialiased italic opacity-60">
                        {t('judge.workspace.assistantPrompt', 'I am ready to assist with Phase {{phase}}. How can I help?', { phase: viewedIdx + 1 })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-border bg-[var(--bg-surface)] shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder={t('judge.workspace.askAI', 'Ask Cylix...')}
                className="w-full bg-[var(--bg-card)] border border-border/60 hover:border-[var(--primary)]/30 focus:border-[var(--primary)]/50 focus:ring-4 focus:ring-[var(--primary)]/5 h-12 pl-5 pr-14 rounded-2xl outline-none transition-all placeholder:opacity-40 text-sm font-bold"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              />
              <button 
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--primary)] text-white rounded-xl flex items-center justify-center shadow-md hover:bg-[var(--primary-hover)] transition-colors"
                onClick={sendChat}
                disabled={isChatLoading}
              >
                <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse"/>
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.3em] opacity-40">{t('judge.workspace.neuralNode', 'Cylix Neural Node Active')}</p>
            </div>
          </div>
        </aside>
      </div>
    </PortalLayout>
  )
}

export default CaseDetail
