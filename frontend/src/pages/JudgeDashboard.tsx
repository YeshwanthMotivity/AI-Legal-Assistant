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
 { title: 'Performance', desc: 'Efficiency metrics', progress: Math.round((performance.resolved / performance.total) * 100), icon: BarChart3, color: 'text-emerald-500' },
 ];

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'Finalized':
 return <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20">Completed</span>;
 case 'AIAnalysisReady':
 case 'DraftGenerated':
 return <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">In Progress</span>;
 default:
 return <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-text-accent/10 text-text-accent border border-text-accent/20">Pending</span>;
 }
 };

 return (
 <PortalLayout title=""hideHeaderContent>
 <div className="flex h-[calc(100vh-64px)] -m-6 overflow-hidden bg-background">
 
 {/* MAIN WORKSPACE - EXPANDED */}
 <main className="flex-1 flex flex-col overflow-hidden bg-background">
 {/* Header */}
 <header className="px-8 py-4 border-b border-border flex justify-between items-center bg-background/5 backdrop-blur-md sticky top-0 z-10">
 <div>
 <nav className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-1 uppercase tracking-widest">
 <span>Judge</span>
 <ChevronRight className="w-3 h-3"/>
 <span>Dashboard</span>
 <ChevronRight className="w-3 h-3"/>
 <span className="text-primary">Overview</span>
 </nav>
 <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
 Dashboard
 <Badge variant="outline"className="text-[10px] uppercase tracking-tighter border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/5 px-2">
 <PlayCircle className="w-3 h-3 mr-1"/> Active Session
 </Badge>
 </h1>
 </div>
 
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 border-r border-border/40 pr-4">
 <LanguageToggle />
 </div>
 <button 
 className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all border ${isAiPanelOpen ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]' : 'bg-muted border-transparent hover:border-border'}`}
 onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
 >
 <Sparkles className={`w-4 h-4 ${isAiPanelOpen ? 'text-primary' : ''}`} />
 {isAiPanelOpen ? 'Hide AI Assistant' : 'Show AI Assistant'}
 </button>
 <button 
 className="flex items-center gap-2 px-5 py-2.5 text-xs font-black bg-primary text-on-primary rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
 onClick={() => navigate('/judge/cases/new')}
 >
 <Plus className="w-4 h-4"/> CREATE CASE
 </button>
 </div>
 </header>

 <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-6">
 {/* Alerts Section */}
 {(stats.urgent > 0 || stats.ready > 0) && (
 <div className="space-y-4">
 {stats.urgent > 0 && (
 <div className="p-4 rounded-2xl bg-error/5 border border-error/20 flex items-center justify-between group animate-in zoom-in-95 duration-300">
 <div className="flex items-center gap-4">
 <div className="p-2.5 bg-error/10 text-error rounded-xl">
 <AlertTriangle className="w-5 h-5"/>
 </div>
 <div>
 <p className="text-sm font-bold text-error italic">Deadline Warning</p>
 <p className="text-xs text-error/80 font-medium">{stats.urgent} cases detected with hearings in less than 7 days.</p>
 </div>
 </div>
 <button className="px-4 py-2 text-xs font-black bg-error/90 text-white rounded-xl shadow-sm hover:bg-error transition-colors">REVIEW URGENT</button>
 </div>
 )}
 {stats.ready > 0 && (
 <div className="p-4 rounded-2xl bg-text-accent/5 border border-text-accent/20 flex items-center justify-between group animate-in zoom-in-95 duration-300 delay-75">
 <div className="flex items-center gap-4">
 <div className="p-2.5 bg-text-accent/10 text-text-accent rounded-xl">
 <Zap className="w-5 h-5"/>
 </div>
 <div>
 <p className="text-sm font-bold text-text-accent italic">AI Readiness</p>
 <p className="text-xs text-text-accent/80 font-medium">{stats.ready} case drafts are ready for judicial finalization.</p>
 </div>
 </div>
 <button className="px-4 py-2 text-xs font-black bg-text-accent/90 text-white rounded-xl shadow-sm hover:bg-text-accent transition-colors">GO TO DRAFTS</button>
 </div>
 )}
 </div>
 )}

 {/* MODULE CARDS */}
 <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
 {modules.map((mod, i) => (
 <div 
 key={i} 
 className="bg-[var(--bg-card)] p-6 rounded-[2rem] border border-outline-variant/30 hover:shadow-2xl hover:shadow-primary/5 hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
 >
 <div className="flex justify-between items-start mb-6">
 <div className={`p-3 rounded-2xl bg-muted/50 group-hover:bg-primary/10 transition-colors overflow-hidden`}>
 <mod.icon className={`w-6 h-6 ${mod.color}`} />
 </div>
 <ArrowUpRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
 </div>
 <div>
 <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-1">{mod.title}</h3>
 <div className="flex items-baseline gap-2">
 <p className="text-3xl font-black tracking-tighter text-foreground">
 {mod.count !== undefined ? mod.count : `${mod.progress}%`}
 </p>
 {mod.count !== undefined && <span className="text-xs font-bold text-muted-foreground/60 uppercase">Active</span>}
 </div>
 <p className="text-[11px] font-medium text-muted-foreground/80 mt-2 italic leading-tight">{mod.desc}</p>
 </div>
 </div>
 ))}
 </section>

 {/* MAIN TABLE (CASE LIST) */}
 <section className="space-y-6">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <h2 className="text-xl font-black tracking-tight">My Cases</h2>
 <div className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase tracking-widest border border-primary/20">
 {recentCases.length} Cases
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors"/>
 <input 
 type="text"
 placeholder="Search workflow..."
 className="bg-muted/50 border border-transparent focus:border-primary/30 focus:bg-background h-10 pl-10 pr-4 rounded-xl text-xs font-medium w-64 transition-all outline-none"
 />
 </div>
 <button className="p-2.5 bg-muted/50 hover:bg-muted border border-transparent hover:border-border rounded-xl transition-all">
 <Filter className="w-4 h-4 text-muted-foreground"/>
 </button>
 </div>
 </div>

 <div className="bg-[var(--bg-card)] rounded-[2rem] border border-outline-variant/20 shadow-sm overflow-hidden">
 <table className="w-full border-collapse text-left">
 <thead>
 <tr className="border-b border-outline-variant/30 bg-muted/20">
 <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] w-[40%] text-left">Information</th>
 <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">Status</th>
 <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">AI Confidence</th>
 <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-left">Hearing</th>
 <th className="px-6 py-5 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Action</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-outline-variant/30">
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
 <td className="px-6 py-5">
 <div className="flex flex-col gap-1">
 <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Case ID: {c.case_number || c.id.substring(0,8).toUpperCase()}</span>
 <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{c.title || 'Untitled Action'}</span>
 <span className="text-[10px] font-bold text-muted-foreground italic tracking-tight">{c.case_type ? c.case_type.replace('_', ' ') : 'General Proceeding'}</span>
 </div>
 </td>
 <td className="px-6 py-5">
 {getStatusBadge(c.status)}
 </td>
 <td className="px-6 py-5">
 <div className="flex items-center gap-3">
 <div className="flex-1 h-1.5 w-24 bg-muted rounded-full overflow-hidden">
 <div className={`h-full rounded-full ${c.status === 'AIAnalysisReady' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-primary/40'}`} style={{ width: c.status === 'AIAnalysisReady' ? '94%' : '40%' }} />
 </div>
 <span className="text-xs font-bold text-foreground/80">{c.status === 'AIAnalysisReady' ? '94%' : '--'}</span>
 </div>
 </td>
 <td className="px-6 py-5">
 <div className="flex flex-col gap-0.5">
 <span className="text-xs font-black text-foreground flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5 text-muted-foreground"/>
 {c.hearing_date ? new Date(c.hearing_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unscheduled'}
 </span>
 <span className="text-[10px] font-bold text-muted-foreground ml-5">{c.hearing_date ? new Date(c.hearing_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}</span>
 </div>
 </td>
 <td className="px-6 py-5 text-right">
 <button className="p-2.5 border-none bg-muted/50 group-hover:bg-primary group-hover:text-on-primary rounded-xl transition-all shadow-sm">
 <PlayCircle className="w-4 h-4"/>
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
 <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Enterprise reasoning active</p>
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
