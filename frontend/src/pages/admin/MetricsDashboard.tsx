import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts'
import { format } from 'date-fns'
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

// ── colour palette ──────────────────────────────────────────────────────────
const COLOURS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa']

// ── helpers ─────────────────────────────────────────────────────────────────
function pct(v: number) { return `${(v * 100).toFixed(1)}%` }
function ms(v: number) { return `${v.toFixed(0)} ms` }
function score(v: number) { return v.toFixed(2) }

function formatBucket(iso: string) {
  try { return format(new Date(iso), 'dd/MM HH:mm') }
  catch { return iso }
}

// ── sub-components ───────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string
  value: string
  accent?: string
}
function KpiTile({ label, value, accent = '#6366f1' }: KpiTileProps) {
  return (
    <article style={{ background: 'var(--card-bg, #1e1e2e)', borderRadius: 12, padding: '1.2rem 1.5rem', borderTop: `3px solid ${accent}` }}>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>{label}</p>
      <p style={{ margin: '0.4rem 0 0', fontSize: 28, fontWeight: 700 }}>{value}</p>
    </article>
  )
}

interface SectionProps { title: string; children: React.ReactNode }
function Section({ title, children }: SectionProps) {
  return (
    <section style={{ background: 'var(--card-bg, #1e1e2e)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: 15, fontWeight: 600, letterSpacing: 0.3 }}>{title}</h3>
      {children}
    </section>
  )
}

interface StatusBadgeProps { status: string }
function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, string> = { approved: '#10b981', deferred: '#f59e0b', pending: '#6b7280' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 99,
      background: map[status] ?? '#6b7280', color: '#fff', fontSize: 12, fontWeight: 600,
    }}>
      {status}
    </span>
  )
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

      {/* ── Overview tiles ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiTile label={t('admin.stats.totalCases')} value={String(overview.totalCases)} accent="#6366f1" />
        <KpiTile label={t('admin.stats.activeJudges')} value={String(overview.activeJudges)} accent="#22d3ee" />
        <KpiTile label={t('admin.stats.documentsProcessed')} value={String(overview.documentsProcessed)} accent="#f59e0b" />
        <KpiTile label={t('admin.stats.judgmentsFinalized')} value={String(overview.judgmentsFinalized)} accent="#10b981" />
      </div>

      {/* ── System performance ────────────────────────────────────── */}
      <Section title="⚡ System Performance">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <KpiTile label="Search Latency" value={metrics ? ms(metrics.search_latency) : '—'} accent="#f43f5e" />
          <KpiTile label="AI Latency" value={metrics ? ms(metrics.ai_latency) : '—'} accent="#f43f5e" />
          <KpiTile label="Outcome Agreement" value={metrics ? pct(metrics.outcome_agreement) : '—'} accent="#10b981" />
          <KpiTile label="Judge Score (avg)" value={metrics ? score(metrics.judge_score) + ' / 5' : '—'} accent="#a78bfa" />
        </div>
        {/* Latency bar chart */}
        {latencyData.some(d => d.ms > 0) && (
          <div style={{ marginTop: '1.2rem', height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={latencyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis type="number" tickFormatter={(v: any) => `${v}ms`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(value: any) => [value ? `${Number(value).toFixed(0)} ms` : '—']} />
                <Bar dataKey="ms" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* ── Phase 1 — Entity Extraction ──────────────────────────── */}
      {entityBarData.length > 0 && (
        <Section title="📋 Phase 1 — Entity Extraction Accuracy by Type">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={entityBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: any) => `${v}%`} domain={[0, 100]} />
                <Tooltip formatter={(value: any) => [value ? `${value}%` : '—']} />
                <Bar dataKey="accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: 12, opacity: 0.5, margin: '0.5rem 0 0' }}>
            Overall: {metrics ? pct(metrics.entity_extraction_accuracy) : '—'}
          </p>
        </Section>
      )}

      {/* ── Phase 2 — Dense Retrieval KPIs ──────────────────────── */}
      <Section title="🔍 Phase 2 — Dense Retrieval (Precision@5 · Recall@5 · MRR)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <KpiTile label="Precision@5" value={metrics ? pct(metrics.precision_at_5) : '—'} />
          <KpiTile label="Recall@5" value={metrics ? pct(metrics.recall_at_5) : '—'} />
          <KpiTile label="MRR" value={metrics ? score(metrics.mrr) : '—'} />
        </div>
        {['precision_at_5', 'recall_at_5', 'mrr'].some(m => tsData('phase_2', m).length > 0) && (
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={(() => {
                const keys = ['precision_at_5', 'recall_at_5', 'mrr']
                const allTimes = [...new Set(keys.flatMap((k: any) => tsData('phase_2', k).map((d: any) => d.time)))].sort()
                return allTimes.map((time: any) => {
                  const row: Record<string, unknown> = { time }
                  keys.forEach((k: any) => {
                    const pt = tsData('phase_2', k).find((d: any) => d.time === time)
                    row[k] = pt ? parseFloat(pt.value.toFixed(4)) : undefined
                  })
                  return row
                })
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 1]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="precision_at_5" stroke={COLOURS[0]} dot={false} />
                <Line type="monotone" dataKey="recall_at_5" stroke={COLOURS[1]} dot={false} />
                <Line type="monotone" dataKey="mrr" stroke={COLOURS[2]} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* ── Phase 3 — Case Similarity ────────────────────────────── */}
      <Section title="⚖️ Phase 3 — Case Similarity Engine">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <KpiTile label="Top-5 Accuracy" value={metrics ? pct(metrics.top_5_accuracy) : '—'} />
          <KpiTile label="Avg Similarity" value={metrics ? score(metrics.avg_similarity_score) : '—'} />
        </div>
        {['top_5_accuracy', 'avg_similarity_score'].some(m => tsData('phase_3', m).length > 0) && (
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={(() => {
                const keys = ['top_5_accuracy', 'avg_similarity_score']
                const allTimes = [...new Set(keys.flatMap((k: any) => tsData('phase_3', k).map((d: any) => d.time)))].sort()
                return allTimes.map((time: any) => {
                  const row: Record<string, unknown> = { time }
                  keys.forEach((k: any) => {
                    const pt = tsData('phase_3', k).find((d: any) => d.time === time)
                    row[k] = pt ? parseFloat(pt.value.toFixed(4)) : undefined
                  })
                  return row
                })
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="top_5_accuracy" stroke={COLOURS[3]} dot={false} />
                <Line type="monotone" dataKey="avg_similarity_score" stroke={COLOURS[4]} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* ── Benchmark Runner ─────────────────────────────────────── */}
      <Section title="🧪 Benchmark Runner — UAE Labour Law Query Set">
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <select
            value={benchmarkMode}
            onChange={(e: any) => setBenchmarkMode(e.target.value as 'dense_baseline' | 'hybrid')}
            style={{ padding: '0.4rem 0.8rem', borderRadius: 8, background: 'var(--input-bg,#2a2a3e)', color: 'inherit', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <option value="dense_baseline">Dense Baseline</option>
            <option value="hybrid">Hybrid (Sparse + Dense)</option>
          </select>
          <button
            onClick={() => runBenchmarkMut.mutate()}
            disabled={runBenchmarkMut.isPending}
            style={{ padding: '0.4rem 1.2rem', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            {runBenchmarkMut.isPending ? 'Running…' : '▶  Run Benchmark'}
          </button>
          {runBenchmarkMut.isError && <span style={{ color: '#f43f5e', fontSize: 12 }}>Run failed — check embedder / Qdrant.</span>}
          {runBenchmarkMut.isSuccess && <span style={{ color: '#10b981', fontSize: 12 }}>✔ Benchmark complete</span>}
        </div>

        {benchQ.data && (
          <div className="table-wrap">
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Mode</th><th>Precision@5</th><th>Recall@5</th><th>MRR</th><th>Queries</th><th>Run At</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{benchQ.data.mode}</td>
                  <td>{pct(benchQ.data.precision_at_5)}</td>
                  <td>{pct(benchQ.data.recall_at_5)}</td>
                  <td>{score(benchQ.data.mrr)}</td>
                  <td>{benchQ.data.query_count}</td>
                  <td>{benchQ.data.run_at ? format(new Date(benchQ.data.run_at), 'dd/MM/yyyy HH:mm') : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Release Gate ──────────────────────────────────────────── */}
      <Section title="🚦 Release Gate — Phase Promotion Decisions">
        {/* Gate submit form */}
        <details style={{ marginBottom: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Record gate decision…</summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <select
              value={gateForm.phase}
              onChange={(e: any) => setGateForm((f: any) => ({ ...f, phase: e.target.value }))}
              style={{ padding: '0.4rem 0.8rem', borderRadius: 8, background: 'var(--input-bg,#2a2a3e)', color: 'inherit', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <option value="phase_1">Phase 1 — Entity Extraction</option>
              <option value="phase_2">Phase 2 — Dense Retrieval</option>
              <option value="phase_3">Phase 3 — Case Similarity</option>
              <option value="phase_5">Phase 5 — AI Orchestrator</option>
            </select>
            <select
              value={gateForm.mode}
              onChange={(e: any) => setGateForm((f: any) => ({ ...f, mode: e.target.value }))}
              style={{ padding: '0.4rem 0.8rem', borderRadius: 8, background: 'var(--input-bg,#2a2a3e)', color: 'inherit', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <option value="dense_baseline">Dense Baseline</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <input
              placeholder="Judge name / sign-off ref"
              value={gateForm.judge_sign_off}
              onChange={(e: any) => setGateForm((f: any) => ({ ...f, judge_sign_off: e.target.value }))}
              style={{ padding: '0.4rem 0.8rem', borderRadius: 8, background: 'var(--input-bg,#2a2a3e)', color: 'inherit', border: '1px solid rgba(255,255,255,0.15)', gridColumn: 'span 2' }}
            />
            <textarea
              placeholder="Rationale…"
              value={gateForm.rationale}
              rows={2}
              onChange={(e: any) => setGateForm((f: any) => ({ ...f, rationale: e.target.value }))}
              style={{ padding: '0.4rem 0.8rem', borderRadius: 8, background: 'var(--input-bg,#2a2a3e)', color: 'inherit', border: '1px solid rgba(255,255,255,0.15)', gridColumn: 'span 2', resize: 'vertical' }}
            />
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.75rem' }}>
              <button
                disabled={submitGateMut.isPending || !gateForm.judge_sign_off || !gateForm.rationale}
                onClick={() => submitGateMut.mutate({ ...gateForm, status: 'approved' })}
                style={{ flex: 1, padding: '0.5rem', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >✔ Approve</button>
              <button
                disabled={submitGateMut.isPending || !gateForm.judge_sign_off || !gateForm.rationale}
                onClick={() => submitGateMut.mutate({ ...gateForm, status: 'deferred' })}
                style={{ flex: 1, padding: '0.5rem', borderRadius: 8, background: '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >⏸ Defer</button>
            </div>
          </div>
        </details>

        {/* Gate history */}
        {gatesQ.isLoading && <p style={{ fontSize: 13, opacity: 0.5 }}>Loading gate records…</p>}
        {gatesQ.data && gatesQ.data.length === 0 && (
          <p style={{ fontSize: 13, opacity: 0.5 }}>No gate decisions recorded yet.</p>
        )}
        {gatesQ.data && gatesQ.data.length > 0 && (
          <div className="table-wrap">
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Phase</th><th>Mode</th><th>Status</th><th>Signed Off By</th>
                  <th>Rationale</th><th>Decided At</th>
                </tr>
              </thead>
              <tbody>
                {gatesQ.data.map((g: any) => (
                  <tr key={g.id}>
                    <td>{g.phase}</td>
                    <td>{g.mode}</td>
                    <td><StatusBadge status={g.status} /></td>
                    <td>{g.judge_sign_off ?? '—'}</td>
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.rationale ?? '—'}
                    </td>
                    <td>{g.decided_at ? format(new Date(g.decided_at), 'dd/MM/yyyy HH:mm') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </PortalLayout>
  )
}

export default MetricsDashboard
