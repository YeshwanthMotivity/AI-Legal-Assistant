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
  const { t } = useTranslation();
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
          label="Active Cases" 
          value={stats.pending} 
          icon={Gavel} 
          className="border-b-4 border-b-primary"
        />
        <StatCard 
          label="Ready for Review" 
          value={stats.ready} 
          icon={CheckCircle2} 
          className="border-b-4 border-b-emerald-500"
        />
        <StatCard 
          label="Urgent Hearings" 
          value={stats.urgent} 
          icon={Clock} 
          className="border-b-4 border-b-amber-500"
        />
        <StatCard 
          label="Performance" 
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
              <CardTitle className="text-lg">Recent Active Cases</CardTitle>
              <CardDescription>Cases requiring your immediate attention</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate('/judge/cases')}>
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {casesQuery.isLoading ? (
              <div className="py-10 text-center text-muted-foreground animate-pulse">Loading cases...</div>
            ) : recentCases.length > 0 ? (
              <div className="space-y-4">
                {recentCases.map((c) => (
                  <div 
                    key={c.id} 
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/judge/cases/${c.id}`)}
                  >
                    <div className="flex items-start gap-4 mb-3 sm:mb-0">
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{c.case_number}</span>
                          <Badge variant={c.status === 'AIAnalysisReady' ? 'default' : 'secondary'} className="text-[9px] h-4 px-1.5 uppercase font-black tracking-tighter">
                            {t(`status.${c.status}`)}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{c.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{t(`judge.caseTypes.${c.case_type}`)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pl-14 sm:pl-0">
                      {c.hearing_date && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(c.hearing_date).toLocaleDateString()}
                        </div>
                      )}
                      <Button size="sm" variant="outline" className="h-8 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground border-primary/20">
                        Analyze
                      </Button>
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
               <Button className="w-full justify-start gap-3 bg-card hover:bg-accent text-foreground border shadow-sm h-12" variant="outline">
                  <Plus className="w-4 h-4 text-primary" />
                  Create New Case
               </Button>
               <Button className="w-full justify-start gap-3 bg-card hover:bg-accent text-foreground border shadow-sm h-12" variant="outline" onClick={() => navigate('/judge/precedents')}>
                  <Search className="w-4 h-4 text-primary" />
                  Search Precedents
               </Button>
               <Button className="w-full justify-start gap-3 bg-card hover:bg-accent text-foreground border shadow-sm h-12" variant="outline">
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
