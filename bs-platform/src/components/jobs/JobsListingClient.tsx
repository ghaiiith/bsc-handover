import JobCard from '@/components/jobs/JobCard'
import type { Job } from '@/types'

interface JobsListingClientProps {
  locale: string
  jobs: Job[]
}

export default function JobsListingClient({ locale, jobs }: JobsListingClientProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} locale={locale} />
      ))}
    </div>
  )
}
