'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Award, ExternalLink, FileText, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { submitFinalExamAnswer, ensureCompletionRecorded } from '@/lib/certificates/final-exam-actions'
import { uploadStudentExamAnswer } from '@/lib/storage/final-exam-upload'
import type { EnrollmentCertStatus } from '@/lib/certificates/enrollment-cert-status'
import { toast } from 'sonner'

interface CourseCertActionsProps {
  locale: string
  courseId: string
  courseTitle: string
  isComplete: boolean
  certStatus: EnrollmentCertStatus
}

export default function CourseCertActions({
  locale,
  courseId,
  courseTitle,
  isComplete,
  certStatus,
}: CourseCertActionsProps) {
  const t = useTranslations('certificates')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [examOpen, setExamOpen] = useState(false)
  const [answerFile, setAnswerFile] = useState<File | null>(null)

  useEffect(() => {
    if (isComplete && certStatus.certificateEnabled) {
      void ensureCompletionRecorded(courseId, locale)
    }
  }, [isComplete, certStatus.certificateEnabled, courseId, locale])

  if (!certStatus.certificateEnabled || !isComplete) {
    return null
  }

  if (certStatus.hasCertificate && certStatus.certificateCode) {
    return (
      <Link
        href={`/${locale}/certificate/${certStatus.certificateCode}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Award className="h-4 w-4" />
        {t('view_certificate')}
      </Link>
    )
  }

  if (!certStatus.finalExamRequired) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        {t('cert_processing')}
      </p>
    )
  }

  const submission = certStatus.examSubmission
  const status = submission?.status

  if (status === 'pending') {
    return (
      <Badge variant="secondary" className="w-full justify-center py-2">
        {t('exam_pending_review')}
      </Badge>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-destructive">{t('exam_rejected')}</p>
        {submission?.instructor_feedback && (
          <p className="text-xs text-muted-foreground">{submission.instructor_feedback}</p>
        )}
        <Button
          type="button"
          size="sm"
          className="w-full gap-2"
          onClick={() => setExamOpen(true)}
        >
          <Upload className="h-4 w-4" />
          {t('resubmit_exam')}
        </Button>
        <ExamSubmitDialog
          open={examOpen}
          onOpenChange={setExamOpen}
          courseId={courseId}
          courseTitle={courseTitle}
          answerFile={answerFile}
          setAnswerFile={setAnswerFile}
          pending={pending}
          onSubmit={() => {
            if (!answerFile) return
            startTransition(async () => {
              const { path, error } = await uploadStudentExamAnswer(courseId, answerFile)
              if (!path) {
                toast.error(t(`upload_error_${error}` as 'upload_error_invalid_type'))
                return
              }
              const result = await submitFinalExamAnswer(
                courseId,
                locale,
                path,
                answerFile.name
              )
              if (!result.success) {
                toast.error(t(`submit_error_${result.error}` as 'submit_error'))
                return
              }
              toast.success(t('exam_submitted'))
              setExamOpen(false)
              setAnswerFile(null)
              router.refresh()
            })
          }}
        />
      </div>
    )
  }

  if (status === 'approved' && !certStatus.hasCertificate) {
    return (
      <p className="text-xs text-muted-foreground text-center">{t('cert_processing')}</p>
    )
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="w-full gap-2"
        onClick={() => setExamOpen(true)}
      >
        <FileText className="h-4 w-4" />
        {t('take_final_exam')}
      </Button>
      <ExamSubmitDialog
        open={examOpen}
        onOpenChange={setExamOpen}
        courseId={courseId}
        courseTitle={courseTitle}
        answerFile={answerFile}
        setAnswerFile={setAnswerFile}
        pending={pending}
        onSubmit={() => {
          if (!answerFile) return
          startTransition(async () => {
            const { path, error } = await uploadStudentExamAnswer(courseId, answerFile)
            if (!path) {
              toast.error(t(`upload_error_${error}` as 'upload_error_invalid_type'))
              return
            }
            const result = await submitFinalExamAnswer(
              courseId,
              locale,
              path,
              answerFile.name
            )
            if (!result.success) {
              toast.error(t(`submit_error_${result.error}` as 'submit_error'))
              return
            }
            toast.success(t('exam_submitted'))
            setExamOpen(false)
            setAnswerFile(null)
            router.refresh()
          })
        }}
      />
    </>
  )
}

export function ExamSubmitDialog({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  answerFile,
  setAnswerFile,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  courseId: string
  courseTitle: string
  answerFile: File | null
  setAnswerFile: (f: File | null) => void
  pending: boolean
  onSubmit: () => void
}) {
  const t = useTranslations('certificates')

  const openExamPdf = async () => {
    const res = await fetch(
      `/api/certificates/exam-file?courseId=${courseId}&type=material`
    )
    const data = (await res.json()) as { url?: string }
    if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer')
    else toast.error(t('exam_pdf_error'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('final_exam_title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">{courseTitle}</p>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">{t('final_exam_instructions')}</p>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => void openExamPdf()}
          >
            <ExternalLink className="h-4 w-4" />
            {t('download_exam_pdf')}
          </Button>
          <div className="rounded-lg border border-dashed p-4 text-center">
            <label className="cursor-pointer text-sm">
              <Upload className="h-5 w-5 mx-auto mb-2 text-primary" />
              {t('upload_answer_pdf')}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setAnswerFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {answerFile && (
              <p className="text-xs text-muted-foreground mt-2 num-en">{answerFile.name}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t('pdf_only_hint')}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="button" disabled={!answerFile || pending} onClick={onSubmit}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('submit_exam')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
