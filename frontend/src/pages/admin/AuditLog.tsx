import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { 
 Activity, 
 User, 
 Database, 
 Clock, 
 ChevronLeft, 
 ChevronRight,
 Terminal,
 ShieldCheck,
 Search,
 Filter,
 Download
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import { adminGetAuditLogs } from '../../api/admin'
import { queryKeys } from '../../api/queryKeys'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const AuditLog = () => {
 const { t } = useTranslation()
 const [page, setPage] = useState(1)

 const skip = (page - 1) * PAGE_SIZE
 const auditQuery = useQuery({
 queryKey: queryKeys.adminAuditLogs(page, PAGE_SIZE),
 queryFn: () => adminGetAuditLogs({ skip, limit: PAGE_SIZE }),
 refetchInterval: 5000,
 })

 const totalPages = useMemo(() => {
 const total = auditQuery.data?.total ?? 0
 return Math.max(1, Math.ceil(total / PAGE_SIZE))
 }, [auditQuery.data?.total])

 return (
 <PortalLayout 
 title={t('admin.pages.auditTitle')} 
 subtitle="Immutable cryptographic ledger of all judicial and administrative operations."
 >
 <div className="space-y-6">
 {/* Dynamic Header Controls */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-primary/10 rounded-lg text-primary">
 <ShieldCheck className="w-5 h-5"/>
 </div>
 <div>
 <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Compliance Ledger</h2>
 <p className="text-xs text-muted-foreground font-medium italic">Verified Audit Stream • v5.2 (Real-time)</p>
 </div>
 </div>
 
 <div className="flex items-center gap-2">
 <div className="relative group">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors"/>
 <input 
 placeholder="Filter by description..."
 className="h-10 pl-10 pr-4 bg-muted/20 border-border/50 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none w-64 transition-all"
 />
 </div>
 <Button variant="outline"size="icon"className="h-10 w-10 rounded-xl">
 <Filter className="w-4 h-4"/>
 </Button>
 <Button variant="outline"size="icon"className="h-10 w-10 rounded-xl text-[var(--primary)] border-[var(--primary)]/20 bg-emerald-500/5">
 <Download className="w-4 h-4"/>
 </Button>
 </div>
 </div>

 <Card className="shadow-lg border-border/50 overflow-hidden flex flex-col min-h-[600px]">
 <CardContent className="p-0 flex flex-col h-full">
 <div className="flex-1 overflow-x-auto">
 <Table>
 <TableHeader className="bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
 <TableRow>
 <TableHead className="pl-8 font-black uppercase text-[10px] tracking-widest py-5">{t('admin.audit.timestamp')}</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('admin.audit.action')}</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('admin.audit.user')}</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('admin.audit.resource')}</TableHead>
 <TableHead className="pr-8 font-black uppercase text-[10px] tracking-widest">{t('admin.audit.description')}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {auditQuery.isLoading ? (
 Array.from({ length: 8 }).map((_, i) => (
 <TableRow key={i} className="animate-pulse">
 <TableCell colSpan={5} className="py-8 h-12 bg-muted/5 border-b"/>
 </TableRow>
 ))
 ) : (auditQuery.data?.items ?? []).map((item) => (
 <TableRow key={item.id} className="group hover:bg-muted/20 transition-colors">
 <TableCell className="pl-8 py-4">
 <div className="flex items-center gap-3">
 <Clock className="w-3.5 h-3.5 text-muted-foreground opacity-50"/>
 <div className="flex flex-col">
 <span className="font-bold text-sm tracking-tight">{new Date(item.created_at).toLocaleDateString()}</span>
 <span className="text-[10px] text-muted-foreground font-medium">{new Date(item.created_at).toLocaleTimeString()}</span>
 </div>
 </div>
 </TableCell>
 <TableCell>
 <Badge 
 variant="outline"
 className={cn(
"text-[9px] font-black uppercase tracking-tighter py-0 h-5 border-primary/20 bg-primary/5 text-primary",
 item.action.includes('error') ?"border-destructive/20 bg-destructive/5 text-destructive":""
 )}
 >
 {item.action}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 bg-muted rounded-full flex items-center justify-center border border-border/50">
 <User className="w-3.5 h-3.5 text-muted-foreground"/>
 </div>
 <span className="text-xs font-bold text-muted-foreground">{item.user_id ?? 'SYSTEM_KERNEL'}</span>
 </div>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <Database className="w-3.5 h-3.5 text-muted-foreground opacity-50"/>
 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.resource_type ?? '-'}</span>
 <span className="text-[10px] font-bold opacity-30">/</span>
 <span className="text-[10px] font-medium text-muted-foreground/60">{item.resource_id ?? '-'}</span>
 </div>
 </TableCell>
 <TableCell className="pr-8 max-w-xs">
 <div className="flex items-start gap-2">
 <Terminal className="w-3.5 h-3.5 text-muted-foreground mt-0.5 opacity-50"/>
 <p className="text-xs font-medium text-muted-foreground leading-relaxed line-clamp-2">{item.description ?? '-'}</p>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>

 {/* Premium Pagination Footer */}
 <div className="p-6 border-t bg-muted/5 flex items-center justify-between">
 <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
 Showing {skip + 1} to {Math.min(skip + PAGE_SIZE, auditQuery.data?.total ?? 0)} of {auditQuery.data?.total ?? 0} events
 </div>
 <div className="flex items-center gap-4">
 <Button
 variant="outline"
 size="sm"
 className="rounded-xl h-9 px-4 font-bold border-border/50 hover:bg-muted/50 transition-colors"
 disabled={page <= 1}
 onClick={() => setPage((prev) => Math.max(1, prev - 1))}
 >
 <ChevronLeft className="w-4 h-4 mr-2"/>
 {t('common.back')}
 </Button>
 
 <div className="flex items-center gap-1">
 <div className="w-9 h-9 flex items-center justify-center bg-primary rounded-lg text-primary-foreground font-black text-xs shadow-lg shadow-primary/20">
 {page}
 </div>
 <div className="w-9 h-9 flex items-center justify-center text-muted-foreground font-black text-xs">
 /
 </div>
 <div className="w-9 h-9 flex items-center justify-center bg-muted/20 border border-border/30 rounded-lg text-muted-foreground font-black text-xs">
 {totalPages}
 </div>
 </div>

 <Button
 variant="outline"
 size="sm"
 className="rounded-xl h-9 px-4 font-bold border-border/50 hover:bg-muted/50 transition-colors"
 disabled={page >= totalPages}
 onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
 >
 {t('common.next')}
 <ChevronRight className="w-4 h-4 ml-2"/>
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </PortalLayout>
 )
}

export default AuditLog

