import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { ChatLocale } from '@/lib/chat/chat-schemas'
import type { ChatUserRole } from '@/types/chat'
import { getCompanyEntitlements } from '@/lib/subscription/entitlements'

/**
 * Reports BS-95 / BS-96: the instructor and company assistants answered like
 * the student chatbot.
 *
 * The cause is structural. `buildSystemPrompt` already carries a per-role
 * briefing, but it only reaches the Anthropic provider — which production has
 * no key for. Every turn therefore fell through to the learning_assistant
 * service, and that service is student-shaped: it takes a course catalog and a
 * job list and answers "what should I learn / where should I apply".
 *
 * So the role has to be expressed in the payload itself. This module builds a
 * short, factual brief of the caller's OWN workspace — an instructor's courses,
 * a company's jobs and applicants — which is prepended to the question, and it
 * decides whether the student catalog/jobs should be attached at all.
 */

export interface RoleWorkspace {
  /** Prepended to the user's question so the answer is scoped to their role. */
  brief: string
  /** Only students get the course catalog and job board as recommendation inputs. */
  includeStudentContext: boolean
}

const LIMIT = 8

function line(ar: string, en: string, locale: ChatLocale): string {
  return locale === 'ar' ? ar : en
}

async function instructorWorkspace(
  userId: string,
  locale: ChatLocale
): Promise<string> {
  const admin = createAdminClient()
  const { data: courses } = await admin
    .from('courses')
    .select('title, title_ar, status, price')
    .eq('instructor_id', userId)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  const rows = courses ?? []
  const published = rows.filter((c) => c.status === 'published').length

  const titles = rows
    .map((c) => `${(locale === 'ar' ? c.title_ar : c.title) || c.title} (${c.status})`)
    .join(' | ')

  return [
    line(
      'أنت مساعد المدرّب داخل منصة Business Skills. المستخدم مدرّب، مو طالب.',
      'You are the instructor assistant inside the Business Skills platform. The user is an instructor, not a student.',
      locale
    ),
    line(
      `عدد كورساته: ${rows.length} (منشور: ${published}).`,
      `Their courses: ${rows.length} (published: ${published}).`,
      locale
    ),
    titles
      ? line(`كورساته: ${titles}.`, `Their courses: ${titles}.`, locale)
      : line('ما عنده كورسات بعد.', 'They have no courses yet.', locale),
    line(
      'جاوب عن إنشاء الكورسات وإدارتها، الاستوديو، الدروس والاختبارات، التسعير، الموافقات، والأرباح. لا ترشّح له كورسات ليدرسها ولا وظائف ليقدّم عليها.',
      'Answer about authoring and managing courses, the studio, lessons and quizzes, pricing, approvals, and earnings. Do NOT recommend courses for them to take or jobs to apply to.',
      locale
    ),
  ].join('\n')
}

/**
 * Round 9 (BS-109): the Free plan gets the LIMITED assistant — general help
 * about the platform and the company's own settings, but no job-level data and
 * no candidate filtering. That data (and the HR chatbot) is a paid feature.
 */
function limitedCompanyWorkspace(locale: ChatLocale, planNameAr: string, planName: string): string {
  return [
    line(
      `أنت مساعد الشركة داخل منصة Business Skills. المستخدم ممثّل شركة على الباقة ${planNameAr}.`,
      `You are the company assistant inside the Business Skills platform. The user is a company representative on the ${planName} plan.`,
      locale
    ),
    line(
      'جاوب عن استخدام المنصة: نشر الوظائف، ملف الشركة والتوثيق، الباقات والترقية، والدعم. ما عندك وصول لبيانات وظائفه أو متقدميه بهذه الباقة — إذا سأل عن المتقدمين أو الترشيح أو التصفية، وضّح بلطف إن هذي ميزة الباقة الاحترافية واقترح الترقية من /dashboard/subscription.',
      'Answer about using the platform: posting jobs, the company profile and verification, plans and upgrading, and support. You have NO access to their job or applicant data on this plan — if asked about applicants, matching, or filtering, explain kindly that this is a Professional-plan feature and suggest upgrading at /dashboard/subscription.',
      locale
    ),
    line(
      'لا ترشّح له كورسات ليدرسها ولا وظائف ليقدّم عليها.',
      'Do NOT recommend courses for them to take or jobs to apply to.',
      locale
    ),
  ].join('\n')
}

async function companyWorkspace(userId: string, locale: ChatLocale): Promise<string> {
  // Plan gate first (BS-106/109): server-side, so interface text cannot widen it.
  const ent = await getCompanyEntitlements(userId)
  if (ent.features.ai_chatbot !== 'full') {
    return limitedCompanyWorkspace(locale, ent.planNameAr, ent.planName)
  }

  const admin = createAdminClient()
  const { data: jobs } = await admin
    .from('jobs')
    .select('id, title, title_ar, status')
    .eq('posted_by', userId)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  const rows = jobs ?? []
  const active = rows.filter((j) => j.status === 'active').length

  let applicants = 0
  if (rows.length > 0) {
    const { count } = await admin
      .from('job_applications')
      .select('id', { count: 'exact', head: true })
      .in(
        'job_id',
        rows.map((j) => j.id as string)
      )
    applicants = count ?? 0
  }

  const titles = rows
    .map((j) => `${(locale === 'ar' ? j.title_ar : j.title) || j.title} (${j.status})`)
    .join(' | ')

  return [
    line(
      'أنت مساعد الشركة داخل منصة Business Skills. المستخدم ممثّل شركة (صاحب عمل)، مو طالب.',
      'You are the company assistant inside the Business Skills platform. The user is a company representative (an employer), not a student.',
      locale
    ),
    line(
      `وظائفه المنشورة: ${rows.length} (نشطة: ${active}). إجمالي المتقدمين: ${applicants}.`,
      `Their posted jobs: ${rows.length} (active: ${active}). Total applicants: ${applicants}.`,
      locale
    ),
    titles
      ? line(`وظائفه: ${titles}.`, `Their jobs: ${titles}.`, locale)
      : line('ما نشر ولا وظيفة بعد.', 'They have not posted any job yet.', locale),
    line(
      'جاوب عن نشر الوظائف وتعديلها، مراجعة المتقدمين والتواصل معهم، ملف الشركة والتوثيق، الباقات والاشتراك، وأكاديمية الشركات. لا ترشّح له كورسات ليدرسها ولا وظائف ليقدّم عليها.',
      'Answer about posting and editing jobs, reviewing and contacting applicants, the company profile and verification, plans and subscription, and the company academy. Do NOT recommend courses for them to take or jobs to apply to.',
      locale
    ),
  ].join('\n')
}

function adminWorkspace(locale: ChatLocale): string {
  return line(
    'أنت مساعد الأدمن داخل منصة Business Skills. جاوب عن إدارة المستخدمين والكورسات والوظائف والمدفوعات والإعدادات من لوحة /admin. لا ترشّح كورسات أو وظائف شخصية.',
    'You are the admin assistant inside the Business Skills platform. Answer about managing users, courses, jobs, payments, and settings from the /admin dashboard. Do not give personal course or job recommendations.',
    locale
  )
}

function freelancerWorkspace(locale: ChatLocale): string {
  return line(
    'أنت مساعد المستقل داخل منصة Business Skills. جاوب عن إنشاء الخدمات وإدارتها، الطلبات الواردة، الأرباح، والبورتفوليو.',
    'You are the freelancer assistant inside the Business Skills platform. Answer about creating and managing service listings, incoming orders, earnings, and the portfolio.',
    locale
  )
}

/** Build the role brief for a chat turn. Never throws — falls back to student. */
export async function buildRoleWorkspace(
  userId: string,
  role: ChatUserRole,
  locale: ChatLocale
): Promise<RoleWorkspace> {
  try {
    switch (role) {
      case 'instructor':
        return { brief: await instructorWorkspace(userId, locale), includeStudentContext: false }
      case 'company':
        return { brief: await companyWorkspace(userId, locale), includeStudentContext: false }
      case 'admin':
        return { brief: adminWorkspace(locale), includeStudentContext: false }
      case 'freelancer':
        return { brief: freelancerWorkspace(locale), includeStudentContext: false }
      default:
        return { brief: '', includeStudentContext: true }
    }
  } catch (err) {
    console.error('[role-workspace] build failed, using student context:', err)
    return { brief: '', includeStudentContext: true }
  }
}

/** Frame the question with the role brief, keeping the user's words last. */
export function applyRoleBrief(message: string, brief: string): string {
  if (!brief.trim()) return message
  return `${brief}\n\n---\n${message}`
}
