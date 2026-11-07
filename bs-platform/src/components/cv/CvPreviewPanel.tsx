'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CvTemplateSelector from '@/components/cv/CvTemplateSelector'
import type { CVFormData, CVTemplate } from '@/types/cv'

interface CvPreviewPanelProps {
  form: CVFormData
  onTemplateChange: (templateId: string) => void
  onDownload: () => void
  downloading: boolean
}

export default function CvPreviewPanel({
  form,
  onTemplateChange,
  onDownload,
  downloading,
}: CvPreviewPanelProps) {
  const t = useTranslations('cv')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [templates, setTemplates] = useState<CVTemplate[]>([])

  useEffect(() => {
    void fetch('/api/cv/templates')
      .then((r) => r.json())
      .then((data: { templates?: CVTemplate[] }) => {
        const list = data.templates ?? []
        setTemplates(list)
        if (list.length && form.settings.selectedTemplate === 'default') {
          onTemplateChange(list[0].id)
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshPdfPreview = async () => {
    setPdfLoading(true)
    setPdfError(null)
    try {
      const { formDataToResumeInput } = await import('@/lib/cv/mappers')
      const res = await fetch('/api/cv/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: formDataToResumeInput(form),
          template: form.settings.selectedTemplate,
        }),
      })
      const data = (await res.json()) as { pdfBase64?: string; error?: string }
      if (!res.ok || !data.pdfBase64) {
        setPdfError(data.error ?? 'pdf_error')
        return
      }
      const binary = atob(data.pdfBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })
    } catch {
      setPdfError('pdf_error')
    } finally {
      setPdfLoading(false)
    }
  }

  // Load the PDF preview once on mount — this is now the only preview (report BS-11).
  useEffect(() => {
    void refreshPdfPreview()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh the preview whenever the CV changes (form edits, AI generation,
  // or template switch) — no manual "refresh" needed. Debounced so it waits until
  // the changes settle (e.g. an AI edit finishes writing the whole CV) before it
  // regenerates, instead of rebuilding on every keystroke.
  const formKey = JSON.stringify({ data: form, tpl: form.settings.selectedTemplate })
  const skipFirstAutoRefresh = useRef(true)
  useEffect(() => {
    if (skipFirstAutoRefresh.current) {
      skipFirstAutoRefresh.current = false
      return
    }
    const timer = setTimeout(() => {
      void refreshPdfPreview()
    }, 1200)
    return () => clearTimeout(timer)
  }, [formKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const pdfErrorMessage =
    pdfError === 'missing_required_fields'
      ? t('pdf_missing_fields')
      : pdfError === 'cv_builder_not_configured'
        ? t('pdf_service_unavailable')
        : t('pdf_error')

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  return (
    <div className="flex flex-col h-full gap-3">
      <CvTemplateSelector
        templates={templates}
        selected={form.settings.selectedTemplate}
        onChange={onTemplateChange}
      />

      <Button
        type="button"
        className="w-full"
        onClick={onDownload}
        disabled={downloading}
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin me-2" />
            {t('generating_pdf')}
          </>
        ) : (
          t('download_pdf')
        )}
      </Button>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="mb-3 flex items-center justify-between shrink-0">
          <span className="text-sm font-medium text-muted-foreground">{t('pdf_preview')}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshPdfPreview()}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <RefreshCw className="h-4 w-4 me-2" />
            )}
            {t('refresh_preview')}
          </Button>
        </div>

        {pdfError && (
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-destructive">{pdfErrorMessage}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshPdfPreview()}>
              {t('refresh_preview')}
            </Button>
          </div>
        )}

        {!pdfError && !pdfUrl && pdfLoading && (
          <div className="flex-1 flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {pdfUrl && (
          <iframe
            src={pdfUrl}
            title="PDF Preview"
            className="flex-1 w-full min-h-[500px] border rounded-md bg-muted"
          />
        )}
      </div>
    </div>
  )
}
