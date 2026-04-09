import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Activity,
  History,
  FileText,
  Clock,
  ArrowRight,
  Gavel,
  CheckCircle2,
  Trash2,
  Brain,
  Sparkles
} from 'lucide-react'
import {
  clerkGetCases,
  clerkCreateCase,
  clerkGetJudges,
  clerkDeleteCase
} from '@/api/clerk'
import PortalLayout from '@/components/layout/PortalLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { queryKeys } from '@/api/queryKeys'
import { ClerkCase } from '@/types/clerk'
import { CaseType } from '@/types/judge'
import { cn } from '@/lib/utils'

const ClerkCaseList = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  
  // Create Case Form State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [createForm, setCreateForm] = useState({
    title: '',
    case_type: 'unpaid_wages',
    claimant_name: '',
    respondent_name: '',
    filing_date: '',
    court_number: '',
    claim_amount: '',
    description: ''
  })

  const casesQuery = useQuery({
    queryKey: queryKeys.clerkCases({ limit: 200 }),
    queryFn: () => clerkGetCases({ limit: 200 }),
  })

  const judgesQuery = useQuery({
    queryKey: queryKeys.judges,
    queryFn: clerkGetJudges,
  })

  const selectedCase = useMemo(
    () => (casesQuery.data?.items ?? []).find((item: ClerkCase) => item.id === selectedCaseId),
    [casesQuery.data?.items, selectedCaseId]
  )

  const createCaseMutation = useMutation({
    mutationFn: clerkCreateCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clerkCases() })
      setMessageType('success')
      setMessage(t('clerk.messages.caseCreated'))
      setCreateForm({
        title: '',
        case_type: 'unpaid_wages',
        claimant_name: '',
        respondent_name: '',
        filing_date: '',
        court_number: '',
        claim_amount: '',
        description: ''
      })
      setTimeout(() => {
        setIsCreateModalOpen(false)
        setMessage(null)
      }, 1500)
    },
    onError: () => {
      setMessageType('error')
      setMessage(t('clerk.messages.error'))
    }
  })

  const deleteCaseMutation = useMutation({
    mutationFn: (id: string) => clerkDeleteCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clerkCases() })
      if (selectedCaseId) setSelectedCaseId(null)
    }
  })

  const filteredCases = useMemo(() => {
    const items = casesQuery.data?.items ?? []
    return items.filter((c: ClerkCase) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [casesQuery.data, searchQuery])

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createCaseMutation.mutate({
      ...createForm,
      case_type: createForm.case_type as CaseType,
      claim_amount: String(createForm.claim_amount)
    })
  }

  const handleDeleteCase = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(t('clerk.messages.confirmDelete'))) {
      deleteCaseMutation.mutate(id)
    }
  }

  return (
    <PortalLayout title={t('clerk.dashboard.title', 'Judicial Registry')} hideHeaderContent>
      <div className={cn("flex flex-col h-full bg-[#F8F8F5] overflow-hidden", i18n.language === 'ar' ? "flex-row-reverse text-right" : "flex-row")}>
        
        {/* MAIN REGISTRY COLUMN */}
        <div className="flex-1 flex flex-col min-w-0 bg-white shadow-sm border-r border-border/40">
          
          {/* Header & Controls */}
          <header className="p-8 space-y-8 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground uppercase leading-none">{t('clerk.dashboard.registry', 'Case Registry')}</h1>
                <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mt-2">Precision Judicial Management Node</p>
              </div>

              <div className="flex items-center gap-4">
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-11 px-6 bg-primary text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                      <Plus className="w-4 h-4 mr-2" /> {t('clerk.dashboard.newCase', 'Create New Case')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] border-[var(--primary)]/20 p-0 overflow-hidden rounded-[2rem]">
                    <div className="p-8 bg-white space-y-8">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">{t('clerk.dashboard.newCase', 'Create New Judicial Record')}</DialogTitle>
                    </DialogHeader>
                    
                    {message && (
                      <div className={cn(
                        "p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 duration-300",
                        messageType === 'success' ? "bg-primary/5 border-primary/20 text-primary" : "bg-destructive/5 border-destructive/20 text-destructive"
                      )}>
                        {messageType === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <MoreVertical className="w-5 h-5 rotate-90" />}
                        <span className="text-xs font-black uppercase tracking-tight">{message}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateSubmit} className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t('clerk.form.title', 'Case Title (Narrative Identity)')}</Label>
                          <Input 
                            required
                            placeholder="e.g. Al-Futtaim v. Landmark Group" 
                            className="h-12 border-border/60 focus:border-primary/40 rounded-xl bg-muted/20"
                            value={createForm.title}
                            onChange={e => setCreateForm({...createForm, title: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t('clerk.form.type', 'Litigation Category')}</Label>
                          <Select 
                            value={createForm.case_type} 
                            onValueChange={v => setCreateForm({...createForm, case_type: v})}
                          >
                            <SelectTrigger className="h-12 border-border/60 rounded-xl bg-muted/20">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unpaid_wages">Unpaid Wages</SelectItem>
                              <SelectItem value="wrongful_termination">Arbitrary Dismissal</SelectItem>
                              <SelectItem value="contract_dispute">Contract Dispute</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t('clerk.form.amount', 'Claim Quantum (AED)')}</Label>
                          <Input 
                            type="number"
                            placeholder="0.00" 
                            className="h-12 border-border/60 rounded-xl bg-muted/20"
                            value={createForm.claim_amount}
                            onChange={e => setCreateForm({...createForm, claim_amount: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t('clerk.form.claimant', 'Claimant Name')}</Label>
                          <Input 
                            className="h-12 border-border/60 rounded-xl bg-muted/20"
                            value={createForm.claimant_name}
                            onChange={e => setCreateForm({...createForm, claimant_name: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t('clerk.form.respondent', 'Respondent Name')}</Label>
                          <Input 
                            className="h-12 border-border/60 rounded-xl bg-muted/20"
                            value={createForm.respondent_name}
                            onChange={e => setCreateForm({...createForm, respondent_name: e.target.value})}
                          />
                        </div>
                      </div>

                      <DialogFooter className="pt-4">
                        <Button 
                          type="submit" 
                          disabled={createCaseMutation.isPending}
                          className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest text-[11px] rounded-xl"
                        >
                          {createCaseMutation.isPending ? 'Processing...' : t('clerk.form.submit', 'Establish Case Record')}
                        </Button>
                      </DialogFooter>
                    </form>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input 
                  placeholder={t('clerk.dashboard.search', 'Search by title or reference number...')}
                  className="h-14 pl-12 bg-white border-border/60 focus:border-primary/40 rounded-2xl shadow-sm text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="h-14 px-6 border-border/60 text-muted-foreground bg-white rounded-2xl">
                <Filter className="w-4 h-4 mr-2" /> {t('clerk.dashboard.filters', 'Filters')}
              </Button>
            </div>
          </header>

          {/* Table/List Area */}
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            <div className="bg-white border border-border/50 rounded-[2rem] overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/10">
                    <th className="px-6 py-5 text-[9px] font-black text-muted-foreground uppercase tracking-widest">{t('clerk.table.caseDetail', 'Case Detail & Reference')}</th>
                    <th className="px-6 py-5 text-[9px] font-black text-muted-foreground uppercase tracking-widest">{t('clerk.table.parties', 'Litigation Parties')}</th>
                    <th className="px-6 py-5 text-[9px] font-black text-muted-foreground uppercase tracking-widest">{t('clerk.table.status', 'Analysis Status')}</th>
                    <th className="px-6 py-5 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">{t('clerk.table.actions', 'Protocols')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredCases.map((c: ClerkCase) => (
                    <tr 
                      key={c.id} 
                      className={cn(
                        "group transition-all hover:bg-muted/5 cursor-pointer",
                        selectedCaseId === c.id && "bg-primary/[0.03] active-row"
                      )}
                      onClick={() => setSelectedCaseId(c.id)}
                    >
                      <td className="px-6 py-6">
                        <div className="space-y-1.5">
                          <p className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors leading-tight truncate max-w-[280px] uppercase">
                            {c.title}
                          </p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black font-mono text-primary/40 group-hover:text-primary/60 transition-colors uppercase tracking-tight">{c.case_number}</span>
                             <span className="w-1 h-1 rounded-full bg-border" />
                             <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">{c.case_type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
                             <span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-tight truncate max-w-[140px]">{c.claimant_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-muted/40" />
                             <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-tight truncate max-w-[140px]">{c.respondent_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                              c.status === 'Created' && "border-primary/20 text-primary bg-primary/5",
                              c.status === 'AIAnalysisReady' && "border-blue-500/20 text-blue-500 bg-blue-500/5",
                              c.status === 'CaseClosed' && "border-green-600/20 text-green-600 bg-green-600/5",
                              c.status === 'DocumentsUploaded' && "border-orange-500/20 text-orange-500 bg-orange-500/5"
                            )}>
                              {c.status}
                            </Badge>
                            {c.ai_precision_score && (
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-primary" />
                                <span className="text-[9px] font-black text-primary">{c.ai_precision_score}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-9 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl"
                            onClick={(e) => handleDeleteCase(c.id, e)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            className="h-9 px-4 bg-primary/5 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-xl transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/clerk/cases/${c.id}`);
                            }}
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('clerk.table.view', 'Orchestrate')}</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-2" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCases.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-32 text-center opacity-30 grayscale scale-95 transition-all">
                        <div className="flex flex-col items-center gap-4">
                           <History className="w-12 h-12 text-primary/40" />
                           <p className="text-xs font-black uppercase tracking-[0.2em]">{t('clerk.dashboard.noCases', 'No active case records found.')}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* DETAILS/INSIGHT PANEL */}
        <aside className="w-[450px] flex flex-col shrink-0 bg-[#FBFBF9]/80 backdrop-blur-xl transition-all duration-500">
           {selectedCase ? (
             <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Header Section */}
                <header className="p-8 border-b border-border/40 space-y-6">
                   <div className="flex items-center justify-between">
                      <div className="p-3 bg-primary/5 border border-primary/10 rounded-2xl shadow-sm">
                         <Gavel className="w-6 h-6 text-primary" />
                      </div>
                      <Badge className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">{selectedCase.status}</Badge>
                   </div>
                   <div>
                      <h3 className="text-xl font-black tracking-tight text-foreground uppercase antialiased">{selectedCase.title}</h3>
                      <p className="text-xs font-black font-mono text-primary/40 uppercase mt-2">{selectedCase.case_number}</p>
                   </div>
                </header>

                {/* Info Groups */}
                <div className="flex-1 overflow-y-auto w-full">
                  <div className="p-8 space-y-10">
                    <section className="space-y-4">
                       <h4 className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.25em]">{t('clerk.dashboard.recordIdentity', 'Judicial Identity')}</h4>
                       <div className="grid grid-cols-1 gap-4">
                          <div className="p-5 bg-white border border-border/50 rounded-2xl shadow-sm space-y-3">
                             <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-primary opacity-30" />
                                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">{t('clerk.form.type', 'Litigation Category')}</span>
                             </div>
                             <p className="text-sm font-bold text-foreground antialiased uppercase">{selectedCase.case_type.replace('_', ' ')}</p>
                          </div>
                          <div className="p-5 bg-white border border-border/50 rounded-2xl shadow-sm space-y-3">
                             <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-primary opacity-30" />
                                <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">{t('clerk.table.filingDate', 'Filing Date')}</span>
                             </div>
                             <p className="text-sm font-bold text-foreground antialiased">
                               {selectedCase.filing_date ? new Date(selectedCase.filing_date).toLocaleDateString() : 'N/A'}
                             </p>
                          </div>
                       </div>
                    </section>

                    <section className="space-y-4">
                       <h4 className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.25em]">{t('clerk.dashboard.litigantProfile', 'Litigant Profile Matrix')}</h4>
                       <div className="bg-white border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                          <div className="p-5 border-b border-border/40 space-y-1.5 hover:bg-muted/5 transition-colors group">
                             <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest">{t('clerk.form.claimant', 'Claimant (Principal)')}</span>
                             <p className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors">{selectedCase.claimant_name}</p>
                          </div>
                          <div className="p-5 space-y-1.5 hover:bg-muted/5 transition-colors group">
                             <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">{t('clerk.form.respondent', 'Respondent (Entity)')}</span>
                             <p className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors">{selectedCase.respondent_name}</p>
                          </div>
                       </div>
                    </section>

                    {selectedCase.ai_precision_score && (
                      <section className="p-6 bg-primary/[0.03] border border-primary/10 rounded-2xl space-y-5">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <Sparkles className="w-4 h-4 text-primary" />
                               <span className="text-[10px] font-black text-primary uppercase tracking-widest">AI Intelligence Discovery</span>
                            </div>
                            <span className="text-xs font-black text-primary">{selectedCase.ai_precision_score}% Confidence</span>
                         </div>
                         <div className="h-1.5 bg-primary/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${selectedCase.ai_precision_score}%` }} />
                         </div>
                      </section>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <footer className="p-8 border-t border-border/40 bg-white">
                   <Button 
                     className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-primary/10 hover:translate-y-[-2px] transition-all"
                     onClick={() => navigate(`/clerk/cases/${selectedCase.id}`)}
                   >
                      {t('clerk.dashboard.orchestrateCase', 'Activate Orchestration Hub')} <ArrowRight className="ml-2 w-4 h-4" />
                   </Button>
                </footer>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-30 grayscale scale-95">
                <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center border border-primary/10">
                   <Brain className="w-10 h-10 text-primary opacity-40" />
                </div>
                <div>
                   <h3 className="text-sm font-black text-foreground uppercase tracking-widest">{t('clerk.dashboard.selectCase', 'Decision Engine Idle')}</h3>
                   <p className="text-[10px] font-semibold text-muted-foreground mt-2 uppercase tracking-tight">Select a case record to initiate analysis and review protocols.</p>
                </div>
             </div>
           )}
        </aside>
      </div>
    </PortalLayout>
  )
}

export default ClerkCaseList
