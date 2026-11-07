'use client'

import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useVideoStudio } from '@/components/instructor/video-studio/VideoStudioProvider'
import type { VideoStudioChapter } from '@/types/video-studio'

function newChapter(duration: number): VideoStudioChapter {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    color: 'bg-violet-500',
    startSeconds: 0,
    endSeconds: Math.min(60, duration),
    visible: true,
  }
}

export default function VideoStudioChaptersSection() {
  const t = useTranslations('studio.video_studio')
  const { payload, chapters, setChapters } = useVideoStudio()
  const duration = payload?.asset?.durationSeconds ?? 300

  const addChapter = () => {
    setChapters([...chapters, newChapter(duration)])
  }

  const updateChapter = (id: string, patch: Partial<VideoStudioChapter>) => {
    setChapters(chapters.map((ch) => (ch.id === id ? { ...ch, ...patch } : ch)))
  }

  const removeChapter = (id: string) => {
    setChapters(chapters.filter((ch) => ch.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{t('section_chapters_title')}</h3>
          <p className="text-sm text-muted-foreground">{t('section_chapters_desc')}</p>
        </div>
        <Button type="button" size="sm" onClick={addChapter}>
          <Plus className="me-1.5 h-4 w-4" />
          {t('chapter_add')}
        </Button>
      </div>

      {chapters.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('chapters_empty')}
        </p>
      ) : (
        <div className="space-y-3">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="rounded-xl border bg-card p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  placeholder={t('chapter_title')}
                  value={chapter.title}
                  onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                />
                <Input
                  type="number"
                  min={0}
                  max={duration}
                  placeholder={t('chapter_start')}
                  value={chapter.startSeconds}
                  onChange={(e) =>
                    updateChapter(chapter.id, { startSeconds: Number(e.target.value) })
                  }
                />
                <Input
                  type="number"
                  min={0}
                  max={duration}
                  placeholder={t('chapter_end')}
                  value={chapter.endSeconds}
                  onChange={(e) =>
                    updateChapter(chapter.id, { endSeconds: Number(e.target.value) })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeChapter(chapter.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
