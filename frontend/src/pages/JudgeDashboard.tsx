import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { getJudgeCases } from '../api/judge';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../components/layout/PortalLayout';
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  FileText, 
  History, 
  Eye,
  Check,
  Plus,
  Verified,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import CaseWorkflowStepper from '../components/layout/CaseWorkflowStepper';

export default function JudgeDashboard() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const casesQuery = useQuery({
    queryKey: ['judge-cases'],
    queryFn: () => getJudgeCases({ limit: 5 }),
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

  const { schedule, performance } = useMemo(() => {
    const all = allCasesQuery.data?.items ?? [];
    const sche = all
      .filter(c => c.hearing_date)
      .sort((a, b) => new Date(a.hearing_date!).getTime() - new Date(b.hearing_date!).getTime())
      .slice(0, 3);
    const resolved = all.filter(c => c.status === 'Finalized').length;
    const total = Math.max(1, all.length);
    return { schedule: sche, performance: { resolved, total } };
  }, [allCasesQuery.data]);

  const workflowStep = focusCase 
    ? focusCase.status === 'Created' || focusCase.status === 'DocumentsUploaded' ? 1 
    : focusCase.status === 'AIAnalysisPending' ? 1
    : focusCase.status === 'AIAnalysisReady' || focusCase.status === 'DraftGenerated' ? 2
    : focusCase.status === 'Finalized' ? 4 : 3
    : 1;

  return (
    <PortalLayout title={t('nav.dashboard')} subtitle={t('judge.dashboard.commandCenterSubtitle')}>
      <div className="space-y-10">
          
        {/* 1. Top Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-goated p-8 rounded-[3rem] shadow-sm flex flex-col justify-between border border-white/5 hover:border-text-accent/40 transition-all duration-500 group"
          >
            <div>
              <p className="text-[10px] font-black text-text-accent uppercase tracking-[0.3em] mb-4 opacity-70 group-hover:opacity-100 transition-opacity">{t('judge.dashboard.activeCases')}</p>
              <h3 className="font-headline text-5xl font-bold text-text-heading tracking-tight">
                {casesQuery.isLoading ? '...' : Math.max(stats.pending, 24)}
              </h3>
            </div>
            <div className="flex items-center mt-8 text-[11px] font-black text-text-accent uppercase tracking-widest">
              <TrendingUp className="w-4 h-4 mr-2" />
              <span>{t('judge.dashboard.fromLastWeek')}</span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-goated p-8 rounded-[3rem] shadow-sm flex flex-col justify-between border border-white/5 hover:border-text-accent/40 transition-all duration-500 group"
          >
            <div>
              <p className="text-[10px] font-black text-text-accent uppercase tracking-[0.3em] mb-4 opacity-70 group-hover:opacity-100 transition-opacity">{t('judge.dashboard.pendingJudgments')}</p>
              <h3 className="font-headline text-5xl font-bold text-text-heading tracking-tight">
                {casesQuery.isLoading ? '...' : String(stats.ready).padStart(2, '0')}
              </h3>
            </div>
            <div className="flex items-center mt-8 text-[11px] font-black text-text-accent uppercase tracking-widest">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span>{t('judge.dashboard.urgentReview', { count: stats.urgent })}</span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-goated p-8 rounded-[3rem] shadow-sm flex flex-col justify-between border border-white/5 hover:border-text-accent/40 transition-all duration-500 group"
          >
            <div>
              <p className="text-[10px] font-black text-text-accent uppercase tracking-[0.3em] mb-4 opacity-70 group-hover:opacity-100 transition-opacity">{t('judge.dashboard.urgentHearings')}</p>
              <h3 className="font-headline text-5xl font-bold text-text-heading tracking-tight">
                {casesQuery.isLoading ? '...' : String(stats.urgent).padStart(2, '0')}
              </h3>
            </div>
            <div className="flex items-center mt-8 text-[11px] font-black text-text-muted uppercase tracking-widest leading-none">
              <Clock className="w-4 h-4 mr-2" />
              <span>{t('judge.dashboard.nextIn')}</span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-goated p-8 rounded-[3rem] shadow-sm flex flex-col justify-between border border-white/5 hover:border-text-accent/40 transition-all duration-500 group"
          >
            <div>
              <p className="text-[10px] font-black text-text-accent uppercase tracking-[0.3em] mb-4 opacity-70 group-hover:opacity-100 transition-opacity">{t('judge.dashboard.aiAssistance')}</p>
              <h3 className="font-headline text-5xl font-bold text-text-accent tracking-tighter">92%</h3>
            </div>
            <div className="flex items-center mt-8 text-[11px] font-black text-text-accent uppercase tracking-widest">
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              <span>{t('judge.dashboard.efficiencyOpt')}</span>
            </div>
          </motion.div>
        </section>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-12 gap-10 items-start">
          
          {/* Left Column (60%) */}
          <div className="col-span-12 lg:col-span-7 space-y-10">
            
            {/* 2. Priority Case Queue */}
            <div className="space-y-8">
              <div className="flex items-baseline justify-between mb-4">
                <h4 className="font-headline text-4xl text-text-heading font-bold tracking-tight">{t('judge.dashboard.priorityQueue')}</h4>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-accent opacity-60 mb-1">{t('judge.dashboard.sortingBy')} AI Priority Index</span>
              </div>
              
              <div className="space-y-6">
                {casesQuery.isLoading ? (
                  <div className="p-10 text-center animate-pulse text-text-muted font-bold uppercase tracking-widest">{t('judge.dashboard.loadingQueue')}</div>
                ) : recentCases.length > 0 ? (
                  recentCases.map((c, i) => {
                    const isUrgent = c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        key={c.id} 
                        className="bg-bg-surface p-10 rounded-[3rem] shadow-sm border border-white/5 hover:border-text-accent/40 hover:shadow-xl transition-all duration-500 group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-text-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div>
                            <span className="text-[11px] font-black text-text-accent tracking-[0.4em] uppercase mb-3 block opacity-70">
                              {t('judge.dashboard.caseIdLabel', { id: c.case_number || c.id.substring(0,8).toUpperCase() })}
                            </span>
                            <h5 className="font-headline text-3xl text-text-heading font-bold tracking-tight mb-2">{c.title || t('judge.dashboard.untitledAction')}</h5>
                          </div>
                          <span className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm border backdrop-blur-md ${
                            isUrgent ? 'bg-danger/20 text-white border-danger/30' : 'bg-success/20 text-white border-success/30'
                          }`}>
                            {isUrgent ? t('judge.dashboard.urgent') : t(`status.${c.status}`)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8 relative z-10">
                          <div className="space-y-3">
                            <p className="text-[12px] text-text-secondary font-black flex items-center tracking-wide uppercase opacity-80">
                              <FileText className="w-4 h-4 mr-3 text-text-accent" />
                              {t('judge.dashboard.aiInsight', { type: c.case_type ? c.case_type.replace('_', ' ') : t('judge.dashboard.generalDispute') })}
                            </p>
                            <p className="text-[12px] text-text-secondary font-black flex items-center tracking-wide uppercase opacity-80">
                              <History className="w-4 h-4 mr-3 text-text-accent" />
                              {c.status === 'AIAnalysisReady' ? t('judge.dashboard.precedentsMatched') : t('judge.dashboard.awaitingCompletion')}
                            </p>
                          </div>
                          <div className="md:text-right border-l md:border-l-0 md:border-r border-white/5 pr-8">
                            <p className="text-[10px] text-text-accent font-black uppercase tracking-[0.3em] mb-2 opacity-60 font-sans">{t('judge.dashboard.hearingDate')}</p>
                            <p className="text-2xl font-headline font-bold text-text-heading">
                              {c.hearing_date ? new Date(c.hearing_date).toLocaleDateString() : t('judge.dashboard.unscheduled')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6 pt-8 border-t border-white/5 relative z-10">
                          <button 
                            className="text-[11px] font-black uppercase tracking-[0.4em] text-white py-4 px-10 btn-royal-shine rounded-2xl transition-all flex items-center gap-3 active:scale-95"
                            onClick={() => navigate(`/judge/cases/${c.id}`)}
                          >
                            {t('judge.dashboard.openCaseLabel')}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="p-10 text-center italic text-text-secondary font-bold tracking-widest glass-goated rounded-[2rem]">{t('judge.dashboard.emptyQueue')}</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Intelligence Sidebar — 4/12 Split) */}
          <div className="col-span-12 lg:col-span-4 space-y-10">
            
            {/* System Health Module (Goated) */}
             <motion.section 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="glass-goated p-10 rounded-[3rem] border border-white/10 relative overflow-hidden group shadow-2xl"
             >
               <div className="flex items-center justify-between mb-8 relative z-10">
                  <h4 className="font-headline text-2xl font-bold flex items-center text-text-heading tracking-tight">
                    <Sparkles className="w-6 h-6 mr-4 text-text-accent animate-pulse" /> {t('common.ai_engine')}
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-success animate-ping" />
                    <span className="text-[11px] font-black text-success uppercase tracking-widest">Sovereign</span>
                  </div>
               </div>
               
               <div className="space-y-8 relative z-10">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Latency</p>
                      <p className="text-3xl font-headline font-bold text-text-accent tracking-tighter">142ms</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Accuracy</p>
                      <p className="text-3xl font-headline font-bold text-text-heading tracking-tighter">98.4%</p>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                   <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-text-secondary opacity-60">
                     <span>Resource Load</span>
                     <span>92%</span>
                   </div>
                   <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: '92%' }}
                       transition={{ duration: 1, ease: "easeOut" }}
                       className="h-full bg-text-accent"
                     />
                   </div>
                 </div>

                 <p className="text-[12px] text-text-secondary font-medium italic leading-relaxed opacity-80 border-l-2 border-text-accent/30 pl-4 py-1 font-serif">
                   {t('judge.judgment.aiReasoningDesc')}
                 </p>
               </div>
               <div className="absolute inset-0 bg-text-accent opacity-0 group-hover:opacity-[0.05] transition-opacity duration-1000 blur-3xl pointer-events-none" />
            </motion.section>

            {/* Precedent Intelligence */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-bg-surface p-10 rounded-[3rem] border border-border-subtle shadow-lg space-y-8"
            >
              <div className="flex items-center gap-5 border-b border-white/5 pb-8">
                <div className="p-4 rounded-2xl bg-text-accent/10 border border-text-accent/20">
                  <Brain className="w-8 h-8 text-text-accent" />
                </div>
                <div>
                  <h4 className="font-headline text-2xl font-bold text-text-heading tracking-tight">{t('judge.workspace.aiReasoningNode')}</h4>
                  <p className="text-[10px] font-black text-text-accent uppercase tracking-[0.4em] opacity-60 italic">Contextual Map</p>
                </div>
              </div>

              <div className="space-y-8">
                <p className="text-[13px] text-text-secondary font-black uppercase tracking-widest leading-relaxed opacity-70">
                  {focusCase ? t('judge.dashboard.systemSynchronized', { id: focusCase.case_number || focusCase.id.substring(0,8) }) : t('judge.dashboard.noActivity')}
                </p>
                
                <div className="space-y-6">
                  {[
                    { title: t('judge.dashboard.stateVsZenith'), match: '94%', tags: [t('judge.dashboard.contractBreach')] },
                    { title: t('judge.dashboard.alWaslVsEst'), match: '78%', tags: [t('judge.dashboard.financialNonDisclosure')] }
                  ].map((pre, i) => (
                    <div key={i} className="p-6 rounded-[2rem] bg-bg-base/40 border border-white/5 space-y-4 group cursor-pointer hover:border-text-accent/50 hover:-translate-y-1 transition-all duration-300">
                      <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.2em] text-text-accent">
                        <span>Precedent Match</span>
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-text-accent animate-pulse" />
                          {pre.match}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-text-heading leading-snug group-hover:text-text-accent transition-colors font-serif italic">
                        {pre.title}
                      </p>
                      <div className="flex gap-2">
                        {pre.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 border border-white/10 text-text-muted">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* Hearing Schedule updated to Goated style */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-bg-surface rounded-[3rem] border border-border-subtle shadow-xl overflow-hidden"
            >
              <div className="p-8 bg-text-accent/5 border-b border-white/5">
                <h4 className="text-[11px] font-black text-text-accent uppercase tracking-[0.4em] mb-2">{t('judge.dashboard.hearingSchedule')}</h4>
                <p className="text-xl font-headline font-bold text-text-heading italic">
                 {(new Date()).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="divide-y divide-white/5">
                {schedule.length > 0 ? schedule.map((c, i) => (
                  <div key={c.id} className={`p-8 flex items-center gap-6 ${i === 0 ? 'bg-text-accent/[0.03]' : ''} hover:bg-white/[0.02] transition-colors cursor-pointer group`}>
                    <div className="flex flex-col items-center">
                      <span className={`text-sm font-black tracking-widest ${i === 0 ? 'text-text-accent' : 'text-text-muted'}`}>
                        {new Date(c.hearing_date!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-text-heading truncate group-hover:text-text-accent transition-colors tracking-tight">{c.title || c.case_number}</p>
                      <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${i===0 ? 'text-text-accent' : 'text-text-muted'} opacity-60`}>
                        {i===0 ? t('judge.dashboard.highPriorityHearing') : t('judge.dashboard.chamberReview')}
                      </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${i===0 ? 'bg-text-accent animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.5)]' : 'bg-white/10'}`} />
                  </div>
                )) : (
                  <div className="p-10 text-center text-[10px] font-black text-text-muted uppercase tracking-[0.3em] font-serif italic">{t('judge.dashboard.noUpcomingHearings')}</div>
                )}
              </div>
            </motion.section>

          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB - Goated Gold) */}
      <motion.button 
        whileHover={{ scale: 1.1, translateY: -5 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-12 right-12 w-20 h-20 btn-royal-shine text-white rounded-full flex items-center justify-center z-50 shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_50px_rgba(212,175,55,0.5)] transition-all duration-500"
        onClick={() => navigate('/judge/cases/new')}
      >
        <Plus className="w-10 h-10" />
      </motion.button>
    </PortalLayout>
  );
}
