import Navbar from '@/components/shared/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

export default function ServicesLoading() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-32 mb-8" />
        <div className="flex flex-col lg:flex-row gap-8">
          <Skeleton className="h-96 w-full lg:w-64 shrink-0 rounded-xl" />
          <div className="flex-1 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
