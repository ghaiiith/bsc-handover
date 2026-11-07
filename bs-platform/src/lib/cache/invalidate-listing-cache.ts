import { revalidateTag } from 'next/cache'

/** Bust unstable_cache for public /courses listings. */
export function revalidateCoursesListingCache(): void {
  revalidateTag('courses', 'max')
}

/** Bust unstable_cache for public /services listings. */
export function revalidateServicesListingCache(): void {
  revalidateTag('services', 'max')
}

/** Bust unstable_cache for public /jobs listings. */
export function revalidateJobsListingCache(): void {
  revalidateTag('jobs', 'max')
}
