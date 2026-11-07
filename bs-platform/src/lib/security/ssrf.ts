import 'server-only'

import { lookup } from 'dns/promises'

/**
 * SSRF protection for server-side fetches of user/instructor/admin-supplied URLs.
 *
 * Two layers:
 *  - `isSafeHttpUrl` (sync): protocol allow-list + reject hostnames that are
 *    obvious internal targets or private/loopback/link-local IP *literals*.
 *  - `assertPublicHttpUrl` (async): the sync check PLUS DNS resolution, so a
 *    public hostname that resolves to a private/metadata IP (DNS rebinding,
 *    `foo.example.com -> 169.254.169.254`) is also blocked.
 *
 * Always prefer `assertPublicHttpUrl` right before the actual `fetch`.
 */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n > 255) return null
    value = value * 256 + n
  }
  return value >>> 0
}

/** True if an IPv4 address falls in a private / loopback / reserved range. */
function isBlockedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return true // unparseable → treat as unsafe
  const inRange = (base: string, maskBits: number) => {
    const b = ipv4ToInt(base)!
    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0
    return (n & mask) === (b & mask)
  }
  return (
    inRange('0.0.0.0', 8) || // "this" network
    inRange('10.0.0.0', 8) || // private
    inRange('100.64.0.0', 10) || // CGNAT
    inRange('127.0.0.0', 8) || // loopback
    inRange('169.254.0.0', 16) || // link-local (incl. 169.254.169.254 metadata)
    inRange('172.16.0.0', 12) || // private
    inRange('192.0.0.0', 24) || // IETF protocol assignments
    inRange('192.168.0.0', 16) || // private
    inRange('198.18.0.0', 15) || // benchmarking
    n >= ipv4ToInt('224.0.0.0')! // multicast + reserved
  )
}

/** True if an IPv6 address is loopback / unspecified / ULA / link-local, or an
 * IPv4-mapped/embedded address pointing at a blocked v4 range. */
function isBlockedIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (addr === '::1' || addr === '::') return true

  // IPv4-mapped (::ffff:a.b.c.d) and NAT64 (64:ff9b::a.b.c.d) — check embedded v4.
  const v4Embedded = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (v4Embedded && (addr.includes('::ffff:') || addr.startsWith('64:ff9b:'))) {
    return isBlockedIpv4(v4Embedded[1])
  }

  const firstGroup = addr.split(':')[0]
  const head = parseInt(firstGroup || '0', 16)
  if (Number.isNaN(head)) return true
  if ((head & 0xfe00) === 0xfc00) return true // fc00::/7 unique-local
  if ((head & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  return false
}

function isIpLiteralBlocked(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '')
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return isBlockedIpv4(host)
  if (host.includes(':')) return isBlockedIpv6(host)
  return false
}

const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.localhost']

/** Sync guard: protocol + obvious-internal-hostname + private-IP-literal checks. */
export function isSafeHttpUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false

  const host = parsed.hostname.toLowerCase()
  if (!host) return false
  if (host === 'localhost') return false
  if (BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) return false
  if (isIpLiteralBlocked(host)) return false
  return true
}

/**
 * Async guard: `isSafeHttpUrl` plus DNS resolution. Returns false if the
 * hostname resolves to any private/loopback/link-local/metadata address.
 * Use immediately before fetching a URL that came from user/admin input.
 */
export async function assertPublicHttpUrl(url: string): Promise<boolean> {
  if (!isSafeHttpUrl(url)) return false
  const { hostname } = new URL(url)
  const host = hostname.replace(/^\[|\]$/g, '')

  // IP literals were already validated synchronously.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) return true

  try {
    const records = await lookup(host, { all: true })
    if (!records.length) return false
    for (const { address, family } of records) {
      if (family === 4 ? isBlockedIpv4(address) : isBlockedIpv6(address)) {
        return false
      }
    }
    return true
  } catch {
    // DNS failure → cannot prove the host is public → block.
    return false
  }
}
