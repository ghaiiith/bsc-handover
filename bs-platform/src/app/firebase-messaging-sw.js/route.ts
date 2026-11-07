import { getPublicFirebaseConfig } from '@/lib/push/firebase-config'
import { buildFirebaseMessagingSwScript } from '@/lib/push/firebase-messaging-sw-script'

export const dynamic = 'force-dynamic'

export async function GET() {
  const config = getPublicFirebaseConfig()
  if (!config) {
    return new Response('// Firebase push is not configured\n', {
      status: 404,
      headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
    })
  }

  return new Response(buildFirebaseMessagingSwScript(config), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  })
}
