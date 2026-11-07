import Navbar from '@/components/shared/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

export default function InstructorCoursesLoading() {
  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>

        <Skeleton className="h-9 w-48" />

        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </div>
  )
}
