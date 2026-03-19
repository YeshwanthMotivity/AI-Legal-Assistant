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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading AI context...</p>
      </div>
    )
  }

  if (error || !precedent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-base)' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Error loading precedent case.</p>
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-primary"
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
      <div style={{ display: 'flex', height: 'calc(100vh - 160px)', background: 'var(--bg-base)' }}>
        {/* Main Content - Case Text */}
        <main style={{ flex: '1', overflowY: 'auto', padding: '2.5rem', background: 'var(--bg-card)' }}>
          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', marginBottom: '2.5rem' }}>
              <BookIcon />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Full Case Transcript</h2>
            </div>
            <div style={{ color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: '1rem' }}>
              {precedent.text}
            </div>
          </div>
        </main>

        {/* Sidebar - AI Chat */}
        <aside style={{ width: '400px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MessageIcon />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Explore with AI</span>
          </div>

          <div style={{ flex: '1', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                  <BotIcon />
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Ask questions about this case's reasoning, judgment, or specific UAE constraints.
                </p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '1rem 1.25rem',
                  borderRadius: '16px',
                  borderBottomRightRadius: msg.role === 'user' ? '0' : '16px',
                  borderBottomLeftRadius: msg.role === 'ai' ? '0' : '16px',
                  background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-card)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  boxShadow: 'var(--shadow-sm)',
                  border: msg.role === 'ai' ? '1px solid var(--border)' : 'none',
                  fontSize: '0.9375rem',
                  textAlign: 'left',
                  lineHeight: 1.5
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {chatMutation.isPending && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1rem 1.5rem', borderRadius: '16px', borderBottomLeftRadius: '0', boxShadow: 'var(--shadow-sm)', display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  Analyzing...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: '1.25rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                type="text"
                placeholder="Ask about this precedent..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatMessage.trim() || chatMutation.isPending}
                className="btn btn-primary cursor-pointer"
                style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
