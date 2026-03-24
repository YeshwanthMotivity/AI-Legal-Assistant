import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import ar from './locales/ar.json'

const applyDocumentDirection = (language: string) => {
  const rtl = language.startsWith('ar')
  document.documentElement.dir = rtl ? 'rtl' : 'ltr'
  document.documentElement.lang = rtl ? 'ar' : 'en'
}

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage'],
  },
})

applyDocumentDirection(i18n.language || 'en')
i18n.on('languageChanged', applyDocumentDirection)

export default i18n
