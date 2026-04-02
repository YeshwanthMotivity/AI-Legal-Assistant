import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clerkGetCases } from '../api/clerk';
import { 
  FileText, 
  Upload, 
  Briefcase, 
  CheckCircle2,
  Settings,
  ArrowRight,
  Sparkles,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import PortalLayout from '../components/layout/PortalLayout';
import CaseWorkflowStepper from '../components/layout/CaseWorkflowStepper';

export default function ClerkDashboard(): ReactNode {
  const { user } = useAuth();
  const { t } = useTranslation();

  const casesQuery = useQuery({
    queryKey: ['clerk-cases-dash'],
    queryFn: () => clerkGetCases({ limit: 200 }),
  });

  const cases = casesQuery.data?.items || [];
  const pendingUploads = cases.filter(c => c.status === 'Created').length;
  const activeCases = cases.filter(c => !['Finalized'].includes(c.status)).length;
  const completedTasks = cases.filter(c => c.status === 'Finalized').length;

  return (
    <PortalLayout title={t('clerk.dashboard.title')} subtitle={`${t('common.welcome')}, ${user?.email || 'Legal Assistant'}`}>
      
      {/* 1. Goated Metrics Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
        {[
          { label: t('clerk.dashboard.pendingUploads'), value: pendingUploads, icon: Upload, color: 'text-text-accent' },
          { label: t('clerk.dashboard.activeCases'), value: activeCases, icon: Briefcase, color: 'text-text-heading' },
          { label: t('clerk.dashboard.completedTasks'), value: completedTasks, icon: CheckCircle2, color: 'text-success' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.8 }}
            className="glass-goated p-10 rounded-[3rem] border border-white/5 relative overflow-hidden group shadow-2xl"
          >
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <p className="text-[10px] font-black text-text-accent uppercase tracking-[0.4em] mb-4 opacity-70 group-hover:opacity-100 transition-opacity">{stat.label}</p>
                <h3 className={`font-headline text-6xl font-bold ${stat.color} tracking-tighter mb-4`}>
                  {casesQuery.isLoading ? '...' : stat.value}
                </h3>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-text-secondary">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span>{t('judge.dashboard.systemSynchronized', { id: 'ONLINE' })}</span>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
              <stat.icon className="w-24 h-24" />
            </div>
          </motion.div>
        ))}
      </section>

      {/* 2. Main Workspace (Pipeline) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-goated p-12 rounded-[4rem] border border-white/5 relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h3 className="font-headline text-4xl font-bold text-text-heading tracking-tight mb-2">Automated Judicial Lifecycle</h3>
              <p className="text-[11px] font-black text-text-accent uppercase tracking-[0.4em] italic opacity-60">Sovereign OS Pipeline v4.0</p>
            </div>
            <div className="flex items-center gap-4">
               <Activity className="w-5 h-5 text-text-accent animate-pulse" />
               <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Real-time Status</span>
            </div>
          </div>
          
          <div className="px-6 mb-20 overflow-x-auto pb-6">
            <CaseWorkflowStepper role="clerk" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-16 border-t border-white/5">
            {/* Stage 1 Card */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="group p-10 rounded-[3rem] bg-bg-base/40 border border-white/5 hover:border-text-accent/30 transition-all duration-700 space-y-8 cursor-pointer shadow-xl"
            >
               <div className="flex items-center gap-6">
                  <div className="p-5 rounded-2xl bg-text-accent/10 border border-text-accent/20 group-hover:bg-text-accent group-hover:text-bg-base transition-colors duration-500">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-headline text-2xl font-bold text-text-heading italic">{t('clerk.dashboard.caseMgmtTitle', 'Case Registration')}</h4>
                    <p className="text-[10px] font-black text-text-accent uppercase tracking-[0.3em] opacity-60">Stage 01: Docket Initiation</p>
                  </div>
               </div>
               <p className="text-sm text-text-secondary font-medium leading-relaxed font-serif italic text-justify opacity-80">
                 {t('clerk.dashboard.caseMgmtDesc', 'Monitor incoming cases, open workspaces, and control new docket entries awaiting documentation.')}
               </p>
               <Link to="/clerk/cases" className="block pt-4">
                 <button className="w-full py-5 btn-royal-shine text-bg-base font-black uppercase tracking-[0.4em] text-[11px] rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all">
                    {t('clerk.dashboard.openWorkspace')} <ArrowRight className="w-4 h-4" />
                 </button>
               </Link>
            </motion.div>

            {/* Stage 2 Card */}
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="group p-10 rounded-[3rem] bg-bg-base/40 border border-white/5 hover:border-success/30 transition-all duration-700 space-y-8 cursor-pointer shadow-xl"
            >
               <div className="flex items-center gap-6">
                  <div className="p-5 rounded-2xl bg-success/10 border border-success/20 group-hover:bg-success group-hover:text-bg-base transition-colors duration-500">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-headline text-2xl font-bold text-text-heading italic">{t('clerk.dashboard.ingestionTitle', 'Direct Ingestion')}</h4>
                    <p className="text-[10px] font-black text-success uppercase tracking-[0.3em] opacity-60">Stage 02: AI Feed Integration</p>
                  </div>
               </div>
               <p className="text-sm text-text-secondary font-medium leading-relaxed font-serif italic text-justify opacity-80">
                 {t('clerk.dashboard.ingestionDesc', 'Prepare case dossiers and securely upload evidentiary documents, sending them directly into the AI analysis queue.')}
               </p>
               <Link to="/clerk/documents" className="block pt-4">
                 <button className="w-full py-5 bg-success/10 border border-success/20 text-success hover:bg-success group-hover:text-bg-base transition-all duration-500 font-black uppercase tracking-[0.4em] text-[11px] rounded-[2rem] flex items-center justify-center gap-3 active:scale-95">
                    {t('clerk.dashboard.startBulkUpload')} <ArrowRight className="w-4 h-4" />
                 </button>
               </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 3. System Status Banner (Goated) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-12 p-8 glass-goated rounded-[3rem] border border-white/10 flex items-center justify-between shadow-2xl relative overflow-hidden"
      >
         <div className="flex items-center gap-8 relative z-10">
            <div className="relative">
              <div className="w-4 h-4 bg-success rounded-full animate-ping absolute opacity-40" />
              <div className="w-4 h-4 bg-success rounded-full relative shadow-[0_0_15px_rgba(16,185,129,0.5)] border border-white/20" />
            </div>
            <div>
               <h4 className="text-[11px] font-black text-text-accent uppercase tracking-[0.5em] mb-1">{t('clerk.dashboard.aiNodesOnline')}</h4>
               <p className="text-md font-headline font-bold text-text-heading italic leading-none">{t('clerk.dashboard.latencyInfo', 'Global Synchronous Uplink: Active')}</p>
            </div>
         </div>
         <button className="flex items-center gap-3 px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-text-accent transition-colors">
            <Settings className="w-4 h-4" />
            {t('clerk.dashboard.hardwareDiagnostics')}
         </button>
         <div className="absolute inset-y-0 right-0 w-64 bg-success opacity-[0.03] blur-3xl rounded-full translate-x-1/2 pointer-events-none" />
      </motion.div>
    </PortalLayout>
  );
}
