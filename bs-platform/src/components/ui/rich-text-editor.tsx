'use client'

import { useEffect, useRef } from 'react'
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Underline as UnderlineIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  dir?: 'rtl' | 'ltr' | 'auto'
  rows?: number
  className?: string
}

const TOOLS = [
  { cmd: 'bold', icon: Bold, label: 'Bold' },
  { cmd: 'italic', icon: Italic, label: 'Italic' },
  { cmd: 'underline', icon: UnderlineIcon, label: 'Underline' },
  { cmd: 'formatBlock:h3', icon: Heading2, label: 'Heading' },
  { cmd: 'insertUnorderedList', icon: List, label: 'Bulleted list' },
  { cmd: 'insertOrderedList', icon: ListOrdered, label: 'Numbered list' },
  { cmd: 'formatBlock:blockquote', icon: Quote, label: 'Quote' },
] as const

/**
 * Small contentEditable editor for lesson notes (report BS-31). It has to
 * accept HTML written programmatically — the AI draft from BS-30 is pushed in
 * through `value` — so the DOM is synced from the prop whenever the incoming
 * HTML differs from what is currently rendered.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  dir = 'auto',
  rows = 10,
  className,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && el.innerHTML !== value) {
      el.innerHTML = value
    }
  }, [value])

  const exec = (cmd: string) => {
    const el = ref.current
    if (!el) return
    el.focus()
    const [command, arg] = cmd.split(':')
    document.execCommand(command, false, arg)
    onChange(el.innerHTML)
  }

  return (
    <div className={cn('rounded-lg border', className)}>
      <div className="flex flex-wrap items-center gap-1 border-b p-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.cmd}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(tool.cmd)}
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dir={dir}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        style={{ minHeight: `${rows * 1.6}rem` }}
        className="prose-sm max-w-none overflow-y-auto px-3 py-2 text-sm focus:outline-none [&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)] [&_blockquote]:border-s-2 [&_blockquote]:ps-3 [&_h3]:font-semibold [&_li]:ms-5 [&_ol]:list-decimal [&_ul]:list-disc"
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
    </div>
  )
}
