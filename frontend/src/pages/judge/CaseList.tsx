import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Gavel,
  History,
  ExternalLink
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import CreateCaseModal from '../../components/judge/CreateCaseModal'
import { createCase, getJudgeCases } from '../../api/judge'
import type { CaseResponse, CreateCaseRequest } from '../../types/judge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import StatCard from '@/components/StatCard'
import { cn } from '@/lib/utils'

interface CaseListProps {
  openCreateOnLoad?: boolean
}

type DashboardTab = 'assigned' | 'previous'

const FINAL_STATUSES = new Set(['Finalized'])

const CaseList = ({ openCreateOnLoad = false }: CaseListProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<DashboardTab>('assigned')
  const [isModalOpen, setIsModalOpen] = useState(openCreateOnLoad)
  const [banner, setBanner] = useState('')

  const casesQuery = useQuery({
    queryKey: ['judge-cases'],
    queryFn: () => getJudgeCases({ limit: 200 }),
  })

  useEffect(() => {
    if (openCreateOnLoad) {
      setIsModalOpen(true)
    }
  }, [openCreateOnLoad])

  const createCaseMutation = useMutation({
    mutationFn: (payload: CreateCaseRequest) => createCase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-cases'] })
      setBanner(t('judge.dashboard.caseCreatedSuccess'))
      setIsModalOpen(false)
      if (location.pathname.endsWith('/new')) {
        navigate('/judge/cases', { replace: true })
      }
    },
  })

  const assignedCases = useMemo(
    () => (casesQuery.data?.items ?? []).filter((item) => !FINAL_STATUSES.has(item.status)),
    [casesQuery.data?.items]
  )

  const previousCases = useMemo(
    () => (casesQuery.data?.items ?? []).filter((item) => FINAL_STATUSES.has(item.status)),
    [casesQuery.data?.items]
  )

  const visibleCases: CaseResponse[] = activeTab === 'assigned' ? assignedCases : previousCases

  const stats = useMemo(() => {
    const items = casesQuery.data?.items ?? []
    return {
      active: items.filter(c => !FINAL_STATUSES.has(c.status)).length,
      finalized: items.filter(c => FINAL_STATUSES.has(c.status)).length,
      ready: items.filter(c => c.status === 'AIAnalysisReady').length,
      urgent: items.filter(c => c.hearing_date && new Date(c.hearing_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length
    }
  }, [casesQuery.data])

  return (
    <PortalLayout title={t('judge.dashboard.title')} subtitle={t('judge.dashboard.subtitle')}>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Active Cases" value={stats.active} icon={Gavel} />
        <StatCard label="Ready for Review" value={stats.ready} icon={CheckCircle2} className="border-l-4 border-l-emerald-500" />
        <StatCard label="Urgent Hearings" value={stats.urgent} icon={Clock} className="border-l-4 border-l-amber-500" />
        <StatCard label="Resolved & Finalized" value={stats.finalized} icon={History} className="border-l-4 border-l-indigo-500" />
      </div>

      <div className="flex flex-col gap-6">
        {/* Actions & Filters Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 p-1 bg-muted/30 rounded-xl border w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('assigned')}
              className={cn(
                "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'assigned' ? "bg-card text-primary shadow-sm" : "hover:bg-card/50 text-muted-foreground"
              )}
            >
              {t('judge.dashboard.assignedCases')}
            </button>
            <button
              onClick={() => setActiveTab('previous')}
              className={cn(
                "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all",
                activeTab === 'previous' ? "bg-card text-primary shadow-sm" : "hover:bg-card/50 text-muted-foreground"
              )}
            >
              {t('judge.dashboard.previousCases')}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  className="w-full bg-card border rounded-lg pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  style={{ paddingLeft: '3rem' }}
                  placeholder="Search cases..."
                />
             </div>
            <Button className="shadow-lg shadow-primary/20 gap-2 px-6" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4" />
              {t('judge.dashboard.createCase')}
            </Button>
          </div>
        </div>

        {/* Banner Section */}
        {banner && (
          <div className="bg-emerald-500/10 text-emerald-600 px-6 py-4 rounded-xl border border-emerald-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
             <CheckCircle2 className="w-5 h-5" />
             <span className="font-bold text-sm">{banner}</span>
             <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 hover:bg-emerald-500/10" onClick={() => setBanner('')}>
                <Plus className="w-4 h-4 rotate-45" />
             </Button>
          </div>
        )}

        {/* Case Table Card */}
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-0">
            {casesQuery.isLoading ? (
               <div className="py-20 text-center text-muted-foreground italic">{t('common.loading')}</div>
            ) : casesQuery.isError ? (
               <div className="py-20 text-center text-destructive">{t('common.error')}</div>
            ) : visibleCases.length === 0 ? (
               <div className="py-20 text-center flex flex-col items-center gap-4">
                  <Briefcase className="w-12 h-12 text-muted-foreground/20" />
                  <p className="text-muted-foreground italic">{t('judge.dashboard.noCases')}</p>
               </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="pl-6">{t('case.caseNumber')}</TableHead>
                    <TableHead>{t('clerk.forms.title')}</TableHead>
                    <TableHead>{t('case.caseType')}</TableHead>
                    <TableHead>{t('case.status')}</TableHead>
                    <TableHead>Hearing Date</TableHead>
                    <TableHead className="pr-6 text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCases.map((item) => (
                    <TableRow key={item.id} className="group hover:bg-muted/5 cursor-pointer" onClick={() => navigate(`/judge/cases/${item.id}`)}>
                      <TableCell className="pl-6 font-bold text-primary">{item.case_number}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{item.title}</TableCell>
                      <TableCell>
                        <span className="text-xs uppercase text-muted-foreground font-black tracking-wider">
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
                          className="px-2 py-0.5 text-[10px] font-black uppercase"
                        >
                          {t(`status.${item.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-medium">
                        {item.hearing_date ? new Date(item.hearing_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 rounded-lg text-primary"
                        >
                          {activeTab === 'assigned' ? t('judge.dashboard.openCase') : t('judge.dashboard.viewCase')}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateCaseModal
        isOpen={isModalOpen}
        isSubmitting={createCaseMutation.isPending}
        onClose={() => {
          setIsModalOpen(false)
          if (location.pathname.endsWith('/new')) {
            navigate('/judge/cases', { replace: true })
          }
        }}
        onSubmit={(payload) => createCaseMutation.mutateAsync(payload)}
      />
    </PortalLayout>
  )
}

export default CaseList
