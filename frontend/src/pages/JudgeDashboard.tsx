import { ReactNode, useMemo } from 'react';
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
  Search,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import PortalLayout from '../components/layout/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatCard from '../components/StatCard';
import { getJudgeCases } from '../api/judge';
import { queryKeys } from '../api/queryKeys';
import { useNavigate } from 'react-router-dom';

export default function JudgeDashboard(): ReactNode {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

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
                <p className="text-muted-foreground text-sm italic">No active cases found.</p>
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
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
               <Button 
                 className="w-full justify-start gap-3 bg-card hover:bg-accent text-foreground border shadow-sm h-12" 
                 variant="outline"
                 onClick={() => navigate('/judge/cases/new')}
               >
                  <Plus className="w-4 h-4 text-primary" />
                  Create New Case
               </Button>
               <Button className="w-full justify-start gap-3 bg-card hover:bg-accent text-foreground border shadow-sm h-12" variant="outline" onClick={() => navigate('/judge/precedents')}>
                  <Search className="w-4 h-4 text-primary" />
                  Search Precedents
               </Button>
               <Button 
                className="w-full justify-start gap-3 bg-card hover:bg-accent text-foreground border shadow-sm h-12" 
                variant="outline"
                onClick={() => alert("Legal Drafting Templates feature is coming soon in the next update!")}
               >
                  <Briefcase className="w-4 h-4 text-primary" />
                  Drafting Templates
               </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-base">AI Analysis Stats</CardTitle>
              <CardDescription>Model performance & usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                    <span>Confidence Score</span>
                    <span>88%</span>
                  </div>
                  <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[88%] rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground">
                    <span>Model Throughput</span>
                    <span>94%</span>
                  </div>
                  <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[94%] rounded-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalLayout>
  );
}
