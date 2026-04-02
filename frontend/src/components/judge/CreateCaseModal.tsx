import { FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, Briefcase, FileText, UserSquare2, Scale, Calendar } from 'lucide-react'
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* 1. Modal Container - Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-container/90 backdrop-blur-xl transition-opacity" 
        onClick={handleClose}
      />
      
      {/* 1. Modal Container - Panel */}
      <div className="relative w-full max-w-4xl bg-surface-container-lowest dark:bg-surface-container rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-outline-variant/30">
        
        {/* Header Ribbon (Kept for LexAI branding) */}
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-tertiary to-primary opacity-80" />
        
        {/* 2. Header */}
        <div className="flex items-center justify-between px-10 py-8 bg-surface-container-lowest dark:bg-surface-container relative">
          <div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider mb-1.5 block opacity-80">
              LexAI
            </span>
            <h2 className="text-3xl font-headline font-semibold text-primary dark:text-emerald-400 tracking-tight">
              {t('judge.form.createNewCase')}
            </h2>
          </div>
          <button 
            onClick={handleClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low dark:bg-surface-container-high border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:border-primary/50 transition-all duration-200 hover:scale-105"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Subtle gradient divider line */}
          <div className="absolute bottom-0 left-10 right-10 h-px bg-gradient-to-r from-outline-variant/50 via-outline-variant/10 to-transparent" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* 3. Form Layout & 11. Scroll Experience */}
          <div className="px-10 py-8 overflow-y-auto scrollbar-thin scrollbar-thumb-outline-variant/30 scrollbar-track-transparent max-h-[65vh] pb-12">
            
            <div className="flex flex-col gap-y-10">
              
              {/* SECTION 1: Case Details */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                  <Briefcase className="w-4 h-4 text-primary opacity-80" />
                  {t('judge.form.caseCoreDetails')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <div className="md:col-span-2 space-y-2">
                    {/* 5. Label Improvement & 10. Icon alignment */}
                    <label className="text-xs font-semibold text-on-surface-variant/90 tracking-wide flex items-center gap-1.5">
                      {t('judge.form.title')}
                    </label>
                    {/* 4. Input Field Enhancement */}
                    <input 
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none"
                      value={title} 
                      onChange={(event) => setTitle(event.target.value)} 
                      placeholder={t('judge.form.titlePlaceholder')}
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-on-surface-variant/90 tracking-wide flex items-center gap-1.5">
                      {t('judge.form.caseType')}
                    </label>
                    <select 
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none appearance-none"
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

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-on-surface-variant/90 tracking-wide flex items-center gap-1.5">
                      {t('judge.form.filingDate')}
                    </label>
                    <input 
                      type="date" 
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none"
                      value={filingDate} 
                      onChange={(event) => setFilingDate(event.target.value)} 
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Parties */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                  <UserSquare2 className="w-4 h-4 text-primary opacity-80" />
                  {t('judge.form.involvedParties')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-on-surface-variant/90 tracking-wide flex items-center gap-1.5">
                      {t('judge.form.claimant')}
                    </label>
                    <input 
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none"
                      value={claimant} 
                      onChange={(event) => setClaimant(event.target.value)} 
                      placeholder={t('judge.form.claimantPlaceholder')}
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-on-surface-variant/90 tracking-wide flex items-center gap-1.5">
                      {t('judge.form.respondent')}
                    </label>
                    <input 
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none"
                      value={respondent} 
                      onChange={(event) => setRespondent(event.target.value)} 
                      placeholder={t('judge.form.respondentPlaceholder')}
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Case Notes */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                  <FileText className="w-4 h-4 text-primary opacity-80" />
                  {t('judge.form.preliminaryIntelligence')}
                </h3>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-on-surface-variant/90 tracking-wide flex items-center gap-1.5">
                    {t('judge.form.notes')}
                  </label>
                  {/* 7. Textarea Enhancement */}
                  <div className="bg-surface-container-low rounded-xl p-1 border border-outline-variant/30 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200 shadow-inner">
                    <textarea 
                      className="w-full bg-transparent border-0 outline-none resize-none px-4 py-4 text-sm text-on-surface min-h-[140px] placeholder:italic placeholder:text-on-surface-variant/50"
                      value={notes} 
                      onChange={(event) => setNotes(event.target.value)} 
                      placeholder={t('judge.form.notesPlaceholder')}
                      required
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 8. Button Section */}
          <div className="px-10 py-6 border-t border-outline-variant/20 bg-surface-container-low flex justify-end gap-6 items-center">
            <button 
              type="button" 
              onClick={handleClose}
              className="text-sm font-medium text-on-surface-variant/70 hover:text-on-surface transition-colors duration-200 hover:underline underline-offset-4"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-primary to-tertiary text-on-primary rounded-lg font-semibold text-sm tracking-wide shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.02] disabled:opacity-50 disabled:transform-none transition-all duration-300 flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  {t('judge.form.processingTarget')}
                </div>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {t('judge.form.initializeRecord')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateCaseModal
