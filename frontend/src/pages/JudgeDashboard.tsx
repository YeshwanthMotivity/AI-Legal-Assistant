import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { getJudgeCases, getAnalysis } from '../api/judge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PortalLayout from '../components/layout/PortalLayout';
import { Button } from '@/components/ui/button';
import LanguageToggle from '../components/LanguageToggle';
import { queryKeys } from '../api/queryKeys';

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
  Briefcase,
  ArrowRight,
  Send,
  LayoutDashboard,
  PanelRightClose,
  Scale,
  FileText,
  X
} from 'lucide-react';

function JudgeDashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assistant' | 'snapshot'>('assistant');

  const casesQuery = useQuery({
    queryKey: queryKeys.judgeCases({ limit: 10 }),
    queryFn: () => getJudgeCases({ limit: 10 }),
    refetchInterval: 30000,
  });

  const allCasesQuery = useQuery({
    queryKey: queryKeys.judgeCases({ limit: 100 }),
    queryFn: () => getJudgeCases({ limit: 100 }),
    refetchInterval: 60000,
  });

  const stats = useMemo(() => {
    const items = casesQuery.data?.items ?? [];
    return {
      pending: items.filter(c => c.status !== 'CaseClosed').length,
      ready: items.filter(c => c.status === 'DraftGenerated' || c.status === 'AIAnalysisReady').length,
      urgent: items.filter(c => c.status !== 'CaseClosed' && c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length
    };
  }, [casesQuery.data]);

  const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

  const recentCases = useMemo(() => {
    const items = casesQuery.data?.items ?? [];
    const filteredByLang = items.filter(c => {
      if (c.status === 'CaseClosed') return false;
      const title = c.title || '';
      const desc = c.description || '';
      const hasArabic = isArabic(title) || isArabic(desc);
      
      if (i18n.language.startsWith('ar')) {
        return hasArabic;
      } else {
        return !isArabic(title);
      }
    });

    if (!searchQuery) return filteredByLang;
    const q = searchQuery.toLowerCase();
    return filteredByLang.filter(c => 
      c.title?.toLowerCase().includes(q) || 
      c.case_number?.toLowerCase().includes(q)
    );
  }, [casesQuery.data, searchQuery, i18n.language]);

  const focusCase = useMemo(() => {
    if (selectedCaseId) {
      return (casesQuery.data?.items ?? []).find(c => String(c.id) === String(selectedCaseId)) || recentCases[0];
    }
    return recentCases[0];
  }, [selectedCaseId, recentCases, casesQuery.data]);

  const analysisQuery = useQuery({
    queryKey: ['case-analysis', focusCase?.id],
    queryFn: () => getAnalysis(focusCase?.id as string),
    enabled: !!focusCase?.id,
  });

  const analysis = analysisQuery.data?.analysis;

  const { performance } = useMemo(() => {
    const all = allCasesQuery.data?.items ?? [];
    const resolved = all.filter(c => c.status === 'CaseClosed').length;
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
    
    STRICT CATEGORY FILTER: You ONLY answer questions about the dashboard metrics, case status summary, and general judicial registry overview.
    If the user asks about specific legal advice, unrelated topics, or information not present on the dashboard, politely decline and state: "I'm sorry, I can only assist with dashboard-related metrics and case registry summaries here. Please enter a specific case workspace for deeper legal analysis."
    
    Respond in ${i18n.language === 'ar' ? 'Arabic' : 'English'}. Keep responses concise and professional.`;

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
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.message.content }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: i18n.language === 'ar' ? 'غير قادر على الاتصال بنموذج الذكاء الاصطناعي.' : 'Unable to connect to AI model.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const modules = [
    { label: t('active_cases', 'Active Cases'), desc: t('currently_assigned', 'Currently assigned'), count: stats.pending, icon: Briefcase },
    { label: t('ai_ready', 'AI Ready'), desc: t('ready_for_review', 'Ready for review'), count: stats.ready || 0, icon: Sparkles },
    { label: t('urgent_hearings', 'Urgent Hearings'), desc: t('require_attention', 'Require attention'), count: stats.urgent || 0, icon: AlertTriangle },
    { label: t('performance', 'Performance'), desc: t('archived_cases', 'Archived cases'), progress: Math.round((performance.resolved / performance.total) * 100), icon: BarChart3 },
  ];

  return (
    <PortalLayout 
      title={t('dashboard', 'Dashboard')} 
      subtitle={t('judicial_summary', 'Judicial summary of recent session activity')}
      headerActions={
        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 h-10 px-6 text-[11px] font-black bg-primary text-on-primary rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
            onClick={() => navigate('/judge/cases/new')}
          >
            <Plus className="w-4 h-4"/> {t('create_case', 'Create Case')}
          </button>
        </div>
      }
    >
      <div className={cn("flex flex-1 min-h-0", i18n.language === 'ar' ? "flex-row-reverse text-right" : "flex-row")}>
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8F8F5] overflow-y-auto">
          <div className="p-8 space-y-8 w-full">
            {/* ALERT BANNER */}
            {(stats.urgent > 0 || stats.ready > 0) && (
              <div className="space-y-3">
                {stats.urgent > 0 && (
                  <div className="p-4 bg-white rounded-2xl border border-red-100 shadow-sm flex items-center justify-between border-l-4 border-l-red-500 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                         <AlertTriangle className="w-5 h-5"/>
                      </div>
                      <div>
                         <p className="text-sm font-bold text-foreground">{stats.urgent} {t('urgent_cases_msg', 'cases detected with hearings in less than 7 days.')}</p>
                         <p className="text-[10px] font-black uppercase text-red-500/60 tracking-widest mt-1">
                           {i18n.language === 'ar' ? 'تنبيه: تتطلب هذه القضايا اهتماماً فورياً' : 'High Priority Attention Required'}
                         </p>
                      </div>
                    </div>
                    <button className="h-9 px-6 text-[10px] font-black bg-red-500 text-white rounded-lg uppercase tracking-widest hover:brightness-110 shadow-md shadow-red-500/10 transition-all">{t('review_urgent', 'Review Urgent')}</button>
                  </div>
                )}
              </div>
            )}

            {/* METRICS GRID - Premium Sovereign Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {modules.map((mod, i) => (
                <div 
                  key={i} 
                  className="group bg-white p-8 rounded-[2.5rem] border border-border/60 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-4 opacity-50">{mod.label}</p>
                      <h3 className="text-lg font-black text-foreground tracking-tighter tabular-nums leading-none">
                        {mod.count !== undefined ? String(mod.count).padStart(2, '0') : `${mod.progress}%`}
                      </h3>
                    </div>
                    <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 shadow-inner">
                       <mod.icon className="w-6 h-6"/>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex items-center justify-between relative z-10">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{mod.desc}</span>
                    <div className="h-1 w-12 bg-primary/10 rounded-full overflow-hidden">
                       <div className="h-full bg-primary rounded-full" style={{ width: mod.progress !== undefined ? `${mod.progress}%` : '40%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* CASE LISTING - Registry Interface */}
            <section className="space-y-8 pb-32">
              <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 bg-white/50 p-6 rounded-[2rem] border border-border/40 shadow-sm backdrop-blur-sm">
                <div>
                   <div className="flex items-center gap-3 mb-1.5">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
                         <Scale className="w-4 h-4"/>
                      </div>
                      <h2 className="text-[11px] font-black tracking-tighter text-foreground uppercase">{t('my_cases', 'Judicial Registry')}</h2>
                   </div>
                   <p className={cn(
                     "text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40",
                     i18n.language === 'ar' ? "pr-11" : "pl-11"
                   )}>
                     {recentCases.length} {t('active_dockets', 'Active Dockets Found')}
                   </p>
                </div>
                
                <div className="relative w-full lg:w-[420px] group">
                  <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-primary transition-all group-focus-within:scale-110", i18n.language === 'ar' ? "right-4" : "left-4")}/>
                  <input
                    className={cn(
                      "w-full bg-white border-2 border-border/40 rounded-2xl h-14 text-[12px] font-black focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all placeholder:opacity-30 uppercase tracking-widest antialiased",
                      i18n.language === 'ar' ? "pr-12 pl-4 text-right" : "pl-12 pr-4"
                    )}
                    placeholder={t('quick_search_dockets', 'Identify Session / Case Ref...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </header>

              <div className="grid grid-cols-12 gap-6 items-start">
                {casesQuery.isLoading ? (
                  <div className="col-span-12 p-24 text-center">
                     <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6"/>
                     <p className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">{t('syncing', 'Synchronizing Registry...')}</p>
                  </div>
                ) : recentCases.length === 0 ? (
                  <div className="col-span-12 p-16 text-center text-muted-foreground bg-white rounded-2xl border-2 border-dashed border-border/60 italic text-xs">
                    No matching judicial records identified in current session.
                  </div>
                ) : (
                  recentCases.map((c) => {
                    const isUrgent = c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                    
                    return (
                      <div 
                        key={c.id} 
                        className={cn(
                          "col-span-12 group relative transition-all duration-300",
                          selectedCaseId === c.id ? "scale-[1.01] z-20" : "hover:scale-[1.005]"
                        )}
                        onClick={() => {
                          setSelectedCaseId(c.id);
                          if (!isAiPanelOpen) setIsAiPanelOpen(true);
                        }}
                      >
                        <div className={cn(
                          "absolute top-0 bottom-0 w-1.5 z-10 transition-all duration-300 group-hover:w-3",
                          i18n.language === 'ar' ? "right-0 rounded-r-3xl" : "left-0 rounded-l-3xl",
                          isUrgent ? "bg-red-500" : c.status === 'CaseClosed' ? "bg-emerald-500" : "bg-primary"
                        )} />
                        
                        <div className={cn(
                          "bg-white p-10 rounded-[2.5rem] border shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-500 flex flex-col gap-10 cursor-pointer overflow-hidden backdrop-blur-sm relative",
                          selectedCaseId === c.id ? "border-primary ring-4 ring-primary/5" : "border-border/80 hover:border-primary/40"
                        )}>
                           <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-125 transition-transform duration-1000 rotate-12">
                              <History className="w-32 h-32 text-primary"/>
                           </div>
                           
                           <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10 relative z-10">
                              <div className="space-y-4 max-w-3xl">
                                 <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black font-mono text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/20 tracking-[0.2em]">
                                       {c.case_number || c.id.substring(0, 12).toUpperCase()}
                                    </span>
                                    {isUrgent && (
                                      <span className="flex items-center gap-1.5 text-[9px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-md animate-pulse">
                                         <AlertTriangle className="w-3 h-3"/> PRIORITY S1
                                      </span>
                                    )}
                                 </div>
                                 <h3 className="text-xs font-black text-foreground group-hover:text-primary transition-colors tracking-tighter leading-tight uppercase antialiased">{c.title || 'Untitled Action'}</h3>
                                 <div className="flex flex-wrap items-center gap-6">
                                    <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-xl border border-border/40">
                                       <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-border/60">
                                          <User className="w-3 h-3 text-primary opacity-60"/>
                                       </div>
                                       <span className="text-[11px] font-black text-foreground tracking-tight uppercase">{c.claimant_name ? c.claimant_name.substring(0, 24) : 'Private Litigant'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-xl border border-border/40">
                                       <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-border/60">
                                          <Scale className="w-3 h-3 text-primary opacity-60"/>
                                       </div>
                                       <span className="text-[11px] font-black text-foreground tracking-tight uppercase">{c.case_type?.replace(/_/g, ' ') || 'LABOR'}</span>
                                    </div>
                                 </div>
                              </div>

                              <div className={cn("flex flex-col gap-6 min-w-[240px]", i18n.language === 'ar' ? "items-start" : "items-end")}>
                                 <div className={cn("flex flex-col gap-1.5", i18n.language === 'ar' ? "items-start" : "items-end")}>
                                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic">
                                      {i18n.language === 'ar' ? 'تاريخ الجلسة' : 'Temporal Status'}
                                    </p>
                                    <div className="flex items-center gap-3">
                                       <Calendar className="w-4 h-4 text-primary opacity-40"/>
                                       <span className="text-sm font-black text-foreground tracking-tighter uppercase tabular-nums">
                                          {c.hearing_date ? new Date(c.hearing_date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending Schedule'}
                                       </span>
                                    </div>
                                 </div>
                                 <Button 
                                    className={cn(
                                       "h-12 w-full px-8 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all active:scale-95 group/btn",
                                       isUrgent ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" : c.status === 'CaseClosed' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : "bg-primary shadow-primary/20"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/judge/cases/${c.id}`);
                                    }}
                                 >
                                    {c.status === 'AIAnalysisReady' ? t('judge.dashboard.resumeSynthesis', 'Resume Synthesis') : t('judge.dashboard.enterWorkspace', 'Enter Workspace')} 
                                    <ChevronRight className={cn("w-4 h-4 transition-transform group-hover/btn:translate-x-1", i18n.language === 'ar' ? "mr-3 rotate-180" : "ml-3")}/>
                                 </Button>
                              </div>
                           </div>
                           
                           <div className="pt-8 border-t border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                              <div className="flex items-center gap-10 flex-1">
                                 <div className="flex-1 max-w-[280px]">
                                    <div className="flex justify-between items-center text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-3 opacity-60">
                                       <span>Node Precision Rating</span>
                                       <span>{c.ai_precision_score ? `${c.ai_precision_score}%` : '78%'}</span>
                                    </div>
                                    <div className="h-2 bg-primary/5 rounded-full overflow-hidden border border-primary/5 shadow-inner">
                                       <div 
                                          className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(5,150,105,0.4)]" 
                                          style={{ width: c.ai_precision_score ? `${c.ai_precision_score}%` : '78%' }} 
                                       />
                                    </div>
                                 </div>
                                 <div className="w-[1px] h-10 bg-border/40 hidden md:block" />
                                 <div className="flex items-center gap-4">
                                    <div className={cn(
                                       "w-3 h-3 rounded-full animate-pulse",
                                       c.status === 'AIAnalysisReady' ? "bg-emerald-400" : "bg-primary/40"
                                    )}/>
                                    <div>
                                       <p className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.3em] mb-1">State Vector</p>
                                       <p className="text-[11px] font-black text-foreground uppercase tracking-tight">{c.status}</p>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4 opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all">
                                 <span className="text-[10px] font-black uppercase tracking-widest">Access Case Module</span>
                                 <ArrowRight className="w-4 h-4" />
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

        {/* SIDEBAR */}
        <aside 
          className={cn(
             "h-full bg-white transition-all duration-500 flex flex-col relative",
             i18n.language === 'ar' ? "border-r border-border" : "border-l border-border",
             isAiPanelOpen ? "w-[380px] opacity-100" : "w-0 opacity-0 overflow-hidden"
          )}
        >
          <header className="shrink-0 sticky top-0 z-20 bg-white">
            <div className="px-6 py-6 border-b border-border/40 bg-white/80 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                    <Sparkles className="w-6 h-6"/>
                 </div>
                 <div>
                    <h3 className="text-xs font-black tracking-[0.1em] text-foreground uppercase leading-none">{activeTab === 'assistant' ? 'Assistant Hub' : 'Case Snapshot'}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">{activeTab === 'assistant' ? 'Neural Synthesis Active' : 'Intelligence Ready'}</p>
                    </div>
                 </div>
              </div>
                <button 
                  onClick={() => setIsAiPanelOpen(false)} 
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 w-8 h-16 bg-white border border-border/40 flex items-center justify-center hover:bg-muted transition-all shadow-xl group z-30",
                    i18n.language === 'ar' ? "-right-8 rounded-r-2xl" : "-left-8 rounded-l-2xl"
                  )}
                  title={t('common.close', 'Close')}
                >
                  <ChevronRight className="w-5 h-5 text-primary transition-all group-hover:scale-125"/>
                </button>
            </div>

            <div className="flex border-b border-border/40">
              <button 
                onClick={() => setActiveTab('assistant')}
                className={cn(
                  "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                  activeTab === 'assistant' ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                Assistant
              </button>
              <button 
                onClick={() => setActiveTab('snapshot')}
                className={cn(
                  "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                  activeTab === 'snapshot' ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                Snapshot
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
            {focusCase ? (
               <div className="space-y-10 animate-in fade-in duration-500">
                  {activeTab === 'assistant' ? (
                    <>
                      {/* DASHBOARD OVERVIEW SECTION */}
                      <div className="p-6 bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 rounded-[2rem] relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                            <LayoutDashboard className="w-16 h-16 text-primary"/>
                         </div>
                         <p className="text-[9px] font-black uppercase text-primary tracking-[0.25em] mb-4 opacity-60">Strategic Pulse</p>
                         <p className="text-[11px] font-bold leading-relaxed text-foreground antialiased">
                           Sovereign monitoring active for <span className="text-primary">{stats.pending}</span> dockets. 
                           Intelligence focus identified: <span className="underline decoration-primary/30 underline-offset-4">{focusCase.case_number}</span>.
                         </p>
                         <div className="mt-6 pt-4 border-t border-primary/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <Zap className="w-3.5 h-3.5 text-primary animate-pulse"/>
                               <span className="text-[9px] font-black text-primary uppercase tracking-widest">Synthesis Engine Online</span>
                            </div>
                            <span className="text-[8px] font-black text-muted-foreground/40 uppercase">V2.4.0</span>
                         </div>
                      </div>

                      {/* JUDICIAL ACTIONS - CONTEXTUAL SUGGESTIONS */}
                      <section className="space-y-6">
                         <div className="flex items-center justify-between px-2">
                            <h4 className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.3em]">{t('suggested_queries', 'Suggested Queries')}</h4>
                            <Sparkles className="w-3.5 h-3.5 text-primary/40"/>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                            {[
                               { 
                                 label: i18n.language === 'ar' ? 'حالة القضايا العاجلة' : 'Urgency Outlook', 
                                 q: i18n.language === 'ar' ? 'لخص حالة القضايا العاجلة اليوم' : 'Summarize the status of urgent cases today.', 
                                 icon: AlertTriangle 
                               },
                               { 
                                 label: i18n.language === 'ar' ? 'تحليل الدقة' : 'Precision Audit', 
                                 q: i18n.language === 'ar' ? 'ما هي دقة الذكاء الاصطناعي الإجمالية؟' : 'What is the overall AI precision rating across registry?', 
                                 icon: Verified 
                               },
                               { 
                                 label: i18n.language === 'ar' ? 'قضايا جاهزة' : 'Readiness Report', 
                                 q: i18n.language === 'ar' ? 'أعطني ملخصاً للقضايا الجاهزة للمراجعة' : 'Give me a summary of cases ready for review.', 
                                 icon: Zap 
                               },
                               { 
                                 label: i18n.language === 'ar' ? 'نظرة عامة على الملفات' : 'Registry health', 
                                 q: i18n.language === 'ar' ? 'كيف هو أداء السجل القضائي حالياً؟' : 'How is the judicial registry performing currently?', 
                                 icon: BarChart3 
                               }
                            ].map((act, i) => (
                               <button 
                                 key={i} 
                                 onClick={() => setChatInput(act.q)}
                                 className="group/btn p-4 text-[10px] font-black bg-white border border-border/60 rounded-2xl hover:border-primary/40 hover:bg-primary/5 hover:scale-[1.02] transition-all text-left uppercase tracking-tight leading-4 flex flex-col gap-3 shadow-sm min-h-[110px]"
                               >
                                  <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
                                     <act.icon className="w-4 h-4"/>
                                  </div>
                                  {act.label}
                               </button>
                            ))}
                         </div>
                      </section>

                      {/* DIALOGUE SECTION */}
                      <section className="flex flex-col flex-1 space-y-6">
                         <div className="flex items-center justify-between px-2">
                            <h4 className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.3em]">Dialogue Stream</h4>
                            <div className="flex gap-1">
                               <div className="w-1 h-1 rounded-full bg-primary/20" />
                               <div className="w-1 h-1 rounded-full bg-primary/40" />
                               <div className="w-1 h-1 rounded-full bg-primary/60" />
                            </div>
                         </div>
                         <div className="space-y-5">
                           {chatHistory.length === 0 ? (
                              <div className="flex gap-3 animate-in fade-in duration-700">
                                 <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-3.5 h-3.5 text-primary"/>
                                 </div>
                                 <div className="bg-[#F8F8F5] p-3.5 rounded-2xl rounded-tl-none border border-border/40 shadow-sm">
                                    <p className="text-[11px] font-medium text-foreground/70 italic leading-relaxed">
                                       Ready for judicial discovery. How can I assist with your workspace today?
                                    </p>
                                 </div>
                              </div>
                           ) : (
                              chatHistory.map((msg, i) => (
                                 <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
                                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", msg.role === 'user' ? "bg-muted border-border/40" : "bg-primary/10 border-primary/20")}>
                                       {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-muted-foreground"/> : <Sparkles className="w-3.5 h-3.5 text-primary"/>}
                                    </div>
                                    <div className={cn("p-3.5 rounded-2xl border shadow-sm flex-1", msg.role === 'user' ? "bg-white border-border/60 rounded-tr-none" : "bg-[#F8F8F5] border-border/40 rounded-tl-none")}>
                                       <p className="text-[11px] font-medium text-foreground leading-relaxed">{msg.content}</p>
                                    </div>
                                 </div>
                              ))
                           )}
                           {isChatLoading && <div className="text-[8px] font-black text-primary animate-pulse uppercase tracking-[0.5em]">Processing...</div>}
                         </div>
                      </section>
                    </>
                  ) : (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                       {/* CASE SNAPSHOT CONTENT */}
                       <div className="p-6 bg-white rounded-[2rem] border border-border/60 shadow-sm space-y-6">
                          <header className="flex items-center justify-between pb-4 border-b border-border/40">
                             <div className="flex items-center gap-3">
                                <Scale className="w-4 h-4 text-primary"/>
                                <h4 className="text-[10px] font-black uppercase text-foreground tracking-widest leading-none">Contextual Summary</h4>
                             </div>
                             <span className="text-[9px] font-black px-2 py-0.5 bg-primary/5 text-primary rounded border border-primary/10 uppercase tracking-tighter">{focusCase.status}</span>
                          </header>
                          
                          <div className="space-y-4">
                             <p className="text-[11px] font-medium text-foreground/70 leading-relaxed italic line-clamp-6">
                               {analysis?.summary || focusCase.description || 'Analysis metadata pending for this docket...'}
                             </p>
                             <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                                   <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Claim Value</p>
                                   <p className="text-[11px] font-black text-primary">AED {Number(focusCase.claim_amount || 0).toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                                   <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">Case Type</p>
                                   <p className="text-[11px] font-black text-foreground">{focusCase.case_type || 'CIVIL'}</p>
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* ENTITLEMENTS PREVIEW */}
                       <section className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                             <h4 className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.3em]">Entitlement Matrix</h4>
                             <Zap className="w-3.5 h-3.5 text-primary/40"/>
                          </div>
                          <div className="space-y-3">
                             {analysisQuery.isLoading ? (
                               <div className="p-10 text-center animate-pulse">
                                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"/>
                                  <p className="text-[9px] font-black text-primary uppercase tracking-widest">Hydrating Matrix...</p>
                               </div>
                             ) : (analysis?.entitlementBreakdown || []).length > 0 ? (
                               (analysis?.entitlementBreakdown || []).slice(0, 3).map((item: any, i: number) => (
                                 <div key={i} className="p-4 bg-white rounded-2xl border border-border/60 shadow-sm flex items-center justify-between group hover:border-primary/40 transition-all">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                          <Scale className="w-4 h-4"/>
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-black text-foreground uppercase tracking-tight truncate max-w-[140px]">{item.label || item.name || item.title}</p>
                                          <p className="text-[8px] font-bold text-muted-foreground/40 italic">Statutory Verified</p>
                                       </div>
                                    </div>
                                    <span className="text-[11px] font-black text-primary">AED {Number(item.value || item.amount || 0).toLocaleString()}</span>
                                 </div>
                               ))
                             ) : (
                               <div className="p-8 text-center bg-muted/30 rounded-2xl border border-dashed border-border/40">
                                  <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">No Intelligence Found</p>
                               </div>
                             )}
                          </div>
                       </section>

                       {/* DOCUMENT DOSSIER PREVIEW */}
                       <section className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                             <h4 className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.3em]">Document Dossier</h4>
                             <FileText className="w-3.5 h-3.5 text-primary/40"/>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                             {(focusCase as any).documents_count > 0 ? (
                               <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary border border-primary/10">
                                        <Briefcase className="w-4 h-4"/>
                                     </div>
                                     <p className="text-[10px] font-black uppercase text-foreground">Verified Exhibits</p>
                                  </div>
                                  <span className="text-[10px] font-black text-primary">{(focusCase as any).documents_count} Files</span>
                               </div>
                             ) : (
                               <div className="p-4 bg-muted/20 rounded-2xl border border-dashed border-border/40 text-center">
                                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">No Exhibits Uploaded</p>
                               </div>
                             )}
                          </div>
                       </section>

                       <Button 
                        className="w-full h-12 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-[11px]"
                        onClick={() => navigate(`/judge/cases/${focusCase.id}`)}
                       >
                          Open Detailed Module <ArrowRight className="ml-2 w-4 h-4"/>
                       </Button>
                    </div>
                  )}
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-4/5 text-center p-8 opacity-20">
                  <LayoutDashboard className="w-12 h-12 mb-4"/>
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Awaiting session context</p>
               </div>
            )}
          </div>

          <div className="p-5 border-t border-border/40 bg-white shrink-0">
             <div className="relative group">
                <input 
                  type="text" 
                  placeholder={t('judge.workspace.queryRegistry', 'Query Registry...')} 
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
                    "absolute top-1.5 h-8 w-8 bg-primary text-on-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-40",
                    i18n.language === 'ar' ? "left-1.5" : "right-1.5"
                  )}
                  onClick={sendChat}
                  disabled={isChatLoading || !chatInput.trim()}
                >
                   <Send className={cn("w-3.5 h-3.5 fill-current", i18n.language === 'ar' && "rotate-180")}/>
                </button>
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
  );
}

export default JudgeDashboard;
