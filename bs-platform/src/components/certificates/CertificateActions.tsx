'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Download, Loader2, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { downloadCertificatePdf } from '@/lib/certificates/capture-certificate-pdf'

interface CertificateActionsProps {
  verifyUrl: string
  fileName: string
}

export default function CertificateActions({ verifyUrl, fileName }: CertificateActionsProps) {
  const t = useTranslations('certificates')
  const [qrOpen, setQrOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const qrRef = useRef<HTMLDivElement>(null)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl)
      toast.success(t('link_copied'))
    } catch {
      toast.error(t('copy_link_error'))
    }
  }

  const handleDownloadPdf = () => {
    const element = document.getElementById('certificate-document')
    if (!element) return

    startTransition(async () => {
      try {
        await downloadCertificatePdf(element, fileName)
      } catch (error) {
        console.error('[certificate-pdf]', error)
        toast.error(t('pdf_download_error'))
      }
    })
  }

  const handleDownloadQr = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const size = 512
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      URL.revokeObjectURL(url)
      const link = document.createElement('a')
      link.download = `${fileName}-qr.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="default"
          className="gap-2"
          disabled={pending}
          onClick={handleDownloadPdf}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {t('download_certificate_pdf')}
        </Button>
        <Button type="button" variant="outline" className="gap-2" onClick={() => void handleCopyLink()}>
          <Copy className="h-4 w-4" />
          {t('copy_certificate_link')}
        </Button>
        <Button type="button" variant="outline" className="gap-2" onClick={() => setQrOpen(true)}>
          <QrCode className="h-4 w-4" />
          {t('show_qr_code')}
        </Button>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('qr_title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div
              ref={qrRef}
              className="rounded-xl border bg-white p-4 shadow-sm"
            >
              <QRCodeSVG value={verifyUrl} size={200} level="M" includeMargin />
            </div>
            <p className="text-center text-xs text-muted-foreground break-all">{verifyUrl}</p>
            <Button type="button" variant="outline" className="gap-2" onClick={handleDownloadQr}>
              <Download className="h-4 w-4" />
              {t('download_qr_image')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
