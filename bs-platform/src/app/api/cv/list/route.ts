import { NextResponse } from 'next/server'
import { getAuthenticatedUserId, listCvProfiles } from '@/lib/cv/cv-data'

export async function GET() {
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const profiles = await listCvProfiles(userId)
  return NextResponse.json({ profiles })
}
