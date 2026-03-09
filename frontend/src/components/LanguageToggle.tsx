import { useTranslation } from 'react-i18next'

const LanguageToggle = () => {
  const { i18n, t } = useTranslation()

  return (
    <div className="language-toggle" aria-label={t('common.language')}>
      <button
        type="button"
        className={i18n.language.startsWith('en') ? 'active' : ''}
        onClick={() => i18n.changeLanguage('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={i18n.language.startsWith('ar') ? 'active' : ''}
        onClick={() => i18n.changeLanguage('ar')}
      >
        AR
      </button>
    </div>
  )
}

export default LanguageToggle
