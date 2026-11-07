export type FinalExamSubmissionStatus = 'pending' | 'approved' | 'rejected'
export type CertificateIssuedVia = 'auto_completion' | 'exam_approved'

export interface FinalExamSubmission {
  id: string
  course_id: string
  student_id: string
  answer_pdf_path: string
  answer_pdf_name?: string | null
  status: FinalExamSubmissionStatus
  instructor_feedback?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  submitted_at: string
  updated_at: string
}

export interface Certificate {
  id: string
  verification_code: string
  student_id: string
  course_id: string
  student_name: string
  student_name_ar?: string | null
  course_title: string
  course_title_ar: string
  instructor_name: string
  instructor_name_ar?: string | null
  issued_via: CertificateIssuedVia
  issued_at: string
}

export interface CertificateWithCourse extends Certificate {
  course_thumbnail_url?: string | null
  course_category?: string | null
}

export interface FinalExamSubmissionWithStudent extends FinalExamSubmission {
  student: {
    id: string
    full_name: string
    full_name_ar?: string | null
    email: string
    avatar_url?: string | null
  }
}
