import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as 'ar' | 'en')) {
    locale = routing.defaultLocale
  }

  const messages =
    locale === 'en'
      ? (await import('../locales/en.json')).default
      : (await import('../locales/ar.json')).default

  return {
    locale,
    messages,
  }
})
