import { describe, it, expect } from 'vitest'
import { buildWhatsAppShareUrl } from '@/lib/share/whatsapp'

describe('buildWhatsAppShareUrl (BS-93)', () => {
  it('produces a wa.me link carrying both the message and the URL', () => {
    const url = buildWhatsAppShareUrl({
      text: 'See my profile',
      url: 'https://bs-platform.com/ar/portfolio/ali',
    })
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
    const decoded = decodeURIComponent(url.split('text=')[1])
    expect(decoded).toContain('See my profile')
    expect(decoded).toContain('https://bs-platform.com/ar/portfolio/ali')
  })

  it('puts the link on its own line so WhatsApp renders a preview', () => {
    const url = buildWhatsAppShareUrl({ text: 'hi', url: 'https://x.test/p' })
    expect(decodeURIComponent(url.split('text=')[1])).toBe('hi\nhttps://x.test/p')
  })

  it('encodes Arabic text without breaking the URL', () => {
    const url = buildWhatsAppShareUrl({
      text: 'شوف الملف المهني',
      url: 'https://bs-platform.com/ar/portfolio/ali',
    })
    expect(url).not.toContain(' ')
    expect(decodeURIComponent(url.split('text=')[1])).toContain('شوف الملف المهني')
  })

  it('addresses a specific recipient when a phone number is given', () => {
    const url = buildWhatsAppShareUrl({
      text: 'hi',
      url: 'https://x.test/p',
      phone: '+964 770 123 4567',
    })
    expect(url.startsWith('https://wa.me/9647701234567?text=')).toBe(true)
  })

  it('falls back to the open chooser when the phone has no digits', () => {
    const url = buildWhatsAppShareUrl({ text: 'hi', url: 'https://x.test/p', phone: '---' })
    expect(url.startsWith('https://wa.me/?text=')).toBe(true)
  })

  it('trims surrounding whitespace from the message and link', () => {
    const url = buildWhatsAppShareUrl({ text: '  hi  ', url: '  https://x.test/p  ' })
    expect(decodeURIComponent(url.split('text=')[1])).toBe('hi\nhttps://x.test/p')
  })
})
