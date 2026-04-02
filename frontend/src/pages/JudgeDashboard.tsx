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
} from 'lucide-react';
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
          <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between border border-slate-200">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('judge.dashboard.activeCases')}</p>
              <h3 className="font-headline text-4xl font-bold text-secondary">
                {casesQuery.isLoading ? '...' : Math.max(stats.pending, 24)}
              </h3>
            </div>
            <div className="flex items-center mt-4 text-[11px] font-bold text-primary">
              <TrendingUp className="w-4 h-4 mr-1 text-primary" />
              <span>{t('judge.dashboard.fromLastWeek')}</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between border border-slate-200">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('judge.dashboard.pendingJudgments')}</p>
              <h3 className="font-headline text-4xl font-bold text-secondary">
                {casesQuery.isLoading ? '...' : String(stats.ready).padStart(2, '0')}
              </h3>
            </div>
            <div className="flex items-center mt-4 text-[11px] font-bold text-accent">
              <AlertTriangle className="w-4 h-4 mr-1 text-accent" />
              <span>{t('judge.dashboard.urgentReview', { count: stats.urgent })}</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between border border-slate-200">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('judge.dashboard.urgentHearings')}</p>
              <h3 className="font-headline text-4xl font-bold text-secondary">
                {casesQuery.isLoading ? '...' : String(stats.urgent).padStart(2, '0')}
              </h3>
            </div>
            <div className="flex items-center mt-4 text-[11px] font-bold text-slate-500">
              <Clock className="w-4 h-4 mr-1 text-slate-400" />
              <span>{t('judge.dashboard.nextIn')}</span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-between border border-slate-200">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('judge.dashboard.aiAssistance')}</p>
              <h3 className="font-headline text-4xl font-bold text-primary">92%</h3>
            </div>
            <div className="flex items-center mt-4 text-[11px] font-bold text-primary">
              <Sparkles className="w-4 h-4 mr-1 text-primary" />
              <span>{t('judge.dashboard.efficiencyOpt')}</span>
            </div>
          </div>
        </section>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-12 gap-10 items-start">
          
          {/* Left Column (60%) */}
          <div className="col-span-12 lg:col-span-7 space-y-10">
            
            {/* 2. Priority Case Queue */}
            <div className="space-y-6">
              <div className="flex items-baseline justify-between">
                <h4 className="font-headline text-2xl text-primary font-medium">{t('judge.dashboard.priorityQueue')}</h4>
                <span className="text-xs font-medium text-on-surface-variant">{t('judge.dashboard.sortingBy')}</span>
              </div>
              
              <div className="space-y-4">
                {casesQuery.isLoading ? (
                  <div className="p-10 text-center animate-pulse text-on-surface-variant">{t('judge.dashboard.loadingQueue')}</div>
                ) : recentCases.length > 0 ? (
                  recentCases.map((c) => {
                    const isUrgent = c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                    return (
                      <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-primary-light hover:shadow-md transition-all duration-300">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1 block">
                              {t('judge.dashboard.caseIdLabel', { id: c.case_number || c.id.substring(0,8).toUpperCase() })}
                            </span>
                            <h5 className="font-headline text-xl text-secondary font-bold">{c.title || t('judge.dashboard.untitledAction')}</h5>
                          </div>
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight rounded-lg ${
                            isUrgent ? 'bg-terracotta-100 text-terracotta-800' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {isUrgent ? t('judge.dashboard.urgent') : t(`status.${c.status}`)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-1">
                            <p className="text-[11px] text-on-surface-variant font-medium flex items-center">
                              <FileText className="w-3 h-3 mr-1 text-primary" />
                              {t('judge.dashboard.aiInsight', { type: c.case_type ? c.case_type.replace('_', ' ') : t('judge.dashboard.generalDispute') })}
                            </p>
                            <p className="text-[11px] text-on-surface-variant font-medium flex items-center">
                              <History className="w-3 h-3 mr-1 text-primary" />
                              {c.status === 'AIAnalysisReady' ? t('judge.dashboard.precedentsMatched') : t('judge.dashboard.awaitingCompletion')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">{t('judge.dashboard.hearingDate')}</p>
                            <p className="text-sm font-bold text-primary">
                              {c.hearing_date ? new Date(c.hearing_date).toLocaleDateString() : t('judge.dashboard.unscheduled')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 pt-4 border-t border-slate-100">
                          <button 
                            className="text-[11px] font-bold uppercase tracking-widest text-white py-2 px-6 bg-primary hover:bg-emerald-700 rounded-xl transition-colors flex items-center shadow-lg shadow-emerald-900/10"
                            onClick={() => navigate(`/judge/cases/${c.id}`)}
                          >
                            {t('judge.dashboard.openCaseLabel')}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-10 text-center italic text-on-surface-variant">{t('judge.dashboard.emptyQueue')}</div>
                )}
              </div>
            </div>

            {/* 5. Precedent Matching */}
            <div className="flex flex-col space-y-4">
              <h4 className="font-headline text-xl text-secondary font-bold">{t('judge.dashboard.precedentMatching')}</h4>
              <div className="flex-1 flex flex-col space-y-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between border-l-4 border-emerald-600 border border-slate-200">
                  <div>
                    <p className="text-sm font-bold text-secondary">{t('judge.dashboard.stateVsZenith')}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{t('judge.dashboard.contractBreach')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-headline font-bold text-emerald-600">94%</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{t('judge.dashboard.similarity')}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between border-l-4 border-gold border border-slate-200">
                  <div>
                    <p className="text-sm font-bold text-secondary">{t('judge.dashboard.alWaslVsEst')}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{t('judge.dashboard.financialNonDisclosure')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-headline font-bold text-gold">78%</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{t('judge.dashboard.similarity')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Hearing Schedule */}
            <div className="flex flex-col space-y-4">
              <h4 className="font-headline text-xl text-secondary font-bold">{t('judge.dashboard.hearingSchedule')}</h4>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col border border-slate-200">
                <div className="p-4 bg-navy-50 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('judge.dashboard.todayPrefix')} {(new Date()).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="divide-y divide-slate-50 flex-1 flex flex-col">
                  {schedule.length > 0 ? schedule.map((c, i) => (
                    <div key={c.id} className={`p-4 flex items-center space-x-4 ${i === 0 ? 'bg-emerald-50/30' : ''} hover:bg-slate-50 transition-colors cursor-pointer`}>
                      <span className={`text-xs font-bold w-12 text-center ${i === 0 ? 'text-primary' : 'text-slate-400'}`}>
                        {new Date(c.hearing_date!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-secondary truncate w-40">{c.title || c.case_number}</p>
                        <p className={`text-[10px] font-bold uppercase ${i===0 ? 'text-accent' : 'text-slate-400'}`}>
                          {i===0 ? t('judge.dashboard.highPriorityHearing') : t('judge.dashboard.chamberReview')}
                        </p>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${i===0 ? 'bg-accent' : i===2 ? 'bg-gold' : 'bg-slate-200'}`}></span>
                    </div>
                  )) : (
                    <div className="p-4 flex-1 flex items-center justify-center text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('judge.dashboard.noUpcomingHearings')}</div>
                  )}
                </div>
              </div>
            </div>

          </div>
          
          {/* Right Column (40%) */}
          <div className="col-span-12 lg:col-span-5 space-y-10">
            
             <section className="bg-navy-900 p-6 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden group mb-6">
               <div className="flex items-center justify-between mb-4 relative z-10">
                  <h4 className="font-headline text-xl font-bold flex items-center text-primary-light">
                    <Sparkles className="w-5 h-5 mr-2 text-primary-light animate-pulse" /> {t('judge.dashboard.recentActivityLog')}
                  </h4>
               </div>
               <p className="text-sm text-slate-400 italic relative z-10 font-medium">
                 {focusCase ? t('judge.dashboard.systemSynchronized', { id: focusCase.case_number || focusCase.id.substring(0,8) }) : t('judge.dashboard.noActivity')}
               </p>
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            </section>

            {/* 4. Judgment Workflow Tracker */}
            <section className="space-y-4">
              <h4 className="font-headline text-xl text-secondary font-bold">{t('judge.dashboard.judgmentWorkflow')}</h4>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="mb-10 mt-2">
                  <CaseWorkflowStepper status={focusCase?.status} role="judge" />
                </div>
                
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/50 flex flex-col gap-2">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">{t('judge.dashboard.currentTask')}</p>
                  <p className="text-sm font-bold text-secondary">
                    {focusCase ? t('judge.dashboard.workingOn', { title: focusCase.title || focusCase.case_number }) : t('judge.dashboard.awaitingAssignment')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Brain className="w-3.5 h-3.5 text-primary" />
                    <p className="text-[11px] text-slate-500 font-medium italic">{t('judge.dashboard.aiSuggestion')}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 7. Judicial Performance */}
            <div className="flex flex-col space-y-4">
              <h4 className="font-headline text-xl text-secondary font-bold">{t('judge.dashboard.judicialPerformance')}</h4>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('judge.dashboard.casesResolved')}</p>
                      <p className="text-sm font-bold text-secondary">{performance.resolved} / {performance.total}</p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${Math.max(5, (performance.resolved / performance.total) * 100)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('judge.dashboard.avgDecisionTime')}</p>
                      <p className="text-sm font-bold text-secondary">{t('judge.dashboard.days')}</p>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gold w-[75%]"></div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-100 animate-pulse flex items-center justify-between">
                    <div className="flex items-center">
                      <Verified className="text-primary w-4 h-4 mr-2" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{t('judge.dashboard.aiAlignment')}</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{t('judge.dashboard.highP')}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Contextual Floating Action Button (FAB) */}
      <button 
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-300 z-50"
        onClick={() => navigate('/judge/cases/new')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </PortalLayout>
  );
}
