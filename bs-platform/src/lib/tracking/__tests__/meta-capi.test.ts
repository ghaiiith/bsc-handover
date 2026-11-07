import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/admin/platform-settings', () => ({ getPlatformSettings: vi.fn() }))

import { buildUserData, capiUserFromRequest } from '@/lib/tracking/meta-capi'
import { createHash } from 'node:crypto'

const sha = (s: string) => createHash('sha256').update(s).digest('hex')

describe('buildUserData — Meta matching keys', () => {
  it('hashes the email lower-cased and trimmed, never raw', () => {
    const out = buildUserData({ email: '  Ali@Example.COM ' })
    expect(out.em).toEqual([sha('ali@example.com')])
    expect(JSON.stringify(out)).not.toContain('Example')
  })

  it('normalises an Iraqi local number to E.164 before hashing', () => {
    const out = buildUserData({ phone: '0770 123 4567' })
    expect(out.ph).toEqual([sha('9647701234567')])
  })

  it('leaves an already-international number alone', () => {
    expect(buildUserData({ phone: '+964 770 123 4567' }).ph).toEqual([sha('9647701234567')])
  })

  it('hashes the external id and passes ip/ua/fbp/fbc through', () => {
    const out = buildUserData({ externalId: 'u1', clientIp: '1.2.3.4', userAgent: 'UA', fbp: 'fb.1.x', fbc: 'fb.1.y' })
    expect(out.external_id).toEqual([sha('u1')])
    expect(out.client_ip_address).toBe('1.2.3.4')
    expect(out.fbp).toBe('fb.1.x')
  })

  it('omits keys that are not provided', () => {
    expect(buildUserData({})).toEqual({})
  })
})

describe('capiUserFromRequest', () => {
  it('reads the first forwarded ip and the Meta cookies', () => {
    const req = new Request('https://x.test', {
      headers: {
        'x-forwarded-for': '9.9.9.9, 10.0.0.1',
        'user-agent': 'TestUA',
        cookie: '_fbp=fb.1.123; other=1; _fbc=fb.1.456',
      },
    })
    expect(capiUserFromRequest(req)).toEqual({ clientIp: '9.9.9.9', userAgent: 'TestUA', fbp: 'fb.1.123', fbc: 'fb.1.456' })
  })
})
