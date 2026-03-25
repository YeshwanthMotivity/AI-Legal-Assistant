import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { 
  ChevronLeft, 
  Send, 
  MessageSquare, 
  BookOpen, 
  Sparkles,
  Search,
  History,
  Info,
  Scale,
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2
} from 'lucide-react'
import { getPrecedent, chatWithPrecedent, getAnalysis, getCase } from '../../api/judge'
import { PrecedentDetail } from '../../types/judge'
import PortalLayout from '../../components/layout/PortalLayout'
import CaseComparison from '../../components/judge/CaseComparison'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function renderMarkdown(text: string): React.ReactNode {
  // Bold: **text** → <strong>
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-primary/90 font-black">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function splitTranscript(text: string): string[] {
  let processed = text
  // Only numbered paragraphs
  processed = processed.replace(/(\b[A-Za-z,]+\s)(\d{3,}\.\s)/g, '$1\n$2')
  processed = processed.replace(/([.!?]\s)(\d{3,}\.\s)/g, '$1\n$2')
  // DIFC citations
  processed = processed.replace(/\s(\[\d{4}\]\s+DIFC)/g, '\n$1')
  
  return processed.split('\n').map(p => p.trim()).filter(p => {
    if (p.length < 20) return false
    // Filter noise like ~~~ or multiple underscore placeholders
    if ((p.match(/[~_]{2,}/g) || []).length > 0) return false
    if (p.includes('...') && p.length < 40) return false
    return true
  })
}

const getSectionLabel = (text: string): string | null => {
  const slice = text.slice(0, 120).toLowerCase()
  if (/\bfacts?\b|\bclaimant\b|\bemployed\b|\bbackground\b|\bparties\b/.test(slice)) return 'facts'
  if (/\barticle\s+\d+|\blaw\b|\bstatute\b|\bregulation\b|\bprovision\b/.test(slice)) return 'legalAnalysis'
  if (/\bjudgment\b|\border\b|\baward\b|\bdismiss|\bfinding\b|\bdecision\b/.test(slice)) return 'judgment'
  return null
}

const PrecedentDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Extract source case ID if coming from active analysis
  const fromCaseId = (location.state as any)?.fromCaseId
  const [activeTab, setActiveTab] = useState<'chat' | 'comparison'>(fromCaseId ? 'comparison' : 'chat')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [caseAnalysis, setCaseAnalysis] = useState<{
    nature: string
    parties: { claimant: string; respondent: string }
    keyFacts: string[]
    legalIssues: string[]
    courtAnalysis: string
    outcome: string
    legalBasis: string
  } | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState(false)

  const { data: precedent, isLoading, error } = useQuery({
    queryKey: ['precedent', id, i18n.language],
    queryFn: () => getPrecedent(id || '', i18n.language),
    enabled: !!id,
  })

  const { data: sourceCaseAnalysis, isLoading: isLoadingSource } = useQuery({
    queryKey: ['case-analysis', fromCaseId],
    queryFn: () => getAnalysis(fromCaseId as string),
    enabled: !!fromCaseId && activeTab === 'comparison',
  })

  const { data: sourceCase } = useQuery({
    queryKey: ['judge-case', fromCaseId],
    queryFn: () => getCase(fromCaseId as string),
    enabled: !!fromCaseId && activeTab === 'comparison',
  })

  const chatMutation = useMutation({
    mutationFn: (message: string) => chatWithPrecedent(id || '', message, i18n.language),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'ai', content: data.response }])
    },
  })

  useEffect(() => {
    if (!precedent?.text || caseAnalysis || analysisLoading) return
    setAnalysisLoading(true)
    setAnalysisError(false)

    const prompt = `Analyze this DIFC court case transcript and respond ONLY with a JSON object. No extra text.
{
  "nature": "One sentence describing the type of dispute",
  "parties": { "claimant": "Name or role of claimant", "respondent": "Name or role of respondent" },
  "keyFacts": ["Fact 1", "Fact 2", "Fact 3", "Fact 4"],
  "legalIssues": ["Issue 1", "Issue 2", "Issue 3"],
  "courtAnalysis": "2-3 sentences on how the court analyzed the case",
  "outcome": "What the court decided",
  "legalBasis": "Which articles or laws the court relied on"
}`

    chatWithPrecedent(id || '', prompt, i18n.language)
      .then(data => {
        try {
          let text = data.response.trim()
          if (text.toLowerCase().startsWith('json')) text = text.slice(4).trim()
          const start = text.indexOf('{')
          const end = text.lastIndexOf('}')
          if (start !== -1 && end !== -1) {
            const parsed = JSON.parse(text.slice(start, end + 1))
            setCaseAnalysis(parsed)
          } else {
            setAnalysisError(true)
          }
        } catch {
          setAnalysisError(true)
        }
      })
      .catch(() => setAnalysisError(true))
      .finally(() => setAnalysisLoading(false))
  }, [precedent?.text, id, i18n.language])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Clear messages when language changes to avoid confusing bilingual chat history
  useEffect(() => {
    setMessages([])
  }, [i18n.language])

  const handleSendMessage = () => {
    if (!chatMessage.trim() || chatMutation.isPending) return
    
    const userMsg = chatMessage.trim()
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setChatMessage('')
    chatMutation.mutate(userMsg)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
           <p className="text-muted-foreground font-medium animate-pulse">Establishing secure legal context...</p>
        </div>
      </div>
    )
  }

  if (error || !precedent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="p-4 bg-destructive/10 rounded-full text-destructive">
           <AlertCircle className="w-12 h-12" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Failed to Load Precedent</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mt-2 italic">We encountered an issue retrieving the judicial details for this case reference.</p>
        </div>
        <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <PortalLayout 
      title={precedent.title} 
      subtitle={`${precedent.year || 'N/A'} | ${precedent.category || 'DIFC Judicial Precedent'}`}
    >
      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-12rem)] min-h-[600px]">
        {/* Main Content - Case Text */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">
          <Card className="flex-1 shadow-sm border-border/50 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-5 flex flex-row items-center justify-between px-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                   <BookOpen className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">{t('judge.workspace.transcriptAnalysis')}</CardTitle>
              </div>
              <div className="flex items-center gap-4">
                {fromCaseId && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary-hover font-black uppercase text-[10px] tracking-tight shadow-sm"
                    onClick={() => navigate(`/judge/cases/${fromCaseId}`)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    {t('common.backToCase') || "← Back to Case"}
                  </Button>
                )}
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter border-primary/30 text-primary/80">{t('judge.workspace.reference')}: {id}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 overflow-y-auto leading-relaxed text-sm font-medium">
              <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Header banner */}
                <div className="flex items-center gap-4 py-4 px-6 bg-primary/5 rounded-2xl border border-primary/10 mb-6">
                  <Scale className="w-8 h-8 text-primary/40 shrink-0" />
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-primary">
                      {t('judge.workspace.judicialRecordTitle')}
                    </h4>
                    <p className="text-[11px] text-muted-foreground italic">
                      {t('judge.workspace.judicialRecordSubtitle')}
                    </p>
                  </div>
                </div>

                {/* Structured Case Analysis */}
                {analysisLoading && (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-6 bg-primary/10 rounded-xl w-1/3" />
                    <div className="h-4 bg-muted/30 rounded-lg w-full" />
                    <div className="h-4 bg-muted/30 rounded-lg w-5/6" />
                    <div className="h-4 bg-muted/30 rounded-lg w-4/6" />
                    <p className="text-xs text-muted-foreground italic text-center pt-4 flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
                      Generating structured case analysis...
                    </p>
                  </div>
                )}

                {!analysisLoading && caseAnalysis && (
                  <div className="space-y-6">

                    {/* Parties */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Claimant</p>
                        <p className="text-sm font-bold text-foreground">{caseAnalysis.parties?.claimant || 'Not identified'}</p>
                      </div>
                      <div className="bg-orange-500/5 border border-orange-500/15 rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1">Respondent</p>
                        <p className="text-sm font-bold text-foreground">{caseAnalysis.parties?.respondent || 'Not identified'}</p>
                      </div>
                    </div>

                    {/* Nature of Dispute */}
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <h5 className="text-[11px] font-black uppercase tracking-widest text-primary">Nature of Dispute</h5>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{caseAnalysis.nature}</p>
                    </div>

                    {/* Key Facts */}
                    {caseAnalysis.keyFacts?.length > 0 && (
                      <div className="border border-border/30 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-emerald-600">Key Facts</h5>
                        </div>
                        <ul className="space-y-2">
                          {caseAnalysis.keyFacts.map((fact, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              {fact}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Legal Issues */}
                    {caseAnalysis.legalIssues?.length > 0 && (
                      <div className="border border-border/30 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-amber-600">Legal Issues</h5>
                        </div>
                        <ul className="space-y-2">
                          {caseAnalysis.legalIssues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                              <span className="text-amber-500 font-black text-xs shrink-0 mt-0.5">→</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Court Analysis */}
                    {caseAnalysis.courtAnalysis && (
                      <div className="bg-muted/20 border border-border/30 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-purple-600">Court's Analysis</h5>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">{caseAnalysis.courtAnalysis}</p>
                      </div>
                    )}

                    {/* Outcome */}
                    {caseAnalysis.outcome && (
                      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-primary">Judgment Outcome</h5>
                        </div>
                        <p className="text-sm font-bold text-foreground leading-relaxed">{caseAnalysis.outcome}</p>
                      </div>
                    )}

                    {/* Legal Basis */}
                    {caseAnalysis.legalBasis && (
                      <div className="border border-border/30 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Legal Basis</h5>
                        </div>
                        <p className="text-sm text-foreground/70 leading-relaxed italic">{caseAnalysis.legalBasis}</p>
                      </div>
                    )}

                    {/* Divider before raw transcript */}
                    <div className="border-t border-dashed border-border/40 pt-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-4 flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        Full Transcript
                      </p>
                      {precedent.text.trimStart()[0] === precedent.text.trimStart()[0].toLowerCase() && (
                        <p className="text-[11px] text-muted-foreground/60 italic mb-4 flex items-center gap-2">
                          <Info className="w-3 h-3" />
                          ⓘ {t('judge.workspace.transcriptBeginNote')}
                        </p>
                      )}
                      <div className="text-foreground/90 selection:bg-primary/20 space-y-4">
                        {(() => {
                          let lastSection: string | null = null
                          return splitTranscript(precedent.text).map((paragraph, idx) => {
                            const trimmed = paragraph.trim()
                            const isNumbered = /^\d+\./.test(trimmed)
                            const sectionLabel = getSectionLabel(trimmed)
                            const showLabel = sectionLabel !== null && sectionLabel !== lastSection
                            if (showLabel) lastSection = sectionLabel
                            return (
                              <div key={idx} className="space-y-1">
                                {showLabel && (
                                  <div className="flex items-center gap-2 mt-6 mb-3">
                                    <Badge className="bg-primary/20 text-primary border-primary/30 font-black uppercase text-[10px] tracking-widest px-3 py-1">
                                      {t(`judge.workspace.sections.${sectionLabel}`)}
                                    </Badge>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                                  </div>
                                )}
                                <p className={cn(
                                  "transition-colors hover:text-foreground leading-relaxed text-sm",
                                  isNumbered && "pl-4 border-l-2 border-primary/20 font-semibold text-foreground py-2 bg-primary/5 rounded-r-lg"
                                )}>
                                  {trimmed}
                                </p>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>

                  </div>
                )}

                {/* Fallback: no analysis, show raw transcript only */}
                {!analysisLoading && !caseAnalysis && (
                  <div className="text-foreground/90 space-y-4">
                    {analysisError && (
                      <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-4">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-800 font-medium">
                          Could not generate structured analysis. Showing raw transcript below.
                        </p>
                      </div>
                    )}
                    {splitTranscript(precedent.text).map((paragraph, idx) => {
                      const trimmed = paragraph.trim()
                      const isNumbered = /^\d+\./.test(trimmed)
                      return (
                        <p key={idx} className={cn(
                          "transition-colors hover:text-foreground leading-relaxed text-sm",
                          isNumbered && "pl-4 border-l-2 border-primary/20 font-semibold py-2 bg-primary/5 rounded-r-lg"
                        )}>
                          {trimmed}
                        </p>
                      )
                    })}
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
        </main>

        {/* Sidebar - AI Chat & Comparison Tabs */}
        <aside className="w-full lg:w-[480px] flex flex-col shrink-0">
          <Card className="h-full shadow-xl border-primary/20 overflow-hidden flex flex-col bg-card/50 backdrop-blur-sm">
            {/* Tab Header */}
            <div className="flex border-b bg-muted/30">
              <button
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  activeTab === 'chat' 
                    ? "bg-background text-primary border-b-2 border-primary" 
                    : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Sparkles className="w-4 h-4" />
                {t('judge.workspace.aiStatus')}
              </button>
              {fromCaseId && (
                <button
                  onClick={() => setActiveTab('comparison')}
                  className={cn(
                    "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    activeTab === 'comparison' 
                      ? "bg-background text-primary border-b-2 border-primary" 
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {t('judge.workspace.comparison')}
                </button>
              )}
            </div>

            <CardHeader className="bg-primary/5 border-b py-4 flex flex-row items-center justify-between px-6">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
                   {activeTab === 'chat' ? <Sparkles className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
                </div>
                <div>
                   <CardTitle className="text-sm font-bold">
                     {activeTab === 'chat' ? t('judge.workspace.intelligentDiscovery') : t('judge.workspace.caseComparison')}
                   </CardTitle>
                   <p className="text-[10px] text-muted-foreground font-bold uppercase">
                     {activeTab === 'chat' ? t('judge.workspace.poweredBy', { model: 'QWEN-2.5' }) : `${t('judge.workspace.reference')}: ${fromCaseId}`}
                   </p>
                </div>
              </div>
            </CardHeader>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {activeTab === 'chat' ? (
                <div className="p-6 space-y-6">
                  {/* Chat Messages */}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 animate-in fade-in zoom-in-95 duration-700">
                  <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary/30">
                    <MessageSquare className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-bold text-foreground">{t('judge.workspace.chatExploreTitle')}</h5>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      {t('judge.workspace.chatExploreDesc')}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-4">
                     {[
                       { label: 'Summary', query: 'Can you provide a concise summary of the legal reasoning in this case?' },
                       { label: 'Impact', query: 'What was the legal impact and precedent set by this ruling?' },
                       { label: 'Key Ruling', query: 'What are the key judicial findings or specific findings in this case?' }
                     ].map(item => (
                       <button 
                         key={item.label} 
                         onClick={() => {
                           setMessages((prev) => [...prev, { role: 'user', content: item.query }]);
                           chatMutation.mutate(item.query);
                         }}
                         className="px-4 py-1.5 bg-muted/50 border rounded-full text-[10px] font-black uppercase hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95"
                       >
                          {item.label}
                       </button>
                     ))}
                  </div>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[90%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm border",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground border-transparent rounded-tr-none" 
                      : "bg-card border-border/50 rounded-tl-none"
                  )}>
                    {renderMarkdown(msg.content)}
                  </div>
                </div>
              ))}
              
              {chatMutation.isPending && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-muted/30 border border-border/10 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <div className="flex gap-1">
                       <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                       <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                       <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter ml-1">{t('judge.workspace.chatAnalyzing')}</span>
                  </div>
                </div>
              )}
                  <div ref={chatEndRef} />
                </div>
              ) : (
                <div className="p-4">
                  {(isLoadingSource || !sourceCaseAnalysis || !sourceCase) ? (
                    <div className="p-12 text-center space-y-4">
                       <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                       <p className="text-xs font-bold text-muted-foreground uppercase italic tracking-widest">{t('common.loading')}</p>
                    </div>
                  ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                      <CaseComparison 
                        currentCase={{
                          title: sourceCase.title || 'Current Case',
                          type: t(`judge.caseTypes.${sourceCase.case_type}`) || sourceCase.case_type || 'Employment',
                          facts: sourceCase.description || 'See case analysis for details.',
                          issues: sourceCaseAnalysis.analysis.lawArticles?.map((a: any) => {
                            const raw = typeof a === 'object' ? (a.title || '') : String(a);
                            if (raw.length > 60) return 'DIFC Employment Law';
                            return raw.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                          }) || [],
                          outcome: sourceCaseAnalysis.analysis.outcome || 'Pending',
                          compensation: sourceCaseAnalysis.analysis.entitlementBreakdown?.find((e: any) => e.label.includes('Gratuity') || e.label.includes('Total'))?.value || 'Pending calculation'
                        }}
                        precedentCase={{
                          title: precedent.title,
                          type: precedent.category || 'DIFC Judicial Precedent',
                          facts: precedent.summary || 'Summary not available.',
                          issues: precedent.cited_laws || [],
                          outcome: precedent.outcome || 'Finalized',
                          compensation: precedent.compensation || 'N/A'
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area (Only for Chat) */}
            {activeTab === 'chat' && (
              <div className="p-6 bg-muted/20 border-t mt-auto">
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder={t('judge.workspace.chatPlaceholder')}
                    className="w-full bg-card border rounded-2xl pl-5 pr-14 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:italic placeholder:font-medium shadow-inner"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage()
                    }}
                  />
                  <Button 
                    size="icon"
                    className="absolute right-2 top-2 h-10 w-10 shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform"
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || chatMutation.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </PortalLayout>
  )
}

export default PrecedentDetailPage
