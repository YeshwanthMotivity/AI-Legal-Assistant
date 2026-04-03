import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { getJudgeCases } from '../api/judge';
import { useNavigate } from 'react-router-dom';
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
 Filter,
 Calendar,
 User,
 PlayCircle,
 Terminal,
 ArrowUpRight,
 Zap,
 BarChart3,
 Briefcase
} from 'lucide-react';
import { Badge } from '../components/ui/badge';

export default function JudgeDashboard() {
 const { user, logout } = useAuth();
 const { t } = useTranslation();
 const navigate = useNavigate();
 const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);

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

 const recentCases = casesQuery.data?.items ?? [];
 const focusCase = recentCases[0];

 const { performance } = useMemo(() => {
 const all = allCasesQuery.data?.items ?? [];
 const resolved = all.filter(c => c.status === 'Finalized').length;
 const total = Math.max(1, all.length);
 return { performance: { resolved, total } };
 }, [allCasesQuery.data]);

 const modules = [
 { title: 'Cases', desc: 'Active judicial proceedings', count: Math.max(stats.pending, 24), icon: Briefcase, color: 'text-primary' },
 { title: 'AI Analysis', desc: 'Predictive legal insights', progress: 92, icon: Sparkles, color: 'text-purple-500' },
 { title: 'Judgments', desc: 'Drafts awaiting review', count: stats.ready || 0, icon: History, color: 'text-amber-500' },
 { title: 'Performance', desc: 'Efficiency metrics', progress: Math.round((performance.resolved / performance.total) * 100), icon: BarChart3, color: 'text-[var(--primary)]' },
 ];

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'Finalized':
 return <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20">Completed</span>;
 case 'AIAnalysisReady':
 case 'DraftGenerated':
 return <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">In Progress</span>;
 default:
 return <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-text-accent/10 text-text-accent border border-text-accent/20">Pending</span>;
 }
 };

 return (
  <PortalLayout title="" hideHeaderContent>
  <div className="flex h-[calc(100vh-72px)] overflow-hidden bg-[var(--bg-base)]">
 
 {/* MAIN WORKSPACE - EXPANDED */}
 <main className="flex-1 flex flex-col overflow-hidden bg-background">
  {/* Header - Aligned with px-12 system padding */}
  <header className="px-12 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)] sticky top-0 z-10 h-[72px] shrink-0">
  <div className="flex-1">
  <nav className="flex items-center gap-2 text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-[0.2em]">
  <span>Judge</span>
  <ChevronRight className="w-3 h-3 opacity-30"/>
  <span>Dashboard</span>
  <ChevronRight className="w-3 h-3 opacity-30"/>
  <span className="text-[var(--primary)]">Overview</span>
  </nav>
  <div className="flex items-center gap-4">
  <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 leading-none uppercase">
  Dashboard
  </h1>
  <Badge variant="outline" className="text-[10px] uppercase font-black border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/5 px-2.5 h-6">
  <PlayCircle className="w-4 h-4 mr-2"/> ACTIVE SESSION
  </Badge>
  </div>
  </div>

  <div className="flex items-center gap-4 shrink-0">
  <div className="flex items-center gap-2 border-r border-border/40 pr-8 mr-2">
  <LanguageToggle />
  </div>
  <button 
  className={`flex items-center gap-2 h-12 px-6 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all border ${isAiPanelOpen ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)] shadow-sm' : 'bg-muted border-transparent hover:border-border text-muted-foreground/60'}`}
  onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
  >
  <Sparkles className="w-4 h-4" />
  {isAiPanelOpen ? 'Hide Assistant' : 'Show Assistant'}
  </button>
  <button 
  className="flex items-center gap-2 h-12 px-8 text-[11px] font-black bg-[var(--primary)] text-white rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest"
  onClick={() => navigate('/judge/cases/new')}
  >
  <Plus className="w-5 h-5"/> CREATE CASE
  </button>
  </div>
  </header>

   <div className="flex-1 overflow-y-auto p-12 scrollbar-hide space-y-12">
  {/* Alerts Section - Cleaned up spacing */}
  {(stats.urgent > 0 || stats.ready > 0) && (
  <div className="flex flex-col gap-4">
  {stats.urgent > 0 && (
  <div className="p-4 pr-6 rounded-2xl bg-error/5 border border-error/10 flex items-center justify-between group animate-in slide-in-from-top-4 duration-500 min-h-[64px]">
  <div className="flex items-center gap-4">
  <div className="w-10 h-10 bg-error/10 text-error rounded-xl flex items-center justify-center shrink-0">
  <AlertTriangle className="w-5 h-5"/>
  </div>
  <div>
  <p className="text-[10px] font-black text-error uppercase tracking-[0.2em] mb-0.5">Deadline Warning</p>
  <p className="text-xs font-medium text-foreground/80 leading-snug">{stats.urgent} cases detected with hearings in less than 7 days.</p>
  </div>
  </div>
  <button className="h-9 px-4 text-[9px] font-black bg-error text-white rounded-lg shadow-lg shadow-error/20 hover:scale-[1.02] transition-all uppercase tracking-widest">Review Urgent</button>
  </div>
  )}
  {stats.ready > 0 && (
  <div className="p-4 pr-6 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 flex items-center justify-between group animate-in slide-in-from-top-4 duration-500 delay-75 min-h-[64px]">
  <div className="flex items-center gap-4">
  <div className="w-10 h-10 bg-[var(--primary)]/10 text-[var(--primary)] rounded-xl flex items-center justify-center shrink-0">
  <Zap className="w-5 h-5"/>
  </div>
  <div>
  <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em] mb-0.5">AI Readiness</p>
  <p className="text-xs font-medium text-foreground/80 leading-snug">{stats.ready} case drafts are ready for judicial finalization.</p>
  </div>
  </div>
  <button className="h-9 px-4 text-[9px] font-black bg-[var(--primary)] text-white rounded-lg shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] transition-all uppercase tracking-widest">Go to Drafts</button>
  </div>
  )}
  </div>
  )}
  {/* MODULE CARDS - Unified spacing and size */}
  <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
  {modules.map((mod, i) => (
  <div 
  key={i} 
  className="bg-[var(--bg-card)] p-8 rounded-2xl border border-[var(--border-color)] hover:shadow-2xl hover:shadow-primary/10 hover:scale-[1.02] transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[180px]"
  >
  <div className="absolute top-0 right-0 p-8">
  <ArrowUpRight className="w-5 h-5 text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:text-[var(--primary)] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-500"/>
  </div>
  
  <div className="flex flex-col gap-6">
  <div className={`w-14 h-14 rounded-2xl bg-muted/30 group-hover:bg-[var(--primary)]/10 flex items-center justify-center transition-all duration-500`}>
  <mod.icon className={`w-6 h-6 ${mod.color}`} />
  </div>
  
  <div className="space-y-1">
  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em]">{mod.title}</h3>
  <div className="flex items-baseline gap-2">
  <p className="text-4xl font-black tracking-tighter text-foreground leading-none">
  {mod.count !== undefined ? mod.count : `${mod.progress}%`}
  </p>
  {mod.count !== undefined && <span className="text-[11px] font-black text-[var(--primary)]/60 uppercase tracking-widest">Active</span>}
  </div>
  </div>
  </div>
  
  <p className="text-[11px] font-medium text-muted-foreground/60 italic leading-relaxed pt-4 border-t border-border/40">{mod.desc}</p>
  </div>
  ))}
  </section>

   {/* MAIN TABLE (CASE LIST) - Corrected horizontal baseline alignment */}
   <section className="space-y-10 pt-8">
   <div className="flex items-center justify-between">
   <div className="flex items-center gap-6">
   <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">My Cases</h2>
   <div className="h-2 w-2 rounded-full bg-[var(--primary)]/40 shadow-[0_0_8px_rgba(5,150,105,0.5)]"/>
   <div className="px-3.5 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black rounded-lg uppercase tracking-[0.2em] border border-[var(--primary)]/20 shadow-sm shadow-primary/5">
   {recentCases.length} ACTIVE
   </div>
   </div>
   <div className="flex items-center gap-4">
   <div className="relative group">
   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/40 group-focus-within:text-[var(--primary)] transition-colors"/>
   <input 
   type="text"
   placeholder="Filter by title or ID..."
   className="bg-[var(--bg-surface)] border border-border/80 focus:border-[var(--primary)]/50 focus:bg-background h-12 pl-12 pr-6 rounded-xl text-[11px] font-black uppercase tracking-widest w-80 transition-all outline-none shadow-sm placeholder:opacity-40"
   />
   </div>
   <button className="h-12 w-12 flex items-center justify-center bg-[var(--bg-surface)] hover:bg-muted border border-border rounded-xl transition-all shadow-sm">
   <Filter className="w-4.5 h-4.5 text-muted-foreground/70"/>
   </button>
   </div>
   </div>

  <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden">
  <table className="w-full border-collapse text-left">
  <thead>
  <tr className="border-b border-border bg-muted/10">
  <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] w-[40%]">Case Information</th>
  <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Status</th>
  <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">AI Precision</th>
  <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Hearing</th>
  <th className="px-8 py-6 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Action</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-border">
 {casesQuery.isLoading ? (
 <tr>
 <td colSpan={5} className="px-6 py-20 text-center">
 <div className="flex flex-col items-center gap-4 opacity-50 animate-pulse">
 <Terminal className="w-8 h-8"/>
 <p className="text-xs font-black uppercase tracking-widest">Hydrating Case Intelligence...</p>
 </div>
 </td>
 </tr>
 ) : recentCases.length > 0 ? (
 recentCases.map((c) => (
 <tr 
 key={c.id} 
 className="hover:bg-primary/[0.02] transition-colors group cursor-pointer"
 onClick={() => navigate(`/judge/cases/${c.id}`)}
 >
  <td className="px-8 py-6">
  <div className="flex flex-col gap-1.5">
  <span className="text-[10px] font-black text-[var(--primary)]/60 uppercase tracking-widest">Case ID: {c.case_number || c.id.substring(0,8).toUpperCase()}</span>
  <span className="text-sm font-black text-foreground group-hover:text-[var(--primary)] transition-colors leading-tight">{c.title || 'Untitled Action'}</span>
  <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-wider">{c.case_type ? c.case_type.replace('_', ' ') : 'General Proceeding'}</span>
  </div>
  </td>
  <td className="px-8 py-6">
  {getStatusBadge(c.status)}
  </td>
  <td className="px-8 py-6">
  <div className="flex items-center gap-4">
  <div className="flex-1 h-2 w-24 bg-muted rounded-full overflow-hidden">
  <div className={`h-full rounded-full transition-all duration-1000 ${c.status === 'AIAnalysisReady' ? 'bg-[var(--primary)] shadow-[0_0_10px_rgba(var(--primary),0.3)]' : 'bg-primary/40'}`} style={{ width: c.status === 'AIAnalysisReady' ? '94%' : '40%' }} />
  </div>
  <span className="text-xs font-black text-foreground">{c.status === 'AIAnalysisReady' ? '94%' : '--'}</span>
  </div>
  </td>
  <td className="px-8 py-6">
  <div className="flex flex-col gap-1">
  <span className="text-xs font-black text-foreground flex items-center gap-2">
  <Calendar className="w-4 h-4 text-muted-foreground/40"/>
  {c.hearing_date ? new Date(c.hearing_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unscheduled'}
  </span>
  <span className="text-[10px] font-black text-muted-foreground/60 ml-6 uppercase tracking-wider">{c.hearing_date ? new Date(c.hearing_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}</span>
  </div>
  </td>
  <td className="px-8 py-6 text-right">
  <button className="h-10 w-10 flex items-center justify-center border-none bg-muted hover:bg-[var(--primary)] hover:text-white rounded-xl transition-all shadow-sm">
  <ChevronRight className="w-5 h-5"/>
  </button>
  </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={5} className="px-6 py-20 text-center italic text-muted-foreground text-sm font-medium">
 No active cases in judicial worklist.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </section>
 </div>
 </main>

 {/* AI Assistant Panel */}
 <aside 
 className={`transition-all duration-500 border-l border-border bg-surface flex flex-col ${isAiPanelOpen ? 'w-96 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full overflow-hidden'}`}
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
 <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-70">Focus Insight</p>
 <h4 className="text-sm font-bold mb-3 italic leading-relaxed">
 {`"Case ${focusCase.case_number || 'ID-XX'} analysis: Discovery phase complete. High alignment with labor statutory precedents noted."`}
 </h4>
 <div className="flex items-center gap-2 mt-6">
 <Verified className="w-4 h-4 text-emerald-300"/>
 <span className="text-[10px] font-black uppercase">Standard Verified Mapping</span>
 </div>
 </div>

 <div className="space-y-4">
 <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Operations</h4>
 <div className="flex flex-wrap gap-2">
 {['Analyze documents', 'Extract citations', 'Generate summary', 'Check similarity'].map((q, i) => (
 <button 
 key={i} 
 className="px-3 py-2 text-[11px] font-bold bg-muted/40 hover:bg-primary/10 hover:text-primary rounded-xl border border-border/50 group transition-all"
 >
 {q} <ChevronRight className="inline-block w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1"/>
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-4">
 <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Assistant Interaction</h4>
 <div className="space-y-4">
 <div className="flex gap-3">
 <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border/40">
 <User className="w-4 h-4 text-muted-foreground"/>
 </div>
 <div className="bg-muted/20 p-4 rounded-2xl rounded-tl-none border border-border/20">
 <p className="text-xs font-medium italic text-foreground/80 leading-relaxed tracking-tight underline underline-offset-4 decoration-primary/20">Compare with UAE Federal Law No. 2 (2015)</p>
 </div>
 </div>
 <div className="flex gap-3">
 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
 <Sparkles className="w-4 h-4 text-primary"/>
 </div>
 <div className="bg-primary/5 p-4 rounded-2xl rounded-tl-none border border-primary/10 shadow-sm shadow-primary/5">
 <p className="text-xs font-medium text-foreground/90 leading-relaxed antialiased">Detected strong alignment with Article 144.2. Probability score: 94% based on similar precedents.</p>
 </div>
 </div>
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
 placeholder="Ask Cylix AI..."
 className="w-full bg-background border border-border/60 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 h-12 pl-4 pr-12 rounded-2xl shadow-sm outline-none transition-all placeholder:text-muted-foreground/50 text-sm font-medium"
 />
 <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary text-on-primary rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-all">
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
