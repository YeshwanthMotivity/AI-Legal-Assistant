import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
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
  Activity as ActivityIcon,
  Zap,
  Trash2,
  MessageSquare,
  Send
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
  submitFeedback,
  deleteCaseDocument
} from '../../api/judge'
import { useCaseAnalysisPolling } from '../../hooks/useCaseAnalysisPolling'
import type { DocumentType, JudgmentRequest } from '../../types/judge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const CaseWorkflow = ({ viewedIdx, currentIdx, stages, onStageClick }: { viewedIdx: number, currentIdx: number, stages: any[], onStageClick: (idx: number) => void }) => {
  return (
    <div className="w-full bg-white border-b border-border/40 relative z-20">
      <div className="max-w-[1640px] mx-auto px-8 py-6">
        <div className="w-full flex items-start justify-between relative">
          <div className="absolute top-5 left-10 right-10 h-[1px] bg-border/60 z-0"/>
  
        {stages.map((stage, i) => {
          const isReached = i <= currentIdx;
          const isViewed = i === viewedIdx;
          const isCompleted = i < currentIdx;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col group flex-1 items-center">
              {isCompleted && i < stages.length - 1 && (
                <div className="absolute top-5 left-[50%] right-[-50%] h-[2px] bg-[var(--primary)] z-0"/>
              )}
  
              <button 
                className="flex flex-col items-center gap-3 transition-all duration-300 w-full outline-none cursor-pointer"
                onClick={() => onStageClick(i)}
              >
                <div 
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 bg-white relative z-10 font-bold",
                    isViewed ?"border-[var(--primary)] text-[var(--primary)] shadow-[0_0_15px_rgba(5,150,105,0.15)] scale-110 font-black": 
                    isCompleted ?"border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]": 
                    isReached ?"border-primary/20 text-primary/40 hover:border-primary/60":
                    "border-muted text-muted-foreground/20 opacity-30"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3px] text-white"/> : <stage.icon className={cn("w-4 h-4", isViewed ? "stroke-[2.5px]" : "stroke-[2px]")}/>}
                </div>
                <div className="text-center px-1">
                  <p className={cn(
                    "text-[10px] font-black tracking-widest uppercase transition-colors", 
                    isViewed ?"text-[var(--primary)]": isReached ?"text-[var(--primary)]/40":"text-muted-foreground/20"
                  )}>
                    Phase {stage.id}
                  </p>
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-tight w-24 truncate transition-colors mt-0.5", 
                    isViewed ?"text-foreground": isReached ?"text-foreground/50":"text-muted-foreground/20"
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
    <div className="w-full bg-white p-8 rounded-2xl border border-border/60 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 mb-12">
      <header className="flex items-center gap-4 border-b border-border/40 pb-6 mb-8">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <MessagesSquare className="w-5 h-5"/>
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground uppercase leading-none">{t('judge.feedback.title', 'Judge Feedback')}</h2>
          <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mt-1">{t('judge.feedback.subtitle', 'Rate AI Performance')}</p>
        </div>
      </header>
  
      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-5 space-y-8 pr-8 border-r border-border/40">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{t('judge.feedback.quantitative', 'Quantitative Metrics')}</h3>
          {['legal_relevance_score', 'reasoning_quality_score', 'explanation_clarity_score'].map((field) => (
            <div key={field} className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-tight text-foreground">{t(`judge.feedback.fields.${field}`, field.replace(/_/g, ' '))}</label>
                <span className="text-[11px] font-black tabular-nums px-2 py-1 bg-muted/30 border border-border/60 rounded text-primary">
                  {(feedback as any)[field]}/10
                </span>
              </div>
              <input 
                type="range" min="1" max="10"
                className="w-full accent-primary h-1 bg-muted rounded-full appearance-none cursor-pointer"
                value={(feedback as any)[field]}
                onChange={(e) => setFeedback({...feedback, [field]: parseInt(e.target.value)})}
              />
            </div>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-7 flex flex-col h-full">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-6">{t('judge.feedback.qualitative', 'Qualitative Analysis')}</h3>
          <div className="flex-1 flex flex-col gap-6">
            <textarea 
              className="w-full flex-1 min-h-[160px] p-5 bg-muted/5 border border-border/80 rounded-xl text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:italic placeholder:opacity-30"
              placeholder={t('judge.feedback.placeholder', 'Log anomalies, edge cases, or override justifications here...')}
              value={feedback.feedback_text}
              onChange={(e) => setFeedback({...feedback, feedback_text: e.target.value})}
            />
            <Button 
              className="w-full h-12 bg-primary text-on-primary font-black uppercase tracking-widest text-[11px] rounded-xl hover:opacity-90 shadow-lg shadow-primary/10 transition-all shrink-0"
              onClick={() => onSubmit(feedback)}
            >
              <Gavel className="w-4 h-4 mr-2 inline" />
              {t('judge.workspace.finalizeJudgment', 'Finalize Judgment')}
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
  const [phaseChats, setPhaseChats] = useState<Record<number, {role: 'user'|'assistant', content: string}[]>>({});
  const chatHistory = phaseChats[viewedIdx] || [];
  const [isChatLoading, setIsChatLoading] = useState(false);

  const stages = [
    { id: 1, label: t('judge.stages.analysis', 'Analysis Results'), sub: 'Research & Synthesis', icon: BrainCircuit, statuses: ['Created', 'DocumentsUploaded', 'AIAnalysisPending', 'AIAnalysisReady'] },
    { id: 2, label: t('judge.stages.review', 'Judicial Review'), sub: 'Judgment drafting', icon: Gavel, statuses: ['DraftGenerated'] },
    { id: 3, label: t('judge.stages.feedback', 'Feedback'), sub: 'Outcome learning', icon: MessagesSquare, statuses: ['CaseClosed'] },
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
    return idx === -1 ? (status === 'CaseClosed' ? 3 : 0) : idx;
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['judge-cases'] })
      navigate('/judge/cases')
    },
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
    mutationFn: () => runAnalysis(id as string, i18n.language),
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

  // JudgmentEditor State
  const [draftText, setDraftText] = useState('')
  const [decision, setDecision] = useState('Awarded')
  const [compensation, setCompensation] = useState('AED 0.00')

  // Sync draftText when analysis is loaded
  useEffect(() => {
    if (caseData?.judgment_text) setDraftText(caseData.judgment_text);
    else if (analysisQuery.analysis?.analysis?.draftText) setDraftText(analysisQuery.analysis.analysis.draftText);
  }, [caseData?.judgment_text, analysisQuery.analysis?.analysis?.draftText]);

  const finalizeMutation = useMutation({
    mutationFn: (payload: JudgmentRequest) => saveJudgment(id as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-case'] })
    },
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) => deleteCaseDocument(id as string, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-documents', id] })
      queryClient.invalidateQueries({ queryKey: ['judge-case', id] })
      setMessageType('success')
      setLocalMessage({ text: 'Document deleted successfully.', phase: 1 })
    },
    onError: () => {
      setMessageType('error')
      setLocalMessage({ text: 'Failed to delete document.', phase: 1 })
    }
  });

  const feedbackMutation = useMutation({
    mutationFn: (payload: any) => submitFeedback(id as string, payload),
    onSuccess: () => {
      setMessageType('success')
      setLocalMessage({ text: t('judge.feedback.submitted', 'Feedback submitted successfully.'), phase: 4 })
      navigate('/judge/cases')
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
    
    setPhaseChats(prev => ({
      ...prev,
      [viewedIdx]: [...(prev[viewedIdx] || []), { role: 'user', content: userMsg }]
    }));
    setIsChatLoading(true);

    const currentStage = stages[viewedIdx]?.label || 'Unknown Phase';
    const systemPrompt = `You are Cylix, an AI judicial assistant. The user is reviewing Case: ${caseData?.title} (${caseData?.case_number}).
    
    Current Phase context: ${currentStage}.
    STRICT CONTEXT RULE: You ONLY answer questions related to the current phase of the case: "${currentStage}". 
    - If Phase 1 (Overview), focus on facts and parties.
    - If Phase 2 (Evidence), focus on uploaded documents and data extraction.
    - If Phase 3 (Analysis), focus on law articles, precedents, and legal reasoning.
    - If Phase 4 (Judgment), focus on the final verdict draft and reasoning consistency.
    
    If the user asks something outside this specific phase context, politely decline and explain that you can only assist with "${currentStage}" related queries in this section.
    
    Respond in ${i18n.language === 'ar' ? 'Arabic' : 'English'}. Keep responses professional and concise.`;

    try {
      const response = await fetch(import.meta.env.VITE_LLM_URL || 'http://172.20.100.215:11434/api/chat', {
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
      setPhaseChats(prev => ({
        ...prev,
        [viewedIdx]: [...(prev[viewedIdx] || []), { role: 'assistant', content: data.message.content }]
      }));
    } catch {
      setPhaseChats(prev => ({
        ...prev,
        [viewedIdx]: [...(prev[viewedIdx] || []), { role: 'assistant', content: i18n.language === 'ar' ? 'غير قادر على الاتصال بنموذج الذكاء الاصطناعي.' : 'Unable to connect to AI model.' }]
      }));
    } finally {
      setIsChatLoading(false);
    }
  };

  const getAssistantContent = () => {
    switch (viewedIdx) {
      case 0:
        return {
          title: t('judge.assistant.analysisTitle', "AI Analysis"),
          insight: t('judge.assistant.analysisInsight', "Statutory interest calculation initialized based on labor law standards."),
          actions: [t('judge.assistant.exportPrecedents', "Export Precedents"), t('judge.assistant.verifyEntitlements', "Verify Entitlements")],
          suggestions: [
             i18n.language === 'ar' ? 'قارن مع السوابق القضائية' : 'Compare with precedents',
             i18n.language === 'ar' ? 'ما هي المواد القانونية المطبقة؟' : 'Applicable law articles',
             i18n.language === 'ar' ? 'تحقق من دقة الحسابات' : 'Verify calculation logic'
          ]
        };
      case 1:
        return {
          title: t('judge.assistant.reviewTitle', "Judgment Review"),
          insight: t('judge.assistant.reviewInsight', "Judgment logic consistent with Article 144. Suggest adding Article 146 citation."),
          actions: [t('judge.assistant.critique', "Critique Reasoning"), t('judge.assistant.checkConsistency', "Check Consistency")],
          suggestions: [
             i18n.language === 'ar' ? 'راجع المنطق القانوني' : 'Review legal reasoning',
             i18n.language === 'ar' ? 'هل هناك تعارض في الحكم؟' : 'Check for inconsistencies',
             i18n.language === 'ar' ? 'اقترح تعديلات على المسودة' : 'Suggest draft edits'
          ]
        };
      case 2:
        return {
          title: t('judge.assistant.feedbackTitle', "Feedback"),
          insight: t('judge.assistant.feedbackInsight', "Your feedback will refine the judicial reasoning node for future cases."),
          actions: [t('judge.assistant.analyzeFeedback', "Analyze Feedback"), t('judge.assistant.exportLearning', "Export Learning")],
          suggestions: [
             i18n.language === 'ar' ? 'كيف أحسن دقة النظام؟' : 'How to improve accuracy?',
             i18n.language === 'ar' ? 'سجل ملاحظاتي الفنية' : 'Log technical feedback',
             i18n.language === 'ar' ? 'قيم أداء الذكاء الاصطناعي' : 'Rate AI performance'
          ]
        };
      default:
        return {
          title: "Cylix Assistant",
          insight: "Awaiting workspace context.",
          actions: ["Search case history"],
          suggestions: ["Ask a general question"]
        };
    }
  };

  const assistant = getAssistantContent() as { title: string; insight: string; actions: string[]; suggestions: string[] };

  const handleFinalize = async () => {
    await finalizeMutation.mutateAsync({
      judgment_text: draftText,
      decision: decision,
      compensation_amount: compensation,
      reasoning: 'Finalized by judicial officer via workbench.',
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
      <div className={cn("flex h-full bg-[#F8F8F5] overflow-hidden", i18n.language === 'ar' ? "flex-row-reverse text-right" : "flex-row")}>
        
        {/* LEFT/CENTER ACTION AREA (Workspace + Header) */}
        <div className={cn("flex-1 flex flex-col min-w-0 bg-white/40 shadow-inner", i18n.language === 'ar' ? "border-r border-border/40" : "border-l border-border/40")}>
          
          {/* TOP CONTEXT BAR - Scoped to this column, so it starts after the left sidebar */}
          <CaseContextBar
            caseNumber={caseData?.case_number ?? '...'}
            title={caseData?.title ?? ''}
            status={caseData?.status}
            confidence={analysis?.confidence}
            isActivelyLoading={isActivelyLoading}
            isDeleting={deleteMutation.isPending}
            onDelete={() => { deleteMutation.mutate(undefined as any) }}
          />
          
          <div className="flex-1 flex flex-col overflow-y-auto">
             {/* Workflow Header */}
             <CaseWorkflow 
               viewedIdx={viewedIdx} 
               currentIdx={currentIdx} 
               stages={stages} 
                onStageClick={(idx) => { setLocalMessage(null); setViewedIdx(idx); setChatInput(""); }}
             />

             {localMessage && localMessage.phase === viewedIdx && (
               <div className="mx-8 mt-6 p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between animate-in zoom-in duration-300 shadow-sm">
                 <div className="flex items-center gap-3">
                   <Sparkles className="w-4 h-4 text-primary animate-pulse"/>
                   <span className="text-xs font-bold text-foreground">{localMessage.text}</span>
                 </div>
                 <button onClick={() => setLocalMessage(null)} className="p-1 hover:bg-primary/10 rounded-md transition-colors">
                   <XIcon className="w-4 h-4 text-muted-foreground"/>
                 </button>
               </div>
             )}

             <div className="px-8 py-8 w-full">
                <div className="max-w-5xl mx-auto space-y-8 pb-32">
                   {/* ANALYSIS TAB */}
                   {viewedIdx === 0 && (
                     <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <IntelligenceCenter
                          analysis={analysis}
                          caseId={id ?? ''}
                          lawArticles={lawArticles}
                          precedents={precedents}
                          caseData={caseData}
                          documents={documentsQuery.data?.items}
                          entitlements={entitlements}
                          onDeleteDocument={(docId) => deleteDocumentMutation.mutate(docId)}
                          isDeletingDocument={deleteDocumentMutation.isPending ? deleteDocumentMutation.variables as string : null}
                        />
                        {!isReady && !isActivelyLoading && (
                          <div className="mt-8 text-center p-12 bg-white border border-dashed border-border/80 rounded-2xl shadow-inner w-full flex flex-col items-center gap-6">
                             <div className="w-20 h-20 bg-primary/5 border border-primary/10 rounded-3xl flex items-center justify-center">
                                <BrainCircuit className="w-10 h-10 text-primary animate-pulse"/>
                             </div>
                             <div>
                                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{t('judge.workspace.runAnalysis', 'Awaiting Synthesis')}</h3>
                                <p className="text-xs font-semibold text-muted-foreground mt-2 opacity-60 antialiased max-w-sm mx-auto">The orchestration node is awaiting intelligence processing from the registry.</p>
                             </div>
                          </div>
                        )}
                        {isReady && !isActivelyLoading && (
                           <div className="mt-8 text-center bg-white border border-border/80 rounded-2xl shadow-sm w-full flex flex-col items-center justify-center p-8 gap-4">
                              <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Ready to Draft?</h3>
                              <p className="text-sm font-semibold text-muted-foreground opacity-60 antialiased max-w-sm mx-auto">Generate a judgment draft based on the intelligent analysis.</p>
                              <Button 
                                className="h-11 px-8 bg-[var(--primary)] text-white rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform text-[11px]"
                                onClick={() => { setLocalMessage(null); setViewedIdx(1); setChatInput(""); }}
                              >
                                Generate Judgment Draft <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                           </div>
                        )}
                     </div>
                   )}

                   {/* REVIEW TAB */}
                   {viewedIdx === 1 && (
                     <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
                        <header className="flex items-center gap-4 mb-6">
                           <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                              <Gavel className="w-5 h-5"/>
                           </div>
                           <div>
                              <h2 className="text-lg font-black text-foreground tracking-tight uppercase leading-none">{t('judge.workspace.draftTitle', 'Trial Determination')}</h2>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1.5 opacity-50">Judicial Consistency Review</p>
                           </div>
                        </header>
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-border/80 overflow-hidden">
                           <JudgmentEditor
                             draftText={draftText}
                             onDraftChange={setDraftText}
                             confidence={analysis?.confidence ?? 0}
                             caseNumber={caseData?.case_number}
                             claimantName={caseData?.claimant_name ?? ''}
                             respondentName={caseData?.respondent_name ?? ''}
                             filingDate={caseData?.filing_date ?? ''}
                             lawArticles={analysis?.lawArticles?.map((a: any) => typeof a === 'object' ? a.title : String(a))}
                             precedents={precedents.map(p => p.title)}
                             decision={decision}
                             onDecisionChange={setDecision}
                             compensation={compensation}
                             onCompensationChange={setCompensation}
                             onRegenerate={async () => { await runAnalysisMutation.mutateAsync() }}
                           />
                        </div>
                     </div>
                   )}

                   {/* FEEDBACK TAB */}
                   {viewedIdx === 2 && (
                     <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
                        <FeedbackForm 
                          caseId={id!} 
                          onSubmit={async (data) => { 
                            await handleFinalize();
                            await feedbackMutation.mutateAsync(data);
                          }} 
                        />
                     </div>
                   )}

                   {/* FALLBACK */}
                   {(viewedIdx < 0 || viewedIdx > 2) && (
                     <div className="p-12 text-center text-muted-foreground opacity-30 italic">
                        Select a phase to continue...
                     </div>
                   )}
                </div>
             </div>

             {/* BOTTOM NAV */}
             <div className="sticky bottom-0 bg-white border-t border-border/40 px-8 py-3 w-full flex items-center justify-between z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] shrink-0">
                <Button
                  variant="ghost"
                  className="h-10 px-5 text-[10px] font-black uppercase tracking-widest hover:bg-muted/40 transition-all rounded-xl disabled:opacity-30"
                  disabled={viewedIdx === 0}
                  onClick={() => { setLocalMessage(null); setViewedIdx(prev => Math.max(0, prev - 1)); setChatInput(""); }}
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-2"/> {t('common.back', 'Previous')}
                </Button>

                <div className="flex items-center gap-1.5">
                   {stages.map((_, i) => (
                     <div key={i} className={cn("h-1 rounded-full transition-all duration-300", i === viewedIdx ? "bg-primary w-6" : i < currentIdx ? "bg-primary/30 w-3" : "bg-muted w-3")} />
                   ))}
                </div>

                {viewedIdx !== 2 && (
                  <Button
                    className="h-10 px-6 text-[10px] font-black uppercase tracking-widest bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40"
                    onClick={() => { setLocalMessage(null); setViewedIdx(prev => Math.min(4, prev + 1)); setChatInput(""); }}
                  >
                    {stages[viewedIdx + 1]?.label} <ArrowRight className="w-3.5 h-3.5 ml-2"/>
                  </Button>
                )}
             </div>
          </div>
        </div>

        <aside className={cn(
          "h-full bg-white transition-all duration-500 flex flex-col relative shrink-0",
          i18n.language === 'ar' ? "border-r border-border" : "border-l border-border",
          isAiPanelOpen ? "w-[420px] opacity-100" : "w-0 opacity-0 overflow-hidden"
        )}>
             {/* SIDEBAR HEADER */}
             <header className="p-5 border-b border-border/40 bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary border border-primary/10">
                      <Sparkles className="w-5 h-5"/>
                   </div>
                   <div>
                      <h3 className="text-[11px] font-black tracking-tight text-foreground uppercase leading-none">{assistant.title}</h3>
                      <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mt-1.5">{t('judge.assistant.nodeActive', 'Precision Node Active')}</p>
                   </div>
                </div>
                 <button 
                  onClick={() => setIsAiPanelOpen(false)} 
                  className="absolute top-1/2 -left-6 -translate-y-1/2 w-6 h-12 bg-white border border-border/40 rounded-l-xl flex items-center justify-center hover:bg-muted transition-all shadow-md group"
                  title={t('common.close', 'Close')}
                >
                  <XIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all group-hover:scale-125"/>
                </button>
             </header>

             <div className="flex-1 overflow-y-auto w-full flex flex-col">
                {/* STRATEGIC SYNTHESIS - REDUCED CONTRAST / MORE COMPACT */}
                <div className="p-6 bg-primary/5 border-b border-border/40 relative overflow-hidden shrink-0 group">
                   <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                   <p className="text-[8px] font-black uppercase tracking-[0.25em] text-primary opacity-60 mb-3">{t('judge.assistant.synthesis', 'Strategic Synthesis')}</p>
                   <p className="text-[12px] font-bold italic leading-relaxed text-foreground antialiased antialiased">
                     &ldquo;{assistant.insight}&rdquo;
                   </p>
                   {/* MODIFIED CONFIDENCE BAR */}
                   <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black text-primary tracking-widest uppercase">
                         <span>AI PRECISION</span>
                         <span>{caseData?.ai_precision_score ? `${caseData.ai_precision_score}%` : (analysis?.confidence ? `${Math.round(analysis.confidence * 100)}%` : '78%')}</span>
                      </div>
                      <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(5,150,105,0.4)]" 
                           style={{ width: caseData?.ai_precision_score ? `${caseData.ai_precision_score}%` : (analysis?.confidence ? `${Math.round(analysis.confidence * 100)}%` : '78%') }} 
                         />
                      </div>
                   </div>
                </div>

                <div className="p-6 space-y-8 flex flex-col flex-1">

                   {/* REASONING DIALOGUE - MORE CHAT-LIKE */}
                    <section className="flex flex-col flex-1 min-h-[300px]">
                       <h4 className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.25em] mb-4">{t('judge.assistant.dialogue', 'Reasoning Dialogue')}</h4>
                       <div className="flex-1 space-y-5 overflow-y-auto pr-1 pb-6">
                          {chatHistory.length === 0 ? (
                            <div className="flex gap-3 animate-in fade-in duration-500">
                               <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                  <Sparkles className="w-3.5 h-3.5 text-primary"/>
                               </div>
                               <div className={cn("bg-[#F8F8F5] p-3.5 rounded-2xl border border-border/40 shadow-sm flex-1", i18n.language === 'ar' ? "rounded-tr-none" : "rounded-tl-none")}>
                                  <p className="text-[11px] font-semibold text-foreground/70 leading-relaxed italic antialiased antialiased">
                                    {t('judge.workspace.assistantPrompt', 'I am ready to assist with Phase {{phase}} logic discovery. How can I help?', { phase: viewedIdx + 1 })}
                                  </p>
                               </div>
                            </div>
                          ) : (
                            chatHistory.map((msg, idx) => (
                              <div key={idx} className={cn("flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300", 
                                msg.role === 'user' 
                                ? (i18n.language === 'ar' ? "flex-row" : "flex-row-reverse") 
                                : (i18n.language === 'ar' ? "flex-row-reverse" : "flex-row")
                              )}>
                                 <div className={cn(
                                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                                    msg.role === 'user' ? "bg-muted border-border/60" : "bg-primary/10 border-primary/20"
                                 )}>
                                    {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-muted-foreground"/> : <Sparkles className="w-3.5 h-3.5 text-primary"/>}
                                 </div>
                                 <div className={cn(
                                    "p-3.5 rounded-2xl flex-1 max-w-[85%] border shadow-sm",
                                    msg.role === 'user' 
                                    ? (i18n.language === 'ar' ? "rounded-tl-none" : "bg-white border-border/60 rounded-tr-none") 
                                    : (i18n.language === 'ar' ? "rounded-tr-none" : "bg-[#F8F8F5] border-border/40 rounded-tl-none")
                                 )}>
                                    <p className="text-[11px] font-medium text-foreground antialiased leading-relaxed">{msg.content}</p>
                                 </div>
                              </div>
                            ))
                          )}
                         {isChatLoading && (
                           <div className="flex items-center gap-2 text-[8px] font-black text-primary opacity-60 uppercase tracking-widest px-1">
                              <div className="w-1 h-1 bg-primary rounded-full animate-bounce"/>
                              <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-.15s]"/>
                              <div className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:-.3s]"/>
                              <span>ANALYZING NODE...</span>
                           </div>
                         )}
                      </div>
                      
                      {/* CHAT SUGGESTIONS */}
                      <div className="px-1 py-4 border-t border-border/20 mt-auto">
                        <p className="text-[7.5px] font-black text-muted-foreground/30 uppercase tracking-[.25em] mb-3">Contextual Queries</p>
                        <div className="flex flex-wrap gap-2">
                            {assistant.suggestions.map((s, i) => (
                              <button 
                                key={i}
                                className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 bg-muted/30 border border-border/40 rounded-lg hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all outline-none"
                                onClick={() => {
                                  setChatInput(s);
                                }}
                              >
                                {s}
                              </button>
                            ))}
                        </div>
                      </div>
                   </section>
                </div>
             </div>

             {/* CHAT INPUT AREA */}
             <div className="p-5 border-t border-border/40 bg-white shrink-0">
                <div className="relative group">
                   <input 
                     type="text" 
                     placeholder={t('judge.workspace.askAI', 'Ask Cylix...')} 
                     className={cn(
                       "w-full bg-[#F8F8F5] border border-border/60 rounded-xl h-11 text-[11px] font-bold focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all placeholder:opacity-30 antialiased",
                       i18n.language === 'ar' ? "pr-4 pl-12 text-right" : "pl-4 pr-12"
                     )}
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                   />
                   <button 
                     className={cn(
                       "absolute top-1.5 h-8 w-8 bg-primary text-on-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40",
                       i18n.language === 'ar' ? "left-1.5" : "right-1.5"
                     )}
                     onClick={sendChat}
                     disabled={isChatLoading || !chatInput.trim()}
                   >
                      <Send className={cn("w-3.5 h-3.5 fill-current", i18n.language === 'ar' && "rotate-180")}/>
                   </button>
                </div>
                <div className="flex items-center justify-center gap-2 mt-3 opacity-30">
                   <div className="w-1 h-1 bg-primary rounded-full animate-pulse"/>
                   <span className="text-[7px] font-black tracking-[0.3em] uppercase text-muted-foreground">{t('judge.workspace.neuralNode', 'Cylix Neural Node Standardized')}</span>
                </div>
             </div>
           </aside>

          {/* FLOATING TOGGLE BUTTON - Appears when AI panel is closed */}
          {!isAiPanelOpen && (
            <button 
              onClick={() => setIsAiPanelOpen(true)}
              className={cn(
                "fixed bottom-8 w-12 h-12 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border border-white/20",
                i18n.language === 'ar' ? "left-6" : "right-6"
              )}
              title={t('judge.assistant.open', 'Open AI Assistant')}
            >
              <Sparkles className="w-5 h-5 animate-pulse group-hover:rotate-12 transition-transform" />
            </button>
          )}
        </div>
    </PortalLayout>
  )
}

export default CaseDetail;
