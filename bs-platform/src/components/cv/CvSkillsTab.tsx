'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CVFormData, SkillGroup } from '@/types/cv'

interface CvSkillsTabProps {
  form: CVFormData
  onChange: (patch: Partial<CVFormData>) => void
}

function SkillInput({ onAdd }: { onAdd: (skill: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <Input
      value={value}
      placeholder="Type skill + Enter"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onAdd(value)
          setValue('')
        }
      }}
    />
  )
}

export default function CvSkillsTab({ form, onChange }: CvSkillsTabProps) {
  const t = useTranslations('cv')
  const groups = form.skills.groups

  const updateGroups = (next: SkillGroup[]) => {
    onChange({ skills: { groups: next } })
  }

  const addGroup = () => {
    updateGroups([...groups, { name: '', skills: [] }])
  }

  const updateGroup = (index: number, patch: Partial<SkillGroup>) => {
    updateGroups(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  const addSkill = (index: number, skill: string) => {
    const trimmed = skill.trim()
    if (!trimmed) return
    const group = groups[index]
    if (group.skills.includes(trimmed)) return
    updateGroup(index, { skills: [...group.skills, trimmed] })
  }

  const removeSkill = (groupIndex: number, skill: string) => {
    const group = groups[groupIndex]
    updateGroup(groupIndex, { skills: group.skills.filter((s) => s !== skill) })
  }

  return (
    <div className="space-y-6">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="rounded-lg border p-4 space-y-3">
          <div className="space-y-2">
            <Label>{t('skill_group_name')}</Label>
            <Input
              value={group.name}
              onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
              placeholder={t('skill_group_name')}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {group.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs"
              >
                {skill}
                <button type="button" onClick={() => removeSkill(groupIndex, skill)} aria-label="Remove">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <SkillInput onAdd={(s) => addSkill(groupIndex, s)} />
        </div>
      ))}

      <Button type="button" variant="outline" className="gap-2" onClick={addGroup}>
        <Plus className="h-4 w-4" />
        {t('add_skill_group')}
      </Button>
    </div>
  )
}
