'use client'

import { useState, useSyncExternalStore } from 'react'
import BrandSplash from '@/components/brand/BrandSplash'
import { BRAND_SPLASH_STORAGE_KEY } from '@/lib/brand/constants'

function subscribeSplashStore() {
  return () => {}
}

function getSplashShouldShow(): boolean {
  try {
    return !sessionStorage.getItem(BRAND_SPLASH_STORAGE_KEY)
  } catch {
    return false
  }
}

function getServerSplashShouldShow(): boolean {
  return false
}

export default function BrandSplashGate() {
  const [dismissed, setDismissed] = useState(false)
  const shouldShow = useSyncExternalStore(
    subscribeSplashStore,
    getSplashShouldShow,
    getServerSplashShouldShow
  )

  if (!shouldShow || dismissed) return null

  return <BrandSplash onComplete={() => setDismissed(true)} />
}
