'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { FileCode2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createPortfolioTemplate,
  deletePortfolioTemplate,
  setPortfolioTemplateActive,
} from '@/lib/portfolio/portfolio-template-actions'
import { MAX_TEMPLATE_BYTES } from '@/lib/portfolio/template-sanitize'
import type { PortfolioTemplateSummary } from '@/lib/portfolio/portfolio-templates'

interface PortfolioTemplatesManagerProps {
  locale: string
  templates: PortfolioTemplateSummary[]
}

/** Report BS-35: upload and manage the HTML templates users pick from. */
export default function PortfolioTemplatesManager({
  locale,
  templates,
}: PortfolioTemplatesManagerProps) {
  const t = useTranslations('portfolio_templates')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [description, setDescription] = useState('')
  const [html, setHtml] = useState('')
  const [fileName, setFileName] = useState('')
  const isAr = locale === 'ar'

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_TEMPLATE_BYTES) {
      toast.error(t('too_large'))
      return
    }
    const text = await file.text()
    setHtml(text)
    setFileName(file.name)
    if (!name) setName(file.name.replace(/\.html?$/i, ''))
  }

  const submit = () => {
    startTransition(async () => {
      const result = await createPortfolioTemplate({
        name,
        name_ar: nameAr,
        description,
        html,
        locale,
      })
      if (result.error) {
        toast.error(result.error === 'template_too_large' ? t('too_large') : t('error_generic'))
        return
      }
      toast.success(t('uploaded'))
      setName('')
      setNameAr('')
      setDescription('')
      setHtml('')
      setFileName('')
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    })
  }

  const toggle = (id: string, active: boolean) => {
    startTransition(async () => {
      const result = await setPortfolioTemplateActive(id, active, locale)
      if (result.error) toast.error(t('error_generic'))
      router.refresh()
    })
  }

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await deletePortfolioTemplate(id, locale)
      if (result.error) toast.error(t('error_generic'))
      else toast.success(t('deleted'))
      router.refresh()
    })
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('upload_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('upload_hint')}</p>

          <div className="space-y-2">
            <Label>{t('html_file')}</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="me-2 h-4 w-4" />
                {t('choose_file')}
              </Button>
              {fileName && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <FileCode2 className="h-4 w-4" />
                  {fileName}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('name_en')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('name_ar')}</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{tCommon('description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">{t('variables')}</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
{`{{name}} {{headline}} {{bio}} {{location}} {{avatar_url}} {{available}}
{{skills_count}} {{projects_count}} {{courses_count}} {{certificates_count}}
{{#each skills}}<span>{{.}}</span>{{/each}}
{{#each experience}}<li>{{title}} — {{company}} ({{period}})<p>{{description}}</p></li>{{/each}}
{{#each education}}<li>{{degree}} — {{institution}} ({{period}})</li>{{/each}}
{{#each projects}}<li><a href="{{url}}">{{name}}</a> — {{description}}</li>{{/each}}
{{#each courses}}<li>{{title}} — {{instructor}}</li>{{/each}}
{{#each certificates}}<li>{{title}} ({{year}}) — {{code}}</li>{{/each}}
{{#each links}}<a href="{{url}}">{{label}}</a>{{/each}}
{{#if bio}} … {{else}} … {{/if}}`}
            </pre>
          </details>

          <Button disabled={isPending || !name.trim() || html.trim().length < 20} onClick={submit}>
            {t('upload_button')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('list_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          )}
          {templates.map((tpl) => (
            <div key={tpl.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {isAr ? tpl.name_ar || tpl.name : tpl.name}
                </p>
                {tpl.description && (
                  <p className="truncate text-xs text-muted-foreground">{tpl.description}</p>
                )}
              </div>
              <Switch
                checked={tpl.is_active}
                disabled={isPending}
                onCheckedChange={(checked) => toggle(tpl.id, checked)}
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={isPending}
                onClick={() => remove(tpl.id)}
                aria-label={tCommon('delete')}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
