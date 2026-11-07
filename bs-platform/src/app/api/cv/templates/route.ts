import { NextResponse } from 'next/server'
import { getCvTemplates } from '@/lib/cv/cv-builder-server'
import { getAuthenticatedUserId } from '@/lib/cv/cv-data'

export const revalidate = 3600

export async function GET() {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const result = await getCvTemplates()
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status })
  }

  const templates = result.templates.map((t, i) => {
    if (typeof t === 'string') return { id: t, name: t }
    const obj = t as Record<string, unknown>
    return {
      id: String(obj.id ?? obj.slug ?? obj.name ?? `template-${i}`),
      name: String(obj.name ?? obj.id ?? `Template ${i + 1}`),
      thumbnail: obj.thumbnail ? String(obj.thumbnail) : undefined,
    }
  })

  if (templates.length === 0) {
    return NextResponse.json({
      templates: [{ id: 'default', name: 'Default' }],
    })
  }

  return NextResponse.json({ templates })
}
