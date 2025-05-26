import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const modules = import.meta.glob('./translations/*.json', { eager: true }) as Record<string, { default: any }>

const resources: Record<string, { translation: any }> = {}

for (const path in modules) {
  const match = path.match(/\.\/translations\/([a-z]{2})\.json$/)
  if (!match) continue
  const lang = match[1]
  resources[lang] = { translation: modules[path].default }
}

export const supportedLanguages = Object.keys(resources)

export const languageLabels: Record<string, string> = {}
for (const lang of supportedLanguages) {
  languageLabels[lang] = resources[lang].translation.language ?? lang
}

const browserLang = navigator.language.split('-')[0]
export const defaultLanguage = supportedLanguages.includes(browserLang) ? browserLang : 'gb'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'gb',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })


export default i18n
