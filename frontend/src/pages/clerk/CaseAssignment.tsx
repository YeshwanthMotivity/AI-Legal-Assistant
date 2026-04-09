import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { 
  Gavel, 
  UserCheck, 
  Clock,
  Briefcase,
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  RefreshCcw,
  Sparkles
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import { clerkGetCases, clerkAssignCase, clerkGetJudges } from '../../api/clerk'
import { queryKeys } from '../../api/queryKeys'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { CaseResponse } from '../../types/judge'
import type { AdminUser } from '../../types/admin'

const ClerkCaseAssignment = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [judgeMap, setJudgeMap] = useState<Record<string, string>>({})

  const judgesQuery = useQuery({
    queryKey: queryKeys.judges,
    queryFn: clerkGetJudges,
  })

  const casesQuery = useQuery({
    queryKey: queryKeys.clerkCases,
    queryFn: () => clerkGetCases({ limit: 500 }),
  })

  const judges = useMemo(
    () => (judgesQuery.data ?? []).filter((user: AdminUser) => String(user.is_active).toLowerCase() === 'true'),
    [judgesQuery.data]
  )

  const judgeName = (judgeId: string | null | undefined) => {
    if (!judgeId) return '-'
    const found = judges.find((judge: AdminUser) => judge.id === judgeId)
    return found ? ((found as any).full_name || found.username) : judgeId
  }

  const assignMutation = useMutation({
    mutationFn: ({ caseId, judgeId }: { caseId: string; judgeId: string }) => clerkAssignCase(caseId, judgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clerkCases })
      setMessageType('success')
      setMessage(t('clerk.messages.caseAssigned', 'Case successfully assigned to judge.'))
    },
    onError: () => {
      setMessageType('error')
      setMessage(t('clerk.messages.caseAssignFailed', 'Failed to assign case.'))
    },
  })

  // Only show cases that have completed AI analysis (AIAnalysisReady, DraftGenerated, or Finalized)
  const readyCases = useMemo(
    () => (casesQuery.data?.items ?? []).filter((item: CaseResponse) => 
      ['AIAnalysisReady', 'DraftGenerated', 'Finalized'].includes(item.status)
    ),
    [casesQuery.data]
  )

  const unassigned = readyCases.filter((item: CaseResponse) => !item.assigned_to)
  const assigned = readyCases.filter((item: CaseResponse) => Boolean(item.assigned_to))

  return (
    <PortalLayout 
      title={t('clerk.pages.assignmentsTitle', 'Case Assignment')} 
      subtitle={t('clerk.pages.assignmentsSubtitle', 'Assign analyzed cases to the appropriate judge for review.')}
    >
      <div className="space-y-8">
        {message && (
          <div className={cn(
            "p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm",
            messageType === 'error'
              ? "bg-destructive/10 border-destructive/20 text-destructive"
              : "bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]"
          )}>
            {messageType === 'error' ? <AlertCircle className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>}
            <p className="text-sm font-bold tracking-tight">{message}</p>
            <button className="ml-auto text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity" onClick={() => setMessage('')}>Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* Unassigned Cases Section */}
          <Card className="shadow-2xl border-primary/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-5">
              <Gavel className="w-32 h-32"/>
            </div>
            <CardHeader className="bg-primary/5 border-b py-6 px-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                    <Clock className="w-6 h-6"/>
                  </div>
                  <div>
                    <CardTitle className="text-xl tracking-tight">{t('clerk.assignment.unassignedTitle', 'Awaiting Assignment')}</CardTitle>
                    <CardDescription className="text-xs font-medium italic">Cases with completed AI analysis, ready for judicial assignment</CardDescription>
                  </div>
                </div>
                <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 px-4 h-7 text-[10px] font-black uppercase tracking-widest">
                  Pending: {unassigned.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/5">
                  <TableRow>
                    <TableHead className="pl-10 font-black uppercase text-[10px] tracking-widest py-5">{t('case.caseNumber')}</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('clerk.forms.title')}</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('case.caseType')}</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('case.status')}</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('clerk.assignment.selectJudge', 'Select Judge')}</TableHead>
                    <TableHead className="pr-10 font-black uppercase text-[10px] tracking-widest text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unassigned.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-[var(--primary)]/5 rounded-full flex items-center justify-center text-[var(--primary)]/20">
                            <CheckCircle2 className="w-8 h-8"/>
                          </div>
                          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">All analyzed cases have been assigned</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : unassigned.map((item: CaseResponse) => (
                    <TableRow key={item.id} className="group hover:bg-muted/10 transition-colors">
                      <TableCell className="pl-10 py-6">
                        <span className="font-black text-xs text-primary bg-primary/5 px-2 py-1 rounded-md border border-primary/10 tracking-widest">{item.case_number}</span>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="flex items-center gap-3">
                          <Briefcase className="w-4 h-4 text-muted-foreground opacity-50"/>
                          <span className="font-bold text-sm tracking-tight truncate">{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter border-muted-foreground/20 text-muted-foreground bg-muted/5">
                          {t(`judge.caseTypes.${item.case_type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="text-[10px] font-black uppercase tracking-tighter bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 hover:bg-[var(--primary)]/10">
                          {t(`status.${item.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <select
                          className="w-full max-w-[200px] bg-muted/20 border-border/50 border rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none font-bold cursor-pointer hover:bg-muted/40 transition-colors"
                          value={judgeMap[item.id] ?? ''}
                          onChange={(e) => setJudgeMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                        >
                          <option value="">{t('clerk.assignment.selectJudge', 'Select Judge')}</option>
                          {judges.map((judge: AdminUser) => (
                            <option key={judge.id} value={judge.id}>{(judge as any).full_name || judge.username}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="pr-10 text-right">
                        <Button
                          disabled={!judgeMap[item.id] || assignMutation.isPending}
                          onClick={() => assignMutation.mutate({ caseId: item.id, judgeId: judgeMap[item.id] })}
                          className="h-10 px-8 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 group/btn"
                        >
                          <UserCheck className="w-4 h-4 group-hover/btn:scale-110 transition-transform"/>
                          {t('clerk.assignment.assign', 'Assign')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Assigned Cases Section */}
          <Card className="shadow-lg border-border/50 overflow-hidden">
            <CardHeader className="bg-muted/10 border-b py-6 px-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-muted/20 rounded-2xl text-muted-foreground">
                    <ShieldCheck className="w-6 h-6"/>
                  </div>
                  <div>
                    <CardTitle className="text-xl tracking-tight">{t('clerk.assignment.assignedTitle', 'Assigned Cases')}</CardTitle>
                    <CardDescription className="text-xs font-medium italic">Cases currently assigned to judges for review</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-4 h-7">
                  Total: {assigned.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/5">
                  <TableRow>
                    <TableHead className="pl-10 font-black uppercase text-[10px] tracking-widest py-5">{t('case.caseNumber')}</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('clerk.forms.title')}</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('clerk.forms.assignedJudge')}</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('case.status')}</TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('clerk.assignment.reassign', 'Reassign')}</TableHead>
                    <TableHead className="pr-10 font-black uppercase text-[10px] tracking-widest text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assigned.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center">
                        <p className="text-sm text-muted-foreground italic">No cases have been assigned yet.</p>
                      </TableCell>
                    </TableRow>
                  ) : assigned.map((item: CaseResponse) => (
                    <TableRow key={item.id} className="group hover:bg-muted/5 transition-colors">
                      <TableCell className="pl-10 py-6">
                        <span className="font-bold text-xs text-muted-foreground opacity-70 tracking-widest">{item.case_number}</span>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span className="font-bold text-xs text-muted-foreground opacity-80 truncate block">{item.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-[var(--primary)]/20 text-[var(--primary)] bg-[var(--primary)]/5 h-6">
                          {judgeName(item.assigned_to)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter border-muted-foreground/20 text-muted-foreground">
                          {t(`status.${item.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <select
                          className="w-full max-w-[200px] bg-card border border-border/50 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary/10 outline-none font-bold cursor-pointer group-hover:bg-muted transition-colors opacity-60 group-hover:opacity-100"
                          value={judgeMap[item.id] ?? item.assigned_to ?? ''}
                          onChange={(e) => setJudgeMap(prev => ({ ...prev, [item.id]: e.target.value }))}
                        >
                          {judges.map((judge: AdminUser) => (
                            <option key={judge.id} value={judge.id}>{(judge as any).full_name || judge.username}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="pr-10 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-4 rounded-lg font-bold gap-2 text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all opacity-40 group-hover:opacity-100"
                          disabled={!judgeMap[item.id] || judgeMap[item.id] === item.assigned_to || assignMutation.isPending}
                          onClick={() => assignMutation.mutate({ caseId: item.id, judgeId: judgeMap[item.id] })}
                        >
                          <RefreshCcw className="w-3.5 h-3.5"/>
                          {t('clerk.assignment.reassign', 'Reassign')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalLayout>
  )
}

export default ClerkCaseAssignment
