'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Download, Loader2, MoreVertical, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { downloadCvPdf } from '@/lib/cv/cv-client-utils'
import { formatRelativeTime } from '@/lib/format-relative-time'
import type { CVProfile } from '@/types/cv'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CvProfileCardProps {
  locale: string
  profile: CVProfile
  onUpdate: () => void
  allProfiles?: CVProfile[]
}

export default function CvProfileCard({ locale, profile, onUpdate, allProfiles }: CvProfileCardProps) {
  const t = useTranslations('cv')
  const [name, setName] = useState(profile.name)
  const [editingName, setEditingName] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [pending, startTransition] = useTransition()

  const saveName = () => {
    if (name.trim() === profile.name) {
      setEditingName(false)
      return
    }
    startTransition(async () => {
      await fetch('/api/cv/rename', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, name: name.trim() }),
      })
      setEditingName(false)
      onUpdate()
    })
  }

  // Report BS-101: one generic toast for every failure made the button look
  // random — the same user could succeed then fail with no explanation. Name
  // the reason, and offer a retry for the transient ones.
  const handleDownload = async () => {
    if (downloading) return
    setDownloading(true)
    const result = await downloadCvPdf(profile.id)
    setDownloading(false)

    if (result.ok) {
      toast.success(`${t('pdf_success')} ${t('signed_url_note')}`)
      onUpdate()
      return
    }

    if (result.error === 'pro_required') {
      toast.error(t('pdf_pro_required'))
      return
    }
    if (result.error === 'missing_required_fields') {
      toast.error(t('pdf_missing_fields'))
      return
    }
    if (result.error === 'cv_builder_not_configured') {
      toast.error(t('pdf_service_unavailable'))
      return
    }

    toast.error(result.error === 'timeout' ? t('pdf_timeout') : t('pdf_error'), {
      action: { label: t('retry'), onClick: () => void handleDownload() },
    })
  }

  const handleSetDefault = () => {
    startTransition(async () => {
      await fetch('/api/cv/set-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id }),
      })
      onUpdate()
    })
  }

  const handleDuplicate = () => {
    startTransition(async () => {
      const copyName =
        locale === 'ar' ? `نسخة من ${profile.name}` : `Copy of ${profile.name}`
      const res = await fetch('/api/cv/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, name: copyName }),
      })
      const data = (await res.json()) as { profile?: { id: string }; error?: string }
      if (!res.ok) {
        if (data.error === 'max_cvs_reached') toast.error(t('max_cvs_reached'))
        return
      }
      onUpdate()
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await fetch(`/api/cv/delete?profileId=${profile.id}`, { method: 'DELETE' })
      setDeleteOpen(false)
      onUpdate()
    })
  }

  return (
    <>
      <article className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <Input
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onBlur={() => saveName()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') {
                    setName(profile.name)
                    setEditingName(false)
                  }
                }}
                className="h-8 font-semibold"
              />
            ) : (
              <button
                type="button"
                className="font-semibold text-left truncate hover:text-primary flex items-center gap-1"
                onClick={() => setEditingName(true)}
              >
                {profile.name}
                <Pencil className="h-3 w-3 opacity-50" />
              </button>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary">
                {profile.language === 'ar' ? 'عربي' : 'English'}
              </Badge>
              {profile.is_default && (
                <Badge className="bg-primary/10 text-primary border-0">Default</Badge>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1 hover:bg-muted">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!profile.is_default && (
                <DropdownMenuItem onClick={handleSetDefault}>{t('set_default')}</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDuplicate}>{t('duplicate')}</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 num-en">
          <p>
            {t('last_edited')}: {formatRelativeTime(profile.updated_at, locale)}
          </p>
          <p>
            {t('last_generated')}:{' '}
            {profile.last_generated_at
              ? formatRelativeTime(profile.last_generated_at, locale)
              : t('never_exported')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/cv-builder/${profile.id}/edit`}
            className={cn(buttonVariants({ size: 'sm' }))}
          >
            Edit
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={downloading || pending}
            onClick={() => void handleDownload()}
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t('download_pdf')}
          </Button>
        </div>
      </article>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete_confirm')}</DialogTitle>
            <DialogDescription>{profile.name}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
