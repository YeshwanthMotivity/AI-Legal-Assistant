import { useMemo, useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { 
 Upload, 
 FileText, 
 Search, 
 CheckCircle2, 
 AlertCircle, 
 Clock, 
 MoreVertical,
 ChevronDown,
 Trash2,
 FileCheck,
 Zap,
 ShieldCheck,
 ChevronRight
} from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import { clerkGetCaseDocuments, clerkGetCases, clerkUploadDocument } from '../../api/clerk'
import { queryKeys } from '../../api/queryKeys'
import type { ClerkUploadJob } from '../../types/clerk'
import type { DocumentType } from '../../types/judge'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const DOCUMENT_TAGS: DocumentType[] = ['contract', 'financial_record', 'termination_notice', 'witness_statement']

const createUploadJob = (file: File): ClerkUploadJob => ({
 id: `${file.name}-${file.size}-${Date.now()}`,
 file,
 documentType: 'contract',
 progress: 0,
 status: 'queued',
})

const DocumentUpload = () => {
 const { t } = useTranslation()
 const queryClient = useQueryClient()
 const [selectedCaseId, setSelectedCaseId] = useState('')
 const [jobs, setJobs] = useState<ClerkUploadJob[]>([])
 const [isDragging, setIsDragging] = useState(false)
 const fileInputRef = useRef<HTMLInputElement>(null)

 const casesQuery = useQuery({
 queryKey: queryKeys.clerkCases(),
 queryFn: () => clerkGetCases({ limit: 200 }),
 })

 const documentsQuery = useQuery({
 queryKey: queryKeys.clerkCaseDocuments(selectedCaseId || 'none'),
 queryFn: () => clerkGetCaseDocuments(selectedCaseId),
 enabled: Boolean(selectedCaseId),
 refetchInterval: 5000,
 })

 const uploadMutation = useMutation({
 mutationFn: async (job: ClerkUploadJob) => {
 if (!selectedCaseId) return null
 return clerkUploadDocument(selectedCaseId, job.file, job.documentType, (progress) => {
 setJobs((prev) => prev.map((item) => (item.id === job.id ? { ...item, progress } : item)))
 })
 },
 onSuccess: (_response, job) => {
 setJobs((prev) => prev.map((item) => (item.id === job.id ? { ...item, status: 'success', progress: 100 } : item)))
 queryClient.invalidateQueries({ queryKey: queryKeys.clerkCaseDocuments(selectedCaseId || 'none') })
 },
 onError: (error, job) => {
 const message = error instanceof Error ? error.message : t('common.error')
 setJobs((prev) => prev.map((item) => (item.id === job.id ? { ...item, status: 'failed', error: message } : item)))
 },
 })

 const selectedCase = useMemo(
 () => (casesQuery.data?.items ?? []).find((item: any) => item.id === selectedCaseId),
 [casesQuery.data?.items, selectedCaseId]
 )

 const pushFiles = (files: FileList | null) => {
 if (!files) return
 const supported = Array.from(files).filter((file) => {
 const type = file.type.toLowerCase()
 return (
 type.includes('pdf') ||
 type.includes('word') ||
 type.includes('officedocument.wordprocessingml') ||
 type.startsWith('image/') ||
 file.name.toLowerCase().endsWith('.docx')
 )
 })

 setJobs((prev) => [...prev, ...supported.map(createUploadJob)])
 }

 const runUploads = async () => {
 if (!selectedCaseId) return
 for (const job of jobs) {
 if (job.status !== 'queued' && job.status !== 'failed') continue
 setJobs((prev) => prev.map((item) => (item.id === job.id ? { ...item, status: 'uploading', progress: 0 } : item)))
 await uploadMutation.mutateAsync(job)
 }
 }

 return (
 <PortalLayout 
 title={t('clerk.pages.documentsTitle')} 
 subtitle={t('clerk.pages.documentsSubtitle')}
 >
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
 {/* Left Column - Controls & Upload */}
 <div className="lg:col-span-4 space-y-8">
 <Card className="shadow-lg border-primary/10">
 <CardHeader className="bg-primary/5 border-b py-5">
 <div className="flex items-center gap-2">
 <Search className="w-5 h-5 text-primary"/>
 <CardTitle className="text-lg">{t('clerk.forms.caseSelection')}</CardTitle>
 </div>
 </CardHeader>
 <CardContent className="p-6">
 <div className="space-y-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">{t('clerk.forms.selectCase')}</label>
 <select 
 className="w-full bg-muted/20 border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer font-bold"
 value={selectedCaseId} 
 onChange={(event) => setSelectedCaseId(event.target.value)}
 >
 <option value="">{t('clerk.forms.selectCase')}</option>
 {(casesQuery.data?.items ?? []).map((item: any) => (
 <option key={item.id} value={item.id}>
 {item.case_number} - {item.title}
 </option>
 ))}
 </select>
 </div>
 {selectedCase && (
 <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2">
 <p className="text-[10px] font-black uppercase text-primary mb-1 tracking-tighter">{t('clerk.forms.metadataEditor')}</p>
 <p className="text-sm font-bold truncate">{selectedCase.title}</p>
 <p className="text-[11px] text-muted-foreground italic mt-1 font-medium">{selectedCase.case_number}</p>
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 <Card className="shadow-lg border-[var(--primary)]/10 overflow-hidden">
 <CardHeader className="bg-[var(--primary)]/5 border-b py-5">
 <div className="flex items-center gap-2">
 <Upload className="w-5 h-5 text-[var(--primary)]"/>
 <CardTitle className="text-lg">{t('clerk.forms.uploadZone')}</CardTitle>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 <label
 className={cn(
"p-10 border-b-2 border-dashed transition-all cursor-pointer group flex flex-col items-center justify-center text-center gap-4",
 isDragging ?"bg-[var(--primary)]/10 border-[var(--primary)] scale-[0.98]":"bg-transparent border-transparent hover:bg-muted/30"
 )}
 onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
 onDragOver={(e) => e.preventDefault()}
 onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
 onDrop={(e) => { e.preventDefault(); setIsDragging(false); pushFiles(e.dataTransfer.files) }}
 >
 <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center text-muted-foreground group-hover:scale-110 group-hover:text-[var(--primary)] transition-all">
 <FileCheck className="w-8 h-8"/>
 </div>
 <div>
 <p className="font-bold text-sm">{t('clerk.forms.dragDropHelp')}</p>
 <p className="text-[11px] text-muted-foreground italic mt-1 font-medium">PDF, DOCX, Images (MAX 50MB)</p>
 </div>
 
 <Button 
 variant="outline"
 size="sm"
 className="gap-2 mt-2"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 fileInputRef.current?.click();
 }}
 >
 <Search className="w-3.5 h-3.5"/>
 {t('clerk.forms.pickFiles')}
 </Button>
 
 <input 
 ref={fileInputRef}
 type="file"
 multiple 
 accept=".pdf,.docx,image/*"
 className="hidden"
 onChange={(e) => pushFiles(e.target.files)} 
 />
 </label>

 {jobs.length > 0 && (
 <div className="p-6 bg-card space-y-4">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h4 className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">Queue ({jobs.length})</h4>
 {!selectedCaseId && (
 <p className="text-[9px] text-destructive font-bold flex items-center gap-1 mt-1 animate-pulse">
 <AlertCircle className="w-2.5 h-2.5"/>
 {t('clerk.forms.selectCaseFirst')}
 </p>
 )}
 </div>
 <Button 
 size="sm"
 className="h-9 px-6 shadow-lg shadow-[rgba(var(--primary-rgb),0.2)] lg:shadow-primary/20 font-bold gap-2"
 disabled={!selectedCaseId || uploadMutation.isPending} 
 onClick={runUploads}
 >
 <Zap className="w-4 h-4"/>
 {uploadMutation.isPending ?"Processing...":"Commit Ingestion"}
 </Button>
 </div>
 <ul className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
 {jobs.map((job) => (
 <li key={job.id} className="p-4 rounded-xl border bg-muted/5 space-y-3 animate-in fade-in slide-in-from-right-4">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 flex-1">
 <p className="text-[13px] font-bold truncate">{job.file.name}</p>
 <div className="flex items-center gap-2 mt-1">
 <Badge variant="outline"className="text-[9px] uppercase font-black py-0 h-4 border-[var(--primary)]/20 text-[var(--primary)] bg-[var(--primary)]/5">
 {t(`clerk.uploadStatus.${job.status}`)}
 </Badge>
 <span className="text-[10px] text-muted-foreground font-medium italic">{(job.file.size / 1024 / 1024).toFixed(2)} MB</span>
 </div>
 </div>
 <select
 className="text-[10px] font-black uppercase bg-card border rounded-lg px-2 py-1 outline-none ring-primary/10 focus:ring-2"
 value={job.documentType}
 onChange={(e) => setJobs(prev => prev.map(item => item.id === job.id ? { ...item, documentType: e.target.value as DocumentType } : item))}
 >
 {DOCUMENT_TAGS.map((tag) => (
 <option key={tag} value={tag}>{t(`judge.documentTypes.${tag}`)}</option>
 ))}
 </select>
 </div>
 <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
 <div 
 className={cn("h-full transition-all duration-300", job.status === 'failed' ?"bg-destructive":"bg-[var(--primary)]")}
 style={{ width: `${job.progress}%` }} 
 />
 </div>
 {job.error && <p className="text-[10px] font-bold text-destructive italic">{job.error}</p>}
 </li>
 ))}
 </ul>
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Right Column - Status Table */}
 <div className="lg:col-span-8 flex flex-col gap-6">
 <Card className="flex-1 shadow-lg border-border/50 overflow-hidden flex flex-col">
 <CardHeader className="bg-muted/10 border-b py-5 px-8 flex flex-row items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-primary/10 rounded-lg text-primary">
 <FileText className="w-5 h-5"/>
 </div>
 <div>
 <CardTitle className="text-lg">{t('clerk.tables.caseDocuments')}</CardTitle>
 <CardDescription className="text-xs font-medium italic">Registry of verified judicial materials</CardDescription>
 </div>
 </div>
 <Badge className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/5 font-black uppercase tracking-tighter text-[10px]">
 Total Documents: {documentsQuery.data?.items?.length ?? 0}
 </Badge>
 </CardHeader>
 <CardContent className="p-0 flex-1 overflow-y-auto">
 {!selectedCaseId ? (
 <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 space-y-4">
 <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center text-muted-foreground/30">
 <Search className="w-10 h-10"/>
 </div>
 <div className="space-y-1">
 <h5 className="font-bold text-foreground">Awaiting Context Selection</h5>
 <p className="text-xs text-muted-foreground italic px-8">Please choose a judicial case folder from the left sidebar to access verified evidence and filings.</p>
 </div>
 </div>
 ) : documentsQuery.data?.items?.length === 0 ? (
 <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 space-y-4 animate-in fade-in duration-700">
 <div className="w-20 h-20 bg-[var(--primary)]/5 rounded-full flex items-center justify-center text-[var(--primary)]/20">
 <Upload className="w-10 h-10"/>
 </div>
 <div className="space-y-1">
 <h5 className="font-bold text-[var(--primary)]">Secure Vault Empty</h5>
 <p className="text-xs text-muted-foreground italic px-8">No documents have been committed to this case yet. Use the ingestion zone to add digital materials.</p>
 </div>
 </div>
 ) : (
 <Table>
 <TableHeader className="bg-muted/5 sticky top-0 z-10">
 <TableRow>
 <TableHead className="w-[45%] pl-8 font-black uppercase text-[10px] tracking-widest">{t('document.fileName')}</TableHead>
 <TableHead className="font-black uppercase text-[10px] tracking-widest">{t('document.fileType')}</TableHead>
 <TableHead className="pr-8 font-black uppercase text-[10px] tracking-widest">{t('document.processingStatus')}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {(documentsQuery.data?.items ?? []).map((doc: any) => (
 <TableRow key={doc.id} className="group hover:bg-muted/20 transition-colors">
 <TableCell className="pl-8 py-4">
 <div className="flex items-center gap-3">
 <div className="p-2 bg-muted/30 rounded-lg group-hover:bg-primary/20 transition-colors">
 <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary"/>
 </div>
 <span className="font-bold text-sm tracking-tight">{doc.file_name}</span>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline"className="text-[10px] font-bold uppercase tracking-tighter border-primary/20 text-primary bg-primary/5">
 {t(`judge.documentTypes.${doc.document_type}`)}
 </Badge>
 </TableCell>
 <TableCell className="pr-8">
 <div className="flex items-center gap-2">
 {doc.processing_status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)]"/> :
 doc.processing_status === 'failed' ? <AlertCircle className="w-3.5 h-3.5 text-destructive"/> :
 <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin"/>}
 <span className={cn(
"text-[11px] font-black uppercase tracking-widest",
 doc.processing_status === 'completed' ?"text-[var(--primary)]":
 doc.processing_status === 'failed' ?"text-destructive":
"text-amber-600"
 )}>
 {t(`judge.documentStatus.${doc.processing_status}`)}
 </span>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 
 <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
 <ShieldCheck className="w-6 h-6"/>
 </div>
 <div>
 <h5 className="text-sm font-black uppercase tracking-tight text-primary">Registry Compliance</h5>
 <p className="text-[10px] text-muted-foreground font-medium italic leading-none mt-1">All materials are cryptographically signed and stored in DIFC secure vaults.</p>
 </div>
 </div>
 <Button variant="ghost"size="sm"className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group">
 System Diagnostics
 <ChevronRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform"/>
 </Button>
 </div>
 </div>
 </div>
 </PortalLayout>
 )
}

export default DocumentUpload
