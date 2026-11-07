import Navbar from '@/components/shared/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

export default function InstructorDashboardLoading() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>

        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}
