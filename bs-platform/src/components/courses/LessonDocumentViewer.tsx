'use client'

import { useTranslations } from 'next-intl'
import { Download, FileText } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LessonDocumentViewerProps {
  url: string
  title: string
  locale: string
  /** Taller layout for course preview modal */
  embedded?: boolean
}

export default function LessonDocumentViewer({
  url,
  title,
  embedded = false,
}: LessonDocumentViewerProps) {
  const t = useTranslations('courses')
  const isPdf = url.toLowerCase().includes('.pdf')

  return (
    <div
      className={cn(
        'overflow-hidden',
        embedded ? 'flex min-h-0 flex-1 flex-col bg-background' : 'rounded-xl border bg-card'
      )}
    >
      {isPdf ? (
        <iframe
          src={url}
          title={title}
          className={cn(
            'w-full border-0 bg-muted',
            embedded ? 'min-h-[min(72vh,780px)] flex-1' : 'aspect-[4/3]'
          )}
        />
      ) : (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-3 bg-muted/50 p-8',
            embedded ? 'min-h-[min(50vh,480px)] flex-1' : 'aspect-video'
          )}
        >
          <FileText className="size-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      )}
      <div
        className={cn(
          'flex flex-wrap gap-2 border-t p-4 shrink-0',
          embedded && 'bg-muted/20'
        )}
      >
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}
        >
          <Download className="size-4" />
          {t('download_pdf')}
        </a>
        {isPdf && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
          >
            <FileText className="size-4" />
            {t('open_pdf')}
          </a>
        )}
      </div>
    </div>
  )
}
