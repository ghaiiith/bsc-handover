interface SplitBarProps {
  platform: number
  instructor: number
  platformLabel: string
  instructorLabel: string
}

/** Visual platform/instructor revenue-split bar with labelled shares. */
export default function SplitBar({
  platform,
  instructor,
  platformLabel,
  instructorLabel,
}: SplitBarProps) {
  const p = Math.max(0, Math.min(100, platform))
  const i = Math.max(0, Math.min(100, instructor))

  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-primary" style={{ width: `${p}%` }} />
        <div className="bg-emerald-500" style={{ width: `${i}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="inline-block size-2 rounded-full bg-primary" />
          {platformLabel} {p}%
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="inline-block size-2 rounded-full bg-emerald-500" />
          {instructorLabel} {i}%
        </span>
      </div>
    </div>
  )
}
