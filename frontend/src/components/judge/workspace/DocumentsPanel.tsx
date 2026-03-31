import { useTranslation } from 'react-i18next'
import { FileText, Upload, Calculator } from 'lucide-react'
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

  const docCount = documents.length
  const readinessLabel = isReady
    ? t('judge.workspace.complete')
    : isActivelyLoading
    ? t('judge.workspace.processing')
    : t('judge.workspace.awaiting')

  const readinessBadgeClass = isReady
    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    : isActivelyLoading
    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    : 'bg-outline-variant/10 text-muted-foreground border-outline-variant/20'

  return (
    <aside className="w-full flex flex-col gap-5 sticky top-[72px] overflow-y-auto max-h-[calc(100vh-88px)] scrollbar-hide">

      {/* Document Management Card */}
      <Card className="bg-surface-container-lowest dark:bg-surface-container overflow-hidden rounded-xl editorial-shadow border border-outline-variant/30">
        <CardHeader className="border-b border-outline-variant/20 p-5 bg-surface-container-low/40">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-primary" />
              {t('judge.workspace.documents')}
            </CardTitle>
            <Badge className={cn('border text-[10px] font-bold uppercase tracking-widest px-2 py-0.5', readinessBadgeClass)}>
              {readinessLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-5">

            {/* Upload Controls */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t('judge.workspace.categorizeEntry')}
              </label>
              <select
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all cursor-pointer font-medium text-on-surface"
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt} value={dt}>{t(`judge.documentTypes.${dt}`)}</option>
                ))}
              </select>
            </div>

            <div className="relative group">
              <input
                ref={fileInputRef}
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={onFileSelect}
              />
              <div className="flex flex-col items-center gap-3 w-full bg-surface-container-low border border-dashed border-outline-variant/30 rounded-lg p-5 group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-200">
                <div className="w-9 h-9 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-all shadow-sm">
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-on-surface-variant text-center leading-snug">
                  {selectedFileName ? selectedFileName : t('judge.workspace.dragFileBrowse')}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                  {t('judge.workspace.fileFormats')}
                </span>
              </div>
            </div>

            <Button
              className="w-full h-9 rounded-lg bg-primary text-on-primary font-semibold text-xs uppercase tracking-wider transition-all duration-200 gap-2"
              onClick={onUpload}
              disabled={!selectedFileName || isUploading}
            >
              {isUploading ? (
                <>
                  <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  {t('judge.workspace.uploading')}
                </>
              ) : t('judge.workspace.injectContext')}
            </Button>

            {/* Document List */}
            <div className="pt-4 border-t border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t('judge.workspace.attachedRepositories')}
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {docCount} {t('judge.workspace.total')}
                </span>
              </div>

              {documents.length === 0 ? (
                <div className="py-5 text-center text-xs text-muted-foreground bg-surface-container-low/50 rounded-lg border border-dashed border-outline-variant/20">
                  {t('judge.workspace.noDocuments')}
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 hover:border-outline-variant/40 transition-all duration-200"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FileText className="w-3 h-3 text-primary/70 shrink-0" />
                          <h5 className="text-xs font-semibold text-on-surface truncate">{doc.file_name}</h5>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest truncate">
                            {t(`judge.documentTypes.${doc.document_type}`)}
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          'px-1.5 h-4.5 text-[8px] font-bold uppercase tracking-widest border shadow-none shrink-0',
                          (doc.processing_status?.toLowerCase() === 'complete' || doc.processing_status?.toLowerCase() === 'completed' || doc.processing_status?.toLowerCase() === 'embedded' || doc.processing_status?.toLowerCase() === 'ocr_complete')
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : doc.processing_status?.toLowerCase() === 'failed'
                            ? 'bg-red-500/10 text-red-600 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        )}
                      >
                        {t(`judge.documentStatus.${doc.processing_status?.toLowerCase()}`) || doc.processing_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ENTITLEMENT CALCULATION */}
      {entitlements.length > 0 && (
        <Card className="bg-surface-container-lowest dark:bg-surface-container overflow-hidden rounded-xl editorial-shadow border border-outline-variant/30">
          <CardHeader className="p-5 border-b border-outline-variant/20 bg-surface-container-low/40">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Calculator className="w-3.5 h-3.5 text-primary" />
              {t('judge.workspace.entitlementCalculation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-outline-variant/20">
              {entitlements.map((e, idx) => {
                const isZero = e.value?.includes('0.00')
                return (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                          {e.label}
                        </span>
                        {isZero && (
                          <Badge className="bg-red-500/10 text-red-600 text-[9px] font-bold uppercase px-1.5 h-4 border border-red-500/20 shrink-0">
                            {t('judge.workspace.missingData')}
                          </Badge>
                        )}
                      </div>
                      <div className="h-1 w-full bg-outline-variant/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: isZero ? '0%' : '75%' }}
                        />
                      </div>
                    </div>
                    <strong className={cn('text-sm shrink-0', isZero ? 'text-muted-foreground font-normal' : 'text-on-surface font-semibold')}>
                      {e.value}
                    </strong>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </aside>
  )
}

export default DocumentsPanel
