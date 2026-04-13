import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  Briefcase, 
  CheckCircle2,
  ArrowRight,
  Gavel
} from 'lucide-react';
import PortalLayout from '../components/layout/PortalLayout';
import { Button } from '@/components/ui/button';

export default function ClerkDashboard(): ReactNode {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <PortalLayout title={t('clerk.dashboard.title')} subtitle={`${t('common.welcome')}, ${user?.email || 'Legal Assistant'}`}>
      <div className="space-y-16">
        {/* Top Section: Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="imperial-card p-6 group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Upload className="w-6 h-6"/>
              </div>
              <span className="text-[10px] font-black text-amber-500/40 uppercase tracking-widest">{t('clerk.dashboard.pendingUploads')}</span>
            </div>
            <h3 className="text-3xl font-black tracking-tighter tabular-nums text-foreground/90">12</h3>
          </div>

          <div className="imperial-card p-6 group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Briefcase className="w-6 h-6"/>
              </div>
              <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{t('clerk.dashboard.activeCases')}</span>
            </div>
            <h3 className="text-3xl font-black tracking-tighter tabular-nums text-foreground/90">48</h3>
          </div>

          <div className="imperial-card p-6 group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform duration-500">
                <CheckCircle2 className="w-6 h-6"/>
              </div>
              <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{t('clerk.dashboard.completedTasks')}</span>
            </div>
            <h3 className="text-3xl font-black tracking-tighter tabular-nums text-foreground/90">124</h3>
          </div>
        </div>

        {/* Bottom Section: Management & Assignment Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Case Management Card */}
          <div className="imperial-card overflow-hidden group flex flex-col">
            <div className="p-8 flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-xl shadow-primary/10 transition-all duration-700 group-hover:rotate-6">
                  <FileText className="w-7 h-7"/>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-black tracking-tight text-foreground/90">{t('clerk.dashboard.caseManagement') || 'Case Management'}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mt-1">{t('clerk.dashboard.docControlCenter')}</p>
                </div>
              </div>
              <p className="text-[14px] font-medium text-muted-foreground leading-relaxed italic font-serif opacity-80 antialiased">
                {t('clerk.dashboard.caseMgmtDesc')}
              </p>
            </div>
            <div className="p-6 bg-muted/5 group-hover:bg-primary/5 transition-colors border-t border-border/10">
              <Link to="/clerk/cases">
                <Button className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-xl gap-3 flex items-center justify-center font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-primary/20 transition-all active:scale-95">
                  <span>{t('clerk.dashboard.openWorkspace')}</span>
                  <ArrowRight className="w-5 h-5 rtl:rotate-180 group-hover:translate-x-1 transition-transform"/>
                </Button>
              </Link>
            </div>
          </div>

          {/* Case Assignment Card */}
          <div className="imperial-card overflow-hidden group flex flex-col">
            <div className="p-8 flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white shadow-xl shadow-accent/20 transition-all duration-700 group-hover:-rotate-6">
                  <Gavel className="w-7 h-7"/>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-black tracking-tight text-foreground/90">{t('clerk.dashboard.caseAssignment')}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 mt-1">{t('clerk.dashboard.assignmentCenter')}</p>
                </div>
              </div>
              <p className="text-[14px] font-medium text-muted-foreground leading-relaxed italic font-serif opacity-80 antialiased">
                {t('clerk.dashboard.assignmentDesc')}
              </p>
            </div>
            <div className="p-6 bg-muted/5 group-hover:bg-accent/5 transition-colors border-t border-border/10">
              <Link to="/clerk/assignments">
                <Button className="w-full h-12 bg-accent hover:opacity-90 text-white rounded-xl gap-3 flex items-center justify-center font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-accent/20 transition-all active:scale-95">
                  <span>{t('clerk.dashboard.openAssignments')}</span>
                  <ArrowRight className="w-5 h-5 rtl:rotate-180 group-hover:translate-x-2 transition-transform"/>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

    </PortalLayout>
  );
}
