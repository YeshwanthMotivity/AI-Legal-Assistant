import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getPrecedent, chatWithPrecedent } from '../../api/judge'
import { PrecedentDetail } from '../../types/judge'
import PortalLayout from '../../components/layout/PortalLayout'

// Inline Icons to avoid extra dependencies
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
)
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
)
const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
)
const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>
)
const ScaleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h18"/></svg>
)
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
)
const BotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
)

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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !precedent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <p className="text-red-600 mb-4">Error loading precedent case.</p>
        <button 
          onClick={() => navigate(-1)} 
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <PortalLayout 
      title={precedent.title} 
      subtitle={`${precedent.year || 'N/A'} | ${precedent.category || 'DIFC Precedent'}`}
    >
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
        {/* Main Content - Case Text */}
        <main className="flex-1 overflow-y-auto px-8 py-10 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 flex items-center gap-2 text-indigo-600 border-b border-slate-100 pb-4">
              <BookIcon />
              <h2 className="text-2xl font-semibold">Full Case Transcript</h2>
            </div>
            <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
              {precedent.text}
            </div>
          </div>
        </main>

        {/* Sidebar - AI Chat */}
        <aside className="w-96 border-l border-slate-200 bg-slate-50 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-2">
            <MessageIcon />
            <span className="font-semibold text-slate-800">Explore with AI</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center">
            {messages.length === 0 && (
              <div className="py-10">
                <div className="flex justify-center mb-3 text-slate-300">
                  <BotIcon />
                </div>
                <p className="text-sm text-slate-500">
                  Ask questions about this case's reasoning, judgment, or specific conditions.
                </p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-left text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-sm' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
              <input 
                type="text"
                placeholder="Ask about this case..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1 px-2"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatMessage.trim() || chatMutation.isPending}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-colors shadow-sm"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </PortalLayout>
  )
}

export default PrecedentDetailPage
