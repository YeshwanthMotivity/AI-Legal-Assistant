import { useTranslation } from 'react-i18next'
import { FileText, Upload, Sparkles, CheckCircle2, AlertCircle, Clock, Check, BarChart3, Database } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
  pollingStatus?: string
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
  pollingStatus
}: DocumentsPanelProps) => {
  const { t } = useTranslation()

  // Simulated completeness
  const completeness = Math.min(100, (documents.length / 4) * 100)
  const isComplete = completeness >= 100

  const getStepStatus = (step: string) => {
    if (isReady) return 'complete'
    if (isActivelyLoading && pollingStatus?.toLowerCase().includes(step.toLowerCase())) return 'active'
    return 'pending'
  }

  const steps = ['Ingestion', 'Parsing', 'Reasoning', 'Synthesis']

  return (
    <aside className="w-full xl:w-96 flex flex-col gap-6 sticky top-24 overflow-y-auto max-h-[calc(100vh-120px)] scrollbar-hide">
      
      {/* Document Management Card */}
      <Card className="shadow-lg border-outline-variant/30 bg-surface-container-lowest dark:bg-surface-container overflow-hidden">
        <CardHeader className="bg-surface-container-low dark:bg-surface-container-high border-b border-outline-variant/20 py-4 px-6">
          <CardTitle className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Workspace Context
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Completeness Info */}
            <div className="bg-surface-container-low dark:bg-surface-container-high p-4 rounded-xl border border-outline-variant/20 mb-6">
               <div className="flex items-center justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                  <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Data Completeness</span>
                  <span className={cn(isComplete ? "text-emerald-500" : "text-amber-500")}>{Math.round(completeness)}%</span>
               </div>
               <div className="h-1.5 w-full bg-outline-variant/20 rounded-full overflow-hidden mb-2">
                  <div className={cn("h-full transition-all duration-1000", isComplete ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${completeness}%` }} />
               </div>
               <p className="text-[10px] text-on-surface-variant font-medium italic opacity-70">
                 {isComplete ? "Full context profile available." : "Additional documents required for high precision."}
               </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-on-surface-variant tracking-widest flex items-center gap-2 ml-1">
                  Categorize Entry
                </label>
                <select
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2.5 text-xs focus:border-tertiary focus:ring-1 focus:ring-tertiary/20 outline-none transition-all cursor-pointer font-bold text-on-surface"
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt} value={dt}>{t(`judge.documentTypes.${dt}`)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="relative group">
                   <input 
                     ref={fileInputRef} 
                     type="file" 
                     className="absolute inset-0 opacity-0 cursor-pointer z-10"
                     onChange={onFileSelect}
                   />
                   <div className="flex flex-col items-center gap-3 w-full bg-surface-container-low border border-dashed border-outline-variant/30 rounded-xl px-4 py-8 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-300 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-all shadow-sm">
                         <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest text-center">
                        {selectedFileName ? selectedFileName : "Drag File or Browse"}
                      </span>
                   </div>
                </div>
              </div>

              <Button
                className="w-full h-10 rounded-lg bg-primary text-on-primary shadow-lg shadow-primary/20 font-bold text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                onClick={onUpload}
                disabled={!selectedFileName || isUploading}
              >
                {isUploading ? (
                   <div className="flex items-center gap-2">
                     <div className="w-3.5 h-3.5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                     Uploading...
                   </div>
                ) : "Inject Context"}
              </Button>
            </div>

            <div className="pt-4 border-t border-outline-variant/30 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Attached Repositories</h4>
              {documents.map((doc) => (
                <div key={doc.id} className="group flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-transparent hover:border-outline-variant/50 hover:bg-surface-container-high transition-all">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                       <FileText className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                       <h5 className="text-[11px] font-bold text-on-surface truncate tracking-tight">{doc.file_name}</h5>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase text-on-surface-variant font-bold tracking-tight bg-surface-container-high px-1.5 py-0.5 rounded border border-outline-variant/30">{t(`judge.documentTypes.${doc.document_type}`)}</span>
                    </div>
                  </div>
                  <Badge 
                    className={cn(
                      "px-2 h-5 text-[9px] font-bold uppercase tracking-tighter border shadow-none",
                      doc.processing_status === 'complete' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
                      doc.processing_status === 'failed' ? "bg-error-container text-on-error-container border-error/20" : 
                      "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
                    )}
                  >
                     {doc.processing_status}
                  </Badge>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="py-8 text-center text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-50 bg-surface-container-low/50 rounded-xl border border-dashed border-outline-variant/20">
                   Awaiting Document Input
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Reasoning Stepper */}
      <Card className="shadow-lg border-outline-variant/30 bg-surface-container-lowest dark:bg-surface-container overflow-hidden">
        <CardHeader className="py-4 px-6 bg-primary/5">
           <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              Intelligence Pipeline
           </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
           <div className="flex flex-col gap-6 relative">
              {/* Vertical dotted line */}
              <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-dashed border-l border-outline-variant/30 z-0" />

              {steps.map((step, idx) => {
                const status = getStepStatus(step)
                return (
                  <div key={step} className="flex items-start gap-4 z-10">
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg",
                      status === 'complete' ? "bg-emerald-500 text-on-primary shadow-emerald-500/20" : 
                      status === 'active' ? "bg-primary text-on-primary shadow-primary/20 animate-pulse" : 
                      "bg-surface-container-high text-on-surface-variant border border-outline-variant/30"
                    )}>
                       {status === 'complete' ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                    </div>
                    <div className="flex flex-col">
                       <span className={cn(
                         "text-[11px] font-bold tracking-widest uppercase transition-colors",
                         status === 'complete' || status === 'active' ? "text-on-surface" : "text-on-surface-variant opacity-60"
                       )}>
                         {step}
                       </span>
                       <span className="text-[9px] text-on-surface-variant font-medium">
                         {status === 'complete' ? "Validation Finished" : status === 'active' ? "Synthesizing Node..." : "Pending Sequence"}
                       </span>
                    </div>
                  </div>
                )
              })}
           </div>
        </CardContent>
      </Card>
    </aside>
  )
}

export default DocumentsPanel
