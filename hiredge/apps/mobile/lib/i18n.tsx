import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations, type Locale, type TranslationKey, LOCALE_LABELS, LOCALE_FLAGS } from '@hiredge/shared/src/i18n/translations'
import { storage } from './storage'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'fr',
  setLocale: () => {},
  t: (key) => key,
})

const STORAGE_KEY = 'hiredge_locale'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    storage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && translations[stored as Locale]) {
        setLocaleState(stored as Locale)
      }
    })
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    storage.setItem(STORAGE_KEY, newLocale)
  }, [])

  const t = useCallback((key: TranslationKey): string => {
    return translations[locale]?.[key] ?? translations.fr[key] ?? key
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}

export { LOCALE_LABELS, LOCALE_FLAGS }
export type { Locale, TranslationKey }
