'use client'

import { useCountUp } from '@/hooks/use-count-up'
import { getScoreColor } from '@/lib/cv/ats-utils'

interface AtsScoreCircleProps {
  score: number
  animate?: boolean
  size?: number
}

export default function AtsScoreCircle({ score, animate = true, size = 160 }: AtsScoreCircleProps) {
  const displayScore = useCountUp(score, 1500, animate)
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)
  const color = getScoreColor(score)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute text-5xl font-bold num-en"
        style={{ color }}
      >
        {displayScore}
      </span>
    </div>
  )
}
