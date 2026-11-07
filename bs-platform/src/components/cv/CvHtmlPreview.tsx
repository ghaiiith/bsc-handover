'use client'

import { useTranslations } from 'next-intl'
import {
  formatExperienceDateRange,
  sortEducation,
  sortExperience,
} from '@/lib/profile/format-profile-dates'
import type { CVFormData } from '@/types/cv'
import { cn } from '@/lib/utils'

interface CvHtmlPreviewProps {
  form: CVFormData
  className?: string
}

export default function CvHtmlPreview({ form, className }: CvHtmlPreviewProps) {
  const t = useTranslations('cv')
  const isAr = form.settings.language === 'ar'
  const presentLabel = isAr ? 'Present' : 'Present'
  const flatSkills = form.skills.groups.flatMap((g) => g.skills).filter(Boolean)
  const groupedSkills = form.skills.groups.filter((g) => g.skills.length > 0)
  const hasGroups = groupedSkills.some((g) => g.name.trim())

  return (
    <article
      dir={isAr ? 'rtl' : 'ltr'}
      className={cn(
        'bg-white text-gray-900 shadow-lg rounded-sm p-8 min-h-[600px] text-sm leading-relaxed',
        isAr ? 'font-[Cairo,sans-serif]' : 'font-[Inter,sans-serif]',
        className
      )}
    >
      <header className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 num-en">{form.personalInfo.name || '—'}</h1>
        {form.personalInfo.headline && (
          <p className="text-primary/80 font-medium mt-1">{form.personalInfo.headline}</p>
        )}
        <div className={cn('flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-600 num-en', isAr && 'flex-row-reverse justify-end')}>
          {form.personalInfo.email && <span>{form.personalInfo.email}</span>}
          {form.personalInfo.phone && <span>{form.personalInfo.phone}</span>}
          {form.personalInfo.city && <span>{form.personalInfo.city}</span>}
        </div>
        <div className={cn('flex flex-wrap gap-3 mt-2 text-xs text-blue-700 num-en', isAr && 'flex-row-reverse justify-end')}>
          {form.personalInfo.linkedin && (
            <span>{form.personalInfo.linkedin.replace(/^https?:\/\//, '')}</span>
          )}
          {form.personalInfo.github && (
            <span>{form.personalInfo.github.replace(/^https?:\/\//, '')}</span>
          )}
          {form.personalInfo.website && (
            <span>{form.personalInfo.website.replace(/^https?:\/\//, '')}</span>
          )}
        </div>
      </header>

      {form.summary && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            {t('professional_summary')}
          </h2>
          <p className="text-gray-700 whitespace-pre-wrap">{form.summary}</p>
        </section>
      )}

      {form.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            {t('experience')}
          </h2>
          <div className="space-y-4">
            {sortExperience(form.experience).map((item) => (
              <div key={item.id}>
                <div className={cn('flex justify-between gap-4', isAr && 'flex-row-reverse')}>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-gray-600">{item.company}</p>
                  </div>
                  <p className="text-xs text-gray-500 whitespace-nowrap num-en">
                    {formatExperienceDateRange(
                      item.start_date,
                      item.end_date,
                      item.is_current,
                      presentLabel
                    )}
                  </p>
                </div>
                {item.description && (
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap text-xs">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {form.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            {t('education')}
          </h2>
          <div className="space-y-3">
            {sortEducation(form.education).map((item) => (
              <div key={item.id} className={cn('flex justify-between gap-4', isAr && 'flex-row-reverse')}>
                <div>
                  <p className="font-semibold">{item.institution}</p>
                  <p className="text-gray-600 text-xs">
                    {[item.degree, item.field].filter(Boolean).join(' — ')}
                  </p>
                </div>
                <p className="text-xs text-gray-500 num-en whitespace-nowrap">
                  {item.start_year}
                  {' — '}
                  {item.is_current ? presentLabel : item.end_year ?? ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {flatSkills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            {t('skills')}
          </h2>
          {hasGroups ? (
            <div className="space-y-2">
              {groupedSkills.map((group, i) => (
                <div key={i}>
                  {group.name.trim() && (
                    <p className="text-xs font-semibold text-gray-600 mb-1">{group.name}</p>
                  )}
                  <div className={cn('flex flex-wrap gap-1.5', isAr && 'flex-row-reverse')}>
                    {group.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={cn('flex flex-wrap gap-1.5', isAr && 'flex-row-reverse')}>
              {flatSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {form.projects.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            {t('projects')}
          </h2>
          <div className="space-y-3">
            {form.projects.map((item) => (
              <div key={item.id}>
                <p className="font-semibold">{item.name}</p>
                {item.description && (
                  <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{item.description}</p>
                )}
                {item.technologies.length > 0 && (
                  <div className={cn('flex flex-wrap gap-1 mt-1', isAr && 'flex-row-reverse')}>
                    {item.technologies.map((tech) => (
                      <span key={tech} className="text-[10px] text-gray-500 num-en">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
