'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, GripVertical, Loader2, Save, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CvEditorTabs from '@/components/cv/CvEditorTabs'
import CvPreviewPanel from '@/components/cv/CvPreviewPanel'
import CvChatPanel from '@/components/cv/CvChatPanel'
import { CV_AUTOSAVE_MS } from '@/lib/cv/constants'
import { downloadCvPdf } from '@/lib/cv/cv-client-utils'
import { addSkillToFormData } from '@/lib/cv/ats-utils'
import { formDataToResumeInput } from '@/lib/cv/mappers'
import { useInterval } from '@/hooks/use-interval'
import type { CVFormData } from '@/types/cv'
import { toast } from 'sonner'

interface CvEditorClientProps {
  locale: string
  profileId?: string
  initialForm: CVFormData
  loadedFromProfile?: boolean
  source?: string
}

function formsEqual(a: CVFormData, b: CVFormData): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function CvEditorClient({
  locale,
  profileId: initialProfileId,
  initialForm,
  loadedFromProfile = false,
  source,
}: CvEditorClientProps) {
  const t = useTranslations('cv')
  const tChat = useTranslations('cv_chat')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profileId, setProfileId] = useState(initialProfileId)
  const [savedForm, setSavedForm] = useState(initialForm)
  const [form, setForm] = useState(initialForm)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [downloading, setDownloading] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [mobilePanel, setMobilePanel] = useState<'edit' | 'preview'>('edit')
  const [panelWidth, setPanelWidth] = useState(40)
  const dragging = useRef(false)
  const [pending, startTransition] = useTransition()
  const [showProfileBanner, setShowProfileBanner] = useState(loadedFromProfile)

  useEffect(() => {
    if (source !== 'import') return
    const raw = sessionStorage.getItem('cv-import-draft')
    if (!raw) return
    try {
      const imported = JSON.parse(raw) as CVFormData
      setForm(imported)
      setSavedForm(imported)
      setShowProfileBanner(true)
      sessionStorage.removeItem('cv-import-draft')
    } catch {
      /* ignore */
    }
  }, [source])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
      const next = new URLSearchParams(searchParams.toString())
      next.delete('tab')
      const qs = next.toString()
      const base = profileId
        ? `/${locale}/cv-builder/${profileId}/edit`
        : window.location.pathname
      router.replace(qs ? `${base}?${qs}` : base)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [chatOpen, setChatOpen] = useState(false)

  const isDirty = !formsEqual(form, savedForm)

  const patchForm = useCallback((patch: Partial<CVFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setSaveStatus('idle')
  }, [])

  const save = useCallback(async (): Promise<string | null> => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/cv/save', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, formData: form }),
      })
      const data = (await res.json()) as {
        profileId?: string
        error?: string
        profile?: { id: string }
      }

      if (!res.ok) {
        if (data.error === 'max_cvs_reached') {
          toast.error(t('max_cvs_reached'))
        } else {
          toast.error(t('pdf_error'))
        }
        setSaveStatus('idle')
        return null
      }

      const newId = data.profileId ?? data.profile?.id ?? profileId
      setSavedForm(form)
      setSaveStatus('saved')

      if (newId && !profileId) {
        setProfileId(newId)
        router.replace(`/${locale}/cv-builder/${newId}/edit`)
      }

      setTimeout(() => setSaveStatus('idle'), 2500)
      return newId ?? null
    } catch {
      toast.error(t('pdf_error'))
      setSaveStatus('idle')
      return null
    }
  }, [form, profileId, locale, router, t])

  useInterval(
    () => {
      if (isDirty) void save()
    },
    CV_AUTOSAVE_MS,
    isDirty
  )

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleDownload = async () => {
    let id = profileId
    if (!id || isDirty) {
      id = (await save()) ?? undefined
    }
    if (!id) return

    setDownloading(true)
    const result = await downloadCvPdf(id)
    setDownloading(false)

    if (result.ok) {
      toast.success(`${t('pdf_success')} ${t('signed_url_note')}`)
    } else if (result.error === 'timeout') {
      toast.error(t('export_timeout'))
    } else if (result.error === 'pro_required') {
      toast.error(t('pro_required'))
    } else {
      toast.error(t('pdf_error'))
    }
  }

  const handleTemplateChange = (templateId: string) => {
    patchForm({ settings: { ...form.settings, selectedTemplate: templateId } })
  }

  const onDividerMouseDown = () => {
    dragging.current = true
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const pct = (e.clientX / window.innerWidth) * 100
      setPanelWidth(Math.min(70, Math.max(25, pct)))
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const statusLabel = useMemo(() => {
    if (saveStatus === 'saving') return t('auto_saving')
    if (saveStatus === 'saved') return t('auto_saved')
    return null
  }, [saveStatus, t])

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="sticky top-16 z-30 flex items-center justify-between gap-3 border-b bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {statusLabel && (
            <>
              {saveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
              {saveStatus === 'saved' && <Check className="h-4 w-4 text-green-600" />}
              <span>{statusLabel}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={chatOpen ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setChatOpen((v) => !v)}
          >
            <Sparkles className="h-4 w-4" />
            {tChat('title')}
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-2"
            disabled={pending || saveStatus === 'saving'}
            onClick={() => startTransition(() => void save())}
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {showProfileBanner && (
        <div className="mx-4 mt-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm flex items-center justify-between">
          <span>{t('data_loaded_from_profile')}</span>
          <button type="button" className="text-muted-foreground" onClick={() => setShowProfileBanner(false)}>
            ×
          </button>
        </div>
      )}

      {/* Mobile tabs */}
      <div className="lg:hidden px-4 pt-4">
        <Tabs value={mobilePanel} onValueChange={(v) => setMobilePanel(v as 'edit' | 'preview')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">تعديل / Edit</TabsTrigger>
            <TabsTrigger value="preview">معاينة / Preview</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="hidden lg:flex flex-1 min-h-0">
        <div
          className="overflow-y-auto border-e p-4"
          style={{ width: `${panelWidth}%` }}
        >
          <CvEditorTabs
            form={form}
            onChange={patchForm}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        <div
          className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/30 flex items-center justify-center"
          onMouseDown={onDividerMouseDown}
          role="separator"
          aria-orientation="vertical"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 sticky top-32 self-start max-h-[calc(100vh-8rem)]">
          <CvPreviewPanel
            form={form}
            onTemplateChange={handleTemplateChange}
            onDownload={() => void handleDownload()}
            downloading={downloading}
          />
        </div>

        {/* AI chat editor (report BS-33) */}
        {chatOpen && (
          <div className="w-[340px] shrink-0 border-s p-3 sticky top-32 self-start max-h-[calc(100vh-8rem)]">
            <CvChatPanel form={form} onApply={(next) => { setForm(next); setSaveStatus('idle') }} />
          </div>
        )}
      </div>

      <div className="lg:hidden flex-1 p-4">
        {mobilePanel === 'edit' ? (
          <CvEditorTabs
            form={form}
            onChange={patchForm}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        ) : (
          <CvPreviewPanel
            form={form}
            onTemplateChange={handleTemplateChange}
            onDownload={() => void handleDownload()}
            downloading={downloading}
          />
        )}
      </div>
    </div>
  )
}
