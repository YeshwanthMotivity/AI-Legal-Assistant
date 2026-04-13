import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  BarChart3, 
  ShieldAlert, 
  Settings, 
  Activity,
  ArrowRight,
  Database,
  Lock
} from 'lucide-react';
import PortalLayout from '../components/layout/PortalLayout';
import { Button } from '@/components/ui/button';

export default function AdminDashboard(): ReactNode {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PortalLayout title={t('admin.dashboard.title')} subtitle={t('admin.dashboard.subtitle', { email: user?.email || 'Admin' })}>
      
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="imperial-card p-8 group">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Users className="w-6 h-6"/>
            </div>
            <span className="text-[10px] font-black text-blue-500/40 uppercase tracking-widest">{t('admin.dashboard.totalUsers')}</span>
          </div>
          <h3 className="text-3xl font-black tracking-tighter tabular-nums">1,284</h3>
        </div>

        <div className="imperial-card p-8 group">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-primary shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Activity className="w-6 h-6"/>
            </div>
            <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{t('admin.dashboard.systemUptime')}</span>
          </div>
          <h3 className="text-3xl font-black tracking-tighter tabular-nums">99.9%</h3>
        </div>

        <div className="imperial-card p-8 group">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Database className="w-6 h-6"/>
            </div>
            <span className="text-[10px] font-black text-amber-500/40 uppercase tracking-widest">{t('admin.dashboard.databaseLoad')}</span>
          </div>
          <h3 className="text-3xl font-black tracking-tighter tabular-nums">14%</h3>
        </div>

        <div className="imperial-card p-8 group focus-within:ring-2 ring-red-500/20">
          <div className="flex items-center justify-between mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <ShieldAlert className="w-6 h-6"/>
            </div>
            <span className="text-[10px] font-black text-red-500/40 uppercase tracking-widest">{t('admin.dashboard.securityAlerts')}</span>
          </div>
          <h3 className="text-3xl font-black tracking-tighter tabular-nums text-red-600">0</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management Card */}
        <div className="imperial-card overflow-hidden group">
          <div className="p-8 border-b border-border/10 bg-muted/5">
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-accent shadow-inner border border-accent/10 transition-all duration-500 group-hover:rotate-6">
                <Users className="w-7 h-7"/>
              </div>
              <div className="text-right">
                <h3 className="text-sm font-black uppercase tracking-widest">{t('admin.dashboard.userAccess')}</h3>
                <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2">{t('admin.dashboard.iamController')}</p>
              </div>
            </div>
            <p className="text-[12px] font-medium text-muted-foreground leading-relaxed italic font-serif h-12">
              {t('admin.dashboard.userAccessDesc')}
            </p>
          </div>
          <div className="p-8 bg-white group-hover:bg-accent/5 transition-colors">
            <Link to="/admin/users">
              <Button className="w-full h-14 btn-royal-shine rounded-2xl gap-4 flex items-center justify-center">
                <span>{t('admin.dashboard.manageAccess')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180 group-hover:translate-x-2 transition-transform"/>
              </Button>
            </Link>
          </div>
        </div>

        {/* AI Performance Card */}
        <div className="imperial-card overflow-hidden group">
          <div className="p-8 border-b border-border/10 bg-muted/5">
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner border border-primary/10 transition-all duration-500 group-hover:rotate-6">
                <BarChart3 className="w-7 h-7"/>
              </div>
              <div className="text-right">
                <h3 className="text-sm font-black uppercase tracking-widest">{t('admin.dashboard.aiPerformance')}</h3>
                <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2">{t('admin.dashboard.resourceMonitor')}</p>
              </div>
            </div>
            <p className="text-[12px] font-medium text-muted-foreground leading-relaxed italic font-serif h-12">
              {t('admin.dashboard.aiPerfDesc')}
            </p>
          </div>
          <div className="p-8 bg-white group-hover:bg-primary/5 transition-colors">
            <Link to="/admin/metrics">
              <Button className="w-full h-14 bg-primary hover:bg-primary-hover text-white rounded-2xl gap-4 flex items-center justify-center font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 transition-all active:scale-95">
                <span>{t('admin.dashboard.viewAnalytics')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180 group-hover:translate-x-2 transition-transform"/>
              </Button>
            </Link>
          </div>
        </div>

        {/* Security Audit Card */}
        <div className="imperial-card overflow-hidden group">
          <div className="p-8 border-b border-border/10 bg-muted/5">
            <div className="flex items-center justify-between mb-8">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner border border-primary/10 transition-all duration-500 group-hover:rotate-6">
                <Lock className="w-7 h-7"/>
              </div>
              <div className="text-right">
                <h3 className="text-sm font-black uppercase tracking-widest">{t('admin.dashboard.securityAudit')}</h3>
                <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] mt-2">{t('admin.dashboard.complianceLedger')}</p>
              </div>
            </div>
            <p className="text-[12px] font-medium text-muted-foreground leading-relaxed italic font-serif h-12">
              {t('admin.dashboard.auditDesc')}
            </p>
          </div>
          <div className="p-8 bg-white group-hover:bg-primary/5 transition-colors">
            <Link to="/admin/audit">
              <Button className="w-full h-14 bg-primary hover:bg-primary-hover text-white rounded-2xl gap-4 flex items-center justify-center font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 transition-all active:scale-95">

                <span>{t('admin.dashboard.reviewLogs')}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180 group-hover:translate-x-2 transition-transform"/>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Global Configuration Banner */}
      <div className="mt-12 p-10 bg-white border-2 border-dashed border-primary/20 rounded-[3rem] flex flex-col md:flex-row items-center justify-between shadow-inner gap-8">
        <div className="flex items-center gap-8">
          <div className="p-6 bg-primary/5 rounded-[2rem] shadow-sm border border-primary/10">
            <Settings className="w-12 h-12 text-primary animate-pulse"/>
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest">{t('admin.dashboard.globalConfig')}</h4>
            <p className="text-[12px] text-muted-foreground font-medium italic mt-2 opacity-60 font-serif max-w-lg">{t('admin.dashboard.globalConfigDesc')}</p>
          </div>
        </div>
        <Button 
          className="h-14 px-12 font-black uppercase tracking-widest text-[11px] bg-white border-2 border-primary text-primary hover:bg-primary/5 transition-all rounded-2xl shadow-lg active:scale-95"
          onClick={() => navigate('/admin/config')}
        >
          {t('admin.dashboard.enterConfigMode')}
        </Button>
      </div>
    </PortalLayout>
  );
}
