import Navbar from '@/components/shared/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

export default function ServiceDetailLoading() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Skeleton className="h-4 w-64 mb-6" />
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-96 w-full lg:w-80 shrink-0 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
