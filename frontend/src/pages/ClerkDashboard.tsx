import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { Link } from 'react-router-dom';
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
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';

export default function ClerkDashboard(): ReactNode {
 const { user } = useAuth();
 const { t } = useTranslation();

 return (
 <PortalLayout title={t('clerk.dashboard.title')} subtitle={`${t('common.welcome')}, ${user?.email || 'Legal Assistant'}`}>
 
 {/* Quick Stats Banner */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
 <StatCard label={t('clerk.dashboard.pendingUploads')} value="12"icon={Upload} className="border-l-4 border-l-amber-500"/>
 <StatCard label={t('clerk.dashboard.activeCases')} value="48"icon={Briefcase} className="border-l-4 border-l-primary"/>
 <StatCard label={t('clerk.dashboard.completedTasks')} value="124"icon={CheckCircle2} className="border-l-4 border-l-[var(--primary)]"/>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Case Management Card */}
 <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow group">
 <CardHeader className="bg-muted/10 border-b py-6 px-8">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
 <FileText className="w-6 h-6"/>
 </div>
 <div>
 <CardTitle className="text-xl">{t('clerk.dashboard.caseManagement')}</CardTitle>
 <CardDescription className="text-xs font-medium uppercase tracking-wider mt-1 opacity-70">{t('clerk.dashboard.docControlCenter')}</CardDescription>
 </div>
 </div>
 <Link to="/clerk/cases">
 <Button variant="ghost"size="icon"className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
 <ArrowRight className="w-5 h-5 rtl:rotate-180"/>
 </Button>
 </Link>
 </div>
 </CardHeader>
 <CardContent className="p-8">
 <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic">
 {t('clerk.dashboard.caseMgmtDesc')}
 </p>
 <Link to="/clerk/cases">
 <Button className="w-full h-11 shadow-lg shadow-primary/20 gap-2 font-bold">
 {t('clerk.dashboard.openWorkspace')}
 </Button>
 </Link>
 </CardContent>
 </Card>

 {/* Document Upload Card */}
 <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow group">
 <CardHeader className="bg-muted/10 border-b py-6 px-8">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-[var(--primary)]/10 rounded-xl text-[var(--primary)]">
 <Upload className="w-6 h-6"/>
 </div>
 <div>
 <CardTitle className="text-xl">{t('clerk.dashboard.directIngestion')}</CardTitle>
 <CardDescription className="text-xs font-medium uppercase tracking-wider mt-1 opacity-70">{t('clerk.dashboard.bulkEvidence')}</CardDescription>
 </div>
 </div>
 <Link to="/clerk/documents">
 <Button variant="ghost"size="icon"className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
 <ArrowRight className="w-5 h-5 rtl:rotate-180"/>
 </Button>
 </Link>
 </div>
 </CardHeader>
 <CardContent className="p-8">
 <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic">
 {t('clerk.dashboard.ingestionDesc')}
 </p>
 <Link to="/clerk/documents">
 <Button variant="secondary"className="w-full h-11 border-[var(--primary)]/20 text-emerald-700 bg-emerald-500/5 hover:bg-[var(--primary)]/10 gap-2 font-bold">
 {t('clerk.dashboard.startBulkUpload')}
 </Button>
 </Link>
 </CardContent>
 </Card>
 </div>

 {/* System Status Banner */}
 <div className="mt-10 p-6 bg-card border rounded-2xl flex items-center justify-between shadow-sm">
 <div className="flex items-center gap-4">
 <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"/>
 <div>
 <h4 className="text-sm font-bold tracking-tight">{t('clerk.dashboard.aiNodesOnline')}</h4>
 <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none mt-0.5">{t('clerk.dashboard.latencyInfo')}</p>
 </div>
 </div>
 <Button variant="ghost"size="sm"className="gap-2 text-muted-foreground text-xs uppercase font-black hover:text-primary transition-colors">
 <Settings className="w-4 h-4"/>
 {t('clerk.dashboard.hardwareDiagnostics')}
 </Button>
 </div>
 </PortalLayout>
 );
}
