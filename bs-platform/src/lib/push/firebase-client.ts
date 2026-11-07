'use client'

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getPublicFirebaseConfig } from '@/lib/push/firebase-config'

let clientApp: FirebaseApp | null = null

export function getFirebaseClientApp(): FirebaseApp | null {
  const config = getPublicFirebaseConfig()
  if (!config) return null

  if (clientApp) return clientApp

  const existing = getApps()
  if (existing.length > 0) {
    clientApp = existing[0]!
    return clientApp
  }

  clientApp = initializeApp(config)
  return clientApp
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  )
}
