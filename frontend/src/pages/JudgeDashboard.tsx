import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { getJudgeCases } from '../api/judge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PortalLayout from '../components/layout/PortalLayout';
import LanguageToggle from '../components/LanguageToggle';

import { 
  AlertTriangle, 
  Sparkles, 
  History, 
  Plus,
  Verified,
  Search,
  ChevronRight,
  Calendar,
  User,
  Terminal,
  Zap,
  BarChart3,
  Briefcase
} from 'lucide-react';

export default function JudgeDashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const casesQuery = useQuery({
    queryKey: ['judge-cases'],
    queryFn: () => getJudgeCases({ limit: 10 }),
    refetchInterval: 30000,
  });

  const allCasesQuery = useQuery({
    queryKey: ['judge-cases-all'],
    queryFn: () => getJudgeCases({ limit: 100 }),
    refetchInterval: 60000,
  });

  const stats = useMemo(() => {
    const items = casesQuery.data?.items ?? [];
    return {
      pending: items.filter(c => c.status !== 'Finalized').length,
      ready: items.filter(c => c.status === 'DraftGenerated' || c.status === 'AIAnalysisReady').length,
      urgent: items.filter(c => c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length
    };
  }, [casesQuery.data]);

  const recentCases = useMemo(() => {
    const items = casesQuery.data?.items ?? [];
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(c => 
      c.title?.toLowerCase().includes(q) || 
      c.case_number?.toLowerCase().includes(q)
    );
  }, [casesQuery.data, searchQuery]);

  const focusCase = recentCases[0];

  const { performance } = useMemo(() => {
    const all = allCasesQuery.data?.items ?? [];
    const resolved = all.filter(c => c.status === 'Finalized').length;
    const total = Math.max(1, all.length);
    return { performance: { resolved, total } };
  }, [allCasesQuery.data]);

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    const systemPrompt = `You are Cylix, an AI judicial assistant. The user is on the Judge Dashboard. 
    Active cases: ${stats.pending}. Urgent hearings: ${stats.urgent}. AI Ready cases: ${stats.ready}.
    ${focusCase ? `Current focus case: ${focusCase.title}, Status: ${focusCase.status}, Case number: ${focusCase.case_number}.` : ''}
    Answer questions about the dashboard, cases, and judicial workflow. ${i18n.language === 'ar' ? 'Always respond in Arabic.' : 'Always respond in English.'}`;

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

  const modules = [
    { label: t('active_cases', 'Active Cases'), desc: t('currently_assigned', 'Currently assigned'), count: stats.pending, icon: Briefcase },
    { label: t('ai_ready', 'AI Ready'), desc: t('ready_for_review', 'Ready for review'), count: stats.ready || 0, icon: Sparkles },
    { label: t('urgent_hearings', 'Urgent Hearings'), desc: t('require_attention', 'Require attention'), count: stats.urgent || 0, icon: History },
    { label: t('performance', 'Performance'), desc: t('archived_cases', 'Archived cases'), progress: Math.round((performance.resolved / performance.total) * 100), icon: BarChart3 },
  ];

  return (
    <PortalLayout 
      title={t('dashboard', 'Dashboard')} 
      subtitle={t('judicial_summary', 'Judicial summary of recent session activity')}
      headerActions={
        <div className="flex items-center gap-3">
          <button 
            className={`flex items-center gap-2 h-9 px-4 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all border ${isAiPanelOpen ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)] shadow-sm' : 'bg-muted border-transparent hover:border-border text-muted-foreground/60'}`}
            onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isAiPanelOpen ? 'Hide Assistant' : 'Show Assistant'}
          </button>
          <button 
            className="flex items-center gap-2 h-9 px-5 text-[10px] font-bold bg-[var(--primary)] text-white rounded-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
            onClick={() => navigate('/judge/cases/new')}
          >
            <Plus className="w-3.5 h-3.5"/> CREATE CASE
          </button>
        </div>
      }
    >
      <div className="flex bg-[var(--bg-base)]">
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <div className="flex-1 overflow-y-auto px-8 py-5 scrollbar-hide space-y-5">
            {/* Alerts Section - Compressed Vertical Footprint */}
            {(stats.urgent > 0 || stats.ready > 0) && (
              <div className="flex flex-col gap-2">
                {stats.urgent > 0 && (
                  <div className="px-5 py-3 rounded-lg bg-[var(--bg-card)] border-l-4 border-error shadow-sm flex items-center justify-between group animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-4">
                      <AlertTriangle className="w-4 h-4 text-error"/>
                      <p className="text-sm font-semibold text-on-surface">{stats.urgent} {t('urgent_cases_msg', 'cases detected with hearings in less than 7 days.')}</p>
                    </div>
                    <button className="h-8 px-4 text-[9px] font-bold bg-error text-white rounded uppercase tracking-widest hover:brightness-110">{t('review_urgent', 'Review Urgent')}</button>
                  </div>
                )}
                {stats.ready > 0 && (
                  <div className="px-5 py-3 rounded-lg bg-[var(--bg-card)] border-l-4 border-[var(--primary)] shadow-sm flex items-center justify-between group animate-in slide-in-from-top-2 delay-75">
                    <div className="flex items-center gap-4">
                      <Zap className="w-4 h-4 text-[var(--primary)]"/>
                      <p className="text-sm font-semibold text-on-surface">{stats.ready} {t('draft_ready_msg', 'case drafts are ready for judicial finalization.')}</p>
                    </div>
                    <button className="h-8 px-4 text-[9px] font-bold bg-[var(--primary)] text-white rounded uppercase tracking-widest hover:brightness-110">{t('finalize_drafts', 'Finalize Drafts')}</button>
                  </div>
                )}
              </div>
            )}

            {/* MODULE CARDS - Symmetric Tight Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {modules.map((mod, i) => (
                <div 
                  key={i} 
                  className="bg-[var(--bg-card)] p-4 rounded-lg border border-outline-variant/30 shadow-sm hover:border-[var(--primary)]/30 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest opacity-60 mb-1">{mod.label}</p>
                    <h3 className="font-headline text-3xl font-medium text-primary leading-none">
                      {mod.count !== undefined ? String(mod.count).padStart(2, '0') : `${mod.progress}%`}
                    </h3>
                  </div>
                  
                  <div className="flex items-center text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider h-4 mt-3">
                    <mod.icon className="w-3.5 h-3.5 mr-2 opacity-70"/>
                    <span>{mod.desc}</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-4 pt-2 pb-12">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1 py-1">
                <div className="flex items-center gap-4">
                  <h2 className="text-base font-bold tracking-tight text-foreground">{t('my_cases', 'My Cases')}</h2>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded border border-primary/20 tracking-widest uppercase">
                    {recentCases.length} {recentCases.length === 1 ? 'Case' : 'Cases'}
                  </span>
                </div>
                
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40"/>
                  <input
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded py-2 pl-9 pr-4 text-[11px] uppercase tracking-widest focus:outline-none focus:border-tertiary font-bold transition-all placeholder:opacity-50"
                    placeholder={t('quick_search_dockets', 'Quick search dockets...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pb-12">
                {casesQuery.isLoading ? (
                  <div className="p-12 text-center animate-pulse text-muted-foreground uppercase text-[10px] font-black tracking-[0.2em]">Synchronizing Registry...</div>
                ) : recentCases.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground bg-[var(--bg-card)] rounded-lg border border-dashed border-border/60 italic text-sm">
                    No recent activity matching your current session filters.
                  </div>
                ) : (
                  recentCases.map((c) => {
                    const isUrgent = c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                    
                    return (
                      <div 
                        key={c.id} 
                        className="bg-[var(--bg-card)] p-6 rounded-lg shadow-sm border border-outline-variant/30 hover:border-[var(--primary)]/40 transition-all duration-300 group cursor-pointer"
                        onClick={() => navigate(`/judge/cases/${c.id}`)}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4 mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.15em] mb-1 block opacity-50">
                              Case ID: {c.case_number || c.id.substring(0, 8).toUpperCase()}
                            </span>
                            <h5 className="font-headline text-xl text-on-surface font-bold group-hover:text-primary transition-colors leading-none">{c.title || 'Untitled Action'}</h5>
                          </div>
                          <div className="flex flex-col items-end pt-1">
                            <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded border self-end ${
                              isUrgent ? 'bg-error/10 text-error border-error/20' : 'bg-primary/5 text-primary/70 border-primary/10'
                            }`}>
                              {isUrgent ? 'Urgent Hearing' : c.status === 'DraftGenerated' ? 'Draft Ready' : 'In Progress'}
                            </span>
                          </div>
                        </div>
                        
                        {/* THE TRI-SECTOR BASELINE - Precision Baseline Pass */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/10 items-baseline">
                          {/* Sector 1: Intelligence */}
                          <div className="space-y-2">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 leading-none">Intelligence Mapping</p>
                            <div className="flex items-center gap-3 mt-4">
                              <span className="text-[10px] font-medium bg-[var(--primary)]/8 text-[var(--primary)] border border-[var(--primary)]/15 px-2 py-0.5 rounded-md">
                                {c.case_type?.replace(/_/g, ' ') || 'Other'}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Search className="w-3 h-3 opacity-40" />
                                <span>Precedents Matched</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Sector 2: Score */}
                          <div className="space-y-2">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 leading-none">{t('ai_precision_score', 'AI Precision Score')}</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 max-w-[140px] h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: c.ai_precision_score ? `${c.ai_precision_score}%` : c.status === 'AIAnalysisReady' ? '94%' : '30%' }} />
                              </div>
                              <span className="text-[12px] font-bold tabular-nums text-primary">{c.ai_precision_score ? `${c.ai_precision_score}%` : c.status === 'AIAnalysisReady' ? '94%' : '--'}</span>
                            </div>
                          </div>
                          
                          {/* Sector 3: Schedule */}
                          <div className="text-right flex flex-col items-end space-y-2">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-40 leading-none">Hearing Schedule</p>
                            <div className="flex items-center gap-2 text-[13px] font-bold text-primary">
                              <Calendar className="w-4 h-4 opacity-30"/>
                              {c.hearing_date ? new Date(c.hearing_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="opacity-40 italic">Unscheduled</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>

        <aside 
          className={`h-[calc(100vh-64px)] sticky top-[64px] transition-all duration-500 border-l border-border bg-surface flex flex-col ${isAiPanelOpen ? 'w-96 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full overflow-hidden'}`}
        >
          <div className="p-8 border-b border-border flex justify-between items-center bg-muted/10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl shadow-inner shadow-primary/20">
                <Sparkles className="w-5 h-5 text-primary"/>
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight">Cylix Assistant</h3>
                <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest">Enterprise reasoning active</p>
              </div>
            </div>
            <button 
              className="p-2 hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
              onClick={() => setIsAiPanelOpen(false)}
            >
              <ChevronRight className="w-4 h-4"/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
            {focusCase ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="p-6 rounded-2xl bg-primary text-on-primary shadow-xl shadow-primary/20 relative overflow-hidden group border border-white/10">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-70">{t('focus_insight', 'Focus Insight')}</p>
                  <h4 className="text-sm font-bold mb-3 italic leading-relaxed">
                    {`Case ${focusCase.case_number} - Status: ${focusCase.status}. Last updated: ${new Date(focusCase.updated_at).toLocaleDateString()}.`}
                  </h4>
                  <div className="flex items-center gap-2 mt-6">
                    <Verified className="w-4 h-4 text-emerald-300"/>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('standard_verified_mapping', 'Standard Verified Mapping')}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-foreground">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {['Analyze documents', 'Extract citations', 'Generate summary', 'Check similarity'].map((q, i) => (
                      <button 
                        key={i} 
                        className="px-3 py-2 text-[11px] font-bold bg-muted/40 hover:bg-primary/10 hover:text-primary rounded-xl border border-border/50 group transition-all text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-foreground">{t('assistant_interaction', 'Assistant Interaction')}</h4>
                  <div className="space-y-4">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'user' ? 'bg-muted border-border/40' : 'bg-primary/10 border-primary/20'}`}>
                          {msg.role === 'user' ? <User className="w-4 h-4 text-muted-foreground"/> : <Sparkles className="w-4 h-4 text-primary"/>}
                        </div>
                        <div className={`${msg.role === 'user' ? 'bg-muted/20 border-border/20' : 'bg-primary/5 border-primary/10 shadow-sm shadow-primary/5'} p-4 rounded-2xl rounded-tl-none border`}>
                          <p className="text-xs font-medium text-foreground/90 leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isChatLoading && <div className="text-[10px] text-muted-foreground animate-pulse font-bold uppercase tracking-widest">{t('thinking', 'Thinking...')}</div>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-4/5 text-center p-8 opacity-30 grayscale">
                <Terminal className="w-12 h-12 mb-4"/>
                <p className="text-xs font-black uppercase tracking-widest">Select case for analysis</p>
              </div>
            )}
          </div>

          <div className="p-8 border-t border-border bg-muted/10 backdrop-blur-sm">
            <div className="relative group">
              <input 
                type="text"
                placeholder={t('ask_cylix_ai', 'Ask Cylix AI...')}
                className="w-full bg-background border border-border/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 h-12 pl-4 pr-12 rounded-2xl shadow-sm outline-none transition-all placeholder:text-muted-foreground/50 text-sm font-medium"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              />
              <button 
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary text-on-primary rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                onClick={sendChat}
                disabled={isChatLoading}
              >
                <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
            <p className="text-[9px] text-center text-muted-foreground mt-3 font-bold uppercase tracking-widest opacity-40">Reasoning Node 4.0.2</p>
          </div>
        </aside>
      </div>
    </PortalLayout>
  );
}
