import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import PortalLayout from '../../components/layout/PortalLayout'
import { clerkGetCaseDocuments, clerkGetCases, clerkUploadDocument } from '../../api/clerk'
import { queryKeys } from '../../api/queryKeys'
import type { ClerkUploadJob } from '../../types/clerk'
import type { DocumentType } from '../../types/judge'

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

  const casesQuery = useQuery({
    queryKey: queryKeys.clerkCases,
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
    () => (casesQuery.data?.items ?? []).find((item) => item.id === selectedCaseId),
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
      // eslint-disable-next-line no-await-in-loop
      await uploadMutation.mutateAsync(job)
    }
  }

  return (
    <PortalLayout title={t('clerk.pages.documentsTitle')} subtitle={t('clerk.pages.documentsSubtitle')}>
      <section className="panel">
        <div className="form-grid two-col">
          <label>
            {t('clerk.forms.caseSelection')}
            <select value={selectedCaseId} onChange={(event) => setSelectedCaseId(event.target.value)}>
              <option value="">{t('clerk.forms.selectCase')}</option>
              {(casesQuery.data?.items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.case_number} - {item.title}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="case-id">{selectedCase ? `${selectedCase.case_number} • ${selectedCase.title}` : '-'}</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>{t('clerk.forms.uploadZone')}</h3>
        <div
          className={isDragging ? 'dropzone active' : 'dropzone'}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault()
            setIsDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            pushFiles(event.dataTransfer.files)
          }}
        >
          <p>{t('clerk.forms.dragDropHelp')}</p>
          <label className="btn-secondary file-btn">
            {t('clerk.forms.pickFiles')}
            <input type="file" multiple onChange={(event) => pushFiles(event.target.files)} />
          </label>
        </div>

        <div className="panel-actions">
          <button type="button" className="btn-primary" disabled={!selectedCaseId || uploadMutation.isPending} onClick={runUploads}>
            {uploadMutation.isPending ? t('common.loading') : t('clerk.forms.uploadQueued')}
          </button>
        </div>

        <ul className="upload-list">
          {jobs.map((job) => (
            <li key={job.id}>
              <div className="upload-row">
                <strong>{job.file.name}</strong>
                <select
                  value={job.documentType}
                  onChange={(event) =>
                    setJobs((prev) =>
                      prev.map((item) =>
                        item.id === job.id ? { ...item, documentType: event.target.value as DocumentType } : item
                      )
                    )
                  }
                >
                  {DOCUMENT_TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {t(`judge.documentTypes.${tag}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${job.progress}%` }} />
              </div>
              <p className="case-id">{t(`clerk.uploadStatus.${job.status}`)}{job.error ? ` • ${job.error}` : ''}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h3>{t('clerk.tables.caseDocuments')}</h3>
        {!selectedCaseId ? <p className="empty-state">{t('clerk.forms.selectCaseFirst')}</p> : null}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('document.fileName')}</th>
                <th>{t('document.fileType')}</th>
                <th>{t('document.processingStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {(documentsQuery.data?.items ?? []).map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.file_name}</td>
                  <td>{t(`judge.documentTypes.${doc.document_type}`)}</td>
                  <td>{t(`judge.documentStatus.${doc.processing_status}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PortalLayout>
  )
}

export default DocumentUpload
