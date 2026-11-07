import {
  Activity,
  BookOpen,
  Film,
  LayoutDashboard,
  ListOrdered,
  Settings,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
}

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'lessons', label: 'Lessons', icon: Film },
  { id: 'queue', label: 'Processing Queue', icon: ListOrdered },
  { id: 'uploads', label: 'Uploads', icon: Upload },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card/50">
      <div className="border-b border-border px-5 py-5">
        <p className="text-xs uppercase tracking-widest text-zinc-500">EduWork</p>
        <h1 className="text-lg font-semibold">BS Platform Studio</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              active === id
                ? 'bg-primary/15 text-white'
                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
