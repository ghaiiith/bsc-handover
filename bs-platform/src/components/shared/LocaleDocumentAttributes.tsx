'use client'

import { useLayoutEffect } from 'react'

interface LocaleDocumentAttributesProps {
  locale: string
}

export default function LocaleDocumentAttributes({
  locale,
}: LocaleDocumentAttributesProps) {
  useLayoutEffect(() => {
    const isRTL = locale === 'ar'
    document.documentElement.lang = locale
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
  }, [locale])

  return null
}
