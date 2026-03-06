import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const CaseList = () => {
  const { t } = useTranslation()

  // Stub data for demonstration
  const cases = [
    { id: '1', caseNumber: 'CASE-2024-001', status: 'pending', type: 'Labor Dispute', assignedTo: 'Judge' },
    { id: '2', caseNumber: 'CASE-2024-002', status: 'in_progress', type: 'Wage Dispute', assignedTo: 'Judge' },
    { id: '3', caseNumber: 'CASE-2024-003', status: 'completed', type: 'Termination', assignedTo: 'Judge' },
  ]

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{t('case.title')}</h1>
      <p>Role: {t('roles.judge')}</p>
      <p>Coming soon - Case list with filtering and search</p>

      <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{t('case.caseNumber')}</th>
            <th style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{t('case.caseType')}</th>
            <th style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{t('case.status')}</th>
            <th style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id}>
              <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{c.caseNumber}</td>
              <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{c.type}</td>
              <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{t(`status.${c.status}`)}</td>
              <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                <Link to={`/judge/cases/${c.id}`}>{t('case.viewDetails')}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CaseList

