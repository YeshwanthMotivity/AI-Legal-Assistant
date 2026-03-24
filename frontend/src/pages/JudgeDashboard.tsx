import { useState, ReactNode, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Gavel, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  FileText,
  Calendar,
  ArrowRight,
  Plus,
  Briefcase,
  X
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import PortalLayout from '../components/layout/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import StatCard from '../components/StatCard';
import { getJudgeCases } from '../api/judge';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TEMPLATE_LABELS, TEMPLATE_LABELS_AR } from '../constants/judgmentTemplates';

export default function JudgeDashboard(): ReactNode {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showTemplates, setShowTemplates] = useState(false);

  const casesQuery = useQuery({
    queryKey: ['judge-cases'],
    queryFn: () => getJudgeCases({ limit: 5 }),
  });

  const stats = useMemo(() => {
    const items = casesQuery.data?.items ?? [];
    return {
      total: items.length, // In a real app, this would be from a separate stats endpoint or full query
      pending: items.filter(c => c.status !== 'Finalized').length,
      ready: items.filter(c => c.status === 'AIAnalysisReady').length,
      urgent: items.filter(c => c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length
    };
  }, [casesQuery.data]);

  const recentCases = (casesQuery.data?.items ?? []).slice(0, 5);

  return (
    <PortalLayout title={t('judge.dashboard.title')} subtitle={`${t('common.welcome')}, ${user?.username || user?.email}`}>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          label={t('judge.dashboard.activeCases')} 
          value={stats.pending} 
          icon={Gavel} 
          className="border-b-4 border-b-primary"
        />
        <StatCard 
          label={t('judge.dashboard.readyForReview')} 
          value={stats.ready} 
          icon={CheckCircle2} 
          className="border-b-4 border-b-emerald-500"
        />
        <StatCard 
          label={t('judge.dashboard.urgentHearings')} 
          value={stats.urgent} 
          icon={Clock} 
          className="border-b-4 border-b-amber-500"
        />
        <StatCard 
          label={t('judge.dashboard.performance')} 
          value="94%" 
          icon={TrendingUp} 
          trend={{ value: 2.4, isPositive: true }}
          className="border-b-4 border-b-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Active Cases */}
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{t('judge.dashboard.recentActiveCases')}</CardTitle>
              <CardDescription>{t('judge.dashboard.immediateAttention')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate('/judge/cases')}>
              {t('judge.dashboard.viewAll')} <ArrowRight className="w-4 h-4 ltr:inline rtl:hidden" /> {i18n.language === 'ar' && <ArrowRight className="w-4 h-4 rotate-180" />}
            </Button>
          </CardHeader>
          <CardContent>
            {casesQuery.isLoading ? (
              <div className="py-10 text-center text-muted-foreground animate-pulse">{t('common.loading')}</div>
            ) : recentCases.length > 0 ? (
              <div className="space-y-4">
                {recentCases.map((c) => (
                  <div 
                    key={c.id} 
                    className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer group"
                    onClick={() => navigate(`/judge/cases/${c.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{c.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="uppercase font-bold tracking-tighter text-[10px] bg-muted px-1.5 py-0.5 rounded">{c.case_number}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {c.hearing_date ? new Date(c.hearing_date).toLocaleDateString() : t('judge.dashboard.today')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant={c.status === 'AIAnalysisReady' ? 'default' : c.status === 'Finalized' ? 'success' : 'secondary'}
                        className="uppercase text-[10px] font-black px-2 py-0.5 shadow-sm"
                      >
                        {t(`status.${c.status}`)}
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <Gavel className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm italic">{t('judge.dashboard.noCases')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shortcuts & Quick Analysis */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border/50 bg-primary/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" />
                {t('common.actions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
               <Button 
                 className="w-full justify-start gap-3 bg-card hover:bg-accent text-foreground border shadow-sm h-12" 
                 variant="outline"
                 onClick={() => navigate('/judge/cases/new')}
               >
                  <Plus className="w-4 h-4 text-primary" />
                  {t('judge.dashboard.createCase')}
               </Button>
               
               <Button 
                className="w-full justify-start gap-3 bg-card hover:bg-accent text-foreground border shadow-sm h-12" 
                variant="outline"
                onClick={() => setShowTemplates(true)}
               >
                  <Briefcase className="w-4 h-4 text-primary" />
                  {t('judge.workspace.judgmentDraft')}
               </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('judge.workspace.aiStatus')}</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider">{t('clerk.dashboard.aiNodesOnline')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-tight">
                    <span>{t('judge.workspace.aiConfidence')}</span>
                    <span className="text-right text-primary">88%</span>
                  </div>
                  <div className="h-2 w-full bg-accent/30 rounded-full overflow-hidden border border-border/5">
                    <div className="h-full bg-primary w-[88%] rounded-full shadow-[0_0_12px_rgba(var(--primary),0.4)] transition-all duration-1000 ease-out" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-tight">
                    <span>{t('judge.dashboard.performance')}</span>
                    <span className="text-right text-emerald-500">94%</span>
                  </div>
                  <div className="h-2 w-full bg-accent/30 rounded-full overflow-hidden border border-border/5">
                    <div className="h-full bg-emerald-500 w-[94%] rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Template Preview Overlay */}
      <AnimatePresence>
        {showTemplates && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplates(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-background border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b bg-muted/30 flex items-center justify-between">
                <div>
                   <h3 className="text-2xl font-black tracking-tight">{t('judge.workspace.judgmentDraft')} — {t('common.actions')}</h3>
                   <p className="text-sm text-muted-foreground mt-1 italic">
                     Select a standard DIFC court template to see a sample of the structured layout.
                   </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowTemplates(false)} className="rounded-full">
                   <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(i18n.language === 'ar' ? TEMPLATE_LABELS_AR : TEMPLATE_LABELS).map(([key, label]) => (
                  <Card key={key} className="p-5 hover:border-primary/50 transition-all cursor-default bg-card shadow-sm border-border/50">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                          <FileText className="w-6 h-6" />
                       </div>
                       <h4 className="font-bold text-base tracking-tight">{label}</h4>
                    </div>
                    <div className="bg-muted/40 p-5 rounded-2xl text-[10px] space-y-3 opacity-50 pointer-events-none select-none border border-border/50">
                       <div className="h-4 bg-muted-foreground/20 w-3/4 rounded-full mx-auto" />
                       <div className="space-y-2">
                          <div className="h-3 bg-muted-foreground/10 w-full rounded-full" />
                          <div className="h-3 bg-muted-foreground/10 w-5/6 rounded-full" />
                          <div className="h-3 bg-muted-foreground/10 w-4/6 rounded-full" />
                       </div>
                       <div className="mt-6 border-t border-border/50 pt-4 h-12 w-full bg-primary/5 rounded-xl font-black flex items-center justify-center uppercase tracking-widest text-[9px] text-primary/60">
                          Sample Structure
                       </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="p-6 border-t bg-muted/10 flex justify-end">
                 <Button onClick={() => setShowTemplates(false)} className="px-8 font-bold">
                    Close Preview
                 </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PortalLayout>
  );
}
