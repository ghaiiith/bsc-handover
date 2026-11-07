'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Award,
  Check,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  saveCertificateSettings,
  reviewFinalExamSubmission,
} from '@/lib/certificates/final-exam-actions'
import { uploadInstructorExamPdf } from '@/lib/storage/final-exam-upload'
import CertificateTemplate from '@/components/certificates/CertificateTemplate'
import type { Course } from '@/types'
import type { FinalExamSubmissionWithStudent } from '@/types/certificate'
import { toast } from 'sonner'

interface StudioCertificatesClientProps {
  locale: string
  course: Course
  instructorName: string
  submissions: FinalExamSubmissionWithStudent[]
  issuedCount: number
}

export default function StudioCertificatesClient({
  locale,
  course,
  instructorName,
  submissions,
  issuedCount,
}: StudioCertificatesClientProps) {
  const t = useTranslations('studio.certificates')
  const tc = useTranslations('certificates')
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [certificateEnabled, setCertificateEnabled] = useState(
    course.certificate_enabled ?? false
  )
  const [finalExamRequired, setFinalExamRequired] = useState(
    course.final_exam_required ?? false
  )
  const [examPdfPath, setExamPdfPath] = useState(course.final_exam_pdf_path ?? '')
  const [examPdfName, setExamPdfName] = useState(course.final_exam_pdf_name ?? '')
  const [uploading, setUploading] = useState(false)
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({})

  const handleExamPdfUpload = async (file: File) => {
    setUploading(true)
    try {
      const { path, error } = await uploadInstructorExamPdf(course.id, file)
      if (!path) {
        toast.error(t(`upload_error_${error}` as 'upload_error_invalid_type'))
        return
      }
      setExamPdfPath(path)
      setExamPdfName(file.name)
      toast.success(t('exam_pdf_uploaded'))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveCertificateSettings(course.id, locale, {
        certificate_enabled: certificateEnabled,
        final_exam_required: finalExamRequired,
        final_exam_pdf_path: examPdfPath || null,
        final_exam_pdf_name: examPdfName || null,
      })
      if (!result.success) {
        if (result.error === 'exam_pdf_required') {
          toast.error(t('exam_pdf_required'))
        } else {
          toast.error(t('save_error'))
        }
        return
      }
      toast.success(t('saved'))
      router.refresh()
    })
  }

  const handleReview = (submissionId: string, decision: 'approved' | 'rejected') => {
    startTransition(async () => {
      const result = await reviewFinalExamSubmission(
        submissionId,
        course.id,
        locale,
        decision,
        feedbackById[submissionId]
      )
      if (!result.success) {
        toast.error(t('review_error'))
        return
      }
      toast.success(
        decision === 'approved'
          ? result.certificateIssued
            ? t('approved_with_cert')
            : t('approved')
          : t('rejected')
      )
      router.refresh()
    })
  }

  const openSignedUrl = async (type: 'material' | 'answer', submissionId?: string) => {
    const params = new URLSearchParams({ courseId: course.id, type })
    if (submissionId) params.set('submissionId', submissionId)
    const res = await fetch(`/api/certificates/exam-file?${params}`)
    const data = (await res.json()) as { url?: string }
    if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer')
    else toast.error(t('file_open_error'))
  }

  const pendingSubmissions = submissions.filter((s) => s.status === 'pending')
  const isAr = locale === 'ar'
  const courseTitle = isAr ? course.title_ar : course.title
  const previewDate = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-IQ' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="edu-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              {t('settings_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="font-medium text-sm">{t('auto_certificate')}</p>
                <p className="text-xs text-muted-foreground">{t('auto_hint')}</p>
              </div>
              <Switch checked={certificateEnabled} onCheckedChange={setCertificateEnabled} />
            </div>

            {certificateEnabled && (
              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <p className="font-medium text-sm">{t('final_exam_required')}</p>
                  <p className="text-xs text-muted-foreground">{t('final_exam_hint')}</p>
                </div>
                <Switch checked={finalExamRequired} onCheckedChange={setFinalExamRequired} />
              </div>
            )}

            {certificateEnabled && finalExamRequired && (
              <div className="space-y-3 rounded-lg border border-dashed p-4">
                <Label>{t('exam_pdf_label')}</Label>
                <p className="text-xs text-muted-foreground">{t('exam_pdf_desc')}</p>
                {examPdfName && (
                  <p className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {examPdfName}
                    {examPdfPath && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => void openSignedUrl('material')}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('view_pdf')}
                      </Button>
                    )}
                  </p>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {t('upload_exam_pdf')}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleExamPdfUpload(f)
                    }}
                  />
                </label>
              </div>
            )}

            {certificateEnabled && !finalExamRequired && (
              <p className="text-sm text-muted-foreground rounded-lg bg-muted/40 p-3">
                {t('instant_cert_hint')}
              </p>
            )}

            <Button onClick={handleSave} disabled={pending} className="gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t('save')}
            </Button>
          </CardContent>
        </Card>

        <Card className="edu-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base">{t('preview_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CertificateTemplate
              variant="preview"
              studentName={t('preview_student_name')}
              courseTitle={courseTitle}
              instructorName={instructorName || t('preview_instructor_fallback')}
              issuedDate={previewDate}
              verificationCode="EDU-XXXX-XXXX"
              labels={{
                certificateOfCompletion: tc('certificate_of_completion'),
                presentedTo: tc('presented_to'),
                forCompleting: tc('for_completing'),
                instructor: tc('instructor'),
                issuedOn: tc('issued_on'),
                verificationCode: tc('verification_code'),
                authenticCertificate: tc('authentic_certificate'),
                previewBadge: t('preview_badge'),
              }}
            />
            <p className="text-xs text-muted-foreground text-center">
              {t('preview_note')}
            </p>
            <p className="text-xs text-muted-foreground text-center num-en">
              {t('issued_count', { count: issuedCount })}
            </p>
          </CardContent>
        </Card>
      </div>

      {certificateEnabled && finalExamRequired && (
        <Card className="edu-card shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{t('submissions_title')}</span>
              {pendingSubmissions.length > 0 && (
                <Badge variant="secondary" className="num-en">
                  {pendingSubmissions.length} {t('pending')}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t('no_submissions')}
              </p>
            ) : (
              submissions.map((sub) => {
                const name = isAr
                  ? sub.student.full_name_ar ?? sub.student.full_name
                  : sub.student.full_name
                const initials = name?.charAt(0) ?? '?'
                return (
                  <div key={sub.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={sub.student.avatar_url ?? ''} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {sub.student.email}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge
                            variant={
                              sub.status === 'approved'
                                ? 'default'
                                : sub.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {t(`status_${sub.status}`)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {sub.answer_pdf_name ?? 'answer.pdf'}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1 shrink-0"
                        onClick={() => void openSignedUrl('answer', sub.id)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t('view_answer')}
                      </Button>
                    </div>

                    {sub.status === 'pending' && (
                      <>
                        <Textarea
                          placeholder={t('feedback_placeholder')}
                          value={feedbackById[sub.id] ?? ''}
                          onChange={(e) =>
                            setFeedbackById((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value,
                            }))
                          }
                          rows={2}
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={pending}
                            onClick={() => handleReview(sub.id, 'rejected')}
                          >
                            <X className="h-3.5 w-3.5" />
                            {t('reject')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1"
                            disabled={pending}
                            onClick={() => handleReview(sub.id, 'approved')}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {t('approve')}
                          </Button>
                        </div>
                      </>
                    )}

                    {sub.instructor_feedback && sub.status !== 'pending' && (
                      <p className="text-sm text-muted-foreground border-t pt-2">
                        {t('your_feedback')}: {sub.instructor_feedback}
                      </p>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
