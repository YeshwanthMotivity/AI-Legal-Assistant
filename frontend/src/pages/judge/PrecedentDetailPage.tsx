import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  AlertCircle
} from 'lucide-react'
import { getPrecedent, chatWithPrecedent } from '../../api/judge'
import { PrecedentDetail } from '../../types/judge'
import PortalLayout from '../../components/layout/PortalLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const PrecedentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const { data: precedent, isLoading, error } = useQuery({
    queryKey: ['precedent', id],
    queryFn: () => getPrecedent(id || ''),
    enabled: !!id,
  })

  const chatMutation = useMutation({
    mutationFn: (message: string) => chatWithPrecedent(id || '', message),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'ai', content: data.response }])
    },
  })

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
                <CardTitle className="text-lg">Case Transcript & Analysis</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter">Reference: {id}</Badge>
            </CardHeader>
            <CardContent className="p-8 overflow-y-auto leading-relaxed text-sm font-medium">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4 py-4 px-6 bg-primary/5 rounded-2xl border border-primary/10 mb-8">
                   <Scale className="w-8 h-8 text-primary/40 shrink-0" />
                   <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-primary">Judicial Record</h4>
                      <p className="text-[11px] text-muted-foreground italic">Official transcript from the DIFC Court of First Instance</p>
                   </div>
                </div>
                <div className="whitespace-pre-wrap text-foreground/90 selection:bg-primary/20">
                  {precedent.text}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>

        {/* Sidebar - AI Chat */}
        <aside className="w-full lg:w-[450px] flex flex-col shrink-0">
          <Card className="h-full shadow-xl border-primary/20 overflow-hidden flex flex-col bg-card/50 backdrop-blur-sm">
            <CardHeader className="bg-primary/5 border-b py-5 flex flex-row items-center justify-between px-6">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary rounded-lg text-primary-foreground">
                   <Sparkles className="w-4 h-4" />
                </div>
                <div>
                   <CardTitle className="text-sm font-bold">Intelligent Discovery</CardTitle>
                   <p className="text-[10px] text-muted-foreground font-bold uppercase">Powered by JAIS-7B</p>
                </div>
              </div>
            </CardHeader>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 animate-in fade-in zoom-in-95 duration-700">
                  <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary/30">
                    <MessageSquare className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h5 className="font-bold text-foreground">Explore this Case</h5>
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      Ask detailed questions about legal reasoning, specific clauses, or how this precedent applies to current labor laws.
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
                    {msg.content}
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
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter ml-1">Analyzing context</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-muted/20 border-t mt-auto">
              <div className="relative group">
                <input 
                  type="text"
                  placeholder="Inquire about case complexities..."
                  className="w-full bg-card border rounded-2xl pl-5 pr-14 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold placeholder:italic placeholder:font-medium shadow-inner"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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
              <p className="text-[9px] text-center mt-3 text-muted-foreground uppercase font-black tracking-widest opacity-50">
                End-to-End Encrypted Judicial Workspace
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </PortalLayout>
  )
}

export default PrecedentDetailPage
