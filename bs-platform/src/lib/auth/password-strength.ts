export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

export function calculatePasswordScore(password: string): number {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[!@#$%^&*]/.test(password)) score += 1
  return score
}

export function getPasswordStrength(password: string): PasswordStrength {
  const score = calculatePasswordScore(password)
  if (score <= 1) return 'weak'
  if (score === 2) return 'fair'
  if (score === 3) return 'good'
  return 'strong'
}

export function getStrengthSegments(strength: PasswordStrength): number {
  switch (strength) {
    case 'weak':
      return 1
    case 'fair':
      return 2
    case 'good':
      return 3
    case 'strong':
      return 4
  }
}

export function getStrengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case 'weak':
      return '#EF4444'
    case 'fair':
      return '#F97316'
    case 'good':
      return '#EAB308'
    case 'strong':
      return '#22C55E'
  }
}

export function meetsRegisterPasswordRequirements(password: string): boolean {
  return password.length >= 8 && calculatePasswordScore(password) >= 2
}

export function passwordRequirements(password: string) {
  return {
    length: password.length >= 8,
    number: /[0-9]/.test(password),
    uppercase: /[A-Z]/.test(password),
  }
}
