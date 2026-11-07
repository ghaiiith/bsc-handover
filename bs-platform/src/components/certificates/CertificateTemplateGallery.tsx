'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import CertificateTemplate from '@/components/certificates/CertificateTemplate'

interface CertificateTemplateGalleryProps {
  courseTitle: string
  instructorName: string
  previewDate: string
  labels: {
    certificateOfCompletion: string
    presentedTo: string
    forCompleting: string
    instructor: string
    issuedOn: string
    verificationCode: string
    authenticCertificate: string
    previewBadge: string
  }
}

const TEMPLATES = [
  { id: 'classic', nameKey: 'template_classic' as const },
  { id: 'modern', nameKey: 'template_modern' as const },
] as const

export default function CertificateTemplateGallery({
  courseTitle,
  instructorName,
  previewDate,
  labels,
}: CertificateTemplateGalleryProps) {
  const t = useTranslations('studio.certificates')
  const [selected, setSelected] = useState<string>('classic')

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{t('templates_title')}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t('templates_desc')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((template) => {
          const isSelected = selected === template.id
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelected(template.id)}
              className={cn(
                'group relative overflow-hidden rounded-xl border-2 bg-card text-start transition-all hover:shadow-md',
                isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
              )}
            >
              <div className="pointer-events-none scale-[0.45] origin-top-left h-[200px] w-[220%] overflow-hidden p-2">
                <CertificateTemplate
                  variant="preview"
                  studentName={t('preview_student_name')}
                  courseTitle={courseTitle}
                  instructorName={instructorName}
                  issuedDate={previewDate}
                  verificationCode="EDU-PREVIEW"
                  labels={labels}
                />
              </div>
              <div className="flex items-center justify-between border-t px-3 py-2">
                <span className="text-sm font-medium">{t(template.nameKey)}</span>
                {isSelected ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                )}
              </div>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t('templates_note')}</p>
    </section>
  )
}
