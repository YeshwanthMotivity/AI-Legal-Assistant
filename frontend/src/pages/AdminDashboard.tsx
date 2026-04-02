import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { Link } from 'react-router-dom';
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
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';

import { useNavigate } from 'react-router-dom';

export default function AdminDashboard(): ReactNode {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PortalLayout title={t('admin.dashboard.title')} subtitle={t('admin.dashboard.subtitle', { email: user?.email || 'Admin' })}>
      
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard label={t('admin.dashboard.totalUsers')} value="1,284" icon={Users} className="border-l-4 border-l-navy-600 bg-white shadow-sm" />
        <StatCard label={t('admin.dashboard.systemUptime')} value="99.9%" icon={Activity} className="border-l-4 border-l-primary bg-white shadow-sm" />
        <StatCard label={t('admin.dashboard.databaseLoad')} value="14%" icon={Database} className="border-l-4 border-l-gold bg-white shadow-sm" />
        <StatCard label={t('admin.dashboard.securityAlerts')} value="0" icon={ShieldAlert} className="border-l-4 border-l-accent bg-white shadow-sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management Card */}
        <Card className="shadow-sm border-slate-200 hover:shadow-md transition-all group bg-white rounded-2xl overflow-hidden">
           <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-navy-50 rounded-xl text-navy-600">
                     <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-secondary font-bold">{t('admin.dashboard.userAccess')}</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-0.5 text-slate-400">{t('admin.dashboard.iamController')}</CardDescription>
                  </div>
                </div>
                <Link to="/admin/users">
                   <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="w-5 h-5" />
                   </Button>
                </Link>
              </div>
           </CardHeader>
           <CardContent className="p-8">
              <p className="text-slate-500 text-xs leading-relaxed mb-6 italic font-medium">
                 {t('admin.dashboard.userAccessDesc')}
              </p>
              <Link to="/admin/users">
                <Button variant="outline" className="w-full h-10 border-navy-100 text-navy-600 bg-navy-50/50 hover:bg-navy-100/50 gap-2 font-bold uppercase text-[10px] tracking-widest rounded-xl">
                   {t('admin.dashboard.manageAccess')}
                </Button>
              </Link>
           </CardContent>
        </Card>

        {/* System Metrics Card */}
        <Card className="shadow-sm border-slate-200 hover:shadow-md transition-all group bg-white rounded-2xl overflow-hidden">
           <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-primary">
                     <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-secondary font-bold">{t('admin.dashboard.aiPerformance')}</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-0.5 text-slate-400">{t('admin.dashboard.resourceMonitor')}</CardDescription>
                  </div>
                </div>
                <Link to="/admin/metrics">
                   <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="w-5 h-5" />
                   </Button>
                </Link>
              </div>
           </CardHeader>
           <CardContent className="p-8">
              <p className="text-slate-500 text-xs leading-relaxed mb-6 italic font-medium">
                  {t('admin.dashboard.aiPerfDesc')}
              </p>
              <Link to="/admin/metrics">
                <Button variant="outline" className="w-full h-10 border-emerald-100 text-primary bg-emerald-50/50 hover:bg-emerald-100/50 gap-2 font-bold uppercase text-[10px] tracking-widest rounded-xl">
                   {t('admin.dashboard.viewAnalytics')}
                </Button>
              </Link>
           </CardContent>
        </Card>

        {/* Audit Logs Card */}
        <Card className="shadow-sm border-slate-200 hover:shadow-md transition-all group bg-white rounded-2xl overflow-hidden">
           <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-terracotta-50 rounded-xl text-terracotta-700">
                     <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-secondary font-bold">{t('admin.dashboard.securityAudit')}</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-0.5 text-slate-400">{t('admin.dashboard.complianceLedger')}</CardDescription>
                  </div>
                </div>
                <Link to="/admin/audit">
                   <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="w-5 h-5" />
                   </Button>
                </Link>
              </div>
           </CardHeader>
           <CardContent className="p-8">
              <p className="text-slate-500 text-xs leading-relaxed mb-6 italic font-medium">
                 {t('admin.dashboard.auditDesc')}
              </p>
              <Link to="/admin/audit">
                <Button variant="outline" className="w-full h-10 border-terracotta-100 text-terracotta-700 bg-terracotta-50/50 hover:bg-terracotta-100/50 gap-2 font-bold uppercase text-[10px] tracking-widest rounded-xl">
                   {t('admin.dashboard.reviewLogs')}
                </Button>
              </Link>
           </CardContent>
        </Card>
      </div>

      {/* Global Configuration Banner */}
      <div className="mt-10 p-10 bg-slate-50 border border-slate-200 border-dashed rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-6">
            <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
               <Settings className="w-10 h-10 text-primary" />
            </div>
            <div>
               <h4 className="text-2xl font-headline font-bold text-secondary tracking-tight">{t('admin.dashboard.globalConfig')}</h4>
               <p className="text-sm text-slate-500 font-medium italic">{t('admin.dashboard.globalConfigDesc')}</p>
            </div>
         </div>
         <Button 
           className="h-12 px-10 font-extrabold uppercase tracking-widest text-xs bg-primary hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/10 rounded-xl"
           onClick={() => navigate('/admin/config')}
         >
            {t('admin.dashboard.enterConfigMode')}
         </Button>
      </div>
    </PortalLayout>
  );
}
