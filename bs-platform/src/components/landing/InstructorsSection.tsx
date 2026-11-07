import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { BookOpen } from 'lucide-react'
import SectionHeader from '@/components/landing/SectionHeader'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatCount } from '@/lib/format-number'
import type { LandingInstructor } from '@/lib/landing/get-landing-data'

interface InstructorsSectionProps {
  instructors: LandingInstructor[]
}

export default async function InstructorsSection({ instructors }: InstructorsSectionProps) {
  const t = await getTranslations('landing.instructors')
  const locale = await getLocale()
  const isAr = locale === 'ar'

  return (
    <section id="instructors" className="py-20 md:py-28">
      <div className="container mx-auto max-w-7xl px-4">
        <SectionHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

        {instructors.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {instructors.map((instructor) => {
              const name = isAr
                ? instructor.full_name_ar ?? instructor.full_name
                : instructor.full_name

              return (
                <Link
                  key={instructor.id}
                  href={`/${locale}/courses`}
                  className="edu-card block p-6"
                >
                  <Avatar className="h-14 w-14 border-2 border-primary/20">
                    <AvatarImage src={instructor.avatar_url ?? ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="mt-4 font-semibold">{name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t('expertise')}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <BookOpen className="h-3 w-3" />
                      <span className="num-en">
                        {formatCount(instructor.courseCount)} {t('courses_label')}
                      </span>
                    </Badge>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        )}
      </div>
    </section>
  )
}
