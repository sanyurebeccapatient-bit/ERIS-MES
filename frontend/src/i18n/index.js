/**
 * Lightweight i18n System
 * -----------------------------------------------------------------------
 * Provides a reactive translation function t() that switches when the
 * language changes. No external dependency needed — just JSON locale files
 * and a Pinia store for persistence.
 * -----------------------------------------------------------------------
 */
import { ref, computed } from 'vue'
import en from './locales/en.json'
import fr from './locales/fr.json'
import rw from './locales/rw.json'
import sw from './locales/sw.json'

const locales = { en, fr, rw, sw }

const STORAGE_KEY = 'ecd_language'

// Default to browser language or English
function detectDefaultLocale() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && locales[saved]) return saved
  const browserLang = (navigator.language || 'en').slice(0, 2)
  return locales[browserLang] ? browserLang : 'en'
}

export const currentLocale = ref(detectDefaultLocale())
export const refreshKey = ref(0)

export function setLocale(locale) {
  if (locales[locale]) {
    currentLocale.value = locale
    localStorage.setItem(STORAGE_KEY, locale)
    refreshKey.value++
  }
}

/**
 * Get a nested value from an object by dot-separated key.
 * e.g. getNested(obj, 'dashboard.goodMorning') => 'Good morning'
 */
function getNested(obj, path) {
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return null
    current = current[key]
  }
  return current
}

/**
 * Main translation function.
 * @param {string} key - Dot-separated key, e.g. 'dashboard.goodMorning'
 * @param {object} params - Interpolation params, e.g. { n: 5 }
 * @returns {string}
 */
export function t(key, params = {}) {
  const locale = locales[currentLocale.value] || en
  let value = getNested(locale, key) || getNested(en, key) || key

  // Replace {param} placeholders
  for (const [k, v] of Object.entries(params)) {
    value = String(value).replace(new RegExp(`\\{${k}\\}`, 'g'), v)
  }

  return value
}

/**
 * Composable for use in Vue components.
 * Returns { t, locale, setLocale, locales }
 */
export function useI18n() {
  return {
    t,
    locale: computed(() => currentLocale.value),
    setLocale,
    localeNames: {
      en: 'English',
      fr: 'Français',
      rw: 'Ikinyarwanda',
      sw: 'Kiswahili',
    },
  }
}

export default { t, useI18n, currentLocale, setLocale }
