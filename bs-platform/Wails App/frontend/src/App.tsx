import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AdminHeader, AdminSidebar } from '@/components/admin/AdminSidebar'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CoursesPage } from '@/pages/CoursesPage'
import { CourseEditorPage } from '@/pages/CourseEditorPage'
import { QueuePage } from '@/pages/QueuePage'
import { UploadsPage } from '@/pages/UploadsPage'
import { ActivityPage } from '@/pages/ActivityPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SearchPage } from '@/pages/SearchPage'
import { api } from '@/lib/wails'
import type { SessionInfo } from '@/types'

function Shell({ session, onLogout }: { session: SessionInfo; onLogout: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()

  const title =
    location.pathname.startsWith('/courses') && location.pathname !== '/courses'
      ? 'Course editor'
      : location.pathname.slice(1) || 'overview'

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminSidebar activePath={location.pathname} onNavigate={navigate} />
      <div className="flex min-h-screen flex-col md:ps-64">
        <AdminHeader
          title={title}
          sessionName={session.fullName || session.email}
          onSearch={() => navigate('/search')}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:courseId" element={<CourseEditorPage />} />
            <Route path="/courses/:courseId/lessons/:lessonId" element={<CourseEditorPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/uploads" element={<UploadsPage course={null} lesson={null} />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const existing = await api.GetSession()
        if (existing?.userId) setSession(existing)
      } catch {
        /* dev */
      }
      setBooting(false)
    })()
  }, [])

  const logout = async () => {
    await api.Logout()
    setSession(null)
  }

  if (booting) return null
  if (!session) return <LoginPage onSuccess={setSession} />

  return (
    <HashRouter>
      <Shell session={session} onLogout={() => void logout()} />
    </HashRouter>
  )
}
