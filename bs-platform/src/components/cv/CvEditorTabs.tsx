'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProfileExperienceSection from '@/components/profile/ProfileExperienceSection'
import ProfileEducationSection from '@/components/profile/ProfileEducationSection'
import ProfileProjectsSection from '@/components/profile/ProfileProjectsSection'
import CvPersonalInfoTab from '@/components/cv/CvPersonalInfoTab'
import CvSummaryTab from '@/components/cv/CvSummaryTab'
import CvSkillsTab from '@/components/cv/CvSkillsTab'
import CvSettingsTab from '@/components/cv/CvSettingsTab'
import { cvFormToProfileSlice } from '@/lib/cv/mappers'
import type { CVFormData } from '@/types/cv'
import type { ProfileFormState } from '@/types/profile'

interface CvEditorTabsProps {
  form: CVFormData
  onChange: (patch: Partial<CVFormData>) => void
  activeTab?: string
  onTabChange?: (tab: string) => void
}

export default function CvEditorTabs({
  form,
  onChange,
  activeTab,
  onTabChange,
}: CvEditorTabsProps) {
  const t = useTranslations('cv')
  const locale = useLocale()
  const profileSlice = cvFormToProfileSlice(form)

  const patchFromProfile = (patch: Partial<ProfileFormState>) => {
    const next: Partial<CVFormData> = {}
    if (patch.experience) next.experience = patch.experience
    if (patch.education) next.education = patch.education
    if (patch.projects) next.projects = patch.projects
    if (patch.skills) {
      next.skills = { groups: [{ name: '', skills: patch.skills }] }
    }
    onChange(next)
  }

  return (
    <Tabs
      value={activeTab ?? 'personal'}
      onValueChange={(v) => onTabChange?.(v)}
      className="w-full"
    >
      <TabsList className="flex w-full overflow-x-auto h-auto flex-wrap justify-start gap-1">
        <TabsTrigger value="personal">{t('personal_info')}</TabsTrigger>
        <TabsTrigger value="summary">{t('professional_summary')}</TabsTrigger>
        <TabsTrigger value="experience">{t('experience')}</TabsTrigger>
        <TabsTrigger value="education">{t('education')}</TabsTrigger>
        <TabsTrigger value="skills">{t('skills')}</TabsTrigger>
        <TabsTrigger value="projects">{t('projects')}</TabsTrigger>
        <TabsTrigger value="settings">{t('cv_settings')}</TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="mt-4">
        <CvPersonalInfoTab form={form} onChange={onChange} />
      </TabsContent>
      <TabsContent value="summary" className="mt-4">
        <CvSummaryTab form={form} onChange={onChange} />
      </TabsContent>
      <TabsContent value="experience" className="mt-4">
        <ProfileExperienceSection form={profileSlice} onChange={patchFromProfile} enableAiImprove />
      </TabsContent>
      <TabsContent value="education" className="mt-4">
        <ProfileEducationSection locale={locale} form={profileSlice} onChange={patchFromProfile} />
      </TabsContent>
      <TabsContent value="skills" className="mt-4">
        <CvSkillsTab form={form} onChange={onChange} />
      </TabsContent>
      <TabsContent value="projects" className="mt-4">
        <ProfileProjectsSection form={profileSlice} onChange={patchFromProfile} />
      </TabsContent>
      <TabsContent value="settings" className="mt-4">
        <CvSettingsTab form={form} onChange={onChange} />
      </TabsContent>
    </Tabs>
  )
}
