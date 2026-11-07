export interface PublicFirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  messagingSenderId: string
  appId: string
}

export function getPublicFirebaseConfig(): PublicFirebaseConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim()
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim()
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim()
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim()

  if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) {
    return null
  }

  return { apiKey, authDomain, projectId, messagingSenderId, appId }
}

export function getFirebaseVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim() ?? null
}

function isLikelyValidVapidKey(key: string | null): boolean {
  if (!key) return false
  const normalized = key.replace(/\s+/g, '')
  return normalized.length >= 80 && normalized.length <= 200
}

export function isFirebaseClientConfigured(): boolean {
  return Boolean(getPublicFirebaseConfig() && isLikelyValidVapidKey(getFirebaseVapidKey()))
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_PRIVATE_KEY?.trim()
  )
}
