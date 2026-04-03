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
 Gavel,
 FileText,
 Upload,
 BrainCircuit,
 MessagesSquare,
 Check,
 ChevronRight,
 ChevronLeft,
 TrendingUp,
 Info,
 Scale,
 User,
 History as HistoryIcon,
 ArrowRight,
 ArrowLeft,
 Terminal,
 Verified,
 PanelRightClose,
 PanelRight,
 LayoutDashboard,
 PlayCircle
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
 <div className="w-full px-12 py-10 bg-[var(--bg-card)] border-b border-border shadow-[0_4px_30px_rgba(0,0,0,0.01)] relative z-10">
 <div className="max-w-7xl mx-auto flex items-start justify-between relative pl-6">
 {/* Continuous background line */}
 <div className="absolute top-5 left-10 right-10 h-[2px] bg-muted/40 z-0"/>
 
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
"text-[9px] font-black tracking-[0.2em] uppercase mb-1.5 transition-colors", 
 isViewed ?"text-[var(--primary)]": isReached ?"text-[var(--primary)]/60":"text-muted-foreground/30"
 )}>
 Phase {stage.id}
 </p>
 <p className={cn(
"text-[11px] font-bold uppercase tracking-tight w-28 truncate transition-colors", 
 isViewed ?"text-foreground": isReached ?"text-foreground/70":"text-muted-foreground/40"
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
 <h2 className="text-xl font-black tracking-tighter text-foreground uppercase leading-none">Judge Feedback</h2>
 <p className="text-[10px] font-black text-[var(--primary)]/70 uppercase tracking-[0.2em] mt-1.5">Rate AI Performance</p>
 </div>
 </header>
 
 <div className="grid grid-cols-12 gap-10">
 <div className="col-span-12 lg:col-span-5 space-y-8 pr-6 border-r border-border/40">
 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-6">Quantitative Metrics</h3>
 {['legal_relevance_score', 'reasoning_quality_score', 'explanation_clarity_score'].map((field) => (
 <div key={field} className="space-y-3">
 <div className="flex justify-between items-center">
 <label className="text-[11px] font-bold uppercase tracking-tight text-foreground">{field.replace(/_/g, ' ')}</label>
 <span className="text-[10px] font-black tracking-[0.1em] px-2 py-1 bg-[var(--bg-surface)] border border-border/80 rounded-md text-[var(--primary)]">
 {(feedback as any)[field]}/10
 </span>
 </div>
 <div className="relative pt-2">
 <input 
 type="range"min="1"max="10"
 className="w-full accent-[var(--primary)] h-1 bg-muted rounded-full appearance-none cursor-pointer"
 value={(feedback as any)[field]}
 onChange={(e) => setFeedback({...feedback, [field]: parseInt(e.target.value)})}
 />
 </div>
 </div>
 ))}
 </div>

 <div className="col-span-12 lg:col-span-7 flex flex-col h-full">
 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-6">Qualitative Analysis</h3>
 <div className="flex-1 flex flex-col gap-6">
 <textarea 
 className="w-full flex-1 min-h-[160px] p-5 bg-[var(--bg-surface)] border border-border/80 rounded-xl text-sm font-medium focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all placeholder:italic placeholder:opacity-50"
 placeholder="Log anomalies, edge cases, or override justifications here..."
 value={feedback.feedback_text}
 onChange={(e) => setFeedback({...feedback, feedback_text: e.target.value})}
 />
 <Button 
 className="w-full h-12 bg-[var(--primary)] text-white font-black uppercase tracking-[0.15em] text-[11px] rounded-xl hover:bg-[var(--primary-hover)] transition-all shadow-md shadow-[var(--primary)]/10 shrink-0"
 onClick={() => onSubmit(feedback)}
 >
 Submit Feedback
 </Button>
 </div>
 </div>
 </div>
 </div>
 );
};

const CaseDetail = () => {
 const { t } = useTranslation()
 const queryClient = useQueryClient()
 const { id } = useParams<{ id: string }>()
 const navigate = useNavigate()

 const [selectedDocType, setSelectedDocType] = useState<DocumentType>('other')
 const [selectedFile, setSelectedFile] = useState<File | null>(null)
 const fileInputRef = useRef<HTMLInputElement | null>(null)
 const [analysisRequested, setAnalysisRequested] = useState(false)
 const [localMessage, setLocalMessage] = useState('')
 const [messageType, setMessageType] = useState<'success' | 'error'>('success')

 const [viewedIdx, setViewedIdx] = useState(0)
 const [isAiPanelOpen, setIsAiPanelOpen] = useState(true)

 const stages = [
 { id: 1, label: 'Case Creation', sub: 'Details confirmation', icon: FileText, statuses: ['Created'] },
 { id: 2, label: 'Evidence Upload', sub: 'Documents & Evidence', icon: Upload, statuses: ['DocumentsUploaded'] },
 { id: 3, label: 'AI - Analysis', sub: 'Research & Synthesis', icon: BrainCircuit, statuses: ['AIAnalysisPending', 'AIAnalysisReady'] },
 { id: 4, label: 'Judicial Review', sub: 'Judgment drafting', icon: Gavel, statuses: ['DraftGenerated'] },
 { id: 5, label: 'Feedback', sub: 'Outcome learning', icon: MessagesSquare, statuses: ['Finalized'] },
 ];

 const caseQuery = useQuery({
 queryKey: ['judge-case', id],
 queryFn: () => getCase(id as string),
 enabled: Boolean(id),
 })

 useEffect(() => {
 setViewedIdx(0)
 }, [id])

 const currentIdx = useMemo(() => {
 const status = caseQuery.data?.status || 'Created';
 const idx = stages.findIndex(s => s.statuses.includes(status));
 return idx === -1 ? (status === 'Finalized' ? 4 : 0) : idx;
 }, [caseQuery.data?.status, stages]);

 const documentsQuery = useQuery({
 queryKey: ['case-documents', id],
 queryFn: () => getCaseDocuments(id as string),
 enabled: Boolean(id),
 })

 const shouldPoll = analysisRequested || caseQuery.data?.status === 'AIAnalysisPending';
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
 setLocalMessage(t('judge.workspace.uploadSuccess'))
 setSelectedFile(null)
 },
 onError: (error) => {
 setMessageType('error')
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
 setLocalMessage(t('common.error'))
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
 mutationFn: (payload: any) => submitFeedback(id as string, payload),
 onSuccess: () => {
 setMessageType('success')
 setLocalMessage('Feedback submitted successfully.')
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

 const handleFinalize = async (payload: any) => {
 await finalizeMutation.mutateAsync({
 judgment_text: payload.judgmentText,
 decision: payload.decision,
 compensation_amount: payload.compensationAmount,
 reasoning: payload.reasoning,
 legal_precedents: precedents.map(p => p.caseId),
 articles_cited: lawArticles.map((a: any) => typeof a === 'string' ? a : a.title),
 })
 }

 const getAssistantContent = () => {
 switch (viewedIdx) {
 case 0:
 return {
 title:"Case Overview",
 insight:"Detecting party mapping. Claimant indicates possible labor breach under Federal Law.",
 actions: ["Verify Claimant ID","Check Respondent License","Scan for conflict of interest"]
 };
 case 1:
 return {
 title:"Upload Documents",
 insight:"Missing Notice Period notification. Recommend scanning for email correspondence exhibits.",
 actions: ["Scan PDF OCR","Cross-link Exhibits","Check Signature Validity","Identify Labor Contract"]
 };
 case 2:
 return {
 title:"AI Analysis",
 insight:"94% alignment with DIFC-2022-04. Statutory interest calculation initialized.",
 actions: ["Export Precedents","Verify Entitlements","Launch Research Node","Simulate Outcome"]
 };
 case 3:
 return {
 title:"Judgment Review",
 insight:"Judgment logic consistent with Article 144. Suggest adding Article 146 citation.",
 actions: ["Critique Reasoning","Check Consistency","Inject Law Article","Review Quantum"]
 };
 case 4:
 return {
 title:"Feedback",
 insight:"Your feedback will refine Node 4.0.2 grounding for wrongful termination cases.",
 actions: ["Analyze Feedback","Export Learning","Finalize Audit","Recalibrate AI Node"]
 };
 default:
 return {
 title:"Cylix Assistant",
 insight:"Awaiting workspace context. Reasoning node active in background.",
 actions: ["Search case history","Common precedents"]
 };
 }
 };

 const assistant = getAssistantContent();

 if (caseQuery.isLoading) {
 return (
 <PortalLayout title="Case Orchestrator"hideHeaderContent>
 <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
 <div className="w-16 h-16 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin"/>
 <p className="text-xs font-black uppercase tracking-[.3em] text-[var(--primary)]/60">Initializing Judicial Node...</p>
 </div>
 </PortalLayout>
 )
 }

 return (
 <PortalLayout title="Case Orchestrator"hideHeaderContent>
 <div className="flex h-[calc(100vh-64px)] -m-6 overflow-hidden bg-[var(--bg-surface)]">
 
 {/* MAIN WORKSPACE CONTENT */}
 <div className="flex-1 flex flex-col overflow-hidden relative">
 
 <CaseContextBar
 caseNumber={caseQuery.data?.case_number ?? id ?? ''}
 title={caseQuery.data?.title ?? ''}
 status={caseQuery.data?.status}
 confidence={analysis?.confidence || 0}
 isActivelyLoading={isActivelyLoading}
 onRunAnalysis={() => runAnalysisMutation.mutate()}
 onFinalize={() => setViewedIdx(3)}
 onDelete={() => deleteMutation.mutate()}
 isDeleting={deleteMutation.isPending}
 />

 <div className="flex-1 overflow-y-auto scrollbar-hide">
 <CaseWorkflow 
 viewedIdx={viewedIdx} 
 currentIdx={currentIdx} 
 stages={stages} 
 onStageClick={(idx) => setViewedIdx(idx)} 
 />

 {localMessage && (
 <div className="mx-10 mt-10 p-5 rounded-2xl border flex items-center gap-4 animate-in fade-in bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)] shadow-[0_4px_20px_rgba(16,185,129,0.05)]">
 <CheckCircle2 className="w-6 h-6"/>
 <div>
 <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Update</p>
 <span className="font-black text-xs uppercase tracking-tight">{localMessage}</span>
 </div>
 </div>
 )}

 <div className="px-10 py-10">
 
 {/* STAGE 1: CASE CREATION DETAILS */}
 {viewedIdx === 0 && (
 <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <header className="flex items-center gap-6 pb-2">
 <div className="w-16 h-16 bg-[var(--bg-card)] border border-border shadow-2xl rounded-[1.75rem] flex items-center justify-center text-[var(--primary)]">
 <Scale className="w-8 h-8"/>
 </div>
 <div>
 <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">Case Details</h2>
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-3 bg-muted/40 w-fit px-3 py-1 rounded-full border border-border/40">Case Information</p>
 </div>
 </header>

 <div className="grid grid-cols-12 gap-10">
 <div className="col-span-8 bg-[var(--bg-card)] p-12 rounded-[3.5rem] shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-border/80 space-y-12">
 <section className="grid grid-cols-2 gap-14">
 <div className="space-y-4">
 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Case Title</label>
 <p className="text-xl font-black text-foreground leading-tight tracking-tight uppercase underline decoration-emerald-600/20 underline-offset-8 decoration-2">{caseQuery.data?.title}</p>
 </div>
 <div className="space-y-4">
 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Case ID</label>
 <div className="flex items-center gap-3">
 <Terminal className="w-4 h-4 text-[var(--primary)]"/>
 <p className="text-xl font-bold font-mono tracking-tighter text-foreground">{caseQuery.data?.case_number}</p>
 </div>
 </div>
 </section>
 
 <div className="h-px bg-muted/60"/>

 <section className="space-y-6">
 <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] flex items-center gap-3">
 <HistoryIcon className="w-4 h-4"/> Case Background
 </label>
 <div className="p-10 bg-[var(--bg-surface)] rounded-[2.5rem] border border-[var(--border-color)] relative overflow-hidden group">
 <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)] opacity-20"/>
 <p className="text-sm font-semibold leading-relaxed text-foreground/80 italic">
 {caseQuery.data?.description || 'Synchronizing procedural background... No legacy data detected.'}
 </p>
 </div>
 </section>

 <section className="grid grid-cols-3 gap-8 pt-4">
 {[
 { label: 'Court Ref', val: caseQuery.data?.court_number || 'DIFC-MAIN', icon: LayoutDashboard },
 { label: 'Filing Date', val: caseQuery.data?.filing_date ? new Date(caseQuery.data.filing_date).toDateString() : 'N/A', icon: HistoryIcon },
 { label: 'Case Type', val: caseQuery.data?.case_type?.replace(/_/g, ' ') || 'OTHER', icon: Gavel }
 ].map((item, i) => (
 <div key={i} className="p-6 bg-muted/10 rounded-3xl border border-border/20 flex flex-col gap-3 group hover:border-[var(--primary)]/20 transition-all duration-300">
 <item.icon className="w-4 h-4 text-[var(--primary)]/40 group-hover:text-[var(--primary)] transition-colors"/>
 <div>
 <p className="text-[9px] font-black uppercase text-muted-foreground opacity-40 mb-1 tracking-widest">{item.label}</p>
 <p className="text-xs font-black text-foreground uppercase tracking-tight truncate">{item.val}</p>
 </div>
 </div>
 ))}
 </section>
 </div>

 <div className="col-span-4 space-y-8">
 <div className="bg-[var(--bg-card)] p-12 rounded-[3.5rem] shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-border/80 relative overflow-hidden group">
 <div className="absolute bottom-[-10%] right-[-10%] w-40 h-40 bg-[var(--primary)]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[var(--primary)]/10 transition-colors duration-700"/>
 <h3 className="text-[10px] font-black uppercase tracking-[.25em] text-[var(--primary)] mb-10 flex items-center gap-3">
 <User className="w-4 h-4"/> Parties
 </h3>
 <div className="space-y-10 relative z-10">
 <div className="space-y-3">
 <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Claimant</p>
 <p className="text-xl font-black tracking-tighter text-foreground uppercase">{caseQuery.data?.claimant_name}</p>
 </div>
 <div className="w-full flex items-center gap-4">
 <div className="h-px bg-muted/60 flex-1"/>
 <span className="text-[8px] font-black uppercase tracking-[.4em] opacity-30">VS</span>
 <div className="h-px bg-muted/60 flex-1"/>
 </div>
 <div className="space-y-3">
 <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Respondent</p>
 <p className="text-xl font-black tracking-tighter text-foreground uppercase">{caseQuery.data?.respondent_name}</p>
 </div>
 </div>
 </div>

 <div className="bg-[var(--bg-card)] p-10 rounded-[3rem] border border-border/80 shadow-[0_4px_30px_rgba(0,0,0,0.02)] hover:border-[var(--primary)]/30 transition-all duration-300">
 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block mb-6">Claim Amount</label>
 <p className="text-4xl font-black text-foreground tracking-tighter tabular-nums">{caseQuery.data?.claim_amount || 'AED 0,00'}</p>
 <div className="mt-6 flex items-center gap-3 text-[var(--primary)] py-2 px-4 bg-[var(--primary)]/10 w-fit rounded-full border border-[var(--primary)]/20">
 <TrendingUp className="w-4 h-4 shrink-0"/>
 <span className="text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Claim Priority: HIGH</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* STAGE 2: EVIDENCE UPLOAD */}
 {viewedIdx === 1 && (
 <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
 <header className="flex items-center gap-6 mb-12">
 <div className="w-16 h-16 bg-[var(--bg-card)] border border-border shadow-2xl rounded-[1.75rem] flex items-center justify-center text-[var(--primary)]">
 <Upload className="w-8 h-8"/>
 </div>
 <div>
 <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">Upload Documents</h2>
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-3 bg-muted/40 w-fit px-3 py-1 rounded-full border border-border/40">Case File Storage</p>
 </div>
 </header>
 <div className="bg-[var(--bg-card)] p-12 rounded-[4rem] shadow-sm border border-border/80">
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

 {/* STAGE 3: AI ANALYSIS */}
 {viewedIdx === 2 && (
 <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
 <IntelligenceCenter
 analysis={analysis}
 caseId={id ?? ''}
 lawArticles={lawArticles}
 precedents={precedents}
 />
 {!isReady && !isActivelyLoading && (
 <div className="mt-12 text-center p-24 bg-[var(--bg-card)] border-2 border-dashed border-border/80 rounded-[4rem] shadow-inner max-w-4xl mx-auto group hover:border-[var(--primary)]/30 transition-all">
 <div className="w-24 h-24 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 group-hover:scale-110 transition-transform">
 <BrainCircuit className="w-12 h-12 text-[var(--primary)] animate-pulse"/>
 </div>
 <h3 className="text-3xl font-black text-foreground uppercase tracking-tight">Run AI Analysis</h3>
 <p className="text-sm font-bold text-muted-foreground mt-6 italic max-w-lg mx-auto opacity-70">Activate the Cylix synthesis engine to perform high-precision cross-statutory reconciliation and automated precedent discovery across the regional judicial database.</p>
 <Button 
 className="mt-12 h-16 px-14 bg-[var(--primary)] text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30 hover:bg-[var(--primary-hover)] hover:scale-105 active:scale-95 transition-all"
 onClick={() => runAnalysisMutation.mutate()}
 >
 <Sparkles className="w-4 h-4 mr-3"/> Run AI Analysis
 </Button>
 </div>
 )}
 </div>
 )}

 {/* STAGE 4: JUDICIAL REVIEW */}
 {viewedIdx === 3 && (
 <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
 <header className="flex items-center gap-6 mb-12">
 <div className="w-16 h-16 bg-[var(--bg-card)] border border-border shadow-2xl rounded-[1.75rem] flex items-center justify-center text-[var(--primary)]">
 <Gavel className="w-8 h-8"/>
 </div>
 <div>
 <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase leading-none">Draft Determination</h2>
 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-3 bg-muted/40 w-fit px-3 py-1 rounded-full border border-border/40">Manual Precision Calibration</p>
 </div>
 </header>
 <div className="bg-[var(--bg-card)] p-12 rounded-[4rem] shadow-sm border border-border/80 overflow-hidden">
 <JudgmentEditor
 draftText={analysis?.draftText ?? caseQuery.data?.judgment_text ?? ''}
 confidence={analysis?.confidence ?? 0}
 isSubmitting={finalizeMutation.isPending}
 caseNumber={caseQuery.data?.case_number}
 claimantName={caseQuery.data?.claimant_name ?? ''}
 respondentName={caseQuery.data?.respondent_name ?? ''}
 filingDate={caseQuery.data?.filing_date ?? ''}
 lawArticles={analysis?.lawArticles?.map((a: any) => typeof a === 'object' ? a.title : String(a))}
 precedents={precedents.map(p => p.title)}
 outcome={analysis?.outcome}
 onRegenerate={async () => { await runAnalysisMutation.mutateAsync() }}
 onFinalize={handleFinalize}
 />
 </div>
 </div>
 )}

 {/* STAGE 5: FEEDBACK */}
 {viewedIdx === 4 && (
 <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
 <FeedbackForm 
 caseId={id!} 
 onSubmit={async (data) => { await feedbackMutation.mutateAsync(data) }} 
 />
 </div>
 )}
 </div>
 </div>

 {/* PERSISTENT FOOTER - Static, neat, clean */}
 <div className="border-t border-border bg-[var(--bg-card)]">
 <div className="max-w-7xl mx-auto flex items-center justify-between h-20 px-10">
 
 {/* Back */}
 <Button
 variant="outline"
 className="h-11 px-7 rounded-xl gap-2 font-black uppercase tracking-widest disabled:opacity-20 transition-all border-border hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] text-[11px]"
 disabled={viewedIdx === 0}
 onClick={() => setViewedIdx(prev => Math.max(0, prev - 1))}
 >
 <ArrowLeft className="w-4 h-4"/>
 {stages[viewedIdx - 1]?.label || 'Back'}
 </Button>

 {/* Center: Stage dots + AI toggle */}
 <div className="flex items-center gap-6">
 <div className="flex gap-2 items-center">
 {stages.map((_, i) => (
 <button
 key={i}
 className={cn(
"h-1.5 rounded-full transition-all duration-500 ease-out",
 i === viewedIdx ?"bg-[var(--primary)] w-8":
 i < currentIdx ?"bg-emerald-400 w-5":
"bg-muted w-5"
 )}
 onClick={() => i <= currentIdx && setViewedIdx(i)}
 />
 ))}
 </div>
 <button
 className={cn(
"w-11 h-11 rounded-xl transition-all duration-300 border flex items-center justify-center",
 isAiPanelOpen
 ?"bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-emerald-500/20"
 :"bg-[var(--bg-card)] border-border text-muted-foreground hover:border-[var(--primary)]/30 hover:text-[var(--primary)]"
 )}
 onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
 >
 {isAiPanelOpen ? <PanelRightClose className="w-5 h-5"/> : <Sparkles className="w-5 h-5"/>}
 </button>
 </div>

 {/* Next */}
 <Button
 disabled={viewedIdx === 4 || viewedIdx > currentIdx}
 className="h-11 px-8 rounded-xl gap-2 bg-[var(--primary)] text-white font-black uppercase tracking-widest shadow-md shadow-emerald-500/20 hover:bg-[var(--primary-hover)] hover:scale-105 active:scale-95 transition-all text-[11px]"
 onClick={() => setViewedIdx(prev => Math.min(4, prev + 1))}
 >
 {stages[viewedIdx + 1]?.label || 'Complete'} <ArrowRight className="w-4 h-4"/>
 </Button>
 </div>
 </div>
 </div>

 {/* CONTEXTUAL AI ASSISTANT PANEL */}
 <aside
 className={cn(
"h-full border-l border-border bg-[var(--bg-card)] transition-all duration-500 overflow-hidden flex flex-col",
 isAiPanelOpen ?"w-[400px] opacity-100":"w-0 opacity-0"
 )}
 >
 {/* Assistant Header */}
 <div className="p-6 border-b border-border flex justify-between items-center bg-[var(--bg-surface)] shrink-0">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-[var(--primary)] rounded-xl shadow-md shadow-emerald-500/20">
 <Sparkles className="w-4 h-4 text-white"/>
 </div>
 <div>
 <h3 className="text-xs font-black tracking-tight uppercase leading-none">{assistant.title}</h3>
 <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest mt-1.5">Precision Node Active</p>
 </div>
 </div>
 <button onClick={() => setIsAiPanelOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
 <ChevronRight className="w-4 h-4 text-muted-foreground"/>
 </button>
 </div>

 {/* Insight Card */}
 <div className="p-6 border-b border-border bg-[var(--primary)] text-white relative overflow-hidden shrink-0">
 <div className="absolute -right-10 -top-10 w-36 h-36 bg-white/10 rounded-full blur-3xl pointer-events-none"/>
 <p className="text-[9px] font-black uppercase tracking-[.25em] mb-3 opacity-60">Strategic Synthesis</p>
 <h4 className="text-[13px] font-bold italic leading-relaxed tracking-tight">
 &ldquo;{assistant.insight}&rdquo;
 </h4>
 <div className="flex items-center gap-2 mt-4 p-2 bg-white/10 rounded-xl border border-white/10 w-fit">
 <Verified className="w-3.5 h-3.5 text-white"/>
 <span className="text-[9px] font-black uppercase tracking-widest">Grounding Standard: 4.2.0</span>
 </div>
 </div>

 {/* Scrollable body */}
 <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
 {/* Phase Actions */}
 <div className="space-y-4">
 <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-50">Phase Protocols</h4>
 <div className="flex flex-col gap-3">
 {assistant.actions.map((action, i) => (
 <button
 key={i}
 className="w-full text-left p-4 bg-muted/20 hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/20 group rounded-2xl border border-border/60 transition-all flex items-center justify-between"
 >
 <span className="text-[11px] font-black text-foreground group-hover:text-[var(--primary)] uppercase tracking-tight">{action}</span>
 <div className="p-1.5 bg-[var(--bg-card)] group-hover:bg-[var(--primary)]/10 rounded-lg border border-border/40 transition-colors">
 <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[var(--primary)] transition-colors"/>
 </div>
 </button>
 ))}
 </div>
 </div>

 {/* Mini Dialogue */}
 <div className="space-y-4">
 <h4 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-50">Reasoning Dialogue</h4>
 <div className="space-y-4">
 <div className="flex gap-3">
 <div className="w-8 h-8 rounded-xl bg-[var(--bg-card)] flex items-center justify-center shrink-0 border border-border"><User className="w-4 h-4 text-muted-foreground"/></div>
 <div className="bg-muted/20 p-4 rounded-2xl rounded-tl-none border border-border/40 text-xs font-bold text-foreground/70 leading-relaxed italic">
"Synthesize phase findings against the labor statute corpus."
 </div>
 </div>
 <div className="flex gap-3">
 <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center shrink-0 shadow-sm"><Sparkles className="w-4 h-4 text-white"/></div>
 <div className="bg-[var(--primary)]/10 p-4 rounded-2xl rounded-tl-none border border-[var(--primary)]/20 text-xs font-bold text-foreground/80 leading-relaxed">
 High consistency detected with Dubai Court of First Instance precedents.
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Input footer */}
 <div className="p-5 border-t border-border bg-[var(--bg-surface)] shrink-0">
 <div className="relative">
 <input
 type="text"
 placeholder="Ask Cylix..."
 className="w-full bg-[var(--bg-card)] border border-border/60 hover:border-[var(--primary)]/30 focus:border-[var(--primary)]/50 focus:ring-4 focus:ring-[var(--primary)]/5 h-12 pl-5 pr-14 rounded-2xl outline-none transition-all placeholder:opacity-40 text-sm font-bold"
 />
 <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--primary)] text-white rounded-xl flex items-center justify-center shadow-md hover:bg-[var(--primary-hover)] transition-colors">
 <ChevronRight className="w-4 h-4"/>
 </button>
 </div>
 <div className="flex items-center justify-center gap-2 mt-3">
 <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]/100 animate-pulse"/>
 <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.3em] opacity-40">Cylix Neural Node Active</p>
 </div>
 </div>
 </aside>

 </div>
 </PortalLayout>
 )
}

export default CaseDetail
