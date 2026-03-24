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
        <StatCard label={t('admin.dashboard.totalUsers')} value="1,284" icon={Users} className="border-l-4 border-l-blue-500" />
        <StatCard label={t('admin.dashboard.systemUptime')} value="99.9%" icon={Activity} className="border-l-4 border-l-emerald-500" />
        <StatCard label={t('admin.dashboard.databaseLoad')} value="14%" icon={Database} className="border-l-4 border-l-amber-500" />
        <StatCard label={t('admin.dashboard.securityAlerts')} value="0" icon={ShieldAlert} className="border-l-4 border-l-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management Card */}
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow group">
           <CardHeader className="bg-muted/10 border-b py-6 px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600">
                     <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('admin.dashboard.userAccess')}</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-70">{t('admin.dashboard.iamController')}</CardDescription>
                  </div>
                </div>
                <Link to="/admin/users">
                   <Button variant="ghost" size="icon" className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                      <ArrowRight className="w-5 h-5 rtl:rotate-180" />
                   </Button>
                </Link>
              </div>
           </CardHeader>
           <CardContent className="p-8">
              <p className="text-muted-foreground text-xs leading-relaxed mb-6 italic">
                 {t('admin.dashboard.userAccessDesc')}
              </p>
              <Link to="/admin/users">
                <Button variant="outline" className="w-full h-10 border-blue-500/20 text-blue-700 bg-blue-500/5 hover:bg-blue-500/10 gap-2 font-bold">
                   {t('admin.dashboard.manageAccess')}
                </Button>
              </Link>
           </CardContent>
        </Card>

        {/* System Metrics Card */}
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow group">
           <CardHeader className="bg-muted/10 border-b py-6 px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                     <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('admin.dashboard.aiPerformance')}</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-70">{t('admin.dashboard.resourceMonitor')}</CardDescription>
                  </div>
                </div>
                <Link to="/admin/metrics">
                   <Button variant="ghost" size="icon" className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                      <ArrowRight className="w-5 h-5 rtl:rotate-180" />
                   </Button>
                </Link>
              </div>
           </CardHeader>
           <CardContent className="p-8">
              <p className="text-muted-foreground text-xs leading-relaxed mb-6 italic">
                  {t('admin.dashboard.aiPerfDesc')}
              </p>
              <Link to="/admin/metrics">
                <Button variant="outline" className="w-full h-10 border-emerald-500/20 text-emerald-700 bg-emerald-500/5 hover:bg-emerald-500/10 gap-2 font-bold">
                   {t('admin.dashboard.viewAnalytics')}
                </Button>
              </Link>
           </CardContent>
        </Card>

        {/* Audit Logs Card */}
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow group">
           <CardHeader className="bg-muted/10 border-b py-6 px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                     <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t('admin.dashboard.securityAudit')}</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-70">{t('admin.dashboard.complianceLedger')}</CardDescription>
                  </div>
                </div>
                <Link to="/admin/audit">
                   <Button variant="ghost" size="icon" className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                      <ArrowRight className="w-5 h-5 rtl:rotate-180" />
                   </Button>
                </Link>
              </div>
           </CardHeader>
           <CardContent className="p-8">
              <p className="text-muted-foreground text-xs leading-relaxed mb-6 italic">
                 {t('admin.dashboard.auditDesc')}
              </p>
              <Link to="/admin/audit">
                <Button variant="outline" className="w-full h-10 border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 gap-2 font-bold">
                   {t('admin.dashboard.reviewLogs')}
                </Button>
              </Link>
           </CardContent>
        </Card>
      </div>

      {/* Global Configuration Banner */}
      <div className="mt-10 p-8 bg-black/5 dark:bg-white/5 border border-dashed rounded-3xl flex items-center justify-between">
         <div className="flex items-center gap-6">
            <div className="p-4 bg-white/50 dark:bg-black/50 rounded-2xl shadow-inner border">
               <Settings className="w-8 h-8 text-black/40 dark:text-white/40" />
            </div>
            <div>
               <h4 className="text-lg font-black tracking-tight">{t('admin.dashboard.globalConfig')}</h4>
               <p className="text-xs text-muted-foreground font-medium italic">{t('admin.dashboard.globalConfigDesc')}</p>
            </div>
         </div>
         <Button 
           className="h-12 px-8 font-black uppercase tracking-widest text-xs"
           onClick={() => navigate('/admin/config')}
         >
            {t('admin.dashboard.enterConfigMode')}
         </Button>
      </div>
    </PortalLayout>
  );
}
