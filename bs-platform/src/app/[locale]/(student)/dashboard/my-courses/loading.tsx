import Navbar from '@/components/shared/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

export default function MyCoursesLoading() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-5 w-64 mb-8" />

        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border overflow-hidden">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
