'use client'

export default function CareerNetworkBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.35] dark:opacity-[0.2]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="edu-network"
            width="120"
            height="120"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="60" cy="60" r="1.5" className="fill-primary/30" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#edu-network)" />
        <g className="stroke-primary/8 dark:stroke-primary/12" strokeWidth="0.5" fill="none">
          <line x1="10%" y1="20%" x2="35%" y2="45%" />
          <line x1="35%" y1="45%" x2="60%" y2="25%" />
          <line x1="60%" y1="25%" x2="85%" y2="50%" />
          <line x1="35%" y1="45%" x2="50%" y2="70%" />
          <line x1="50%" y1="70%" x2="75%" y2="80%" />
          <line x1="60%" y1="25%" x2="70%" y2="55%" />
          <line x1="20%" y1="75%" x2="50%" y2="70%" />
          <line x1="85%" y1="50%" x2="70%" y2="55%" />
        </g>
        {[
          { cx: '10%', cy: '20%', delay: '0s' },
          { cx: '35%', cy: '45%', delay: '1s' },
          { cx: '60%', cy: '25%', delay: '2s' },
          { cx: '85%', cy: '50%', delay: '0.5s' },
          { cx: '50%', cy: '70%', delay: '1.5s' },
          { cx: '75%', cy: '80%', delay: '2.5s' },
          { cx: '70%', cy: '55%', delay: '3s' },
          { cx: '20%', cy: '75%', delay: '1.2s' },
        ].map((node, i) => (
          <circle
            key={i}
            cx={node.cx}
            cy={node.cy}
            r="3"
            className="fill-brand-green/20"
            style={{
              animation: `edu-node-pulse 4s ease-in-out ${node.delay} infinite`,
            }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
    </div>
  )
}
