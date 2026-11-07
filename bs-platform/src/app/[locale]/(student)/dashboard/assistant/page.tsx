import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { Sparkles } from 'lucide-react'
import { getSessionProfile } from '@/lib/auth/profile'
import { isLearningAssistantConfigured } from '@/lib/ai/learning-assistant-server'
import LearningAssistantPanel from '@/components/assistant/LearningAssistantPanel'

// Integration: student Learning Assistant (Computiq learning_assistant).
export default async function AssistantPage() {
  const locale = await getLocale()
  const t = await getTranslations('assistant')
  const session = await getSessionProfile()
  if (!session) redirect(`/${locale}/login`)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>
      {isLearningAssistantConfigured() ? (
        <LearningAssistantPanel />
      ) : (
        <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          {t('unavailable')}
        </p>
      )}
    </div>
  )
}
