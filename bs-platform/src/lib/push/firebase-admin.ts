import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'
import { isFirebaseAdminConfigured } from '@/lib/push/firebase-config'

let adminApp: App | null = null

function getAdminApp(): App | null {
  if (!isFirebaseAdminConfigured()) return null
  if (adminApp) return adminApp

  const existing = getApps()
  if (existing.length > 0) {
    adminApp = existing[0]!
    return adminApp
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!privateKey) return null

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
  })

  return adminApp
}

export function getFirebaseMessaging(): Messaging | null {
  const app = getAdminApp()
  if (!app) return null
  return getMessaging(app)
}
