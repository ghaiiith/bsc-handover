import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/verify-admin-api'
import { searchCommunityMembersForAdmin } from '@/lib/community/get-community-data'

export async function GET(request: Request) {
  const isAdmin = await verifyAdminApi()
  if (!isAdmin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ users: [] })
  }

  const users = await searchCommunityMembersForAdmin(q)
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      full_name_ar: u.full_name_ar,
      avatar_url: u.avatar_url,
      headline: u.headline,
      skills: u.skills,
      portfolio_slug: u.portfolio_slug,
    })),
  })
}
