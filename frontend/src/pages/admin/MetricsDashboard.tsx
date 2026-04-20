import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
 LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
 Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { 
  
 Activity, 
 Search as SearchIcon, 
 Shield, 
 Database, 
 Zap,
 CheckCircle,
 
 BarChart3,
 FlaskConical,
 GanttChart,
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import {
 adminGetCases,
 adminGetMetrics,
 adminGetUsers,
 adminRunBenchmark,
 adminGetBenchmarkLatest,
} from '../../api/admin'
import { clerkGetCaseDocuments } from '../../api/clerk'
import { queryKeys } from '../../api/queryKeys'
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
 { name: t('admin.metrics.searchLatency'), ms: metrics?.search_latency ?? 0 },
 { name: t('admin.metrics.aiLatency'), ms: metrics?.ai_latency ?? 0 },
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
 <Zap className="w-5 h-5 text-primary"/>
 {t('admin.metrics.systemPerformance')}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 gap-4 mb-6">
 <div className="p-4 rounded-lg bg-accent/30 border">
 <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{t('admin.metrics.searchLatency')}</p>
 <p className="text-xl font-bold">{metrics ? ms(metrics.search_latency) : '—'}</p>
 </div>
 <div className="p-4 rounded-lg bg-accent/30 border">
 <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">{t('admin.metrics.aiLatency')}</p>
 <p className="text-xl font-bold">{metrics ? ms(metrics.ai_latency) : '—'}</p>
 </div>
 <div className="p-4 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
 <p className="text-xs text-[var(--primary)] font-bold uppercase tracking-wider mb-1">{t('admin.metrics.outcomeAgreement')}</p>
 <p className="text-xl font-bold text-[var(--primary)]">{metrics ? pct(metrics.outcome_agreement) : '—'}</p>
 </div>
 <div className="p-4 rounded-lg bg-[var(--accent-gold)]/10 border border-indigo-100">
 <p className="text-xs text-[var(--accent-gold)] font-bold uppercase tracking-wider mb-1">{t('admin.metrics.judgeScore')}</p>
 <p className="text-xl font-bold text-indigo-800">{metrics ? score(metrics.judge_score) + ' / 5' : '—'}</p>
 </div>
 </div>
 
 {latencyData.some(d => d.ms > 0) && (
 <div className="h-[180px] w-full mt-4">
 <ResponsiveContainer width="100%"height="100%">
 <BarChart data={latencyData} layout="vertical">
 <CartesianGrid strokeDasharray="3 3"vertical={false} stroke="#e2e8f0"/>
 <XAxis type="number"hide />
 <YAxis type="category"dataKey="name"tick={{ fontSize: 10, fill: '#64748b' }} width={100} />
 <Tooltip 
 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
 formatter={(v: any) => [`${Number(v).toFixed(0)} ms`]}
 />
 <Bar dataKey="ms"fill="#0f172a"radius={[0, 4, 4, 0]} barSize={20} />
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
 <SearchIcon className="w-5 h-5 text-primary"/>
 {t('admin.metrics.retrievalPerformance')}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-3 gap-2 mb-6">
 <div className="text-center p-3 rounded-lg border bg-muted/20">
 <p className="text-[10px] text-muted-foreground font-bold uppercase">{t('admin.metrics.prec5')}</p>
 <p className="text-lg font-bold">{metrics ? pct(metrics.precision_at_5) : '—'}</p>
 </div>
 <div className="text-center p-3 rounded-lg border bg-muted/20">
 <p className="text-[10px] text-muted-foreground font-bold uppercase">{t('admin.metrics.recall5')}</p>
 <p className="text-lg font-bold">{metrics ? pct(metrics.recall_at_5) : '—'}</p>
 </div>
 <div className="text-center p-3 rounded-lg border bg-muted/20">
 <p className="text-[10px] text-muted-foreground font-bold uppercase">{t('admin.metrics.mrr')}</p>
 <p className="text-lg font-bold">{metrics ? score(metrics.mrr) : '—'}</p>
 </div>
 </div>

 {['precision_at_5', 'recall_at_5', 'mrr'].some(m => tsData('phase_2', m).length > 0) && (
 <div className="h-[180px] w-full mt-4">
 <ResponsiveContainer width="100%"height="100%">
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
 <CartesianGrid strokeDasharray="3 3"vertical={false} stroke="#e2e8f0"/>
 <XAxis dataKey="time"hide />
 <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 1]} />
 <Tooltip />
 <Legend iconType="circle"wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
 <Line type="monotone"dataKey="precision_at_5"stroke="#0f172a"strokeWidth={2} dot={false} />
 <Line type="monotone"dataKey="recall_at_5"stroke="#475569"strokeWidth={2} dot={false} />
 <Line type="monotone"dataKey="mrr"stroke="#94a3b8"strokeWidth={2} dot={false} />
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
 <BarChart3 className="w-5 h-5 text-primary"/>
 {t('admin.metrics.extractionAccuracy')}
 </CardTitle>
 <CardDescription>{t('admin.metrics.extractionAccuracyDesc')}</CardDescription>
 </CardHeader>
 <CardContent>
 {entityBarData.length > 0 ? (
 <div className="h-[250px] w-full mt-2">
 <ResponsiveContainer width="100%"height="100%">
 <BarChart data={entityBarData}>
 <CartesianGrid strokeDasharray="3 3"vertical={false} stroke="#e2e8f0"/>
 <XAxis dataKey="name"tick={{ fontSize: 10, fill: '#64748b' }} />
 <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: any) => `${v}%`} domain={[0, 100]} />
 <Tooltip />
 <Bar dataKey="accuracy"fill="#0f172a"radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 ) : <p className="text-center py-10 text-muted-foreground text-sm">No data available</p>}
 <div className="mt-4 pt-4 border-t flex justify-between items-center">
 <span className="text-xs font-bold uppercase text-muted-foreground">{t('admin.metrics.overallAccuracy')}</span>
 <Badge variant="success">{metrics ? pct(metrics.entity_extraction_accuracy) : '—'}</Badge>
 </div>
 </CardContent>
 </Card>

 {/* Case Similarity */}
 <Card className="lg:col-span-2 shadow-sm border border-border/50">
 <CardHeader>
 <CardTitle className="text-lg flex items-center gap-2">
 <Activity className="w-5 h-5 text-primary"/>
 {t('admin.metrics.similarityEngine')}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 gap-4 mb-6">
 <div className="p-4 rounded-xl bg-muted/20 border flex justify-between items-center">
 <p className="text-xs font-bold text-muted-foreground uppercase">{t('admin.metrics.top5Accuracy')}</p>
 <p className="text-xl font-black text-primary">{metrics ? pct(metrics.top_5_accuracy) : '—'}</p>
 </div>
 <div className="p-4 rounded-xl bg-muted/20 border flex justify-between items-center">
 <p className="text-xs font-bold text-muted-foreground uppercase">{t('admin.metrics.avgSimilarity')}</p>
 <p className="text-xl font-black text-primary">{metrics ? score(metrics.avg_similarity_score) : '—'}</p>
 </div>
 </div>

 {['top_5_accuracy', 'avg_similarity_score'].some(m => tsData('phase_3', m).length > 0) && (
 <div className="h-[200px] w-full mt-4">
 <ResponsiveContainer width="100%"height="100%">
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
 <CartesianGrid strokeDasharray="3 3"vertical={false} stroke="#e2e8f0"/>
 <XAxis dataKey="time"hide />
 <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
 <Tooltip />
 <Legend iconType="circle"wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
 <Line type="monotone"dataKey="top_5_accuracy"stroke="#0f172a"strokeWidth={2} dot={false} />
 <Line type="monotone"dataKey="avg_similarity_score"stroke="#64748b"strokeWidth={2} dot={false} />
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
 <CardTitle className="text-lg flex items-center gap-2">
 <FlaskConical className="w-5 h-5 text-primary"/>
 {t('admin.metrics.benchmarkTitle')}
 </CardTitle>
 <div className="flex gap-2">
 <select
 value={benchmarkMode}
 onChange={(e: any) => setBenchmarkMode(e.target.value as 'dense_baseline' | 'hybrid')}
 className="bg-background border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
 >
 <option value="dense_baseline">{t('admin.metrics.denseBaseline')}</option>
 <option value="hybrid">{t('admin.metrics.hybridMode')}</option>
 </select>
 <Button
 size="sm"
 onClick={() => runBenchmarkMut.mutate()}
 disabled={runBenchmarkMut.isPending}
 >
 {runBenchmarkMut.isPending ? t('admin.metrics.running') : t('admin.metrics.runBenchmark')}
 </Button>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {benchQ.data ? (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="pl-6">{t('common.mode')}</TableHead>
 <TableHead>{t('admin.metrics.prec5')}</TableHead>
 <TableHead>{t('admin.metrics.recall5')}</TableHead>
 <TableHead>{t('admin.metrics.mrr')}</TableHead>
 <TableHead>{t('admin.metrics.queries')}</TableHead>
 <TableHead className="pr-6 text-right">{t('admin.metrics.runAt')}</TableHead>
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
 <div className="py-12 text-center text-muted-foreground italic text-sm">{t('admin.metrics.noBenchmarkData')}</div>
 )}
 </CardContent>
 </Card>

 </PortalLayout>
 )
}

export default MetricsDashboard
