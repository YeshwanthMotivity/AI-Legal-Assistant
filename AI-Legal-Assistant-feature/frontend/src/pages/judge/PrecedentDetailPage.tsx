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
  CheckCircle2,
  ChevronRight
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
  if (!text) return null
  
  // Split on numbered points: "1. " "2. " etc, or "Summary:"
  const lines = text
    .replace(/(\d+\.\s)/g, '\n$1')
    .replace(/(Summary:)/gi, '\n$1')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)

  if (lines.length <= 1) {
    const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g)
    return <span>{parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-primary/90 font-black">{part.slice(2, -2)}</strong>
      }
      return part
    })}</span>
  }

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const isSummary = /^summary:/i.test(line)
        const isNumbered = /^\d+\./.test(line)
        const parts = line.split(/(\*\*[^*]+\*\*)/g)
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="text-primary/90 font-black">{part.slice(2, -2)}</strong>
          }
          return part
        })
        return (
          <div key={i} className={isSummary
            ? "pt-2 border-t border-border/30 font-bold text-foreground"
            : isNumbered ? "flex gap-2" : ""
          }>
            {rendered}
          </div>
        )
      })}
    </div>
  )
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

function extractCaseTitle(text: string, fallback: string): string {
  // Pattern: "X v Y [YEAR] DIFC" or "X v Y" in legal text
  const vMatch = text.match(/([A-Z][A-Za-z\s&,.'()-]{3,50})\s+v\s+([A-Z][A-Za-z\s&,.'()-]{3,50})\s+\[(\d{4})\]/);
  if (vMatch) return `${vMatch[1].trim()} v ${vMatch[2].trim()}`;
  
  // Shorter "X v Y" without year
  const shortV = text.match(/([A-Z][A-Za-z\s]{3,40})\s+v\s+([A-Z][A-Za-z\s]{3,40})[^\w]/);
  if (shortV) return `${shortV[1].trim()} v ${shortV[2].trim()}`;
  
  // If fallback looks like a filename, return generic
  if (/^[a-z0-9_-]+$/.test(fallback)) return 'DIFC Court Case';
  return fallback;
}

function extractParties(text: string): { claimant: string; respondent: string } {
  // "X v Y [year]" pattern
  const match = text.match(/([A-Z][A-Za-z\s&,.'()-]{3,50})\s+v\s+([A-Z][A-Za-z\s&,.'()-]{3,50})\s+\[(\d{4})\]/);
  if (match) {
    return { claimant: match[1].trim(), respondent: match[2].trim() };
  }
  // Fallback: look for "Claimant: X" or "Defendant: X" patterns
  const claimantMatch = text.match(/[Cc]laimant[:\s]+([A-Z][A-Za-z\s]{2,40})(?:\n|,|\.)/);
  const defendantMatch = text.match(/[Dd]efendant[:\s]+([A-Z][A-Za-z\s]{2,40})(?:\n|,|\.)/);
  return {
    claimant: claimantMatch?.[1]?.trim() || 'See transcript',
    respondent: defendantMatch?.[1]?.trim() || 'See transcript',
  };
}

function extractSummary(text: string): string {
  if (!text) return '';
  
  // Find sentences that contain key judgment language
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.length > 40 && s.length < 400);
  
  // Prefer sentences with outcome/decision language
  const outcomeSentence = sentences.find(s =>
    /\b(court (found|held|ordered|dismissed|awarded)|judgment|claimant (is|was) entitled|claim (succeeded|failed)|awarded|dismissed)\b/i.test(s)
  );
  
  // Prefer sentences with factual background
  const factSentence = sentences.find(s =>
    /\b(employed|employment|wages|salary|termination|dismissed|contract|dispute)\b/i.test(s)
  );
  
  const parts = [factSentence, outcomeSentence]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i) // dedupe
    .slice(0, 2);
  
  if (parts.length > 0) {
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }
  
  // Last resort: first 1 clean sentence, capped
  return sentences.slice(0, 1).join(' ').trim().slice(0, 220) + '...';
}

function extractYear(text: string): string | null {
  // Match [2024] DIFC or similar citation patterns
  const match = text.match(/\[(\d{4})\]\s+DIFC/) || text.match(/\b(20\d{2}|19\d{2})\b/);
  return match ? match[1] : null;
}

function getOutcomeStyle(outcome: string): { label: string; className: string } {
  const o = (outcome || '').toLowerCase();
  if (o.includes('award') || o.includes('granted') || o.includes('success'))
    return { label: 'Awarded', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400' };
  if (o.includes('dismiss') || o.includes('reject') || o.includes('denied') || o.includes('failed'))
    return { label: 'Dismissed', className: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400' };
  if (o.includes('final') || o.includes('settled') || o.includes('resolved'))
    return { label: 'Finalized', className: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400' };
  if (o.includes('partial'))
    return { label: 'Partially Awarded', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400' };
  return { label: outcome, className: 'bg-muted/50 text-muted-foreground border-border/40' };
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

  const [aiSummary, setAiSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)
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

  // Dynamic x.ai Summary Generation
  useEffect(() => {
    if (!precedent?.text || aiSummary || summaryLoading) return
    setSummaryLoading(true)
    
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: `In 2-3 sentences max, summarize this DIFC court case — who sued whom, what the dispute was about, and the outcome. Be concise and factual.\n\n${precedent.text.slice(0, 3000)}`
        }],
        temperature: 0,
        max_tokens: 150
      })
    })
    .then(r => r.json())
    .then(d => setAiSummary(d.choices?.[0]?.message?.content || ''))
    .catch(err => console.error('Groq summary fetch failed:', err))
    .finally(() => setSummaryLoading(false))
  }, [precedent?.text, aiSummary])

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

                {/* Header Banner */}
                <div className="flex items-center gap-4 py-4 px-6 bg-primary/5 rounded-2xl border border-primary/10">
                  <Scale className="w-8 h-8 text-primary/40 shrink-0" />
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-primary">Judicial Record</h4>
                    <p className="text-[11px] text-muted-foreground italic">Official transcript from the DIFC Court of First Instance</p>
                  </div>
                </div>

                {/* Static Case Details Card */}
                <div className="border border-border/40 rounded-2xl overflow-hidden">
                  <div className="bg-muted/20 px-6 py-3 border-b border-border/30 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-primary">Case Details</h5>
                  </div>
                  <div className="divide-y divide-border/20">
                    {(() => {
                      const parties = {
                        claimant: precedent.claimant || extractParties(precedent.text).claimant,
                        respondent: precedent.respondent || extractParties(precedent.text).respondent,
                      }
                      const cleanTitle = extractCaseTitle(precedent.text, precedent.title)
                      const cleanSummary = precedent.summary || extractSummary(precedent.text)
                      const year = precedent.year || extractYear(precedent.text)
                      const outcomeRaw = (precedent.outcome || '').split('.')[0].trim()
                      const outcomeStyle = outcomeRaw ? getOutcomeStyle(outcomeRaw) : null

                      type RowType = { label: string; value: unknown; type: 'text' | 'outcome' | 'summary' }
                      const rows: RowType[] = [
                        { label: 'Court',       value: 'DIFC Courts',                                    type: 'text' },
                        { label: 'Reference',   value: id,                                                type: 'text' },
                        ...(year ? [{ label: 'Year', value: year, type: 'text' as const }] : []),
                        { label: 'Case Type',   value: precedent.category || 'DIFC Judicial Precedent',  type: 'text' },
                        ...(parties.claimant ? [{ label: 'Claimant', value: parties.claimant,  type: 'text' as const }] : []),
                        ...(parties.respondent ? [{ label: 'Respondent', value: parties.respondent,  type: 'text' as const }] : []),
                        ...(outcomeStyle ? [{ label: 'Outcome', value: outcomeStyle, type: 'outcome' as const }] : []),
                        ...(aiSummary || summaryLoading ? [{
                          label: 'Summary',
                          value: summaryLoading ? 'Generating AI summary...' : aiSummary,
                          type: 'summary' as const
                        }] : []),
                        { label: 'Source',      value: precedent.title,                                   type: 'text' },
                      ]

                      return rows.map((row, i) => (
                        <div key={i} className="grid grid-cols-[140px_1fr] gap-4 px-6 py-3.5 hover:bg-muted/10 transition-colors">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                            {row.label}
                          </span>
                          {row.type === 'outcome' ? (
                            <span className={`inline-flex items-center self-start gap-1.5 text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border w-fit ${(row.value as ReturnType<typeof getOutcomeStyle>).className}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {(row.value as ReturnType<typeof getOutcomeStyle>).label}
                            </span>
                          ) : (
                            <span className={`text-sm font-medium leading-relaxed ${row.type === 'summary' ? 'italic text-muted-foreground' : 'text-foreground/85'}`}>
                              {String(row.value)}
                            </span>
                          )}
                        </div>
                      ))
                    })()}

                    {/* Cited Laws row - only if available */}
                    {(precedent.cited_laws?.length ?? 0) > 0 && (
                      <div className="grid grid-cols-[140px_1fr] gap-4 px-6 py-3.5 hover:bg-muted/10 transition-colors">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                          Laws Cited
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(precedent.cited_laws || []).slice(0, 5).map((law: string, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                              {law}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hint to use AI chat */}
                <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-black text-primary">Want a deeper analysis?</span> Use the AI Assistant on the right to ask questions about this case — key rulings, legal reasoning, how it compares to your current case, and more.
                  </p>
                </div>

                {/* Full Transcript (collapsible) */}
                <details className="group border border-border/30 rounded-2xl overflow-hidden">
                  <summary className="flex items-center justify-between px-6 py-4 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors list-none">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        Full Transcript
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-6 py-5 space-y-4 border-t border-border/20">
                    {precedent.text.trimStart()[0] === precedent.text.trimStart()[0].toLowerCase() && (
                      <p className="text-[11px] text-muted-foreground/60 italic flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        ⓘ {t('judge.workspace.transcriptBeginNote')}
                      </p>
                    )}
                    <div className="text-foreground/90 space-y-4">
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
                </details>

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
                          facts: (() => {
                            if (summaryLoading) return 'Generating AI summary...'
                            if (aiSummary) return aiSummary
                            if (precedent.summary && precedent.summary.length < 500 && !precedent.summary.startsWith('with any')) return precedent.summary
                            const cleanText = (precedent.text || '')
                              .replace(/https?:\/\/\S+/g, '')
                              .replace(/\(\/[\w-]+\)/g, '')
                              .replace(/DFSA\s*\(/g, '')
                              .replace(/data-protection-policy|terms-of-use|quality-policy|disclaimer/gi, '')
                              .replace(/Dubai Courts[^.]*\./gi, '')
                              .replace(/\n{3,}/g, '\n\n')
                              .trim()
                            if (cleanText.length > 50) return cleanText.slice(0, 300) + '...'
                            return 'See full transcript for case details.'
                          })(),
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
