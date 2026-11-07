'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, Download, ExternalLink, X, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EmptyState from '@/components/dashboard/ux/EmptyState'
import { reviewFinalExamSubmission } from '@/lib/certificates/final-exam-actions'
import { formatRelativeTime } from '@/lib/format-relative-time'
import type { InstructorCertificateRequest } from '@/lib/instructor/get-certificate-requests'
import { toast } from 'sonner'

interface InstructorCertificateRequestsClientProps {
  locale: string
  requests: InstructorCertificateRequest[]
}

export default function InstructorCertificateRequestsClient({
  locale,
  requests,
}: InstructorCertificateRequestsClientProps) {
  const t = useTranslations('instructor.certificate_requests')
  const ts = useTranslations('studio.certificates')
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({})
  const isAr = locale === 'ar'

  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const reviewedRequests = requests.filter((r) => r.status !== 'pending')

  const openAnswer = async (courseId: string, submissionId: string) => {
    const params = new URLSearchParams({
      courseId,
      type: 'answer',
      submissionId,
    })
    const res = await fetch(`/api/certificates/exam-file?${params}`)
    const data = (await res.json()) as { url?: string }
    if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer')
    else toast.error(ts('file_open_error'))
  }

  const handleReview = (
    submission: InstructorCertificateRequest,
    decision: 'approved' | 'rejected'
  ) => {
    startTransition(async () => {
      const result = await reviewFinalExamSubmission(
        submission.id,
        submission.course_id,
        locale,
        decision,
        feedbackById[submission.id]
      )
      if (!result.success) {
        toast.error(ts('review_error'))
        return
      }
      toast.success(
        decision === 'approved'
          ? result.certificateIssued
            ? ts('approved_with_cert')
            : ts('approved')
          : ts('rejected')
      )
      router.refresh()
    })
  }

  const renderRequest = (sub: InstructorCertificateRequest) => {
    const name = isAr
      ? sub.student.full_name_ar ?? sub.student.full_name
      : sub.student.full_name
    const courseTitle = isAr ? sub.course_title_ar : sub.course_title
    const initials = name?.charAt(0) ?? '?'

    return (
      <div key={sub.id} className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={sub.student.avatar_url ?? ''} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{sub.student.email}</p>
            <Link
              href={`/${locale}/instructor/courses/${sub.course_id}/studio/certificates`}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {courseTitle}
              <ExternalLink className="h-3 w-3" />
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  sub.status === 'approved'
                    ? 'default'
                    : sub.status === 'rejected'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {ts(`status_${sub.status}`)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(sub.submitted_at, locale)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 shrink-0"
            onClick={() => void openAnswer(sub.course_id, sub.id)}
          >
            <Download className="h-3.5 w-3.5" />
            {ts('view_answer')}
          </Button>
        </div>

        {sub.status === 'pending' && (
          <>
            <Textarea
              placeholder={ts('feedback_placeholder')}
              value={feedbackById[sub.id] ?? ''}
              onChange={(e) =>
                setFeedbackById((prev) => ({ ...prev, [sub.id]: e.target.value }))
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
                onClick={() => handleReview(sub, 'rejected')}
              >
                <X className="h-3.5 w-3.5" />
                {ts('reject')}
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1"
                disabled={pending}
                onClick={() => handleReview(sub, 'approved')}
              >
                <Check className="h-3.5 w-3.5" />
                {ts('approve')}
              </Button>
            </div>
          </>
        )}

        {sub.instructor_feedback && sub.status !== 'pending' && (
          <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-2">
            {sub.instructor_feedback}
          </p>
        )}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title={t('empty_title')}
        description={t('empty_desc')}
        action={{
          href: `/${locale}/instructor/courses`,
          label: t('empty_action'),
        }}
      />
    )
  }

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">
          {t('tab_pending')}
          {pendingRequests.length > 0 && (
            <Badge variant="secondary" className="ms-2 num-en">
              {pendingRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="all">{t('tab_all')}</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-4 space-y-3">
        {pendingRequests.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('no_pending')}</p>
        ) : (
          pendingRequests.map(renderRequest)
        )}
      </TabsContent>

      <TabsContent value="all" className="mt-4 space-y-3">
        {reviewedRequests.length === 0 && pendingRequests.length > 0 ? (
          <p className="text-sm text-muted-foreground">{t('only_pending')}</p>
        ) : (
          requests.map(renderRequest)
        )}
      </TabsContent>
    </Tabs>
  )
}
