import Navbar from '@/components/shared/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

export default function CourseDetailLoading() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-4 w-64 mb-6" />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-10 w-full max-w-xl" />
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-7 w-48" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>

            <div className="space-y-3">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>

          <aside>
            <Skeleton className="aspect-video w-full rounded-xl mb-4" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-12 w-full" />
          </aside>
        </div>
      </div>
    </div>
  )
}
