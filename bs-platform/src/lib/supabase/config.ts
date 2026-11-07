export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isHttps = url?.startsWith('https://')
  // Allow local Supabase (supabase CLI) over http on loopback for local dev.
  const isLocalHttp =
    url?.startsWith('http://127.0.0.1') || url?.startsWith('http://localhost')
  // Staging escape hatch: allow plain http (e.g. bare-IP server before DNS/TLS).
  const isAllowedHttp =
    process.env.NEXT_PUBLIC_ALLOW_HTTP_SUPABASE === 'true' &&
    url?.startsWith('http://')
  return Boolean(
    (isHttps || isLocalHttp || isAllowedHttp) &&
      !url?.includes('your-project') &&
      key &&
      !key.startsWith('your_')
  )
}
