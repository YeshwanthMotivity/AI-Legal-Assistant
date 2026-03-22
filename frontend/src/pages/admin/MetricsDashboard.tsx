import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { 
  TrendingUp, 
  Activity, 
  Search as SearchIcon, 
  Shield, 
  Database, 
  Zap,
  CheckCircle,
  AlertCircle,
  BarChart3,
  FlaskConical,
  GanttChart
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import {
  adminGetCases,
  adminGetMetrics,
  adminGetUsers,
  adminRunBenchmark,
  adminGetBenchmarkLatest,
  adminGetReleaseGate,
  adminSubmitReleaseGate,
} from '../../api/admin'
import { clerkGetCaseDocuments } from '../../api/clerk'
import { queryKeys } from '../../api/queryKeys'
import type { ReleaseGateRequest } from '../../types/evaluation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import StatCard from '@/components/StatCard'

const COLOURS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8']

// ── helpers ─────────────────────────────────────────────────────────────────
function pct(v: number) { return `${(v * 100).toFixed(1)}%` }
function ms(v: number) { return `${v.toFixed(0)} ms` }
function score(v: number) { return v.toFixed(2) }

function formatBucket(iso: string) {
  try { return format(new Date(iso), 'dd/MM HH:mm') }
  catch { return iso }
}

// ── main component ────────────────────────────────────────────────────────────
const MetricsDashboard = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [docsProcessed, setDocsProcessed] = useState(0)
  const [benchmarkMode, setBenchmarkMode] = useState<'dense_baseline' | 'hybrid'>('dense_baseline')
  const [gateForm, setGateForm] = useState({ phase: 'phase_2', mode: 'hybrid', rationale: '', judge_sign_off: '' })

  // ── data fetching ───────────────────────────────────────────────────────
  const usersQ = useQuery({ queryKey: queryKeys.adminUsers, queryFn: () => adminGetUsers({ limit: 500 }) })
  const casesQ = useQuery({ queryKey: queryKeys.adminCases, queryFn: () => adminGetCases({ limit: 500 }) })

  const metricsQ = useQuery({
    queryKey: ['admin-metrics-ts'],
    queryFn: () => adminGetMetrics({ time_window: 48 }),
    refetchInterval: 60_000,
  })

  const benchQ = useQuery({
    queryKey: ['admin-benchmark-latest', benchmarkMode],
    queryFn: () => adminGetBenchmarkLatest(benchmarkMode).catch(() => null),
  })

  const gatesQ = useQuery({
    queryKey: ['admin-release-gates'],
    queryFn: () => adminGetReleaseGate(),
  })

  useQuery({
    queryKey: ['admin-docs-processed', (casesQ.data?.items ?? []).map((i: any) => i.id).join(',')],
    enabled: Boolean(casesQ.data?.items?.length),
    queryFn: async () => {
      const cases = (casesQ.data?.items ?? []).slice(0, 50)
      const docs = await Promise.all(cases.map((c: any) => clerkGetCaseDocuments(c.id)))
      const count = docs.flatMap((b: any) => b.items)
        .filter((d: any) => ['completed', 'embedded', 'partial_indexed'].includes(String(d.processing_status).toLowerCase()))
        .length
      setDocsProcessed(count)
      return count
    },
  })

  // ── mutations ────────────────────────────────────────────────────────────
  const runBenchmarkMut = useMutation({
    mutationFn: () => adminRunBenchmark(benchmarkMode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-benchmark-latest'] }),
  })

  const submitGateMut = useMutation({
    mutationFn: (payload: ReleaseGateRequest) => adminSubmitReleaseGate(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-release-gates'] }),
  })

  // ── derived stats ─────────────────────────────────────────────────────
  const overview = useMemo(() => {
    const cases = casesQ.data?.items ?? []
    const users = usersQ.data ?? []
    return {
      totalCases: cases.length,
      activeJudges: users.filter((u: any) => u.role === 'judge' && String(u.is_active).toLowerCase() === 'true').length,
      documentsProcessed: docsProcessed,
      judgmentsFinalized: cases.filter((c: any) => c.status === 'Finalized').length,
    }
  }, [casesQ.data, usersQ.data, docsProcessed])

  const metrics = metricsQ.data

  // Build time-series lookup by (phase, metric_type)
  function tsData(phase: string, metricType: string) {
    return (metrics?.time_series ?? [])
      .find((ts: any) => ts.phase === phase && ts.metric_type === metricType)
      ?.data.map((pt: any) => ({ time: formatBucket(pt.bucket), value: pt.value })) ?? []
  }

  // Entity extraction bar data
  const entityBarData = Object.entries(metrics?.entity_extraction_by_type ?? {}).map(([k, v]: [string, any]) => ({
    name: k, accuracy: parseFloat((v * 100).toFixed(1)),
  }))

  // Phase 5 latency bar data
  const latencyData = [
    { name: 'Search Latency', ms: metrics?.search_latency ?? 0 },
    { name: 'AI Latency', ms: metrics?.ai_latency ?? 0 },
  ]

  return (
    <PortalLayout title={t('admin.pages.metricsTitle')} subtitle={t('admin.pages.metricsSubtitle')}>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          label={t('admin.stats.totalCases')} 
          value={overview.totalCases} 
          icon={GanttChart} 
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard 
          label={t('admin.stats.activeJudges')} 
          value={overview.activeJudges} 
          icon={Shield} 
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard 
          label={t('admin.stats.documentsProcessed')} 
          value={overview.documentsProcessed} 
          icon={Database} 
          trend={{ value: 24, isPositive: true }}
        />
        <StatCard 
          label={t('admin.stats.judgmentsFinalized')} 
          value={overview.judgmentsFinalized} 
          icon={CheckCircle} 
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* System Performance */}
        <Card className="shadow-sm border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              ⚡ System Latency & Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-accent/30 border">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Search Latency</p>
                <p className="text-xl font-bold">{metrics ? ms(metrics.search_latency) : '—'}</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/30 border">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">AI Latency</p>
                <p className="text-xl font-bold">{metrics ? ms(metrics.ai_latency) : '—'}</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Outcome Agreement</p>
                <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{metrics ? pct(metrics.outcome_agreement) : '—'}</p>
              </div>
              <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900">
                <p className="text-xs text-indigo-700 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">Judge Score (Avg)</p>
                <p className="text-xl font-bold text-indigo-800 dark:text-indigo-300">{metrics ? score(metrics.judge_score) + ' / 5' : '—'}</p>
              </div>
            </div>
            
            {latencyData.some(d => d.ms > 0) && (
              <div className="h-[180px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={latencyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={100} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                      formatter={(v: any) => [`${Number(v).toFixed(0)} ms`]}
                    />
                    <Bar dataKey="ms" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Retrieval KPIs */}
        <Card className="shadow-sm border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <SearchIcon className="w-5 h-5 text-primary" />
              🔍 Retrieval Performance (Phase 2)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-6">
               <div className="text-center p-3 rounded-lg border bg-muted/20">
                 <p className="text-[10px] text-muted-foreground font-bold uppercase">Prec@5</p>
                 <p className="text-lg font-bold">{metrics ? pct(metrics.precision_at_5) : '—'}</p>
               </div>
               <div className="text-center p-3 rounded-lg border bg-muted/20">
                 <p className="text-[10px] text-muted-foreground font-bold uppercase">Recall@5</p>
                 <p className="text-lg font-bold">{metrics ? pct(metrics.recall_at_5) : '—'}</p>
               </div>
               <div className="text-center p-3 rounded-lg border bg-muted/20">
                 <p className="text-[10px] text-muted-foreground font-bold uppercase">MRR</p>
                 <p className="text-lg font-bold">{metrics ? score(metrics.mrr) : '—'}</p>
               </div>
            </div>

            {['precision_at_5', 'recall_at_5', 'mrr'].some(m => tsData('phase_2', m).length > 0) && (
              <div className="h-[180px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(() => {
                    const keys = ['precision_at_5', 'recall_at_5', 'mrr']
                    const allTimes = [...new Set(keys.flatMap((k: any) => tsData('phase_2', k).map((d: any) => d.time)))].sort()
                    return allTimes.map((time: any) => {
                      const row: Record<string, any> = { time }
                      keys.forEach((k: any) => {
                        const pt = tsData('phase_2', k).find((d: any) => d.time === time)
                        row[k] = pt ? parseFloat(pt.value.toFixed(4)) : undefined
                      })
                      return row
                    })
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" hide />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 1]} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                    <Line type="monotone" dataKey="precision_at_5" stroke="#0f172a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="recall_at_5" stroke="#475569" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="mrr" stroke="#94a3b8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Entity Extraction */}
        <Card className="lg:col-span-1 shadow-sm border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              📋 Extraction Accuracy
            </CardTitle>
            <CardDescription>Accuracy by entity type (Phase 1)</CardDescription>
          </CardHeader>
          <CardContent>
            {entityBarData.length > 0 ? (
              <div className="h-[250px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entityBarData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: any) => `${v}%`} domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="accuracy" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center py-10 text-muted-foreground text-sm">No data available</p>}
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-muted-foreground">Overall Accuracy</span>
              <Badge variant="success">{metrics ? pct(metrics.entity_extraction_accuracy) : '—'}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Case Similarity */}
        <Card className="lg:col-span-2 shadow-sm border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              ⚖️ Case Similarity Engine (Phase 3)
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-muted/20 border flex justify-between items-center">
                   <p className="text-xs font-bold text-muted-foreground uppercase">Top-5 Accuracy</p>
                   <p className="text-xl font-black text-primary">{metrics ? pct(metrics.top_5_accuracy) : '—'}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 border flex justify-between items-center">
                   <p className="text-xs font-bold text-muted-foreground uppercase">Avg Similarity</p>
                   <p className="text-xl font-black text-primary">{metrics ? score(metrics.avg_similarity_score) : '—'}</p>
                </div>
             </div>

             {['top_5_accuracy', 'avg_similarity_score'].some(m => tsData('phase_3', m).length > 0) && (
              <div className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(() => {
                    const keys = ['top_5_accuracy', 'avg_similarity_score']
                    const allTimes = [...new Set(keys.flatMap((k: any) => tsData('phase_3', k).map((d: any) => d.time)))].sort()
                    return allTimes.map((time: any) => {
                      const row: Record<string, any> = { time }
                      keys.forEach((k: any) => {
                        const pt = tsData('phase_3', k).find((d: any) => d.time === time)
                        row[k] = pt ? parseFloat(pt.value.toFixed(4)) : undefined
                      })
                      return row
                    })
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" hide />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                    <Line type="monotone" dataKey="top_5_accuracy" stroke="#0f172a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="avg_similarity_score" stroke="#64748b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Benchmark section */}
      <Card className="mb-8 shadow-sm border border-border/50 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              🧪 Evaluation Benchmark (UAE Labour Law)
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <select
              value={benchmarkMode}
              onChange={(e: any) => setBenchmarkMode(e.target.value as 'dense_baseline' | 'hybrid')}
              className="bg-background border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="dense_baseline">Dense Baseline</option>
              <option value="hybrid">Hybrid (Sparse + Dense)</option>
            </select>
            <Button
              size="sm"
              onClick={() => runBenchmarkMut.mutate()}
              disabled={runBenchmarkMut.isPending}
            >
              {runBenchmarkMut.isPending ? 'Running…' : 'Run Benchmark'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {benchQ.data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Mode</TableHead>
                  <TableHead>Precision@5</TableHead>
                  <TableHead>Recall@5</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Queries</TableHead>
                  <TableHead className="pr-6 text-right">Run At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="pl-6 font-bold uppercase text-xs">{benchQ.data.mode}</TableCell>
                  <TableCell><Badge variant="outline">{pct(benchQ.data.precision_at_5)}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{pct(benchQ.data.recall_at_5)}</Badge></TableCell>
                  <TableCell className="font-mono">{score(benchQ.data.mrr)}</TableCell>
                  <TableCell>{benchQ.data.query_count}</TableCell>
                  <TableCell className="pr-6 text-right text-muted-foreground text-xs">
                    {benchQ.data.run_at ? format(new Date(benchQ.data.run_at), 'dd/MM/yyyy HH:mm') : '—'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-muted-foreground italic text-sm">No benchmark data loaded</div>
          )}
        </CardContent>
      </Card>

      {/* Release Gate section */}
      <Card className="shadow-sm border border-border/50">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              🚦 Model Release Gates
            </CardTitle>
            <CardDescription>Decisions for phase promotion to production</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => (document.getElementById('gate-modal') as any)?.showModal()}>
             Record New Decision
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {gatesQ.data && gatesQ.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Phase</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sign-off</TableHead>
                  <TableHead className="pr-6 text-right">Decision Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gatesQ.data.map((g: any) => (
                  <TableRow key={g.id}>
                    <TableCell className="pl-6 font-bold text-xs uppercase text-primary">{g.phase.replace('_', ' ')}</TableCell>
                    <TableCell className="text-xs uppercase font-medium">{g.mode.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={g.status === 'approved' ? 'success' : 'warning'} className="uppercase text-[9px] font-black">
                        {g.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{g.judge_sign_off || '—'}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{g.rationale}</span>
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right text-muted-foreground text-xs">
                      {g.decided_at ? format(new Date(g.decided_at), 'dd/MM/yyyy HH:mm') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-20 text-center flex flex-col items-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm italic">No gate decisions recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simple Modal for Gate Recording using native HTML dialog (improved over original details) */}
      <dialog id="gate-modal" className="modal bg-transparent backdrop:bg-black/50 p-0 rounded-2xl border shadow-2xl w-full max-w-md">
        <div className="bg-card p-6">
          <h3 className="text-xl font-bold mb-4">Record Release Decision</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Phase</label>
                <select
                  value={gateForm.phase}
                  onChange={(e: any) => setGateForm((f: any) => ({ ...f, phase: e.target.value }))}
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="phase_1">Phase 1 — Entities</option>
                  <option value="phase_2">Phase 2 — Retrieval</option>
                  <option value="phase_3">Phase 3 — Similarity</option>
                  <option value="phase_5">Phase 5 — AI Agent</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Mode</label>
                <select
                  value={gateForm.mode}
                  onChange={(e: any) => setGateForm((f: any) => ({ ...f, mode: e.target.value }))}
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="dense_baseline">Dense Baseline</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Judge Sign-off</label>
              <input
                placeholder="Name of approving judge"
                value={gateForm.judge_sign_off}
                onChange={(e: any) => setGateForm((f: any) => ({ ...f, judge_sign_off: e.target.value }))}
                className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Rationale</label>
               <textarea
                placeholder="Technical justification for promotion..."
                value={gateForm.rationale}
                rows={3}
                onChange={(e: any) => setGateForm((f: any) => ({ ...f, rationale: e.target.value }))}
                className="w-full bg-background border rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => (document.getElementById('gate-modal') as any)?.close()}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-amber-500 hover:bg-amber-600 border-none"
                disabled={submitGateMut.isPending || !gateForm.judge_sign_off || !gateForm.rationale}
                onClick={() => {
                  submitGateMut.mutate({ ...gateForm, status: 'deferred' });
                  (document.getElementById('gate-modal') as any)?.close();
                }}
              >
                ⏸ Defer
              </Button>
              <Button 
                className="flex-1"
                disabled={submitGateMut.isPending || !gateForm.judge_sign_off || !gateForm.rationale}
                onClick={() => {
                  submitGateMut.mutate({ ...gateForm, status: 'approved' });
                  (document.getElementById('gate-modal') as any)?.close();
                }}
              >
                ✔ Approve
              </Button>
            </div>
          </div>
        </div>
      </dialog>
    </PortalLayout>
  )
}

export default MetricsDashboard
