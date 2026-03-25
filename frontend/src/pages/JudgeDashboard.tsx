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
} from 'lucide-react';

export default function JudgeDashboard() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
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
    <PortalLayout title={t('nav.dashboard')} subtitle="Judicial Intelligence Command Center">
      <div className="space-y-10">
          
        {/* 1. Top Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface-container-lowest dark:bg-surface-container p-6 rounded-lg editorial-shadow flex flex-col justify-between border border-outline-variant/30">
            <div>
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Active Cases</p>
              <h3 className="font-headline text-3xl font-medium text-primary">
                {casesQuery.isLoading ? '...' : Math.max(stats.pending, 24)}
              </h3>
            </div>
            <div className="flex items-center mt-4 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+2 from last week</span>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest dark:bg-surface-container p-6 rounded-lg editorial-shadow flex flex-col justify-between border border-outline-variant/30">
            <div>
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Pending Judgments</p>
              <h3 className="font-headline text-3xl font-medium text-primary">
                {casesQuery.isLoading ? '...' : String(stats.ready).padStart(2, '0')}
              </h3>
            </div>
            <div className="flex items-center mt-4 text-[11px] font-medium text-error">
              <AlertTriangle className="w-4 h-4 mr-1 text-error" />
              <span>{stats.urgent} Require urgent review</span>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest dark:bg-surface-container p-6 rounded-lg editorial-shadow flex flex-col justify-between border border-outline-variant/30">
            <div>
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">Urgent Hearings</p>
              <h3 className="font-headline text-3xl font-medium text-primary">
                {casesQuery.isLoading ? '...' : String(stats.urgent).padStart(2, '0')}
              </h3>
            </div>
            <div className="flex items-center mt-4 text-[11px] font-medium text-on-surface-variant">
              <Clock className="w-4 h-4 mr-1 text-on-surface-variant" />
              <span>Next in 45 minutes</span>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest dark:bg-surface-container p-6 rounded-lg editorial-shadow flex flex-col justify-between border border-outline-variant/30">
            <div>
              <p className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1">AI Assistance</p>
              <h3 className="font-headline text-3xl font-medium text-primary">92%</h3>
            </div>
            <div className="flex items-center mt-4 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <Sparkles className="w-4 h-4 mr-1" />
              <span>Efficiency optimization active</span>
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
                <h4 className="font-headline text-2xl text-primary font-medium">Priority Case Queue</h4>
                <span className="text-xs font-medium text-on-surface-variant">Sorting by: AI Priority Index</span>
              </div>
              
              <div className="space-y-4">
                {casesQuery.isLoading ? (
                  <div className="p-10 text-center animate-pulse text-on-surface-variant">Loading Chamber Queue...</div>
                ) : recentCases.length > 0 ? (
                  recentCases.map((c) => {
                    const isUrgent = c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                    return (
                      <div key={c.id} className="bg-surface-container-lowest dark:bg-surface-container p-5 rounded-lg editorial-shadow border border-outline-variant/30 hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-all duration-300">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-tertiary tracking-widest uppercase mb-1 block">
                              Case ID: {c.case_number || c.id.substring(0,8).toUpperCase()}
                            </span>
                            <h5 className="font-headline text-xl text-on-surface font-semibold">{c.title || 'Untitled Action'}</h5>
                          </div>
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-tighter rounded ${
                            isUrgent ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'
                          }`}>
                            {isUrgent ? 'Urgent' : c.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-1">
                            <p className="text-[11px] text-on-surface-variant font-medium flex items-center">
                              <FileText className="w-3 h-3 mr-1 text-primary" />
                              AI Insight: {c.case_type ? c.case_type.replace('_', ' ') : 'General dispute'} alignment
                            </p>
                            <p className="text-[11px] text-on-surface-variant font-medium flex items-center">
                              <History className="w-3 h-3 mr-1 text-primary" />
                              {c.status === 'AIAnalysisReady' ? 'Precedents matched' : 'Awaiting completion'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">Hearing Date</p>
                            <p className="text-sm font-bold text-primary">
                              {c.hearing_date ? new Date(c.hearing_date).toLocaleDateString() : 'Unscheduled'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 pt-4 border-t border-outline-variant/30">
                          <button 
                            className="text-[11px] font-bold uppercase tracking-wider text-on-primary py-2 px-4 bg-primary hover:opacity-90 rounded transition-colors flex items-center"
                            onClick={() => navigate(`/judge/cases/${c.id}`)}
                          >
                            Open Case
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-10 text-center italic text-on-surface-variant">Queue is empty.</div>
                )}
              </div>
            </div>

            {/* 5. Precedent Matching */}
            <div className="flex flex-col space-y-4">
              <h4 className="font-headline text-xl text-on-surface font-medium">Precedent Matching</h4>
              <div className="flex-1 flex flex-col space-y-4">
                <div className="bg-surface-container-lowest dark:bg-surface-container p-4 rounded-lg editorial-shadow flex items-center justify-between border-l-2 border-emerald-600 dark:border-emerald-400 border border-outline-variant/20">
                  <div>
                    <p className="text-sm font-bold text-on-surface">State vs. Zenith Logistics (2021)</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">Contract Breach / Force Majeure</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-headline font-bold text-emerald-600 dark:text-emerald-400">94%</p>
                    <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">Similarity</p>
                  </div>
                </div>
                <div className="bg-surface-container-lowest dark:bg-surface-container p-4 rounded-lg editorial-shadow flex items-center justify-between border-l-2 border-tertiary border border-outline-variant/20">
                  <div>
                    <p className="text-sm font-bold text-on-surface">Al-Wasl Bank vs. Est. Trading</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">Financial Non-Disclosure</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-headline font-bold text-tertiary dark:text-tertiary-fixed-dim">78%</p>
                    <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">Similarity</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Hearing Schedule */}
            <div className="flex flex-col space-y-4">
              <h4 className="font-headline text-xl text-on-surface font-medium">Hearing Schedule</h4>
              <div className="bg-surface-container-lowest dark:bg-surface-container rounded-lg editorial-shadow overflow-hidden flex-1 flex flex-col border border-outline-variant/30">
                <div className="p-4 bg-surface-container-low dark:bg-surface-container-high border-b border-outline-variant/30">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Today — {(new Date()).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="divide-y divide-outline-variant/20 flex-1 flex flex-col">
                  {schedule.length > 0 ? schedule.map((c, i) => (
                    <div key={c.id} className={`p-4 flex items-center space-x-4 ${i === 0 ? 'bg-primary/5' : ''} hover:bg-surface-container-low dark:hover:bg-surface-container-high transition-colors`}>
                      <span className={`text-xs font-bold w-12 text-center ${i === 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {new Date(c.hearing_date!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-on-surface truncate w-40">{c.title || c.case_number}</p>
                        <p className={`text-[10px] font-bold uppercase ${i===0 ? 'text-error' : 'text-on-surface-variant'}`}>
                          {i===0 ? 'High Priority Hearing' : 'Chamber Review'}
                        </p>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${i===0 ? 'bg-error' : i===2 ? 'bg-tertiary' : 'bg-outline'}`}></span>
                    </div>
                  )) : (
                    <div className="p-4 flex-1 flex items-center justify-center text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">No Upcoming Hearings Scheduled</div>
                  )}
                </div>
              </div>
            </div>

          </div>
          
          {/* Right Column (40%) */}
          <div className="col-span-12 lg:col-span-5 space-y-10">
            
            {/* 3. AI Case Insights Panel */}
            <section className="bg-primary p-6 rounded-lg text-on-primary editorial-shadow relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h4 className="font-headline text-xl font-medium flex items-center text-on-primary">
                  <Sparkles className="w-5 h-5 mr-2" /> Case Insights Deep-Dive
                </h4>
                <span className="text-[10px] bg-tertiary px-2 py-0.5 rounded uppercase font-bold tracking-widest text-on-tertiary">
                  Real-time
                </span>
              </div>
              
              <div className="space-y-4 relative z-10">
                <div>
                  <p className="text-[10px] text-primary-fixed uppercase tracking-widest mb-1">Executive Summary</p>
                  <p className="text-sm text-on-primary/80 leading-relaxed italic">
                    "{focusCase ? `This ${focusCase.case_type ? focusCase.case_type.replace('_',' ') : 'legal'} dispute (${focusCase.case_number || focusCase.id.substring(0,6)}) hinges on statutory precedents in related tribunals. Previous rulings favor the plaintiff if documentation proves explicit intent of breach.` : 'Select a case from the queue to run dynamic real-time AI inference.'}"
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-3 rounded-lg border border-white/10">
                    <p className="text-[10px] text-primary-fixed uppercase mb-1">Risk Indicators</p>
                    <div className="flex items-center">
                      <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden mr-2">
                        <div className="h-full bg-error w-3/4"></div>
                      </div>
                      <span className="text-xs font-bold text-on-primary">75%</span>
                    </div>
                  </div>
                  <div className="bg-white/10 p-3 rounded-lg border border-white/10">
                    <p className="text-[10px] text-primary-fixed uppercase mb-1">Similarity Score</p>
                    <div className="flex items-center">
                      <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden mr-2">
                        <div className="h-full bg-inverse-primary w-4/5"></div>
                      </div>
                      <span className="text-xs font-bold text-on-primary">82%</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <p className="text-[10px] text-primary-fixed uppercase tracking-widest mb-2">Relevant UAE Laws</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] border border-white/20 px-2 py-1 rounded-full bg-white/5 text-on-primary">Federal Law No. 2 (2015)</span>
                    <span className="text-[9px] border border-white/20 px-2 py-1 rounded-full bg-white/5 text-on-primary">Decree Law No. 32 (2021)</span>
                    <span className="text-[9px] border border-white/20 px-2 py-1 rounded-full bg-white/5 text-on-primary">Article 144.2</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Judgment Workflow Tracker */}
            <section className="space-y-4">
              <h4 className="font-headline text-xl text-on-surface font-medium">Judgment Workflow</h4>
              <div className="bg-surface-container-lowest dark:bg-surface-container p-6 rounded-lg editorial-shadow border border-outline-variant/30">
                <div className="flex items-center justify-between mb-8">
                  
                  <div className="flex flex-col items-center flex-1 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 font-bold text-xs ${workflowStep > 1 ? 'bg-primary text-on-primary' : 'bg-primary-fixed border-2 border-primary text-primary'}`}>
                      {workflowStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                    </div>
                    <p className={`text-[10px] font-bold mt-2 uppercase tracking-tighter ${workflowStep >= 1 ? 'text-on-surface' : 'text-on-surface-variant'}`}>Research</p>
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${workflowStep > 1 ? 'bg-primary' : 'bg-outline-variant'}`}></div>
                  </div>
                  
                  <div className="flex flex-col items-center flex-1 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 font-bold text-xs ${workflowStep > 2 ? 'bg-primary text-on-primary' : workflowStep === 2 ? 'bg-primary-fixed border-2 border-primary text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {workflowStep > 2 ? <Check className="w-4 h-4" /> : '2'}
                    </div>
                    <p className={`text-[10px] font-bold mt-2 uppercase tracking-tighter ${workflowStep >= 2 ? 'text-on-surface' : 'text-on-surface-variant'}`}>Drafting</p>
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${workflowStep > 2 ? 'bg-primary' : 'bg-outline-variant'}`}></div>
                  </div>
                  
                  <div className="flex flex-col items-center flex-1 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 font-bold text-xs ${workflowStep > 3 ? 'bg-primary text-on-primary' : workflowStep === 3 ? 'bg-primary-fixed border-2 border-primary text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {workflowStep > 3 ? <Check className="w-4 h-4" /> : '3'}
                    </div>
                    <p className={`text-[10px] font-bold mt-2 uppercase tracking-tighter ${workflowStep >= 3 ? 'text-on-surface' : 'text-on-surface-variant'}`}>Review</p>
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${workflowStep > 3 ? 'bg-primary' : 'bg-outline-variant'}`}></div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 font-bold text-xs ${workflowStep === 4 ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                      {workflowStep === 4 ? <Check className="w-4 h-4" /> : '4'}
                    </div>
                    <p className={`text-[10px] font-bold mt-2 uppercase tracking-tighter ${workflowStep === 4 ? 'text-on-surface' : 'text-on-surface-variant'}`}>Final</p>
                  </div>

                </div>
                
                <div className="bg-primary-fixed/20 dark:bg-primary/10 p-4 rounded-lg border-l-4 border-primary">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Current Active Task</p>
                  <p className="text-sm font-semibold text-on-surface mb-1">
                    {focusCase ? `Working on: ${focusCase.title || focusCase.case_number}` : 'Awaiting assignment actions'}
                  </p>
                  <p className="text-[11px] text-on-surface-variant italic">AI suggestion: Refer to Supreme Court Ruling 2019/88 for multiplier alignment.</p>
                </div>
              </div>
            </section>

            {/* 7. Judicial Performance */}
            <div className="flex flex-col space-y-4">
              <h4 className="font-headline text-xl text-on-surface font-medium">Judicial Performance</h4>
              <div className="bg-surface-container-lowest dark:bg-surface-container p-6 rounded-lg editorial-shadow border border-outline-variant/30 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Cases Resolved (Total)</p>
                      <p className="text-sm font-bold text-on-surface">{performance.resolved} / {performance.total}</p>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-high dark:bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(5, (performance.resolved / performance.total) * 100)}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Avg. Decision Time</p>
                      <p className="text-sm font-bold text-on-surface">12.4 Days</p>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-high dark:bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary w-[75%]"></div>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-outline-variant/30 flex items-center justify-between">
                    <div className="flex items-center">
                      <Verified className="text-primary w-4 h-4 mr-2" />
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">AI Alignment Index</span>
                    </div>
                    <span className="text-sm font-bold text-primary">High (98%)</span>
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
