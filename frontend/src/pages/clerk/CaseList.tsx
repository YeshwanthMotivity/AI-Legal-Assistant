import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { 
 Plus, 
 Search, 
 Filter, 
 MoreVertical, 
 Edit3, 
 Trash2, 
 ExternalLink,
 Briefcase,
 Clock,
 CheckCircle2,
 AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import PortalLayout from '../../components/layout/PortalLayout'
import { clerkCreateCase, clerkGetCases, clerkUpdateCaseMetadata } from '../../api/clerk'
import { queryKeys } from '../../api/queryKeys'
import type { CaseStatus, CaseType } from '../../types/judge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import StatCard from '@/components/StatCard'

const CASE_TYPES: CaseType[] = [
 'unpaid_wages',
 'wrongful_termination',
 'end_of_service',
 'contract_dispute',
 'other',
]

const STATUS_OPTIONS: CaseStatus[] = [
 'Created',
 'DocumentsUploaded',
 'AIAnalysisPending',
 'AIAnalysisReady',
 'DraftGenerated',
 'Finalized',
]

const ClerkCaseList = () => {
 const { t } = useTranslation()
 const queryClient = useQueryClient()

 const [message, setMessage] = useState('')
 const [messageType, setMessageType] = useState<'success' | 'error'>('success')
 const [selectedCaseId, setSelectedCaseId] = useState('')

 const [createForm, setCreateForm] = useState({
 title: '',
 case_type: 'unpaid_wages' as CaseType,
 claimant_name: '',
 respondent_name: '',
 filing_date: '',
 court_number: '',
 description: '',
 claim_amount: '',
 })

 const [metadataForm, setMetadataForm] = useState({
 hearing_date: '',
 status: 'Created' as CaseStatus,
 })

 const casesQuery = useQuery({
 queryKey: queryKeys.clerkCases,
 queryFn: () => clerkGetCases({ limit: 200 }),
 })

 const selectedCase = useMemo(
 () => (casesQuery.data?.items ?? []).find((item) => item.id === selectedCaseId),
 [casesQuery.data?.items, selectedCaseId]
 )

 const createCaseMutation = useMutation({
 mutationFn: clerkCreateCase,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: queryKeys.clerkCases })
 setMessageType('success')
 setMessage(t('clerk.messages.caseCreated'))
 setCreateForm({
 title: '',
 case_type: 'unpaid_wages',
 claimant_name: '',
 respondent_name: '',
 filing_date: '',
 court_number: '',
 description: '',
 claim_amount: '',
 })
 },
 onError: () => {
 setMessageType('error')
 setMessage(t('clerk.messages.caseCreateFailed'))
 },
 })

 const updateCaseMutation = useMutation({
 mutationFn: ({ caseId, payload }: { caseId: string; payload: { hearing_date?: string; status?: string } }) =>
 clerkUpdateCaseMetadata(caseId, payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: queryKeys.clerkCases })
 setMessageType('success')
 setMessage(t('clerk.messages.caseUpdated'))
 },
 onError: () => {
 setMessageType('error')
 setMessage(t('clerk.messages.caseUpdateFailed'))
 },
 })

 const stats = useMemo(() => {
 const items = casesQuery.data?.items ?? []
 return {
 total: items.length,
 pending: items.filter(c => ['Created', 'DocumentsUploaded', 'AIAnalysisPending'].includes(c.status)).length,
 ready: items.filter(c => c.status === 'AIAnalysisReady').length,
 finalized: items.filter(c => c.status === 'Finalized').length,
 }
 }, [casesQuery.data])

 return (
 <PortalLayout title={t('clerk.pages.casesTitle')} subtitle={t('clerk.pages.casesSubtitle')}>
 
 {/* Quick Stats */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
 <StatCard label="Total Cases"value={stats.total} icon={Briefcase} />
 <StatCard label="Processing"value={stats.pending} icon={Clock} className="border-l-4 border-l-amber-500"/>
 <StatCard label="Ready for Review"value={stats.ready} icon={AlertCircle} className="border-l-4 border-l-indigo-500"/>
 <StatCard label="Finalized"value={stats.finalized} icon={CheckCircle2} className="border-l-4 border-l-[var(--primary)]"/>
 </div>

 <div className="flex flex-col gap-6">
 {/* Actions & Filters Bar */}
 <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
 <div className="relative w-full sm:w-96">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
 <input 
 className="w-full bg-card border rounded-lg pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
 style={{ paddingLeft: '3rem' }}
 placeholder="Search by case number, title or claimant..."
 />
 </div>
 <div className="flex items-center gap-3 w-full sm:w-auto">
 <Button variant="outline"className="flex-1 sm:flex-none gap-2">
 <Filter className="w-4 h-4"/>
 Filters
 </Button>
 <Button className="flex-1 sm:flex-none gap-2 shadow-lg shadow-primary/20"onClick={() => (document.getElementById('create-case-modal') as any)?.showModal()}>
 <Plus className="w-4 h-4"/>
 {t('clerk.forms.createCaseAction')}
 </Button>
 </div>
 </div>

 {/* Case Table */}
 <Card className="shadow-sm border-border/50">
 <CardHeader className="bg-muted/10 border-b">
 <CardTitle className="text-lg">{t('clerk.tables.recentCases')}</CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 {casesQuery.isLoading ? (
 <div className="py-20 text-center text-muted-foreground italic">{t('common.loading')}</div>
 ) : casesQuery.isError ? (
 <div className="py-20 text-center text-destructive">{t('common.error')}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="pl-6">{t('case.caseNumber')}</TableHead>
 <TableHead>{t('clerk.forms.title')}</TableHead>
 <TableHead>{t('case.caseType')}</TableHead>
 <TableHead>{t('case.status')}</TableHead>
 <TableHead>{t('clerk.forms.assignedJudge')}</TableHead>
 <TableHead className="pr-6 text-right">{t('common.actions')}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {(casesQuery.data?.items ?? []).map((item) => (
 <TableRow key={item.id} className="group">
 <TableCell className="pl-6 font-bold text-primary">{item.case_number}</TableCell>
 <TableCell className="font-medium">{item.title}</TableCell>
 <TableCell>
 <span className="text-xs uppercase text-muted-foreground font-semibold">
 {t(`judge.caseTypes.${item.case_type}`)}
 </span>
 </TableCell>
 <TableCell>
 <Badge 
 variant={
 item.status === 'Finalized' ? 'success' : 
 ['AIAnalysisReady', 'DraftGenerated'].includes(item.status) ? 'default' : 
 'warning'
 }
 className="px-2 py-0 h-5 text-[10px] font-black uppercase tracking-tighter"
 >
 {t(`status.${item.status}`)}
 </Badge>
 </TableCell>
 <TableCell>{item.assigned_to ?? '-'}</TableCell>
 <TableCell className="pr-6 text-right">
 <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <Button 
 variant="ghost"
 size="icon"
 className="h-8 w-8 text-primary"
 onClick={() => {
 setSelectedCaseId(item.id)
 setMetadataForm({
 hearing_date: item.hearing_date ? item.hearing_date.slice(0, 10) : '',
 status: item.status,
 })
 setTimeout(() => (document.getElementById('edit-metadata-modal') as any)?.showModal(), 10)
 }}
 >
 <Edit3 className="w-4 h-4"/>
 </Button>
 <Button variant="ghost"size="icon"className="h-8 w-8 text-muted-foreground">
 <ExternalLink className="w-4 h-4"/>
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Create Case Modal */}
 <dialog id="create-case-modal"className="fixed inset-0 z-50 m-auto w-[95%] max-w-2xl h-fit max-h-[90vh] bg-background rounded-[40px] shadow-2xl border-none p-0 overflow-hidden backdrop:bg-black/60 backdrop:backdrop-blur-sm shadow-emerald-500/10">
 <div className="bg-card">
 <div className="p-6 border-b flex justify-between items-center bg-muted/20">
 <h3 className="text-xl font-bold">{t('clerk.forms.createCase')}</h3>
 <Button variant="ghost"size="icon"onClick={() => (document.getElementById('create-case-modal') as any)?.close()}>
 <Plus className="w-5 h-5 rotate-45"/>
 </Button>
 </div>
 <div className="p-8">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-2">
 <label className="text-xs font-black uppercase text-muted-foreground ml-1">{t('clerk.forms.title')}</label>
 <input
 className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
 placeholder="e.g. Al-Futtaim vs. Employee A"
 value={createForm.title}
 onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black uppercase text-muted-foreground ml-1">{t('clerk.forms.caseType')}</label>
 <select
 className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
 value={createForm.case_type}
 onChange={(event) => setCreateForm((prev) => ({ ...prev, case_type: event.target.value as CaseType }))}
 >
 {CASE_TYPES.map((caseType) => (
 <option key={caseType} value={caseType}>
 {t(`judge.caseTypes.${caseType}`)}
 </option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black uppercase text-muted-foreground ml-1">{t('clerk.forms.claimant')}</label>
 <input
 className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
 value={createForm.claimant_name}
 onChange={(event) => setCreateForm((prev) => ({ ...prev, claimant_name: event.target.value }))}
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black uppercase text-muted-foreground ml-1">{t('clerk.forms.respondent')}</label>
 <input
 className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
 value={createForm.respondent_name}
 onChange={(event) => setCreateForm((prev) => ({ ...prev, respondent_name: event.target.value }))}
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black uppercase text-muted-foreground ml-1">{t('clerk.forms.filingDate')}</label>
 <input
 type="date"
 className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
 value={createForm.filing_date}
 onChange={(event) => setCreateForm((prev) => ({ ...prev, filing_date: event.target.value }))}
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black uppercase text-muted-foreground ml-1">{t('clerk.forms.courtNumber')}</label>
 <input
 className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
 placeholder="e.g. DIFC-LC-2024-001"
 value={createForm.court_number}
 onChange={(event) => setCreateForm((prev) => ({ ...prev, court_number: event.target.value }))}
 />
 </div>
 <div className="space-y-2 md:col-span-2">
 <label className="text-xs font-black uppercase text-muted-foreground ml-1">{t('clerk.forms.claimAmount') || 'Claim Amount (AED)'}</label>
 <input
 className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
 placeholder="e.g. 55000"
 value={createForm.claim_amount}
 onChange={(event) => setCreateForm((prev) => ({ ...prev, claim_amount: event.target.value }))}
 />
 </div>
 <div className="space-y-2 md:col-span-2">
 <label className="text-xs font-black uppercase text-muted-foreground ml-1">{t('clerk.forms.description') || 'Case Description / Notes'}</label>
 <textarea
 className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
 placeholder="Briefly describe the nature of the claim..."
 value={createForm.description}
 onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
 />
 </div>
 </div>
 </div>
 <div className="p-6 border-t bg-muted/10 flex justify-end gap-3">
 <Button variant="outline"onClick={() => (document.getElementById('create-case-modal') as any)?.close()}>
 {t('common.cancel')}
 </Button>
 <Button 
 disabled={createCaseMutation.isPending}
 onClick={() => {
 if (!createForm.title || !createForm.claimant_name || !createForm.respondent_name || !createForm.filing_date) {
 setMessageType('error')
 setMessage(t('clerk.messages.requiredFields'))
 return
 }
 createCaseMutation.mutate({
 ...createForm,
 filing_date: `${createForm.filing_date}T00:00:00`,
 }, {
 onSuccess: () => (document.getElementById('create-case-modal') as any)?.close()
 })
 }}
 >
 {createCaseMutation.isPending ? t('common.loading') : t('clerk.forms.createCaseAction')}
 </Button>
 </div>
 </div>
 </dialog>

 {/* Metadata Editor Modal */}
 <dialog id="edit-metadata-modal"className="fixed inset-0 z-50 m-auto w-[95%] max-w-md h-fit max-h-[90vh] bg-background rounded-[40px] shadow-2xl border-none p-0 overflow-hidden backdrop:bg-black/60 backdrop:backdrop-blur-sm shadow-emerald-500/10">
 <div className="bg-card">
 <div className="p-6 border-b bg-muted/20">
 <h3 className="text-lg font-bold">{t('clerk.forms.metadataEditor')}</h3>
 <p className="text-xs text-muted-foreground font-mono mt-1">{selectedCase?.case_number || '-'}</p>
 </div>
 <div className="p-6 space-y-4">
 <div className="space-y-1">
 <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">{t('clerk.forms.hearingDate')}</label>
 <input
 type="date"
 className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
 value={metadataForm.hearing_date}
 onChange={(event) => setMetadataForm((prev) => ({ ...prev, hearing_date: event.target.value }))}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">{t('case.status')}</label>
 <select
 className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
 value={metadataForm.status}
 onChange={(event) => setMetadataForm((prev) => ({ ...prev, status: event.target.value as CaseStatus }))}
 >
 {STATUS_OPTIONS.map((status) => (
 <option key={status} value={status}>
 {t(`status.${status}`)}
 </option>
 ))}
 </select>
 </div>
 </div>
 <div className="p-6 border-t flex gap-2">
 <Button 
 variant="outline"
 className="flex-1"
 onClick={() => (document.getElementById('edit-metadata-modal') as any)?.close()}
 >
 {t('common.cancel')}
 </Button>
 <Button 
 className="flex-1"
 disabled={updateCaseMutation.isPending}
 onClick={() => {
 updateCaseMutation.mutate({
 caseId: selectedCaseId,
 payload: {
 hearing_date: metadataForm.hearing_date ? `${metadataForm.hearing_date}T10:00:00` : undefined,
 status: metadataForm.status,
 },
 }, {
 onSuccess: () => (document.getElementById('edit-metadata-modal') as any)?.close()
 })
 }}
 >
 {updateCaseMutation.isPending ? t('common.loading') : t('clerk.forms.saveMetadata')}
 </Button>
 </div>
 </div>
 </dialog>

 {/* Toasts / Notifications */}
 {message && (
 <div className={cn(
"fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl border shadow-2xl animate-in slide-in-from-right-10 duration-300",
 messageType === 'error' ?"bg-destructive text-destructive-foreground":"bg-card text-card-foreground border-primary/20"
 )}>
 {messageType === 'error' ? <AlertCircle className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5 text-primary"/>}
 <span className="font-semibold">{message}</span>
 <Button variant="ghost"size="icon"className="h-6 w-6 ml-4"onClick={() => setMessage('')}>
 <Plus className="w-4 h-4 rotate-45"/>
 </Button>
 </div>
 )}
 </PortalLayout>
 )
}

export default ClerkCaseList
