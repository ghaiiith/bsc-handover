'use client'

import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SkillsTagInputProps {
  value: string[]
  onChange: (skills: string[]) => void
  max?: number
  placeholder?: string
  className?: string
}

function normalizeSkill(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export default function SkillsTagInput({
  value,
  onChange,
  max = 30,
  placeholder,
  className,
}: SkillsTagInputProps) {
  const [draft, setDraft] = useState('')

  const addSkill = (raw: string) => {
    const skill = normalizeSkill(raw)
    if (!skill || value.length >= max) return
    const exists = value.some((s) => s.toLowerCase() === skill.toLowerCase())
    if (exists) return
    onChange([...value, skill])
    setDraft('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addSkill(draft)
    }
    if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const removeSkill = (skill: string) => {
    onChange(value.filter((s) => s !== skill))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {value.map((skill) => (
          <Badge key={skill} variant="secondary" className="gap-1 pr-1 num-en">
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="rounded-full p-0.5 hover:bg-muted"
              aria-label={`Remove ${skill}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      {value.length < max && (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft && addSkill(draft)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}
