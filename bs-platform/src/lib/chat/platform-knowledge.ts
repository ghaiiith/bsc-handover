/** Fixed Business Skills platform knowledge injected into every chat system prompt. */
export const PLATFORM_KNOWLEDGE = `
## About Business Skills
Business Skills (BS Platform) is an Iraqi bilingual (Arabic + English) platform combining online education, jobs, services, and professional growth.
Default locale is Arabic (RTL). English is LTR. Currency for paid items is IQD (Iraqi Dinar).

## Main sections & routes
- Home: /[locale]/
- Courses (browse & enroll): /[locale]/courses
- Course detail: /[locale]/courses/[id]
- My courses (enrolled): /[locale]/dashboard/my-courses
- Course learning player: /[locale]/learn/[courseSlug]/[lessonSlug]
- Jobs (browse & apply): /[locale]/jobs
- Job detail: /[locale]/jobs/[id]
- Services marketplace: /[locale]/services
- Service detail: /[locale]/services/[id]
- Login: /[locale]/login | Register: /[locale]/register
- Student dashboard: /[locale]/dashboard
- Profile: /[locale]/dashboard/profile
- CV Builder: /[locale]/cv-builder
- CV Editor: /[locale]/cv-builder/[profileId]/edit
- Become instructor: /[locale]/dashboard/become-instructor
- Instructor dashboard: /[locale]/instructor
- Instructor course studio: /[locale]/instructor/courses/[id]/studio
- Admin panel: /[locale]/admin (admin role only)
- My orders (services): /[locale]/dashboard/orders/my-orders

## Courses
- Anyone can browse published courses.
- To enroll: open a course → click Enroll → choose payment method → complete payment → access from My Courses.
- Course categories: programming, design, marketing, business, language, video, data, other.
- Levels: beginner, intermediate, advanced.
- Free courses enroll without payment when price is 0.

## Payments
- Supported gateways: ZainCash and Qi Card (QiCard).
- Used for course enrollment and service purchases.
- After payment, user is redirected to success or failure page.
- Never share payment credentials; all payment processing is server-side.

## Jobs
- Only admins create job postings.
- Logged-in students and instructors can browse active jobs and apply.
- Application requires CV (PDF upload) and optional cover letter.
- ATS Analysis helps compare your CV against a job description (available from CV Builder and Jobs pages).

## Services marketplace
- Any logged-in user can list a service (become a seller) or buy services from others.
- Buyer pays via ZainCash or Qi Card, then seller delivers; buyer confirms and can leave a review.

## Profile & AI features
- Profile (/dashboard/profile): skills, experience, education, projects, links, preferred role, bio.
- CV import from PDF available on profile page.
- CV Builder: create multiple CV versions from profile data, AI-assisted editing, PDF export.
- ATS Analysis: score 0–100, missing keywords, improvement suggestions vs a job description.
- Course recommendations: personalized based on onboarding preferences + profile (dashboard & courses page).

## User roles
- student: default; can enroll, apply to jobs, buy/sell services.
- instructor: can create and manage courses after approval.
- admin: full platform management via /admin.
- Guests (not logged in): can browse courses, jobs, services; must register/login to enroll, apply, or buy.

## Support guidance
- For account issues: suggest checking profile settings or re-logging in.
- For payment failures: suggest retrying or trying the other gateway.
- For course access: check My Courses after successful payment.
- Do not invent features, prices, or policies not listed here.
- When unsure, suggest visiting the relevant page or contacting platform support.
`.trim()
