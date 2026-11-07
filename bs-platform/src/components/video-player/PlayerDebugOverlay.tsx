'use client'

import type { PlaybackAdminDebug, PlayerCapabilities, PlayerDebugSnapshot } from '@/types/video-player'
import type { SessionHealthSnapshot } from '@/lib/playback/session-health'

interface PlayerDebugOverlayProps {
  debug: PlaybackAdminDebug
  capabilities?: PlayerCapabilities
  snapshot?: PlayerDebugSnapshot
  engineState: string
  currentTime: number
  duration: number
  bufferedPercent: number
  sessionHealth?: SessionHealthSnapshot | null
}

export default function PlayerDebugOverlay({
  debug,
  capabilities,
  snapshot,
  engineState,
  currentTime,
  duration,
  bufferedPercent,
  sessionHealth,
}: PlayerDebugOverlayProps) {
  return (
    <div className="pointer-events-none absolute start-3 top-3 z-50 max-h-[80%] max-w-xs overflow-y-auto rounded-md bg-black/85 p-2 font-mono text-[10px] leading-relaxed text-green-400">
      <p className="font-bold text-green-300">— Debug —</p>
      <p>Provider: {debug.providerId ?? '—'}</p>
      <p>Mode: {debug.playbackMode ?? '—'}</p>
      <p>Session: {debug.sessionId?.slice(0, 8) ?? '—'}</p>
      <p>Engine: {engineState}</p>
      <p>UI: {snapshot?.uiState ?? '—'}</p>
      <p className="num-en">
        Time: {currentTime.toFixed(1)} / {duration.toFixed(1)}
      </p>
      <p className="num-en">Buffer: {bufferedPercent.toFixed(0)}%</p>
      <p>Resolution: {debug.resolution ?? '—'}</p>
      <p className="num-en">Bitrate: {debug.bitrate ?? snapshot?.currentBitrate ?? '—'}</p>
      <p>Network: {snapshot?.networkState ?? '—'}</p>
      <p>Online: {snapshot?.isOnline ? 'yes' : 'no'}</p>
      <p className="num-en">Seeks: {snapshot?.seekCount ?? 0}</p>
      <p className="num-en">
        Watch: {Math.round((snapshot?.averageWatchTimeMs ?? 0) / 1000)}s
      </p>

      {capabilities && (
        <>
          <p className="mt-1 border-t border-green-400/30 pt-1 font-bold text-green-300">
            Capabilities
          </p>
          {Object.entries(capabilities).map(([key, val]) => (
            <p key={key}>
              {key}: {val ? '✓' : '—'}
            </p>
          ))}
        </>
      )}

      {sessionHealth && (
        <>
          <p className="mt-1 border-t border-green-400/30 pt-1 font-bold text-green-300">
            Session
          </p>
          <p>Machine: {sessionHealth.machineState}</p>
          <p>Leader: {sessionHealth.isLeader ? 'yes' : 'no'}</p>
          <p className="num-en">
            Remaining: {Math.floor(sessionHealth.remainingLifetimeMs / 1000)}s
          </p>
        </>
      )}
    </div>
  )
}
