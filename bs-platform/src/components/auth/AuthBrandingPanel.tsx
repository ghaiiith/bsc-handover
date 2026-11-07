import { getTranslations } from 'next-intl/server'
import { Sparkles } from 'lucide-react'
import BrandLogo from '@/components/brand/BrandLogo'
import { BRAND_ORANGE, BRAND_TEAL } from '@/lib/brand/constants'

interface AuthBrandingPanelProps {
  locale: string
}

export default async function AuthBrandingPanel({ locale }: AuthBrandingPanelProps) {
  const t = await getTranslations({ locale, namespace: 'auth' })

  const features = [
    t('feature_1'),
    t('feature_2'),
    t('feature_3'),
  ]

  return (
    <aside
      className="relative hidden min-h-screen w-[60%] flex-col justify-center overflow-hidden bg-gradient-to-br from-[#0B1220] to-[#111827] px-12 lg:px-16 md:flex"
      aria-hidden
    >
      <svg className="absolute inset-0 h-full w-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="auth-dots" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#334155" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-dots)" />
      </svg>

      <div
        className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: `${BRAND_ORANGE}1A` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: `${BRAND_TEAL}1A` }}
        aria-hidden
      />

      <div className="relative z-10 max-w-lg">
        <BrandLogo locale={locale} orientation="horizontal" mode="full" onDark iconSize={48} />

        <p className="mt-6 text-xl font-normal text-white/80">
          {t('branding_tagline')}
        </p>

        <ul className="mt-10 space-y-4">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-[15px] text-white/75">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_ORANGE }} aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
