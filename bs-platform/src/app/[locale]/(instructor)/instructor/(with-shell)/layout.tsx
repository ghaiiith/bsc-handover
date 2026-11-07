import { getLocale } from 'next-intl/server'
import InstructorShell from '@/components/instructor/InstructorShell'

export default async function InstructorShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  return <InstructorShell locale={locale}>{children}</InstructorShell>
}
