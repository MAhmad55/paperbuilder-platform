import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import ur from './ur.json'

export const LANGUAGE_STORAGE_KEY = 'paperbuilder.lang'
export type AppLanguage = 'en' | 'ur'

function initialLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored === 'en' || stored === 'ur') return stored
  } catch { /* ignore */ }
  return 'en'
}

function applyDocumentDirection(lang: AppLanguage) {
  const dir = lang === 'ur' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
  document.documentElement.dir = dir
}

applyDocumentDirection(initialLanguage())

i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
    },
    lng: initialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React handles escaping
    },
    returnNull: false,
    react: {
      useSuspense: false,
    },
  })
  .then(() => {
    applyDocumentDirection((i18next.language as AppLanguage) ?? 'en')
  })

i18next.on('languageChanged', (lng) => {
  const lang = (lng === 'ur' ? 'ur' : 'en') as AppLanguage
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, lang) } catch { /* ignore */ }
  applyDocumentDirection(lang)
})

export function setLanguage(lang: AppLanguage) {
  void i18next.changeLanguage(lang)
}

export default i18next
