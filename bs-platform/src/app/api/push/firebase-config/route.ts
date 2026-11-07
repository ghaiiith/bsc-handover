import { NextResponse } from 'next/server'
import { getPublicFirebaseConfig } from '@/lib/push/firebase-config'

export const dynamic = 'force-dynamic'

/** Public Firebase web config for the messaging service worker fallback. */
export async function GET() {
  const config = getPublicFirebaseConfig()
  if (!config) {
    return NextResponse.json({ configured: false }, { status: 404 })
  }

  return NextResponse.json(
    { configured: true, ...config },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
