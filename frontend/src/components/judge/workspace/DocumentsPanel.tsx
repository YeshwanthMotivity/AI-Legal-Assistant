import { useTranslation } from 'react-i18next'
import { FileText, Upload, Calculator, Terminal, Plus, Verified, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DocumentType } from '@/types/judge'

interface DocumentsPanelProps {
  documents: any[]
  isActivelyLoading: boolean
  isReady: boolean
  selectedDocType: DocumentType
  setSelectedDocType: (type: DocumentType) => void
  onFileSelect: (event: any) => void
  selectedFileName: string | null
  fileInputRef: any
  onUpload: () => void
  isUploading: boolean
  entitlements?: any[]
}

const DOCUMENT_TYPES: DocumentType[] = [
  'contract', 'financial_record', 'termination_notice', 'witness_statement',
  'employment_contract', 'salary_records', 'termination_letter', 'evidence',
  'court_order', 'other'
]

const DocumentsPanel = ({
  documents,
  isActivelyLoading,
  isReady,
  selectedDocType,
  setSelectedDocType,
  onFileSelect,
  selectedFileName,
  fileInputRef,
  onUpload,
  isUploading,
  entitlements = [],
}: DocumentsPanelProps) => {
  const { t } = useTranslation()

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Management Grid */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left: Uploader */}
        <div className="col-span-12 lg:col-span-7 bg-[var(--bg-card)] p-8 rounded-[2rem] border border-border shadow-sm space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-bl-[100px] pointer-events-none" />
          
          <header className="flex items-center gap-4 border-b border-border/50 pb-6 relative z-10">
            <div className="p-2.5 bg-[var(--primary)] rounded-xl shadow-sm">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-tight leading-none">Upload Files</h3>
              <p className="text-[10px] font-black text-[var(--primary)]/70 uppercase tracking-[0.2em] mt-1.5">Add documents to this case</p>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-6 relative z-10">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">Document Type</label>
              <select
                className="w-full bg-[var(--bg-surface)] border border-border/80 hover:border-border rounded-xl px-4 h-12 text-xs font-bold uppercase tracking-tight focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all cursor-pointer text-foreground"
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>{t(`judge.documentTypes.${dt}`)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">Choose File</label>
              <div className="relative group h-12">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={onFileSelect}
                />
                <div className="flex items-center justify-between h-full bg-[var(--bg-surface)] border border-dashed border-border/80 rounded-xl px-4 group-hover:border-[var(--primary)]/50 transition-all">
                  <span className={cn(
                    "text-[11px] font-bold uppercase tracking-tight truncate max-w-[140px]",
                    selectedFileName ? "text-foreground" : "text-muted-foreground/50"
                  )}>
                    {selectedFileName || 'Select a file...'}
                  </span>
                  <Plus className="w-4 h-4 text-[var(--primary)] opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          </div>

          <Button
            className="w-full h-12 rounded-xl bg-[var(--primary)] text-white font-black uppercase tracking-[0.15em] text-[11px] shadow-md shadow-[var(--primary)]/10 hover:bg-[var(--primary-hover)] hover:shadow-lg transition-all relative z-10"
            onClick={onUpload}
            disabled={!selectedFileName || isUploading}
          >
            {isUploading ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Verified className="w-4 h-4" />
                <span>Upload Document</span>
              </div>
            )}
          </Button>
        </div>

        {/* Right: Record List */}
        <div className="col-span-12 lg:col-span-5 bg-[var(--bg-card)] rounded-[2rem] border border-border shadow-sm flex flex-col h-full overflow-hidden relative">
          <header className="flex items-center justify-between p-6 bg-[var(--bg-surface)] border-b border-border/60 shrink-0 relative z-10">
             <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--primary)]" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground">Uploaded Files</h4>
             </div>
             <Badge variant="outline" className="text-[9px] font-black uppercase bg-white">{documents.length} Files</Badge>
          </header>

          <div className="flex-1 overflow-y-auto w-full relative z-10">
            {documents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30 grayscale scale-95 transition-all">
                <Terminal className="w-10 h-10 mb-3" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em]">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-[var(--bg-surface)] transition-colors group flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[var(--primary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate leading-none mb-1">{doc.file_name}</p>
                        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest opacity-60">{t(`judge.documentTypes.${doc.document_type}`)}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aggregate Calculations Grid */}
      {entitlements.length > 0 && (
        <div className="bg-[var(--bg-card)] p-8 rounded-[2rem] border border-border shadow-sm space-y-8 relative overflow-hidden">
           <header className="flex items-center gap-5 border-b border-border/50 pb-6 relative z-10">
              <div className="w-12 h-12 bg-[var(--primary)] shadow-sm rounded-xl flex items-center justify-center text-white">
                 <Calculator className="w-5 h-5" />
              </div>
              <div>
                 <h2 className="text-xl font-black text-foreground tracking-tighter uppercase leading-none">Entitlement Calculation</h2>
                 <p className="text-[10px] font-black text-[var(--primary)]/70 uppercase tracking-[0.2em] mt-1.5">Calculated Entitlements</p>
              </div>
           </header>

           <div className="grid grid-cols-3 gap-6 relative z-10">
              {entitlements.map((e, idx) => {
                const isZero = e.value?.includes('0.00')
                return (
                  <div key={idx} className="p-6 bg-[var(--bg-surface)] rounded-2xl border border-border/60 hover:border-[var(--primary)]/30 hover:shadow-sm transition-all group flex flex-col justify-between h-36">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground opacity-60">
                        {e.label}
                      </span>
                      <p className={cn('text-2xl font-black tracking-tighter tabular-nums', isZero ? 'text-muted-foreground/30' : 'text-foreground')}>
                        {e.value}
                      </p>
                    </div>
                    
                    <div className="w-full bg-border h-1 rounded-full overflow-hidden">
                       <div 
                         className={cn("h-full transition-all duration-1000", isZero ? "bg-red-500/20 w-1" : "bg-[var(--primary)]/100")} 
                         style={{ width: isZero ? '4px' : '70%' }} 
                       />
                    </div>

                    {isZero && (
                      <div className="flex items-center gap-1.5 text-red-500/80 mt-1">
                         <AlertCircle className="w-3 h-3" />
                         <span className="text-[8px] font-black uppercase tracking-widest">Missing Data</span>
                      </div>
                    )}
                  </div>
                )
              })}
           </div>
        </div>
      )}

    </div>
  )
}

export default DocumentsPanel
