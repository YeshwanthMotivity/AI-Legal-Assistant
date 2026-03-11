import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CaseType, CreateCaseRequest } from '../../types/judge'

interface CreateCaseModalProps {
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: CreateCaseRequest) => Promise<unknown>
}

const defaultCaseType: CaseType = 'unpaid_wages'

const CreateCaseModal = ({ isOpen, isSubmitting, onClose, onSubmit }: CreateCaseModalProps) => {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [caseType, setCaseType] = useState<CaseType>(defaultCaseType)
  const [claimant, setClaimant] = useState('')
  const [respondent, setRespondent] = useState('')
  const [description, setDescription] = useState('')
  const [claimAmount, setClaimAmount] = useState('')
  const [filingDate, setFilingDate] = useState('')
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setTitle('')
    setCaseType(defaultCaseType)
    setClaimant('')
    setRespondent('')
    setDescription('')
    setClaimAmount('')
    setFilingDate('')
    setNotes('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const filingDateTime = `${filingDate}T00:00:00`
    await onSubmit({
      title,
      case_type: caseType,
      claimant_name: claimant,
      respondent_name: respondent,
      description,
      claim_amount: claimAmount,
      filing_date: filingDateTime,
      notes,
    })
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>{t('judge.dashboard.createCase')}</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            {t('judge.form.title')}
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>

          <label>
            {t('judge.form.caseType')}
            <select value={caseType} onChange={(event) => setCaseType(event.target.value as CaseType)} required>
              <option value="unpaid_wages">{t('judge.caseTypes.unpaid_wages')}</option>
              <option value="wrongful_termination">{t('judge.caseTypes.wrongful_termination')}</option>
              <option value="end_of_service">{t('judge.caseTypes.end_of_service')}</option>
              <option value="contract_dispute">{t('judge.caseTypes.contract_dispute')}</option>
              <option value="other">{t('judge.caseTypes.other')}</option>
            </select>
          </label>

          <label>
            {t('judge.form.claimant')}
            <input value={claimant} onChange={(event) => setClaimant(event.target.value)} required />
          </label>

          <label>
            {t('judge.form.respondent')}
            <input value={respondent} onChange={(event) => setRespondent(event.target.value)} required />
          </label>

          <label>
            {t('judge.form.claimAmount')}
            <input value={claimAmount} onChange={(event) => setClaimAmount(event.target.value)} placeholder="e.g. 15000" />
          </label>

          <label>
            {t('judge.form.filingDate')}
            <input type="date" value={filingDate} onChange={(event) => setFilingDate(event.target.value)} required />
          </label>

          <label className="full-width">
            {t('judge.form.description')}
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} required />
          </label>

          <label className="full-width">
            {t('judge.form.notes')}
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : t('common.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateCaseModal

