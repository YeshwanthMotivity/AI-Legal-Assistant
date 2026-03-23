import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import type { CaseType, CreateCaseRequest } from '../../types/judge'
import { Button } from '@/components/ui/button'

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
  const [filingDate, setFilingDate] = useState('')
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setTitle('')
    setCaseType(defaultCaseType)
    setClaimant('')
    setRespondent('')
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
      description: notes,
      claim_amount: "0",
      filing_date: filingDateTime,
      notes,
    })
    resetForm()
  }

  if (!isOpen) return null

  return (
    <dialog 
      id="create-case-modal-judge" 
      className="modal bg-transparent backdrop:bg-black/50 p-0 rounded-2xl border shadow-2xl w-full max-w-2xl overflow-hidden"
      open={isOpen}
    >
      <div className="bg-card">
        <div className="p-6 border-b flex justify-between items-center bg-muted/20">
          <h3 className="text-xl font-bold">{t('judge.dashboard.createCase')}</h3>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <Plus className="w-5 h-5 rotate-45" />
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-8 max-h-[70vh] overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="md:col-span-2 space-y-2.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 tracking-tight">
                  {t('judge.form.title')}
                </label>
                <input 
                  className="w-full bg-background border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                  value={title} 
                  onChange={(event) => setTitle(event.target.value)} 
                  placeholder="e.g. Landmark Construction vs. City Planning"
                  required 
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 tracking-tight">
                  {t('judge.form.caseType')}
                </label>
                <select 
                  className="w-full bg-background border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer shadow-sm"
                  value={caseType} 
                  onChange={(event) => setCaseType(event.target.value as CaseType)} 
                  required
                >
                  <option value="unpaid_wages">{t('judge.caseTypes.unpaid_wages')}</option>
                  <option value="wrongful_termination">{t('judge.caseTypes.wrongful_termination')}</option>
                  <option value="end_of_service">{t('judge.caseTypes.end_of_service')}</option>
                  <option value="contract_dispute">{t('judge.caseTypes.contract_dispute')}</option>
                  <option value="other">{t('judge.caseTypes.other')}</option>
                </select>
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 tracking-tight">
                  {t('judge.form.filingDate')}
                </label>
                <input 
                  type="date" 
                  className="w-full bg-background border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                  value={filingDate} 
                  onChange={(event) => setFilingDate(event.target.value)} 
                  required 
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 tracking-tight">
                  {t('judge.form.claimant')}
                </label>
                <input 
                  className="w-full bg-background border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                  value={claimant} 
                  onChange={(event) => setClaimant(event.target.value)} 
                  placeholder="Claimant Name"
                  required 
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 tracking-tight">
                  {t('judge.form.respondent')}
                </label>
                <input 
                  className="w-full bg-background border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
                  value={respondent} 
                  onChange={(event) => setRespondent(event.target.value)} 
                  placeholder="Respondent Name"
                  required 
                />
              </div>

              <div className="md:col-span-2 space-y-2.5">
                <label className="text-[11px] font-black uppercase text-muted-foreground ml-1 tracking-tight">
                  {t('judge.form.notes')}
                </label>
                <textarea 
                  className="w-full bg-background border rounded-xl px-4 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[140px] shadow-sm"
                  value={notes} 
                  onChange={(event) => setNotes(event.target.value)} 
                  placeholder="Detailed case description and notes..."
                  required
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t bg-muted/10 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? t('common.loading') : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('common.submit')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

export default CreateCaseModal
