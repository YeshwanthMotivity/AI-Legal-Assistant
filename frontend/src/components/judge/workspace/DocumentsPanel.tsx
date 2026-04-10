import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Upload, Calculator, Terminal, Plus, Verified, CheckCircle2, AlertCircle, X, ChevronDown, Files, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { DocumentType } from '@/types/judge'

// ─── Legacy Single-File Props (backward compat for judge) ───
interface SingleFileProps {
  selectedDocType: DocumentType
  setSelectedDocType: (type: DocumentType) => void
  onFileSelect: (event: any) => void
  selectedFileName: string | null
  fileInputRef: any
  onUpload: () => void
  isUploading: boolean
}

// ─── New Batch Props ───
interface BatchFileProps {
  selectedFiles: File[]
  setSelectedFiles: (files: File[]) => void
  selectedDocTypes: DocumentType[]
  setSelectedDocTypes: (types: DocumentType[]) => void
  batchFileInputRef: any
  onBatchFileSelect: (event: any) => void
  onBatchUpload: () => void
  isBatchUploading: boolean
  batchProgress?: { current: number; total: number }
}
type DocumentsPanelProps = {
  documents: any[]
  isActivelyLoading: boolean
  isReady: boolean
  onDeleteDocument?: (docId: string) => void
  isDeletingDocument?: string | null
  onViewDocument?: (docId: string) => void
  caseTitle?: string
  caseDescription?: string
} & (SingleFileProps | BatchFileProps)

const DOCUMENT_TYPES: DocumentType[] = [
  'contract', 'financial_record', 'termination_notice', 'witness_statement',
  'employment_contract', 'salary_records', 'termination_letter', 'evidence',
  'court_order', 'other'
]

// Type guard
function isBatchMode(props: DocumentsPanelProps): props is ({ documents: any[]; isActivelyLoading: boolean; isReady: boolean; entitlements?: any[] } & BatchFileProps) {
  return 'selectedFiles' in props
}

// ─── Multi-Category Checklist Popover ───
const CategorySelector = ({ selectedTypes, onToggle, t }: { selectedTypes: DocumentType[]; onToggle: (type: DocumentType) => void; t: any }) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const label = selectedTypes.length === 0
    ? 'Select Categories'
    : selectedTypes.length === 1
      ? t(`judge.documentTypes.${selectedTypes[0]}`)
      : `${selectedTypes.length} Categories Selected`

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-[var(--bg-surface)] border border-border/80 hover:border-border rounded-xl px-4 h-12 text-xs font-bold uppercase tracking-tight focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none transition-all cursor-pointer text-foreground flex items-center justify-between gap-2",
          isOpen && "border-[var(--primary)] ring-1 ring-[var(--primary)]"
        )}
      >
        <span className={cn("truncate", selectedTypes.length === 0 && "text-muted-foreground/50")}>
          {label}
        </span>
        <ChevronDown className={cn("w-4 h-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-full bg-white border border-border shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl border-[var(--primary)]/20 animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 z-[100] flex flex-col overflow-hidden">
          <div className="max-h-[420px] overflow-y-auto py-3 custom-scrollbar">
            <div className="px-4 pb-2 mb-2 border-b border-border/40">
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Available Categories</span>
            </div>
            {DOCUMENT_TYPES.map((dt) => {
              const checked = selectedTypes.includes(dt)
              return (
                <button
                  key={dt}
                  type="button"
                  onClick={() => onToggle(dt)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--primary)]/5 transition-colors group",
                    checked && "bg-[var(--primary)]/5"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                    checked 
                      ? "bg-[var(--primary)] border-[var(--primary)] text-white scale-105" 
                      : "border-border/80 group-hover:border-[var(--primary)]/50"
                  )}>
                    {checked && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold uppercase tracking-tight",
                    checked ? "text-[var(--primary)]" : "text-foreground"
                  )}>
                    {t(`judge.documentTypes.${dt}`)}
                  </span>
                </button>
              )
            })}
          </div>
          {selectedTypes.length > 0 && (
            <div className="px-5 py-4 border-t border-[var(--primary)]/10 bg-[var(--bg-surface)] flex items-center justify-between shrink-0 mt-auto shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">{selectedTypes.length} Selected</span>
              </div>
              <button 
                type="button"
                className="text-[10px] font-black text-destructive/70 hover:text-destructive uppercase tracking-widest transition-colors flex items-center gap-1.5 hover:underline decoration-2 underline-offset-4"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const types = [...selectedTypes];
                  types.forEach(t => onToggle(t));
                }}
              >
                <X className="w-3 h-3" />
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const DocumentsPanel = (props: DocumentsPanelProps) => {
  const { t, i18n } = useTranslation()
  const { documents, onDeleteDocument, isDeletingDocument, onViewDocument, caseTitle, caseDescription } = props

  // ─── Relevance Audit State ───
  const [relevanceAudit, setRelevanceAudit] = useState<{ 
    status: 'idle' | 'checking' | 'warning', 
    message?: string,
    onBypass?: () => void 
  }>({ status: 'idle' })

  const handleRelevanceCheck = async (fileName: string, doctype: DocumentType, originalUpload: () => void) => {
    if (!caseTitle) {
      originalUpload()
      return
    }

    setRelevanceAudit({ status: 'checking' })
    
    const prompt = `You are a legal document auditor. Analyze if the following file is relevant to the case.
    Case Title: ${caseTitle}
    Case Description: ${caseDescription?.substring(0, 500) || 'N/A'}
    
    Document info:
    File Name: ${fileName}
    Selected Type: ${doctype}
    
    Is this document potentially relevant to this case based ONLY on the names/types? 
    Respond with JSON: {"is_relevant": boolean, "confidence": float (0-1), "reason": string}`

    try {
      const response = await fetch('http://172.20.100.215:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5:1.5b-instruct',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          format: 'json'
        })
      })
      const data = await response.json()
      const result = JSON.parse(data.message.content)

      if (result.is_relevant === false && result.confidence > 0.8) {
        setRelevanceAudit({ 
          status: 'warning', 
          message: result.reason || "This document seems unrelated to the current case parties or facts.",
          onBypass: originalUpload
        })
      } else {
        setRelevanceAudit({ status: 'idle' })
        originalUpload()
      }
    } catch (err) {
      console.error("Relevance check failed:", err)
      setRelevanceAudit({ status: 'idle' })
      originalUpload() // Bypass on error
    }
  }

  // ─── Batch Mode Rendering ───
  if (isBatchMode(props)) {
    const {
      selectedFiles, setSelectedFiles,
      selectedDocTypes, setSelectedDocTypes,
      batchFileInputRef, onBatchFileSelect,
      onBatchUpload, isBatchUploading, batchProgress
    } = props

    const triggerBatchUpload = () => {
      // For batch, we check the first file or a summary. 
      // For simplicity and speed, we check the first file's metadata.
      if (selectedFiles.length > 0) {
        handleRelevanceCheck(
          selectedFiles[0].name, 
          selectedDocTypes[0] || 'other', 
          onBatchUpload
        )
      } else {
        onBatchUpload()
      }
    }

    const handleToggleType = (type: DocumentType) => {
      setSelectedDocTypes(
        selectedDocTypes.includes(type)
          ? selectedDocTypes.filter(t => t !== type)
          : [...selectedDocTypes, type]
      )
    }

    const removeFile = (index: number) => {
      setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
      // Reset file input if all removed
      if (selectedFiles.length <= 1 && batchFileInputRef.current) {
        batchFileInputRef.current.value = ''
      }
    }

    return (
      <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Left: Batch Uploader */}
          <div className="col-span-12 lg:col-span-7 bg-[var(--bg-card)] p-8 rounded-[2rem] border border-border shadow-sm space-y-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-bl-[100px] rounded-tr-[2rem] pointer-events-none" />
            
            <header className="flex items-center gap-4 border-b border-border/50 pb-6 relative z-10">
              <div className="p-2.5 bg-[var(--primary)] rounded-xl shadow-sm">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight leading-none">Upload Files</h3>
                <p className="text-[10px] font-black text-[var(--primary)]/70 uppercase tracking-[0.2em] mt-1.5">Batch upload with multi-category tagging</p>
              </div>
            </header>

            {/* Category Multi-Select */}
            <div className="space-y-3 relative z-40">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">Document Categories</label>
              <CategorySelector selectedTypes={selectedDocTypes} onToggle={handleToggleType} t={t} />
              {selectedDocTypes.length > 0 && (
                <div className="flex flex-col gap-4 mt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDocTypes.map((dt) => (
                      <div 
                        key={dt} 
                        className="bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 rounded-full flex items-center text-[9px] font-black uppercase tracking-widest cursor-pointer group gap-1 pl-2.5 pr-1.5 py-1 transition-colors"
                        onClick={() => handleToggleType(dt)}
                      >
                        {t(`judge.documentTypes.${dt}`)}
                        <X className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                  {/* AI Upload Guidance */}
                  <div className="bg-sky-50/50 border border-sky-200/50 p-3 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-1.5 bg-sky-100/50 rounded-lg shrink-0">
                      <Terminal className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                    <p className="text-[11px] font-semibold text-sky-900/70 leading-relaxed">
                      You have selected <span className="font-black text-sky-800">{selectedDocTypes.length}</span> document categories. You can upload more relevant documents to improve AI analysis. Do you want to proceed with these or add more?
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Multi-File Drop Zone */}
            <div className="space-y-3 relative z-10">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">Choose Files</label>
              <div className="relative group">
                <input
                  ref={batchFileInputRef}
                  type="file"
                  multiple
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={onBatchFileSelect}
                />
                <div className={cn(
                  "flex items-center justify-center h-24 bg-[var(--bg-surface)] border-2 border-dashed rounded-2xl transition-all",
                  selectedFiles.length > 0 
                    ? "border-[var(--primary)]/30 bg-[var(--primary)]/5" 
                    : "border-border/60 group-hover:border-[var(--primary)]/40"
                )}>
                  {selectedFiles.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Plus className="w-6 h-6 text-[var(--primary)] opacity-40 group-hover:opacity-80 transition-opacity group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                        Click or drag files here
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pointer-events-none">
                      <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center">
                        <Files className="w-5 h-5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--primary)] uppercase tracking-tight">{selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'} Selected</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Click to add more</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Selected File Chips */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 relative z-20">
                {selectedFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="flex items-center gap-3 bg-[var(--bg-surface)] border border-border/50 rounded-xl px-4 py-2.5 group hover:border-[var(--primary)]/30 transition-colors">
                    <FileText className="w-4 h-4 text-[var(--primary)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-foreground truncate uppercase tracking-tight">{file.name}</p>
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest opacity-50">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeFile(i)} 
                      className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <Button
              className="w-full h-12 rounded-xl bg-[var(--primary)] text-white font-black uppercase tracking-[0.15em] text-[11px] shadow-md shadow-[var(--primary)]/10 hover:bg-[var(--primary-hover)] hover:shadow-lg transition-all relative z-10"
              onClick={triggerBatchUpload}
              disabled={selectedFiles.length === 0 || selectedDocTypes.length === 0 || isBatchUploading || relevanceAudit.status === 'checking'}
            >
              {isBatchUploading || relevanceAudit.status === 'checking' ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{relevanceAudit.status === 'checking' ? 'Auditing Relevance...' : `Uploading (${batchProgress?.current ?? 0}/${batchProgress?.total ?? selectedFiles.length})...`}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Verified className="w-4 h-4" />
                  <span>Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}` : 'Documents'}</span>
                </div>
              )}
            </Button>
            
            {/* Relevance Warning UI */}
            {relevanceAudit.status === 'warning' && (
              <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl space-y-4 animate-in zoom-in-95 duration-300 relative z-50">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Relevance Warning</h4>
                    <p className="text-[11px] font-medium text-rose-800/80 leading-relaxed mt-1">
                      {relevanceAudit.message}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-9 rounded-lg text-[10px] font-black uppercase border-rose-200 text-rose-700 hover:bg-rose-100"
                    onClick={() => setRelevanceAudit({ status: 'idle' })}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 h-9 rounded-lg text-[10px] font-black uppercase bg-rose-600 text-white hover:bg-rose-700"
                    onClick={() => {
                      const bypass = relevanceAudit.onBypass;
                      setRelevanceAudit({ status: 'idle' });
                      bypass?.();
                    }}
                  >
                    Proceed Anyway
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Record List */}
          {renderDocumentList(documents, t, onDeleteDocument, isDeletingDocument, onViewDocument)}
        </div>
      </div>
    )
  }

  // ─── Legacy Single-File Mode (Judge CaseDetail backward compat) ───
  const {
    selectedDocType, setSelectedDocType,
    onFileSelect, selectedFileName,
    fileInputRef, onUpload, isUploading
  } = props as (typeof props & SingleFileProps)

  const triggerUpload = () => {
    if (selectedFileName) {
      handleRelevanceCheck(selectedFileName, selectedDocType, onUpload)
    } else {
      onUpload()
    }
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-7 bg-[var(--bg-card)] p-8 rounded-[2rem] border border-border shadow-sm space-y-8 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-bl-[100px] rounded-tr-[2rem] pointer-events-none" />
          
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
            onClick={triggerUpload}
            disabled={!selectedFileName || isUploading || relevanceAudit.status === 'checking'}
          >
            {isUploading || relevanceAudit.status === 'checking' ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{relevanceAudit.status === 'checking' ? 'Auditing Relevance...' : 'Uploading...'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Verified className="w-4 h-4" />
                <span>Upload Document</span>
              </div>
            )}
          </Button>

          {/* Relevance Warning UI (Legacy Mode) */}
          {relevanceAudit.status === 'warning' && (
            <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl space-y-4 animate-in zoom-in-95 duration-300 relative z-50">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-rose-900 uppercase tracking-tight">Relevance Audit Warning</h4>
                  <p className="text-[11px] font-medium text-rose-800/80 leading-relaxed mt-1">
                    {relevanceAudit.message}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-9 rounded-lg text-[10px] font-black uppercase border-rose-200 text-rose-700 hover:bg-rose-100"
                  onClick={() => setRelevanceAudit({ status: 'idle' })}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 h-9 rounded-lg text-[10px] font-black uppercase bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => {
                    const bypass = relevanceAudit.onBypass;
                    setRelevanceAudit({ status: 'idle' });
                    bypass?.();
                  }}
                >
                  Proceed Anyway
                </Button>
              </div>
            </div>
          )}
        </div>

        {renderDocumentList(documents, t, onDeleteDocument, isDeletingDocument, onViewDocument)}
      </div>
    </div>
  )
}

// ─── Shared sub-renders ───

function renderDocumentList(documents: any[], t: any, onDeleteDocument?: (docId: string) => void, isDeletingDocument?: string | null, onViewDocument?: (docId: string) => void) {
  return (
    <div className="col-span-12 lg:col-span-5 bg-[var(--bg-card)] rounded-[2rem] border border-border shadow-sm flex flex-col h-full overflow-hidden relative">
      <header className="flex items-center justify-between p-6 bg-[var(--bg-surface)] border-b border-border/60 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--primary)]" />
          <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground">Documents</h4>
        </div>
        <Badge variant="outline" className="text-[9px] font-black uppercase bg-white">{documents.length} Documents</Badge>
      </header>

      <div className="flex-1 overflow-y-auto w-full relative z-10">
        {documents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30 grayscale scale-95 transition-all">
            <Terminal className="w-10 h-10 mb-3" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em]">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {documents.map((doc) => {
              const isDeleting = isDeletingDocument === doc.id;
              return (
                <div 
                   key={doc.id} 
                   className={cn(
                     "p-4 hover:bg-[var(--primary)]/5 transition-all group flex items-center justify-between cursor-pointer",
                     onViewDocument && "active:bg-[var(--primary)]/10"
                   )}
                   onClick={() => onViewDocument?.(doc.id)}
                >
                  <div className="flex items-center gap-4 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-foreground uppercase tracking-tight truncate leading-none mb-1">{doc.file_name}</p>
                      <div className="flex flex-wrap gap-1">
                        {(doc.document_type?.includes(',') 
                          ? doc.document_type.split(',').map((dt: string) => dt.trim())
                          : [doc.document_type]
                        ).map((dt: string, idx: number) => (
                          <span key={idx} className="text-[8px] font-bold text-[var(--primary)]/70 uppercase tracking-widest bg-[var(--primary)]/5 px-1.5 py-0.5 rounded">
                            {t(`judge.documentTypes.${dt}`)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    {onDeleteDocument && (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all disabled:opacity-50"
                        title="Delete Document"
                      >
                        {isDeleting ? (
                          <div className="w-4 h-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


export default DocumentsPanel
