import {
  getFirebaseVapidKey,
  getPublicFirebaseConfig,
  type PublicFirebaseConfig,
} from '@/lib/push/firebase-config'
import { getFirebaseClientApp, isPushSupported } from '@/lib/push/firebase-client'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'

export const FCM_SW_PATH = '/firebase-messaging-sw.js'

export type FcmRegisterErrorCode =
  | 'unsupported'
  | 'not_configured'
  | 'permission_denied'
  | 'invalid_vapid'
  | 'service_worker_failed'
  | 'token_failed'
  | 'push_service_blocked'
  | 'register_api_failed'

export class FcmRegisterError extends Error {
  constructor(
    public readonly code: FcmRegisterErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'FcmRegisterError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function normalizeVapidKey(key: string): string {
  return key.replace(/\s+/g, '')
}

function isLikelyValidVapidKey(key: string): boolean {
  const normalized = normalizeVapidKey(key)
  return normalized.length >= 80 && normalized.length <= 200
}

export async function isBraveBrowser(): Promise<boolean> {
  const brave = (navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } }).brave
  if (!brave?.isBrave) return false
  try {
    return await brave.isBrave()
  } catch {
    return false
  }
}

async function unregisterStalePushWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    registrations
      .filter((reg) => {
        const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? ''
        return url.includes('firebase-messaging-sw')
      })
      .map((reg) => reg.unregister())
  )
}

async function waitForServiceWorkerActive(
  registration: ServiceWorkerRegistration
): Promise<ServiceWorkerRegistration> {
  if (registration.active?.state === 'activated') {
    return registration
  }

  const worker = registration.installing ?? registration.waiting
  if (worker) {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error('Service worker activation timed out'))
      }, 20000)

      const onStateChange = () => {
        if (worker.state === 'activated') {
          window.clearTimeout(timeout)
          worker.removeEventListener('statechange', onStateChange)
          resolve()
        }
        if (worker.state === 'redundant') {
          window.clearTimeout(timeout)
          worker.removeEventListener('statechange', onStateChange)
          reject(new Error('Service worker became redundant'))
        }
      }

      worker.addEventListener('statechange', onStateChange)
      if (worker.state === 'activated') {
        window.clearTimeout(timeout)
        worker.removeEventListener('statechange', onStateChange)
        resolve()
      }
    })
  }

  await navigator.serviceWorker.ready
  return registration
}

async function verifyServiceWorkerScript(): Promise<void> {
  const response = await fetch(FCM_SW_PATH, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Service worker script returned ${response.status}`)
  }
  const text = await response.text()
  if (!text.includes('firebase.initializeApp')) {
    throw new Error('Service worker script is missing Firebase initialization')
  }
}

async function pingServiceWorker(
  registration: ServiceWorkerRegistration
): Promise<void> {
  const worker = registration.active
  if (!worker) {
    throw new Error('No active service worker')
  }

  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => {
      reject(new Error('Service worker ping timed out'))
    }, 8000)

    channel.port1.onmessage = (event: MessageEvent) => {
      window.clearTimeout(timeout)
      if (event.data?.type === 'PONG' && event.data.ready) {
        resolve()
        return
      }
      reject(new Error('Service worker Firebase is not ready'))
    }

    worker.postMessage({ type: 'PING' }, [channel.port2])
  })
}

async function registerPushServiceWorker(
  _config: PublicFirebaseConfig
): Promise<ServiceWorkerRegistration> {
  await verifyServiceWorkerScript()
  await unregisterStalePushWorkers()

  let registration = await navigator.serviceWorker.register(FCM_SW_PATH, {
    scope: '/',
    updateViaCache: 'none',
  })

  registration = await waitForServiceWorkerActive(registration)
  await pingServiceWorker(registration)

  if (!registration.pushManager) {
    throw new Error('PushManager is not available')
  }

  return registration
}

function classifyTokenError(error: unknown): FcmRegisterError {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  if (
    lower.includes('push service error') ||
    lower.includes('pushmanager') ||
    lower.includes('gcm') ||
    lower.includes('registration failed')
  ) {
    return new FcmRegisterError(
      'push_service_blocked',
      'Browser push service is unavailable. Try Chrome/Edge, disable Brave Shields, or check notification permissions.',
      error
    )
  }

  if (
    lower.includes('applicationserverkey') ||
    lower.includes('vapid') ||
    lower.includes('invalid access')
  ) {
    return new FcmRegisterError(
      'invalid_vapid',
      'Invalid VAPID key. Use the Web Push certificate key from Firebase Console → Cloud Messaging.',
      error
    )
  }

  return new FcmRegisterError('token_failed', message, error)
}

async function getTokenWithRetry(
  messaging: import('firebase/messaging').Messaging,
  options: { vapidKey: string; serviceWorkerRegistration: ServiceWorkerRegistration }
): Promise<string> {
  const { getToken } = await import('firebase/messaging')
  let lastError: unknown

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const token = await getToken(messaging, options)
      if (token) return token
      lastError = new Error('FCM token was empty')
    } catch (error) {
      lastError = error
    }

    if (attempt < 3) {
      await sleep(750 * (attempt + 1))
    }
  }

  throw lastError
}

export async function registerFcmToken(locale: string): Promise<string> {
  if (!isPushSupported()) {
    throw new FcmRegisterError('unsupported', 'Push notifications are not supported in this browser')
  }

  const config = getPublicFirebaseConfig()
  if (!config) {
    throw new FcmRegisterError('not_configured', 'Firebase is not configured')
  }

  if (await isBraveBrowser()) {
    throw new FcmRegisterError(
      'push_service_blocked',
      'Brave blocks Google push by default. Open brave://settings/privacy and allow Google push messaging, or use Chrome/Edge.'
    )
  }

  const vapidKey = getFirebaseVapidKey()
  if (!vapidKey || !isLikelyValidVapidKey(vapidKey)) {
    throw new FcmRegisterError(
      'invalid_vapid',
      'Missing or invalid NEXT_PUBLIC_FIREBASE_VAPID_KEY'
    )
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new FcmRegisterError('permission_denied', 'Notification permission was denied')
  }

  const { isSupported, getMessaging, onMessage } = await import('firebase/messaging')

  if (!(await isSupported())) {
    throw new FcmRegisterError('unsupported', 'Firebase messaging is not supported here')
  }

  let registration: ServiceWorkerRegistration
  try {
    registration = await registerPushServiceWorker(config)
  } catch (error) {
    throw new FcmRegisterError(
      'service_worker_failed',
      'Could not register the notification service worker',
      error
    )
  }

  const app = getFirebaseClientApp()
  if (!app) {
    throw new FcmRegisterError('not_configured', 'Firebase app failed to initialize')
  }

  const messaging = getMessaging(app)

  let token: string
  try {
    token = await getTokenWithRetry(messaging, {
      vapidKey: normalizeVapidKey(vapidKey),
      serviceWorkerRegistration: registration,
    })
  } catch (error) {
    throw classifyTokenError(error)
  }

  const res = await fetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, locale }),
  })

  if (!res.ok) {
    throw new FcmRegisterError('register_api_failed', 'Failed to save push token on server')
  }

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? BRAND_FULL_NAME
    const body = payload.notification?.body ?? ''
    if (document.visibilityState === 'visible' && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo-traced.svg' })
    }
  })

  return token
}

export function getFcmErrorMessage(
  error: unknown,
  t: (key: string) => string
): string {
  if (error instanceof FcmRegisterError) {
    switch (error.code) {
      case 'permission_denied':
        return t('denied')
      case 'invalid_vapid':
        return t('invalid_vapid')
      case 'push_service_blocked':
        return t('push_service_blocked')
      case 'unsupported':
        return t('unsupported')
      case 'not_configured':
        return t('not_configured')
      default:
        return t('error')
    }
  }
  return t('error')
}
