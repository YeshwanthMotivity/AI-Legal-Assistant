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
import { toast } from 'sonner'
import PortalLayout from '../../components/layout/PortalLayout'
import JudgmentEditor from '../../components/judge/JudgmentEditor'
import CaseContextBar from '../../components/judge/workspace/CaseContextBar'
import DocumentsPanel from '../../components/judge/workspace/DocumentsPanel'
import IntelligenceCenter from '../../components/judge/workspace/IntelligenceCenter'
import {
  clerkGetCaseDocuments,
  clerkRunAnalysis,
  clerkUploadDocument as clerkUploadCaseDocument,
  clerkDeleteCase,
  clerkGetCase,
  clerkDeleteCaseDocument,
  clerkGetDocumentContent,
  clerkGetAuditLogs
} from '../../api/clerk'
import ActivityLogMatrix from '../../components/judge/workspace/ActivityLogMatrix'
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
                  {isCompleted && !isViewed ? (
                    <Check className={cn("w-4 h-4 stroke-[3px]", "text-white")}/>
                  ) : (
                    <stage.icon className={cn("w-4 h-4", isViewed ? "stroke-[2.5px] text-[var(--primary)]" : "stroke-[2px]")}/>
                  )}
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

// Feedback form removed for clerk

const CaseDetail = () => {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [selectedDocTypes, setSelectedDocTypes] = useState<DocumentType[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [analysisRequested, setAnalysisRequested] = useState(false)
  const [localMessage, setLocalMessage] = useState<{ text: string, phase: number } | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [batchUploading, setBatchUploading] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

  const [viewedIdx, setViewedIdx] = useState(0)
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [phaseChats, setPhaseChats] = useState<Record<number, {role: 'user'|'assistant', content: string}[]>>({});
  const chatHistory = phaseChats[viewedIdx] || [];
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isActivityMatrixOpen, setIsActivityMatrixOpen] = useState(false)

  const stages = [
    { id: 1, label: t('judge.stages.creation', 'Case Creation'), sub: 'Details confirmation', icon: FileText, statuses: ['Created'] },
    { id: 2, label: t('judge.stages.evidence', 'Evidence Upload'), sub: 'Documents & Evidence', icon: Upload, statuses: ['DocumentsUploaded'] },
    { id: 3, label: t('judge.stages.analysis', 'AI - Analysis'), sub: 'Research & Analysis', icon: BrainCircuit, statuses: ['AIAnalysisPending', 'AIAnalysisReady', 'DraftGenerated', 'Finalized'] },
  ];

  const caseQuery = useQuery({
    queryKey: ['judge-case', id],
    queryFn: () => clerkGetCase(id as string),
    enabled: Boolean(id),
  })

  const caseData = caseQuery.data;

  useEffect(() => {
    setViewedIdx(0)
  }, [id])

  const currentIdx = useMemo(() => {
    const status = caseData?.status || 'Created';
    const idx = stages.findIndex(s => s.statuses.includes(status));
    return idx === -1 ? (status === 'Finalized' ? 2 : 0) : idx;
  }, [caseData?.status]);

  const documentsQuery = useQuery({
    queryKey: ['case-documents', id],
    queryFn: () => clerkGetCaseDocuments(id as string),
    enabled: Boolean(id),
  })

  const shouldPoll = analysisRequested || caseData?.status === 'AIAnalysisPending';
  const analysisQuery = useCaseAnalysisPolling(id, shouldPoll)


  const deleteMutation = useMutation({
    mutationFn: () => clerkDeleteCase(id as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clerk-cases'] })
      navigate('/clerk/cases')
    },
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: string }) =>
      clerkUploadCaseDocument(id as string, file, documentType as DocumentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-documents', id] })
      queryClient.invalidateQueries({ queryKey: ['judge-case', id] })
    },
    onError: (error: any) => {
      setMessageType('error')
      const errorDetail = error?.response?.data?.detail || t('judge.workspace.uploadError');
      setLocalMessage({ text: errorDetail, phase: 1 })
    },
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) => clerkDeleteCaseDocument(id as string, documentId),
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

  const runAnalysisMutation = useMutation({
    mutationFn: () => clerkRunAnalysis(id as string, i18n.language),
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

  const auditLogsQuery = useQuery({
    queryKey: ['case-audit-logs', id],
    queryFn: () => clerkGetAuditLogs(id as string),
    enabled: Boolean(id) && isActivityMatrixOpen,
    refetchInterval: isActivityMatrixOpen ? 3000 : false
  })

  const handleViewDocument = async (docId: string) => {
    if (!id) return;
    try {
      const blob = await clerkGetDocumentContent(id, docId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to view document:', error);
      toast.error('Failed to open document');
    }
  };

  const analysis = analysisQuery.analysis?.analysis
  const isReady = analysis?.status === 'AIAnalysisReady'
  const isActivelyLoading = runAnalysisMutation.isPending || analysisQuery.isPolling
  const lawArticles = analysis?.lawArticles ?? []
  const precedents = useMemo(() => (analysis?.similarPrecedents ?? []).slice(0, 5), [analysis?.similarPrecedents])
  const entitlements = analysis?.entitlementBreakdown ?? []

  // AUTOMATED ANALYSIS TRIGGER: When clerk moves to Phase 3 (viewedIdx === 2), 
  // trigger analysis if it hasn't been started or results are missing.
  useEffect(() => {
    if (viewedIdx === 2 && !isReady && !isActivelyLoading && !analysisRequested) {
      runAnalysisMutation.mutate();
      setAnalysisRequested(true);
    }
  }, [viewedIdx, isReady, isActivelyLoading, analysisRequested, runAnalysisMutation]);

  const handleBatchFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      setSelectedFiles(prev => [...prev, ...Array.from(files)])
    }
  }

  const handleBatchUpload = async () => {
    if (!id) return;
    
    if (selectedFiles.length === 0) {
      setMessageType('error');
      setLocalMessage({ text: 'Validation Error: Please select at least one file to upload.', phase: 1 });
      return;
    }

    if (selectedDocTypes.length === 0) {
      setMessageType('error');
      setLocalMessage({ text: 'Validation Error: Please select at least one document category to proceed with the AI analysis.', phase: 1 });
      return;
    }
    
    setBatchUploading(true)
    const joinedTypes = selectedDocTypes.join(',')
    
    let successCount = 0
    let failureCount = 0
    const errors: string[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      setBatchProgress({ current: i + 1, total: selectedFiles.length })
      try {
        await uploadMutation.mutateAsync({ file: selectedFiles[i], documentType: joinedTypes })
        successCount++
      } catch (err: any) {
        failureCount++
        const errorDetail = err?.response?.data?.detail || "Upload failed";
        errors.push(`${selectedFiles[i].name}: ${errorDetail}`)
      }
    }
    
    setBatchUploading(false)
    setBatchProgress({ current: 0, total: 0 })
    
    // Remove files that were successfully uploaded
    if (successCount > 0) {
      // In a real app, we'd more carefully match which ones succeeded
      // For now, if all succeeded, clear all. If some failed, we keep them in list.
      if (failureCount === 0) {
        setSelectedFiles([])
        setSelectedDocTypes([])
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        // Just filter roughly (this is a simplification)
        setSelectedFiles(prev => prev.slice(successCount))
      }
    }
    
    if (failureCount > 0) {
       setMessageType('error')
       const summary = `Uploaded ${successCount} files. ${failureCount} failed validation.\nErrors:\n${errors.join('\n')}`
       setLocalMessage({ text: summary, phase: 1 })
    } else {
       setMessageType('success')
       setLocalMessage({ text: `${successCount} file${successCount > 1 ? 's' : ''} uploaded and validated successfully.`, phase: 1 })
    }
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
          title: t('judge.assistant.overviewTitle', "Case Overview"),
          insight: t('judge.assistant.overviewInsight', "System has identified a potential labor dispute regarding unpaid salary."),
          actions: [t('judge.assistant.validateStatus', "Validate Party Status"), t('judge.assistant.checkJurisdiction', "Check Jurisdiction")],
          suggestions: [
             i18n.language === 'ar' ? 'لخص وقائع القضية' : 'Summarize case facts',
             i18n.language === 'ar' ? 'من هم أطراف النزاع؟' : 'Identify parties',
             i18n.language === 'ar' ? 'ما هو موضوع الدعوى؟' : 'Case subject matter'
          ]
        };
      case 1:
        return {
          title: t('judge.assistant.evidenceTitle', "Evidence Review"),
          insight: t('judge.assistant.evidenceInsight', "3 core documents uploaded. Salary Record extraction suggests missing payments."),
          actions: [t('judge.assistant.extractSalary', "Extract Salary Data"), t('judge.assistant.analyzeContract', "Analyze Contract Terms")],
          suggestions: [
             i18n.language === 'ar' ? 'ما هي المستندات المقدمة؟' : 'List submitted documents',
             i18n.language === 'ar' ? 'حلل الراتب المستحق' : 'Analyze salary entitlement',
             i18n.language === 'ar' ? 'هل هناك مستندات ناقصة؟' : 'Any missing documents?'
          ]
        };
      case 2:
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
        
        <div className={cn("flex-1 flex flex-col min-w-0 bg-white/40 shadow-inner", i18n.language === 'ar' ? "border-r border-border/40" : "border-l border-border/40")}>
          
      <CaseContextBar
        caseId={id!}
        caseNumber={caseData?.case_number ?? '...'}
        title={caseData?.title ?? ''}
        status={caseData?.status}
        confidence={analysis?.confidence}
        isActivelyLoading={isActivelyLoading}
        isDeleting={deleteMutation.isPending}
        onRunAnalysis={() => { runAnalysisMutation.mutate(undefined as any) }}
        onDelete={() => { deleteMutation.mutate(undefined as any) }}
        onOpenActivity={() => setIsActivityMatrixOpen(true)}
      />
          
          <div className="flex-1 flex flex-col overflow-y-auto">
             <CaseWorkflow 
               viewedIdx={viewedIdx} 
               currentIdx={currentIdx} 
               stages={stages} 
                onStageClick={(idx) => { setLocalMessage(null); setViewedIdx(idx); setChatInput(""); }}
             />


             <div className="px-8 py-8 w-full">
                <div className="max-w-5xl mx-auto space-y-8 pb-32">
                   {viewedIdx === 0 && (
                     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <header className="flex items-center justify-between">
                           <div>
                              <h2 className="text-lg font-black tracking-tight text-foreground uppercase leading-none">{t('judge.workspace.caseOverview', 'Case Overview')}</h2>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2 opacity-50">{t('judge.workspace.caseInfo', 'Case Registry Detail')}</p>
                           </div>
                        </header>

                        {localMessage && localMessage.phase === 0 && (
                          <div className={cn(
                            "p-4 rounded-xl border flex items-center justify-between animate-in zoom-in duration-300 shadow-sm",
                            messageType === 'success' ? "border-primary/30 bg-primary/5" : "border-rose-200 bg-rose-50"
                          )}>
                            <div className="flex items-center gap-3">
                              {messageType === 'success' ? <Sparkles className="w-4 h-4 text-primary animate-pulse"/> : <ActivityIcon className="w-4 h-4 text-rose-600"/>}
                              <span className={cn("text-xs font-bold", messageType === 'success' ? "text-foreground" : "text-rose-900 line-clamp-2")}>{localMessage.text}</span>
                            </div>
                            <button onClick={() => setLocalMessage(null)} className="p-1 hover:bg-primary/10 rounded-md transition-colors">
                              <XIcon className="w-4 h-4 text-muted-foreground"/>
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                           <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-3 group hover:border-primary/20 transition-all h-[110px]">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-primary opacity-30"/>
                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{t('judge.workspace.caseTitle', 'Case Title')}</span>
                              </div>
                              <p className="text-[13px] font-bold text-foreground leading-tight line-clamp-2">{caseData?.title}</p>
                           </div>
                           <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-3 group hover:border-primary/20 transition-all h-[110px]">
                              <div className="flex items-center gap-2">
                                <Terminal className="w-3.5 h-3.5 text-primary opacity-30"/>
                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{t('judge.workspace.refId', 'Reference ID')}</span>
                              </div>
                              <p className="text-[13px] font-black font-mono text-primary truncate leading-none mt-1">{caseData?.case_number}</p>
                           </div>
                           <div className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-3 group hover:border-primary/20 transition-all h-[110px]">
                              <div className="flex items-center gap-2">
                                <Scale className="w-3.5 h-3.5 text-primary opacity-30"/>
                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{t('judge.workspace.claimValue', 'Claim Value')}</span>
                              </div>
                              <p className="text-sm font-black text-foreground leading-none mt-1">
                                {(() => {
                                  const rawVal = String(caseData?.claim_amount || '0').replace(/,/g, '');
                                  const val = Number(rawVal);
                                  return isNaN(val) ? 'AED 0.00' : `AED ${val.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;
                                })()}
                              </p>
                           </div>
                        </div>

                        <div className="grid grid-cols-12 gap-6 items-stretch">
                           <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
                              <section className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col gap-4 flex-1">
                                 <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2 opacity-60">
                                    <HistoryIcon className="w-3 h-3"/> {t('judge.workspace.background', 'Case Background')}
                                 </h3>
                                 <div className="p-5 bg-[#FBFBF9] rounded-xl border border-border/40 relative overflow-hidden flex-1 group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                                    <p className="text-xs font-semibold leading-relaxed text-foreground/70 italic antialiased">
                                      {caseData?.description || t('judge.workspace.noBackground', 'No contextual narrative provided.')}
                                    </p>
                                 </div>
                              </section>

                              <div className="grid grid-cols-3 gap-4">
                                 {[
                                   { label: t('judge.workspace.courtRef', 'Court Ref'), val: caseData?.court_number || 'DIFC-JUDICIAL', icon: LayoutDashboard },
                                   { label: t('judge.workspace.filingDate', 'Filing Date'), val: caseData?.filing_date ? new Date(caseData.filing_date).toLocaleDateString() : 'N/A', icon: HistoryIcon },
                                   { label: t('judge.workspace.caseType', 'Case Type'), val: caseData?.case_type?.replace(/_/g, ' ') || 'LABOR', icon: Gavel }
                                 ].map((item, i) => (
                                   <div key={i} className="p-4 bg-white rounded-2xl border border-border shadow-sm flex flex-col gap-2 group hover:border-primary/20 transition-all">
                                      <item.icon className="w-3.5 h-3.5 text-primary/30 group-hover:text-primary transition-colors"/>
                                      <div>
                                         <p className="text-[8px] font-black uppercase text-muted-foreground/40 mb-0.5 tracking-widest">{item.label}</p>
                                         <p className="text-[10px] font-black text-foreground uppercase tracking-tight truncate">{item.val}</p>
                                      </div>
                                   </div>
                                 ))}
                              </div>
                           </div>

                           <div className="col-span-12 lg:col-span-4">
                              <section className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col gap-6 h-full relative group overflow-hidden">
                                 <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <User className="w-8 h-8 text-primary"/>
                                 </div>
                                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{t('judge.workspace.parties', 'Litigation Parties')}</h3>
                                 <div className="space-y-6 mt-2">
                                    <div className="space-y-1">
                                       <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">{t('judge.workspace.claimant', 'Claimant')}</p>
                                       <p className="text-sm font-bold tracking-tight text-foreground">{caseData?.claimant_name}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                       <div className="h-px bg-border/60 flex-1"/>
                                       <span className="text-[7px] font-black uppercase tracking-[0.5em] text-muted-foreground/20">V</span>
                                       <div className="h-px bg-border/60 flex-1"/>
                                    </div>
                                    <div className="space-y-1">
                                       <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{t('judge.workspace.respondent', 'Respondent')}</p>
                                       <p className="text-sm font-bold tracking-tight text-foreground leading-tight">{caseData?.respondent_name}</p>
                                    </div>
                                 </div>
                              </section>
                           </div>
                        </div>
                     </div>
                   )}

                   {viewedIdx === 1 && (
                      <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
                        <header className="flex items-center justify-between">
                            <div>
                               <h2 className="text-lg font-black tracking-tight text-foreground uppercase leading-none">{t('judge.workspace.evidenceUpload', 'Evidence Upload')}</h2>
                               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2 opacity-50">{t('judge.workspace.discoveryInventory', 'Discovery Inventory Control')}</p>
                            </div>
                        </header>

                        <DocumentsPanel
                          documents={documentsQuery.data?.items ?? []}
                          isActivelyLoading={isActivelyLoading}
                          isReady={isReady}
                          caseTitle={caseData?.title ?? undefined}
                          caseDescription={caseData?.description ?? undefined}
                          selectedFiles={selectedFiles}
                          setSelectedFiles={setSelectedFiles}
                          selectedDocTypes={selectedDocTypes}
                          setSelectedDocTypes={setSelectedDocTypes}
                          batchFileInputRef={fileInputRef}
                          onBatchFileSelect={handleBatchFileSelect}
                          onBatchUpload={handleBatchUpload}
                          isBatchUploading={batchUploading}
                          batchProgress={batchProgress}
                          onDeleteDocument={(docId) => deleteDocumentMutation.mutate(docId)}
                          isDeletingDocument={deleteDocumentMutation.isPending ? deleteDocumentMutation.variables as string : null}
                          onViewDocument={handleViewDocument}
                          notification={localMessage && localMessage.phase === 1 ? {
                            text: localMessage.text,
                            type: messageType,
                            onClear: () => setLocalMessage(null)
                          } : undefined}
                        />
                      </div>
                   )}

                   {viewedIdx === 2 && (
                     <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
                        <header className="flex items-center justify-between">
                            <div>
                               <h2 className="text-lg font-black tracking-tight text-foreground uppercase leading-none">{t('judge.workspace.aiAnalysis', 'AI Analysis')}</h2>
                               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2 opacity-50">{t('judge.workspace.intelligenceCenter', 'Neural Reasoning Engine')}</p>
                            </div>
                        </header>

                        {localMessage && localMessage.phase === 2 && (
                          <div className={cn(
                            "p-4 rounded-xl border flex items-center justify-between animate-in zoom-in duration-300 shadow-sm",
                            messageType === 'success' ? "border-primary/30 bg-primary/5" : "border-rose-200 bg-rose-50"
                          )}>
                            <div className="flex items-center gap-3">
                              {messageType === 'success' ? <Sparkles className="w-4 h-4 text-primary animate-pulse"/> : <ActivityIcon className="w-4 h-4 text-rose-600"/>}
                              <span className={cn("text-xs font-bold", messageType === 'success' ? "text-foreground" : "text-rose-900")}>{localMessage.text}</span>
                            </div>
                            <button onClick={() => setLocalMessage(null)} className="p-1 hover:bg-primary/10 rounded-md transition-colors">
                              <XIcon className="w-4 h-4 text-muted-foreground"/>
                            </button>
                          </div>
                        )}

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
                          onViewDocument={handleViewDocument}
                        />
                        {!isReady && !isActivelyLoading && (
                          <div className="mt-8 text-center p-12 bg-white border border-dashed border-border/80 rounded-2xl shadow-inner w-full flex flex-col items-center gap-6">
                             <div className="w-20 h-20 bg-primary/5 border border-primary/10 rounded-3xl flex items-center justify-center">
                                <BrainCircuit className="w-10 h-10 text-primary animate-pulse"/>
                             </div>
                             <div>
                                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{t('judge.workspace.runAnalysis', 'Initialize Analysis')}</h3>
                                <p className="text-xs font-semibold text-muted-foreground mt-2 opacity-60 antialiased max-w-sm mx-auto">Activate the Cylix reasoning engine for deep case analysis.</p>
                             </div>
                             <Button 
                               className="h-12 px-10 bg-primary text-on-primary rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-[11px]"
                               onClick={() => runAnalysisMutation.mutate()}
                             >
                                <Sparkles className="w-3.5 h-3.5 mr-2.5"/> {t('judge.workspace.runAnalysis', 'Execute Intelligence Node')}
                             </Button>
                          </div>
                        )}
                        {isReady && !isActivelyLoading && (
                          <div className="mt-12 text-center flex flex-col items-center gap-6">
                             <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center text-[var(--primary)] mb-2">
                                <CheckCircle2 className="w-8 h-8"/>
                             </div>
                             <div>
                               <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{t('clerk.analysis.ready', 'AI Case Analysis Complete')}</h3>
                               <p className="text-xs font-semibold text-muted-foreground mt-2 opacity-60">Verified legal insights are now available. Proceed to judge allocation.</p>
                             </div>
                             <Button 
                               className="h-12 px-10 bg-primary text-on-primary rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-[11px]"
                               onClick={() => navigate('/clerk/assignments')}
                             >
                               {t('clerk.analysis.returnToList', 'Proceed to Assignment')} <ArrowRight className="ml-2 w-4 h-4"/>
                             </Button>
                          </div>
                        )}
                     </div>
                   )}

                   {(viewedIdx < 0 || viewedIdx > 2) && (
                     <div className="p-12 text-center text-muted-foreground opacity-30 italic">
                        Select a phase to continue...
                     </div>
                   )}
                </div>
             </div>

             {/* Activity Log Overlay */}
             {isActivityMatrixOpen && (
               <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
                 <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsActivityMatrixOpen(false)} />
                 <div className="relative w-full max-w-xl h-full shadow-2xl">
                   <ActivityLogMatrix 
                     logs={auditLogsQuery.data || []} 
                     onClose={() => setIsActivityMatrixOpen(false)} 
                     isOpen={isActivityMatrixOpen}
                     isLoading={auditLogsQuery.isLoading}
                   />
                 </div>
               </div>
             )}

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

                <Button
                  className={cn("h-10 px-6 text-[10px] font-black uppercase tracking-widest bg-primary text-on-primary rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all", viewedIdx === 2 && !isReady ? "opacity-30 pointer-events-none" : "")}
                  onClick={() => { 
                    if (viewedIdx === 2) {
                      navigate('/clerk/assignments');
                    } else {
                      // Trigger Analysis when moving to Phase 3
                      if (viewedIdx === 1 && !isReady && !isActivelyLoading) {
                        runAnalysisMutation.mutate();
                      }
                      setLocalMessage(null); 
                      setViewedIdx(prev => Math.min(2, prev + 1)); 
                      setChatInput(""); 
                    }
                  }}
                >
                  {viewedIdx === 2 ? t('common.complete', 'Proceed to Assignment') : (stages[viewedIdx + 1]?.label || t('common.complete', 'Next'))} <ArrowRight className="w-3.5 h-3.5 ml-2"/>
                </Button>
             </div>
          </div>
        </div>

        <aside className={cn(
          "h-full bg-white transition-all duration-500 flex flex-col relative shrink-0",
          i18n.language === 'ar' ? "border-r border-border" : "border-l border-border",
          isAiPanelOpen ? "w-[420px] opacity-100" : "w-0 opacity-0 overflow-hidden"
        )}>
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
                  className={cn("absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-border/40 rounded-l-xl flex items-center justify-center hover:bg-muted transition-all shadow-md group", i18n.language === 'ar' ? "right-[-6px] rounded-r-xl rounded-l-none" : "left-[-6px]")}
                  title={t('common.close', 'Close')}
                >
                  <XIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all group-hover:scale-125"/>
                </button>
             </header>

             <div className="flex-1 overflow-y-auto w-full flex flex-col">
                <div className="p-6 bg-primary/5 border-b border-border/40 relative overflow-hidden shrink-0 group">
                   <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                   <p className="text-[8px] font-black uppercase tracking-[0.25em] text-primary opacity-60 mb-3">{t('judge.assistant.synthesis', 'Strategic Analysis')}</p>
                   <p className="text-[12px] font-bold italic leading-relaxed text-foreground antialiased">
                     &ldquo;{assistant.insight}&rdquo;
                   </p>
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
                    <section className="flex flex-col flex-1 min-h-[300px]">
                       <h4 className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.25em] mb-4">{t('judge.assistant.dialogue', 'Reasoning Dialogue')}</h4>
                       <div className="flex-1 space-y-5 overflow-y-auto pr-1 pb-6">
                          {chatHistory.length === 0 ? (
                            <div className="flex gap-3 animate-in fade-in duration-500">
                               <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                  <Sparkles className="w-3.5 h-3.5 text-primary"/>
                               </div>
                               <div className={cn("bg-[#F8F8F5] p-3.5 rounded-2xl border border-border/40 shadow-sm flex-1", i18n.language === 'ar' ? "rounded-tr-none" : "rounded-tl-none")}>
                                  <p className="text-[11px] font-semibold text-foreground/70 leading-relaxed italic antialiased">
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
