import { Skeleton } from '@/components/ui/skeleton'

/** Only the lesson content column — shell (navbar, curriculum) stays mounted in layout. */
export default function LessonPlayerLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-9">
      <div className="min-w-0 space-y-4 lg:col-span-6">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-24" />
        <div className="flex justify-between pt-4">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <aside className="hidden lg:col-span-3 lg:block">
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </aside>
    </div>
  )
}
