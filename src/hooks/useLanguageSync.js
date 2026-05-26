import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useStore from '../store/useStore'

export default function useLanguageSync() {
  const language = useStore((s) => s.language)
  const { i18n } = useTranslation()

  useEffect(() => {
    i18n.changeLanguage(language)
    document.documentElement.lang = language
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'
  }, [language, i18n])
}
