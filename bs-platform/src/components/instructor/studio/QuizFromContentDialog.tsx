'use client'

import { useRef, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Sparkles, Upload, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createCourseQuiz } from '@/lib/courses/quiz-actions'

interface LessonOpt {
  id: string
  title: string
  title_ar: string | null
}

interface AiQuestion {
  question_ar: string
  question_en: string
  options_ar: string[]
  options_en: string[]
  correct_option_index: number
}

// Report BS-77: generate quizzes ONLY from instructor-provided content, review &
// edit them, then attach to an existing lesson.
export default function QuizFromContentDialog({
  courseId,
  lessons,
}: {
  courseId: string
  lessons: LessonOpt[]
}) {
  const t = useTranslations('studio.quizFromContent')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '')
  const [content, setContent] = useState('')
  const [count, setCount] = useState(5)
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false'>('multiple_choice')
  const [questions, setQuestions] = useState<AiQuestion[]>([])
  const [generating, setGenerating] = useState(false)
  const [saving, startSave] = useTransition()

  const readFile = (file: File) => {
    if (file.size > 1_000_000) {
      toast.error(t('file_too_large'))
      return
    }
    // Report BS-77: only text-like files can be read here — a PDF/DOCX would be
    // silently turned into binary garbage, so reject it with a clear message.
    const name = file.name.toLowerCase()
    const isText =
      file.type.startsWith('text/') ||
      ['.txt', '.md', '.markdown', '.csv'].some((ext) => name.endsWith(ext))
    if (!isText) {
      toast.error(t('unsupported_file'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => setContent(String(reader.result ?? '').slice(0, 20000))
    reader.readAsText(file)
  }

  const generate = async () => {
    if (content.trim().length < 50) {
      toast.error(t('content_too_short'))
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/instructor/ai/generate-quiz-from-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), count, questionType }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error === 'pro_required' ? t('pro_required') : t('generate_failed'))
        return
      }
      setQuestions((data.questions ?? []) as AiQuestion[])
      if (!data.questions?.length) toast.error(t('generate_failed'))
    } catch {
      toast.error(t('generate_failed'))
    } finally {
      setGenerating(false)
    }
  }

  const editQ = (i: number, patch: Partial<AiQuestion>) =>
    setQuestions((q) => q.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const editOpt = (qi: number, oi: number, val: string) =>
    setQuestions((q) =>
      q.map((x, j) => {
        if (j !== qi) return x
        const key = isAr ? 'options_ar' : 'options_en'
        const opts = [...x[key]]
        opts[oi] = val
        return { ...x, [key]: opts }
      })
    )

  const save = () => {
    if (!lessonId) {
      toast.error(t('pick_lesson'))
      return
    }
    if (questions.length === 0) return
    startSave(async () => {
      const lesson = lessons.find((l) => l.id === lessonId)
      const res = await createCourseQuiz(courseId, locale, {
        title: `${(isAr ? lesson?.title_ar : lesson?.title) || 'Quiz'} — Quiz`,
        lesson_id: lessonId,
        questions: questions.map((q) => ({
          question_text: (isAr ? q.question_ar : q.question_en).trim(),
          options: (isAr ? q.options_ar : q.options_en).map((o) => o.trim()),
          correct_index: q.correct_option_index,
        })),
      })
      if (res.success) {
        toast.success(t('saved'))
        setOpen(false)
        setQuestions([])
        setContent('')
      } else {
        toast.error(t('save_failed'))
      }
    })
  }

  return (
    <>
      <Button variant="outline" className="gap-1.5" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" />
        {t('trigger')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t('attach_to')}</Label>
              <Select value={lessonId} onValueChange={(v) => v && setLessonId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('pick_lesson')} />
                </SelectTrigger>
                <SelectContent>
                  {lessons.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {(isAr ? l.title_ar : l.title) || l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('question_type')}</Label>
              <Select
                value={questionType}
                onValueChange={(v) => v && setQuestionType(v as 'multiple_choice' | 'true_false')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">{t('type_multiple_choice')}</SelectItem>
                  <SelectItem value="true_false">{t('type_true_false')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('question_count')}</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t('content')}</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
              />
              <Button type="button" size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
                <Upload className="me-1 h-4 w-4" />
                {t('upload_file')}
              </Button>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('content_placeholder')}
              rows={6}
            />
          </div>

          <Button type="button" disabled={generating} onClick={generate} className="gap-1.5">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t('generate')}
          </Button>

          {questions.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-medium">{t('review')}</p>
              {questions.map((q, qi) => (
                <div key={qi} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <Input
                      value={isAr ? q.question_ar : q.question_en}
                      onChange={(e) =>
                        editQ(qi, isAr ? { question_ar: e.target.value } : { question_en: e.target.value })
                      }
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive"
                      onClick={() => setQuestions((x) => x.filter((_, j) => j !== qi))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {(isAr ? q.options_ar : q.options_en).map((opt, oi) => (
                    <label key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={q.correct_option_index === oi}
                        onChange={() => editQ(qi, { correct_option_index: oi })}
                      />
                      <Input value={opt} onChange={(e) => editOpt(qi, oi, e.target.value)} className="h-8 text-sm" />
                    </label>
                  ))}
                </div>
              ))}
              <Button type="button" disabled={saving} onClick={save} className="gap-1.5">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('save')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
      </Dialog>
    </>
  )
}
