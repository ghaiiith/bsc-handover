import Navbar from '@/components/shared/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-9 w-48 mb-8" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
