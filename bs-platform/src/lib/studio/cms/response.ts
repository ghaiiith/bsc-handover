import { NextResponse } from 'next/server'

export function cmsJson<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function cmsError(error: string, status = 400) {
  return NextResponse.json({ error }, { status })
}

export function cmsUnauthorized() {
  return cmsError('unauthorized', 401)
}
