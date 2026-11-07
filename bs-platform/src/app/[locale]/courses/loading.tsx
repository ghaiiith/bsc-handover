import Navbar from '@/components/shared/Navbar'
import CoursesListingSkeleton from '@/components/courses/CoursesListingSkeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function CoursesLoading() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-64 mb-8" />

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0">
            <div className="rounded-xl border bg-background p-4 space-y-4">
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </aside>

          <main className="flex-1">
            <CoursesListingSkeleton />
          </main>
        </div>
      </div>
    </div>
  )
}
