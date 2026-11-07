import {
  Activity,
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  ListOrdered,
  Search,
  Settings,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  {
    key: 'operate',
    label: 'Operate',
    items: [
      { key: 'dashboard', href: '/', label: 'Overview', icon: LayoutDashboard },
      { key: 'courses', href: '/courses', label: 'Courses', icon: BookOpen },
    ],
  },
  {
    key: 'production',
    label: 'Production',
    items: [
      { key: 'queue', href: '/queue', label: 'Queue', icon: ListOrdered },
      { key: 'uploads', href: '/uploads', label: 'Uploads', icon: Upload },
      { key: 'activity', href: '/activity', label: 'Activity', icon: Activity },
    ],
  },
  {
    key: 'system',
    label: 'System',
    items: [{ key: 'settings', href: '/settings', label: 'Settings', icon: Settings }],
  },
]

interface AdminSidebarProps {
  activePath: string
  onNavigate: (path: string) => void
}

export function AdminSidebar({ activePath, onNavigate }: AdminSidebarProps) {
  return (
    <aside className="fixed inset-y-0 start-0 z-30 flex h-svh w-64 flex-col border-e border-sidebar-border bg-sidebar">
      <div className="shrink-0 border-b border-sidebar-border p-4">
        <p className="text-lg font-bold text-sidebar-foreground">EduWork</p>
        <p className="text-xs text-muted-foreground">BS Platform Studio</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.key}>
            <div className="mb-1 flex w-full items-center justify-between px-3 py-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active =
                  item.href === '/'
                    ? activePath === '/'
                    : activePath.startsWith(item.href)
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavigate(item.href)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-start">{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  )
}

export function AdminHeader({
  title,
  sessionName,
  onSearch,
  onLogout,
}: {
  title: string
  sessionName: string
  onSearch: () => void
  onLogout: () => void
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <h2 className="text-sm font-semibold capitalize">{title}</h2>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSearch}
          className="flex items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <Search className="h-4 w-4" />
          Search…
        </button>
        <span className="hidden text-sm text-muted-foreground sm:inline">{sessionName}</span>
        <button
          type="button"
          onClick={onLogout}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
