export type LoginErrorKey =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'rate_limit'
  | 'generic'

export function mapLoginError(message: string): LoginErrorKey {
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'invalid_credentials'
  }
  if (lower.includes('email not confirmed')) {
    return 'email_not_confirmed'
  }
  if (lower.includes('too many') || lower.includes('rate limit')) {
    return 'rate_limit'
  }
  return 'generic'
}

export type OAuthErrorKey = 'oauth_error' | 'access_denied'

export function mapOAuthErrorParam(error: string | null): OAuthErrorKey | null {
  if (error === 'oauth_error' || error === 'access_denied') {
    return error
  }
  return null
}
