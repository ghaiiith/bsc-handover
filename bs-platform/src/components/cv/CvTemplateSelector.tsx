'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { CVTemplate } from '@/types/cv'

interface CvTemplateSelectorProps {
  templates: CVTemplate[]
  selected: string
  onChange: (templateId: string) => void
}

export default function CvTemplateSelector({
  templates,
  selected,
  onChange,
}: CvTemplateSelectorProps) {
  const t = useTranslations('cv')
  const list = templates.length ? templates : [{ id: 'default', name: 'Default' }]

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t('select_template')}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {list.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onChange(template.id)}
            className={cn(
              'shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
              selected === template.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50'
            )}
          >
            {template.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={template.thumbnail} alt="" className="h-8 w-12 object-cover rounded mb-1" />
            ) : null}
            {template.name}
          </button>
        ))}
      </div>
    </div>
  )
}
