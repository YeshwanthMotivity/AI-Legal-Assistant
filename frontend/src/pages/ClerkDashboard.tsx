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
  Clock, 
  CheckCircle2,
  Settings,
  ArrowRight
} from 'lucide-react';
import PortalLayout from '../components/layout/PortalLayout';
import CaseWorkflowStepper from '../components/layout/CaseWorkflowStepper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';

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
      
      {/* Quick Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard label={t('clerk.dashboard.pendingUploads')} value={casesQuery.isLoading ? '...' : String(pendingUploads)} icon={Upload} className="border-l-4 border-l-amber-500" />
        <StatCard label={t('clerk.dashboard.activeCases')} value={casesQuery.isLoading ? '...' : String(activeCases)} icon={Briefcase} className="border-l-4 border-l-primary" />
        <StatCard label={t('clerk.dashboard.completedTasks')} value={casesQuery.isLoading ? '...' : String(completedTasks)} icon={CheckCircle2} className="border-l-4 border-l-emerald-500" />
      </div>

      <div className="space-y-6">
        <div className="bg-surface-container-lowest dark:bg-surface-container p-6 rounded-lg editorial-shadow border border-outline-variant/30">
          <h3 className="font-headline text-2xl font-medium mb-8 text-on-surface tracking-tight">Case Lifecycle Pipeline</h3>
          
          {/* Static reference stepper */}
          <div className="px-4">
            <CaseWorkflowStepper role="clerk" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-16 pt-10 border-t border-outline-variant/20">
            <div className="space-y-5 bg-card/40 p-6 rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-colors">
               <h4 className="font-bold flex items-center gap-3 text-lg"><div className="p-2 rounded-lg bg-primary/10"><FileText className="w-5 h-5 text-primary" /></div> Stage 1: Case Registration</h4>
               <p className="text-sm text-muted-foreground italic leading-relaxed">{t('clerk.dashboard.caseMgmtDesc', 'Monitor incoming cases, open workspaces, and control new docket entries awaiting documentation.')}</p>
               <Link to="/clerk/cases" className="block mt-4">
                 <Button className="w-full h-12 shadow-lg shadow-primary/20 gap-2 font-bold text-sm rounded-xl">
                    {t('clerk.dashboard.openWorkspace')} <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
               </Link>
            </div>
            <div className="space-y-5 bg-card/40 p-6 rounded-xl border border-outline-variant/10 hover:border-emerald-500/30 transition-colors">
               <h4 className="font-bold flex items-center gap-3 text-lg"><div className="p-2 rounded-lg bg-emerald-500/10"><Upload className="w-5 h-5 text-emerald-500" /></div> Stage 2: Direct Ingestion</h4>
               <p className="text-sm text-muted-foreground italic leading-relaxed">{t('clerk.dashboard.ingestionDesc', 'Prepare case dossiers and securely upload evidentiary documents, sending them directly into the AI analysis queue.')}</p>
               <Link to="/clerk/documents" className="block mt-4">
                 <Button variant="secondary" className="w-full h-12 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 gap-2 font-bold text-sm rounded-xl">
                    {t('clerk.dashboard.startBulkUpload')} <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
               </Link>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="mt-10 p-6 bg-card border rounded-2xl flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <div>
               <h4 className="text-sm font-bold tracking-tight">{t('clerk.dashboard.aiNodesOnline')}</h4>
               <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none mt-0.5">{t('clerk.dashboard.latencyInfo')}</p>
            </div>
         </div>
         <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground text-xs uppercase font-black hover:text-primary transition-colors">
            <Settings className="w-4 h-4" />
            {t('clerk.dashboard.hardwareDiagnostics')}
         </Button>
      </div>
    </PortalLayout>
  );
}
