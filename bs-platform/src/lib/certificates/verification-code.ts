import 'server-only'

import { randomBytes } from 'crypto'

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function randomSegment(length: number): string {
  const bytes = randomBytes(length)
  let result = ''
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabet.length]
  }
  return result
}

export function generateVerificationCode(): string {
  return `EW-${randomSegment(8)}`
}
