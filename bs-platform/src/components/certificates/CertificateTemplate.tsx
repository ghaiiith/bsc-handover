import { Award, CheckCircle2, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_FULL_NAME } from '@/lib/brand/constants'

function CornerFlourish({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 60"
      className={cn('pointer-events-none absolute h-12 w-12 text-amber-500 md:h-16 md:w-16', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2 2 L2 26 M2 2 L26 2" strokeWidth={2.2} />
      <path d="M6 6 C 26 6, 30 10, 30 30 M6 6 C 6 26, 10 30, 30 30" />
      <path d="M10 10 C 22 10, 24 12, 24 24" strokeWidth={1} className="text-amber-400" />
      <circle cx="30" cy="30" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export interface CertificateTemplateLabels {
  certificateOfCompletion: string
  presentedTo: string
  forCompleting: string
  instructor: string
  issuedOn: string
  verificationCode: string
  authenticCertificate: string
  previewBadge?: string
}

export interface CertificateTemplateProps {
  studentName: string
  courseTitle: string
  instructorName: string
  issuedDate: string
  verificationCode: string
  labels: CertificateTemplateLabels
  verifyUrl?: string
  variant?: 'full' | 'preview'
  className?: string
  documentId?: string
}

export default function CertificateTemplate({
  studentName,
  courseTitle,
  instructorName,
  issuedDate,
  verificationCode,
  labels,
  verifyUrl,
  variant = 'full',
  className,
  documentId = 'certificate-document',
}: CertificateTemplateProps) {
  const isPreview = variant === 'preview'

  return (
    <div
      id={isPreview ? undefined : documentId}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border border-orange-100 bg-[#fffdf8] text-center shadow-xl',
        'aspect-[1.414/1] min-h-[240px]',
        isPreview && 'shadow-none min-h-[200px]',
        className
      )}
    >
      {/* Warm luxury wash + edge tint (solid fallback keeps PDF warm) */}
      <div className="pointer-events-none absolute inset-0 bg-[#fff8ec] bg-[radial-gradient(120%_120%_at_50%_0%,#fff8ec_0%,#fffdf8_45%,#fdf3e2_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-orange-600" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-orange-600" />

      {/* Triple gold frame */}
      <div className="pointer-events-none absolute inset-[3%] rounded-lg border-2 border-orange-500/80" />
      <div
        className={cn(
          'pointer-events-none absolute rounded-md border border-amber-400/80',
          isPreview ? 'inset-[calc(3%+5px)]' : 'inset-[calc(3%+8px)]'
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute rounded-sm border border-dashed border-amber-300/60',
          isPreview ? 'inset-[calc(3%+9px)]' : 'inset-[calc(3%+14px)]'
        )}
      />

      {/* Ornate corner flourishes */}
      <CornerFlourish className="left-[2.5%] top-[2.5%]" />
      <CornerFlourish className="right-[2.5%] top-[2.5%] -scale-x-100" />
      <CornerFlourish className="bottom-[2.5%] left-[2.5%] -scale-y-100" />
      <CornerFlourish className="bottom-[2.5%] right-[2.5%] -scale-100" />

      {/* Guilloché-style radiating watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]">
        <div className={cn('relative', isPreview ? 'h-40 w-40' : 'h-72 w-72 md:h-96 md:w-96')}>
          <div className="absolute inset-0 rounded-full border-2 border-orange-700" />
          <div className="absolute inset-[10%] rounded-full border border-orange-700" />
          <div className="absolute inset-[22%] rounded-full border border-orange-700" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Award className={cn(isPreview ? 'h-16 w-16' : 'h-32 w-32 md:h-40 md:w-40')} />
          </div>
        </div>
      </div>

      {/* Preview badge */}
      {isPreview && labels.previewBadge && (
        <div className="absolute end-3 top-3 z-20">
          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
            {labels.previewBadge}
          </span>
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 flex h-full flex-col items-center justify-between',
          isPreview ? 'px-6 py-5' : 'px-8 py-7 md:px-14 md:py-10'
        )}
      >
        {/* Brand medallion with ribbon */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative">
            <div
              className={cn(
                'flex items-center justify-center rounded-full border-2 border-amber-300 bg-orange-600 text-white ring-2 ring-orange-600/25 ring-offset-2 ring-offset-[#fffdf8]',
                isPreview ? 'p-2' : 'p-3.5 md:p-4'
              )}
            >
              <Award className={cn(isPreview ? 'h-5 w-5' : 'h-7 w-7 md:h-9 md:w-9')} />
            </div>
            {/* Ribbon tails */}
            {!isPreview && (
              <>
                <span className="absolute -bottom-3 left-1/2 h-5 w-2.5 -translate-x-[9px] rotate-6 bg-orange-600 [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]" />
                <span className="absolute -bottom-3 left-1/2 h-5 w-2.5 -translate-x-[1px] -rotate-6 bg-amber-500 [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]" />
              </>
            )}
          </div>
          <div className={cn('flex items-center', isPreview ? 'mt-1 gap-1.5' : 'mt-2.5 gap-2')}>
            <Star className={cn('fill-amber-500 text-amber-500', isPreview ? 'h-2 w-2' : 'h-2.5 w-2.5')} />
            <p
              className={cn(
                'font-bold uppercase text-orange-700',
                isPreview ? 'text-[9px] tracking-[0.3em]' : 'text-xs tracking-[0.4em] md:text-sm'
              )}
            >
              {BRAND_FULL_NAME}
            </p>
            <Star className={cn('fill-amber-500 text-amber-500', isPreview ? 'h-2 w-2' : 'h-2.5 w-2.5')} />
          </div>
        </div>

        {/* Title, recipient & course */}
        <div className="flex flex-col items-center gap-1">
          <p
            className={cn(
              'font-semibold uppercase text-slate-500',
              isPreview ? 'text-[9px] tracking-[0.25em]' : 'text-xs tracking-[0.3em] md:text-sm'
            )}
          >
            {labels.certificateOfCompletion}
          </p>

          <div className={cn('flex items-center', isPreview ? 'my-1 gap-1.5' : 'my-2 gap-2')}>
            <span className={cn('rounded-full bg-amber-400', isPreview ? 'h-1 w-1' : 'h-1.5 w-1.5')} />
            <span className={cn('h-px bg-orange-400', isPreview ? 'w-6' : 'w-10 md:w-14')} />
            <span className={cn('rotate-45 border border-amber-500 bg-orange-500', isPreview ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5')} />
            <span className={cn('h-px bg-orange-400', isPreview ? 'w-6' : 'w-10 md:w-14')} />
            <span className={cn('rounded-full bg-amber-400', isPreview ? 'h-1 w-1' : 'h-1.5 w-1.5')} />
          </div>

          <p className={cn('text-slate-500', isPreview ? 'text-[10px]' : 'text-sm md:text-base')}>
            {labels.presentedTo}
          </p>
          <p
            className={cn(
              'font-bold text-slate-900',
              isPreview ? 'text-lg' : 'text-3xl md:text-5xl'
            )}
          >
            {studentName}
          </p>
          <span
            className={cn(
              'mt-1 rounded bg-orange-500/70',
              isPreview ? 'h-0.5 w-16' : 'h-0.5 w-24 md:w-28'
            )}
          />

          <p
            className={cn(
              'mt-2 text-slate-500',
              isPreview ? 'text-[10px]' : 'text-sm md:text-base'
            )}
          >
            {labels.forCompleting}
          </p>
          <span
            className={cn(
              'mt-1 inline-block rounded-md border border-amber-300 bg-orange-50/80 font-semibold text-orange-700',
              isPreview ? 'px-2 py-0.5 text-sm' : 'px-4 py-1.5 text-lg md:text-2xl'
            )}
          >
            {courseTitle}
          </span>
        </div>

        {/* Signatures & verification */}
        <div className="flex w-full flex-col items-center gap-2">
          <div
            className={cn(
              'flex w-full items-end justify-between',
              isPreview ? 'gap-4 px-2' : 'gap-8 px-2 md:px-6'
            )}
          >
            <div className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  'font-medium text-slate-800',
                  isPreview ? 'text-[10px]' : 'text-xs md:text-sm'
                )}
              >
                {instructorName}
              </span>
              <span className="h-px w-full max-w-[150px] bg-slate-300" />
              <span
                className={cn(
                  'uppercase tracking-wide text-slate-400',
                  isPreview ? 'text-[8px]' : 'text-[10px] md:text-xs'
                )}
              >
                {labels.instructor}
              </span>
            </div>

            {!isPreview && (
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center self-center">
                <div className="absolute inset-0 rounded-full border-2 border-amber-400" />
                <div className="absolute inset-[3px] rounded-full border border-dashed border-orange-400" />
                <Star className="h-5 w-5 fill-orange-500 text-orange-500" />
              </div>
            )}

            <div className="flex flex-1 flex-col items-center gap-1">
              <span
                className={cn(
                  'num-en font-medium text-slate-800',
                  isPreview ? 'text-[10px]' : 'text-xs md:text-sm'
                )}
              >
                {issuedDate}
              </span>
              <span className="h-px w-full max-w-[150px] bg-slate-300" />
              <span
                className={cn(
                  'uppercase tracking-wide text-slate-400',
                  isPreview ? 'text-[8px]' : 'text-[10px] md:text-xs'
                )}
              >
                {labels.issuedOn}
              </span>
            </div>
          </div>

          <p
            className={cn(
              'font-mono num-en text-slate-500',
              isPreview ? 'text-[8px]' : 'text-[10px] md:text-xs'
            )}
          >
            {labels.verificationCode}: {verificationCode}
          </p>

          {!isPreview && (
            <div className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-xs md:text-sm">{labels.authenticCertificate}</span>
            </div>
          )}

          {verifyUrl && !isPreview && (
            <p className="num-en max-w-full truncate text-[10px] text-slate-400 md:text-xs">
              {verifyUrl}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
