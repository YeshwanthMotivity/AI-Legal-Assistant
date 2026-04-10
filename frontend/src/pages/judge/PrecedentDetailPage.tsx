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
  History as HistoryIcon,
  Info,
  Scale,
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronRight,
  Archive,
  Terminal,
  Loader2
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
  const lines = text.replace(/(\d+\.\s)/g, '\n$1').replace(/(Summary:)/gi, '\n$1').split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length <= 1) {
    const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g)
    return <span>{parts.map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="text-primary/90 font-black">{part.slice(2, -2)}</strong> : part)}</span>
  }
  return (<div className="space-y-2">{lines.map((line, i) => {
    const isSummary = /^summary:/i.test(line); const isNumbered = /^\d+\./.test(line); const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (<div key={i} className={isSummary ? "pt-2 border-t border-border/30 font-bold text-foreground" : isNumbered ? "flex gap-2" : ""}>{parts.map((part, j) => part.startsWith('**') && part.endsWith('**') ? <strong key={j} className="text-primary/90 font-black">{part.slice(2, -2)}</strong> : part)}</div>)
  })}</div>)
}

function splitTranscript(text: string): string[] {
  let processed = text; processed = processed.replace(/(\b[A-Za-z,]+\s)(\d{3,}\.\s)/g, '$1\n$2'); processed = processed.replace(/([.!?]\s)(\d{3,}\.\s)/g, '$1\n$2'); processed = processed.replace(/\s(\[\d{4}\]\s+DIFC)/g, '\n$1')
  return processed.split('\n').map(p => p.trim()).filter(p => p.length >= 20 && !(/[~_]{2,}/g.test(p)))
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
  
  const fromCaseId = (location.state as any)?.fromCaseId
  const [activeTab, setActiveTab] = useState<'chat' | 'comparison'>(fromCaseId ? 'comparison' : 'chat')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { data: precedent, isLoading, error } = useQuery({
    queryKey: ['precedent', id, i18n.language],
    queryFn: () => getPrecedent(id || '', i18n.language),
    enabled: !!id,
    retry: 1
  })

  const { data: sourceCase } = useQuery({
    queryKey: ['case', fromCaseId],
    queryFn: () => getCase(fromCaseId!),
    enabled: !!fromCaseId
  })

  const { data: sourceCaseAnalysis } = useQuery({
    queryKey: ['caseAnalysis', fromCaseId],
    queryFn: () => getAnalysis(fromCaseId!),
    enabled: !!fromCaseId
  })

  const chatMutation = useMutation({
    mutationFn: (msg: string) => chatWithPrecedent(id || '', msg, i18n.language),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'ai', content: data.response }])
    }
  })

  const handleSendMessage = () => {
    if (!chatMessage.trim() || chatMutation.isPending) return
    setMessages(prev => [...prev, { role: 'user', content: chatMessage.trim() }])
    chatMutation.mutate(chatMessage.trim())
    setChatMessage('')
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#F8F8F5]">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto border border-primary/20 shadow-sm">
            <Scale className="w-8 h-8 text-primary animate-pulse"/>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 animate-pulse">Establishing Judicial Context...</p>
        </div>
      </div>
    )
  }

  // ENHANCED FALLBACK: Look like the real page but for Archival/Missing records
  if (error || !precedent) {
    return (
      <PortalLayout title={id || "Archival Record"} subtitle="DIFC Judicial Registry | External Reference">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-10rem)] min-h-[600px] animate-in fade-in duration-700">
          <main className="flex-1 min-w-0 flex flex-col gap-6">
            <Card className="flex-1 shadow-sm border-border/50 overflow-hidden flex flex-col bg-white">
              <CardHeader className="bg-muted/5 border-b py-4 flex flex-row items-center justify-between px-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary"><Archive className="w-5 h-5"/></div>
                  <CardTitle className="text-base font-black uppercase tracking-tight">Archival Record</CardTitle>
                </div>
                {fromCaseId && (
                  <Button onClick={() => navigate(-1)} variant="outline" size="sm" className="h-8 gap-2 font-black uppercase text-[9px] tracking-widest"><ChevronLeft className="w-3 h-3"/> {t('common.backToCase', 'Back to Case')}</Button>
                )}
              </CardHeader>
              <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-8 flex-1">
                <div className="w-32 h-32 bg-primary/5 rounded-[3rem] flex items-center justify-center border-2 border-dashed border-primary/20 shadow-inner relative group">
                  <Terminal className="w-12 h-12 text-primary opacity-20 group-hover:opacity-40 transition-opacity"/>
                  <div className="absolute inset-0 rounded-[3rem] border border-primary/5 animate-ping opacity-20"/>
                </div>
                <div className="space-y-3 max-w-md">
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight">External Reference Found</h3>
                  <p className="text-[11px] font-semibold text-muted-foreground leading-relaxed italic opacity-80">
                    Record ID <span className="text-primary font-black not-italic">{id}</span> represents an external judicial reference. 
                    Detailed electronic analysis for this specific registry ID is currently being synthesized in the sovereign core.
                  </p>
                </div>
                <div className="pt-6">
                  <Button onClick={() => navigate(-1)} className="h-10 px-8 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-primary/10 hover:scale-105 active:scale-95 transition-all">
                    Return to Navigation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
          <aside className="w-full lg:w-[420px] shrink-0">
             <Card className="h-full border-primary/20 shadow-lg bg-white/50 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center space-y-6">
                <Sparkles className="w-12 h-12 text-primary/20 animate-pulse"/>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">AI Analysis Context Locked<br/>for Archival Entries</p>
             </Card>
          </aside>
        </div>
      </PortalLayout>
    )
  }

  // ... rest of the file stays same
  return (
    <PortalLayout 
      title={precedent.title} 
      subtitle={`${precedent.year || 'N/A'} | ${precedent.category || 'DIFC Judicial Precedent'}`}
    >
      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-12rem)] min-h-[600px] w-full items-stretch">
        {/* Main Content - Case Text */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">
          <Card className="flex-1 shadow-sm border-border/50 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-5 flex flex-row items-center justify-between px-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <BookOpen className="w-5 h-5"/>
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
                    <ChevronLeft className="w-3.5 h-3.5"/>
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
                  <Scale className="w-8 h-8 text-primary/40 shrink-0"/>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-primary">Judicial Record</h4>
                    <p className="text-[11px] text-muted-foreground italic">Official transcript from the DIFC Court of First Instance</p>
                  </div>
                </div>

                {/* Static Case Details Card */}
                <div className="border border-border/40 rounded-2xl overflow-hidden">
                  <div className="bg-muted/20 px-6 py-3 border-b border-border/30 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary"/>
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-primary">Case Details</h5>
                  </div>
                  <div className="divide-y divide-border/20">
                    {(() => {
                      const claimant = precedent.claimant || 'N/A'
                      const respondent = precedent.respondent || 'N/A'
                      const outcomeRaw = (precedent.outcome || '').split('.')[0].trim()
                      const getOutcomeStyle = (oRaw: string) => {
                        const o = oRaw.toLowerCase()
                        if (o.includes('dismiss')) return { label: 'Dismissed', className: 'bg-red-50 text-red-700 border-red-200' }
                        if (o.includes('award') || o.includes('upheld')) return { label: 'Awarded', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                        if (o.includes('settle')) return { label: 'Settled', className: 'bg-blue-50 text-blue-700 border-blue-200' }
                        return { label: oRaw || 'N/A', className: 'bg-slate-50 text-slate-700 border-slate-200' }
                      }
                      const outcomeStyle = outcomeRaw ? getOutcomeStyle(outcomeRaw) : null
                      const rows = [
                        { label: 'Court', value: 'DIFC Courts' },
                        { label: 'Reference', value: id },
                        { label: 'Year', value: precedent.year || '2024' },
                        { label: 'Case Type', value: precedent.category || 'DIFC Judicial Precedent' },
                        { label: 'Claimant', value: claimant },
                        { label: 'Respondent', value: respondent },
                        { label: 'Outcome', value: outcomeStyle, type: 'outcome' },
                        { label: 'Source', value: precedent.title },
                      ]

                      return rows.map((row, i) => (
                        <div key={i} className="grid grid-cols-[140px_1fr] gap-4 px-6 py-3.5 hover:bg-muted/10 transition-colors">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-0.5">{row.label}</span>
                          {row.type === 'outcome' ? (
                            <span className={`inline-flex items-center self-start gap-1.5 text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border w-fit ${(row.value as any).className}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"/>{(row.value as any).label}
                            </span>
                          ) : (<span className="text-sm font-medium leading-relaxed text-foreground/85">{String(row.value)}</span>)}
                        </div>
                      ))
                    })()}
                  </div>
                </div>

                {/* AI Hint */}
                <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5"/><p className="text-xs text-muted-foreground leading-relaxed"><span className="font-black text-primary">Want a deeper analysis?</span> Use the AI Assistant on the right to ask questions about this case.</p>
                </div>

                {/* Collapsible Transcript */}
                <details className="group border border-border/30 rounded-2xl overflow-hidden">
                  <summary className="flex items-center justify-between px-6 py-4 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors list-none">
                    <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-muted-foreground"/><span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Full Transcript</span></div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90"/>
                  </summary>
                  <div className="px-6 py-5 space-y-4 border-t border-border/20 text-foreground/90 space-y-4">
                      {splitTranscript(precedent.text).map((p, idx) => (
                        <p key={idx} className={cn("transition-colors hover:text-foreground leading-relaxed text-sm", /^\d+\./.test(p) && "pl-4 border-l-2 border-primary/20 font-semibold py-2 bg-primary/5 rounded-r-lg")}>{p}</p>
                      ))}
                  </div>
                </details>
              </div>
            </CardContent>
          </Card>
        </main>

        <aside className="w-full lg:w-1/2 flex flex-col min-w-0">
          <Card className="h-full shadow-xl border-primary/20 overflow-hidden flex flex-col bg-card/50 backdrop-blur-sm">
            <div className="flex border-b bg-muted/30">
              <button onClick={() => setActiveTab('chat')} className={cn("flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", activeTab === 'chat' ? "bg-background text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-muted/50")}><Sparkles className="w-4 h-4"/>{t('judge.workspace.aiStatus')}</button>
              {fromCaseId && (<button onClick={() => setActiveTab('comparison')} className={cn("flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2", activeTab === 'comparison' ? "bg-background text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-muted/50")}><ArrowLeftRight className="w-4 h-4"/>{t('judge.workspace.comparison')}</button>)}
            </div>
            <CardHeader className="bg-primary/5 border-b py-4 flex flex-row items-center justify-between px-6">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">{activeTab === 'chat' ? <Sparkles className="w-4 h-4"/> : <ArrowLeftRight className="w-4 h-4"/>}</div>
                <div><CardTitle className="text-sm font-bold">{activeTab === 'chat' ? t('judge.workspace.intelligentDiscovery') : t('judge.workspace.caseComparison')}</CardTitle>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">{activeTab === 'chat' ? t('judge.workspace.poweredBy', { model: 'QWEN-2.5' }) : `${t('judge.workspace.reference')}: ${fromCaseId}`}</p>
                </div>
              </div>
            </CardHeader>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {activeTab === 'chat' ? (
                <div className="p-6 space-y-6">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary/30"><MessageSquare className="w-10 h-10"/></div>
                      <h5 className="font-bold text-foreground">{t('judge.workspace.chatExploreTitle')}</h5>
                      <p className="text-xs text-muted-foreground italic">{t('judge.workspace.chatExploreDesc')}</p>
                    </div>
                  )}
                  {messages.map((msg, idx) => (<div key={idx} className={cn("flex w-full animate-in fade-in", msg.role === 'user' ? "justify-end" : "justify-start")}><div className={cn("max-w-[90%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm border", msg.role === 'user' ? "bg-primary text-primary-foreground border-transparent rounded-tr-none" : "bg-card border-border/50 rounded-tl-none")}>{renderMarkdown(msg.content)}</div></div>))}
                  
                  {chatMutation.isPending && (
                    <div className="flex w-full justify-start animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="bg-card border border-border/50 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary/40"/>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 animate-pulse">
                          Generating synthesis...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 animate-in fade-in zoom-in-95 duration-500">
                  {sourceCase && sourceCaseAnalysis && (<CaseComparison currentCase={{ title: sourceCase.title || 'Unknown', type: sourceCase.case_type || 'Unknown', facts: sourceCase.description || 'N/A', issues: [], outcome: 'Pending', compensation: 'Pending' }} precedentCase={{ title: precedent.title || 'Unknown', type: precedent.category || 'Unknown', facts: precedent.summary || 'N/A', issues: [], outcome: precedent.outcome || 'N/A', compensation: 'N/A' }} />)}
                </div>
              )}
            </div>
            {activeTab === 'chat' && (
              <div className="p-6 bg-muted/20 border-t mt-auto">
                <div className="relative group">
                  <input type="text" placeholder={t('judge.workspace.chatPlaceholder')} className="w-full bg-card border rounded-2xl pl-5 pr-14 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold shadow-inner" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}/>
                  <Button size="icon" className="absolute right-2 top-2 h-10 w-10 shadow-lg" onClick={handleSendMessage} disabled={!chatMessage.trim() || chatMutation.isPending}><Send className="w-4 h-4"/></Button>
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
