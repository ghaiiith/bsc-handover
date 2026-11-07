import { Skeleton } from '@/components/ui/skeleton'

export default function AdminCoursesLoading() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}
