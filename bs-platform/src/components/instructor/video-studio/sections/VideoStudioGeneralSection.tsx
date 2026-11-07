'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useVideoStudio } from '@/components/instructor/video-studio/VideoStudioProvider'
import VideoStudioField from '@/components/instructor/video-studio/shared/VideoStudioField'
import VideoStudioStatusBadge from '@/components/instructor/video-studio/shared/VideoStudioStatusBadge'
import {
  formatStudioBytes,
  formatStudioDate,
  formatStudioDuration,
  formatStudioProviderLabel,
} from '@/lib/video-studio/format'

export default function VideoStudioGeneralSection() {
  const t = useTranslations('studio.video_studio')
  const { payload, generalDraft, setGeneralDraft, locale } = useVideoStudio()
  const asset = payload?.asset

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{t('section_general_title')}</h3>
        <p className="text-sm text-muted-foreground">{t('section_general_desc')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('field_display_title')}</Label>
          <Input
            value={generalDraft.displayTitle}
            onChange={(e) =>
              setGeneralDraft({ ...generalDraft, displayTitle: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>{t('field_internal_name')}</Label>
          <Input
            value={generalDraft.internalName}
            onChange={(e) =>
              setGeneralDraft({ ...generalDraft, internalName: e.target.value })
            }
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>{t('field_description')}</Label>
          <Textarea
            rows={4}
            value={generalDraft.description}
            onChange={(e) =>
              setGeneralDraft({ ...generalDraft, description: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>{t('field_visibility')}</Label>
          <Select
            value={generalDraft.visibility}
            onValueChange={(v) => {
              if (v) setGeneralDraft({ ...generalDraft, visibility: v as typeof generalDraft.visibility })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">{t('visibility_private')}</SelectItem>
              <SelectItem value="enrolled">{t('visibility_enrolled')}</SelectItem>
              <SelectItem value="preview">{t('visibility_preview')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('field_language')}</Label>
          <Select
            value={generalDraft.language}
            onValueChange={(v) => {
              if (v) setGeneralDraft({ ...generalDraft, language: v })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/20 p-4">
        <h4 className="mb-4 text-sm font-semibold">{t('technical_metadata')}</h4>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <VideoStudioField
            label={t('header_duration')}
            value={formatStudioDuration(asset?.durationSeconds)}
          />
          <VideoStudioField
            label={t('header_resolution')}
            value={asset?.resolution ?? '—'}
          />
          <VideoStudioField
            label={t('header_storage')}
            value={formatStudioBytes(asset?.fileSize)}
          />
          <VideoStudioField
            label={t('header_provider')}
            value={formatStudioProviderLabel(asset?.provider, asset?.providerDisplayName)}
          />
          <VideoStudioField
            label={t('field_status')}
            value={
              <VideoStudioStatusBadge
                status={asset?.providerProcessingStatus ?? asset?.status}
              />
            }
          />
          <VideoStudioField
            label={t('field_asset_id')}
            value={asset?.id ?? '—'}
            mono
          />
          <VideoStudioField
            label={t('field_created')}
            value={formatStudioDate(asset?.uploadedAt, locale)}
          />
          <VideoStudioField
            label={t('field_updated')}
            value={formatStudioDate(asset?.updatedAt, locale)}
          />
          <VideoStudioField
            label={t('header_version')}
            value={`v${asset?.providerVersion ?? 1}`}
          />
        </dl>
      </div>
    </div>
  )
}
