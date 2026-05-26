export function createLanguageSlice(set) {
  return {
    language: 'en',
    setLanguage: (lang) => set({ language: lang }),
  }
}
