'use client'

import { useEffect, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExamSubmitDialog } from '@/components/certificates/CourseCertActions'
import { submitFinalExamAnswer, ensureCompletionRecorded } from '@/lib/certificates/final-exam-actions'
import { uploadStudentExamAnswer } from '@/lib/storage/final-exam-upload'
import type { EnrollmentCertStatus } from '@/lib/certificates/enrollment-cert-status'
import { toast } from 'sonner'

interface LessonCurriculumCompletionProps {
  locale: string
  courseId: string
  courseTitle: string
  isCourseComplete: boolean
  certStatus: EnrollmentCertStatus | null
}

export default function LessonCurriculumCompletion({
  locale,
  courseId,
  courseTitle,
  isCourseComplete,
  certStatus,
}: LessonCurriculumCompletionProps) {
  const t = useTranslations('courses.learn')
  const tc = useTranslations('certificates')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [examOpen, setExamOpen] = useState(false)
  const [answerFile, setAnswerFile] = useState<File | null>(null)

  useEffect(() => {
    if (isCourseComplete && certStatus?.certificateEnabled) {
      void ensureCompletionRecorded(courseId, locale)
    }
  }, [isCourseComplete, certStatus?.certificateEnabled, courseId, locale])

  if (!certStatus?.certificateEnabled) {
    return null
  }

  const submission = certStatus.examSubmission
  const examStatus = submission?.status
  const hasCertificate = certStatus.hasCertificate && certStatus.certificateCode
  const examRequired = certStatus.finalExamRequired

  const handleExamSubmit = () => {
    if (!answerFile) return
    startTransition(async () => {
      const { path, error } = await uploadStudentExamAnswer(courseId, answerFile)
      if (!path) {
        toast.error(tc(`upload_error_${error}` as 'upload_error_invalid_type'))
        return
      }
      const result = await submitFinalExamAnswer(courseId, locale, path, answerFile.name)
      if (!result.success) {
        toast.error(tc(`submit_error_${result.error}` as 'submit_error'))
        return
      }
      toast.success(tc('exam_submitted'))
      setExamOpen(false)
      setAnswerFile(null)
      router.refresh()
    })
  }

  let examLabel = tc('take_final_exam')
  let examIcon = <FileText className="h-4 w-4 shrink-0" />
  let examAction: (() => void) | null = isCourseComplete ? () => setExamOpen(true) : null
  let examMuted = !isCourseComplete

  if (!examRequired) {
    examLabel = tc('no_exam_required')
    examIcon = <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
    examAction = null
    examMuted = true
  } else if (examStatus === 'pending') {
    examLabel = tc('exam_pending_review')
    examIcon = <Clock className="h-4 w-4 shrink-0 text-amber-600" />
    examAction = null
    examMuted = true
  } else if (examStatus === 'rejected') {
    examLabel = tc('resubmit_exam')
    examIcon = <XCircle className="h-4 w-4 shrink-0 text-destructive" />
    examAction = isCourseComplete ? () => setExamOpen(true) : null
  } else if (examStatus === 'approved') {
    examLabel = tc('exam_approved')
    examIcon = <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
    examAction = null
    examMuted = true
  }

  let certLabel = tc('view_certificate')
  let certIcon = <Award className="h-4 w-4 shrink-0" />
  const certHref: string | null = hasCertificate
    ? `/${locale}/certificate/${certStatus.certificateCode}`
    : null
  let certMuted = !hasCertificate

  if (!hasCertificate && isCourseComplete && !examRequired) {
    certLabel = tc('cert_processing')
    certIcon = <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
    certMuted = true
  } else if (!hasCertificate) {
    certLabel = isCourseComplete ? tc('certificate_locked_pending') : tc('certificate_locked')
    certIcon = <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
    certMuted = true
  }

  return (
    <div className="mb-2 border-t pt-3">
      <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
        {t('completion_section')}
      </p>
      <ul className="space-y-0.5">
        {examRequired && (
          <li>
            <CompletionRow
              icon={examIcon}
              label={examLabel}
              muted={examMuted}
              onClick={examAction}
            />
          </li>
        )}
        <li>
          {certHref ? (
            <Link
              href={certHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                'bg-amber-500/10 text-amber-800 hover:bg-amber-500/15 dark:text-amber-300'
              )}
            >
              {certIcon}
              <span className="flex-1 font-medium">{certLabel}</span>
            </Link>
          ) : (
            <CompletionRow icon={certIcon} label={certLabel} muted={certMuted} />
          )}
        </li>
      </ul>

      {examRequired && (
        <ExamSubmitDialog
          open={examOpen}
          onOpenChange={setExamOpen}
          courseId={courseId}
          courseTitle={courseTitle}
          answerFile={answerFile}
          setAnswerFile={setAnswerFile}
          pending={pending}
          onSubmit={handleExamSubmit}
        />
      )}
    </div>
  )
}

function CompletionRow({
  icon,
  label,
  muted,
  onClick,
}: {
  icon: ReactNode
  label: string
  muted?: boolean
  onClick?: (() => void) | null
}) {
  const className = cn(
    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-start transition-colors',
    muted
      ? 'text-muted-foreground'
      : 'hover:bg-amber-500/10 text-foreground font-medium cursor-pointer'
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {icon}
        <span className="flex-1">{label}</span>
      </button>
    )
  }

  return (
    <div className={className}>
      {icon}
      <span className="flex-1">{label}</span>
    </div>
  )
}
