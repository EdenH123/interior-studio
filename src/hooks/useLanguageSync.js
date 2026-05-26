import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useStore from '../store/useStore'

export default function useLanguageSync() {
  const language = useStore((s) => s.language)
  const { i18n } = useTranslation()

  useEffect(() => {
    i18n.changeLanguage(language)
    document.documentElement.lang = language
    // Layout stays LTR for both languages — only text translates, button
    // positions never shift. Hebrew characters still render right-to-left
    // within their own text containers thanks to Unicode BiDi.
    document.documentElement.dir = 'ltr'
  }, [language, i18n])
}
