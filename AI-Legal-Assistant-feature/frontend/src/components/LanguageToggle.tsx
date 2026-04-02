import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'

const LanguageToggle = () => {
  const { i18n, t } = useTranslation()

  return (
    <div className="flex bg-muted/20 border border-border/40 p-1 rounded-xl" aria-label={t('common.language')}>
      <button
        type="button"
        className={cn(
          "px-3 py-1.5 text-[10px] font-black tracking-widest rounded-lg transition-all",
          i18n.language.startsWith('en') 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
        )}
        onClick={() => i18n.changeLanguage('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={cn(
          "px-3 py-1.5 text-[10px] font-black tracking-widest rounded-lg transition-all",
          i18n.language.startsWith('ar') 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
        )}
        onClick={() => i18n.changeLanguage('ar')}
      >
        AR
      </button>
    </div>
  )
}

export default LanguageToggle
