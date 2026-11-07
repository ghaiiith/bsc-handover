/**
 * OAuth provider feature flags.
 *
 * Google sign-in requires the Google provider to be enabled in Supabase
 * (GoTrue GOTRUE_EXTERNAL_GOOGLE_* config + Google Cloud OAuth credentials).
 * Until that is configured, the buttons are hidden so users never hit
 * "Unsupported provider: provider is not enabled".
 */
export function isGoogleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true'
}
