import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sanitizePortfolioSlugInput } from '@/lib/portfolio/slug-validation'
import type { SupabaseClient } from '@supabase/supabase-js'

const ARABIC_MAP: Record<string, string> = {
  أ: 'a',
  ا: 'a',
  آ: 'a',
  إ: 'i',
  ء: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'th',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'w',
  ي: 'y',
  ى: 'a',
  ة: 'a',
  ئ: 'y',
  ؤ: 'w',
  لا: 'la',
  ' ': '-',
}

function transliterateArabic(text: string): string {
  let result = ''
  let i = 0
  while (i < text.length) {
    const two = text.slice(i, i + 2)
    if (two === 'لا') {
      result += 'la'
      i += 2
      continue
    }
    const ch = text[i]
    const mapped = ARABIC_MAP[ch]
    if (mapped !== undefined) {
      result += mapped
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      result += ch.toLowerCase()
    } else if (/\s/.test(ch)) {
      result += '-'
    }
    i += 1
  }
  return result
}

export function generateSlug(fullName: string, fullNameEn?: string): string {
  const source = fullNameEn?.trim() || fullName.trim()
  const latin = /[\u0600-\u06FF]/.test(source) ? transliterateArabic(source) : source

  let slug = latin
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  if (slug.length < 3) {
    slug = `user-${Date.now().toString().slice(-6)}`
  }

  return slug
}

export async function ensureUniqueSlug(
  baseSlug: string,
  supabase?: SupabaseClient
): Promise<string> {
  const cleaned = sanitizePortfolioSlugInput(baseSlug)
  const slugBase = cleaned.length >= 3 ? cleaned : generateSlug('user')

  let client = supabase
  if (!client) {
    try {
      client = createAdminClient()
    } catch {
      client = await createClient()
    }
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0
        ? slugBase
        : `${slugBase.slice(0, 40)}-${Math.floor(1000 + Math.random() * 9000)}`

    const { data } = await client
      .from('users')
      .select('id')
      .eq('portfolio_slug', candidate)
      .maybeSingle()

    if (!data) return candidate
  }

  return `${slugBase.slice(0, 35)}-${Date.now().toString().slice(-6)}`
}
