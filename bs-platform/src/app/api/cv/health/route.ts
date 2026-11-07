import { NextResponse } from 'next/server'
import { getCvBuilderHealth, isCvBuilderConfigured } from '@/lib/cv/cv-builder-server'

/** Health probe for the CV Builder AI service (admin / diagnostics). */
export async function GET() {
  if (!isCvBuilderConfigured()) {
    return NextResponse.json(
      { ok: false, configured: false, error: 'cv_builder_not_configured' },
      { status: 503 }
    )
  }

  const result = await getCvBuilderHealth()
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, configured: true, error: result.message },
      { status: result.status }
    )
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    service: result.health.service,
    model: result.health.model,
    ai_enabled: result.health.ai_enabled,
  })
}
