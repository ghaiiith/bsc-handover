import 'server-only'

import type { WatermarkConfig } from '@/types/content-protection'

export const DEFAULT_WATERMARK: WatermarkConfig = {
  enabled: true,
  opacity: 0.45,
  fontSize: 13,
  position: 'bottom-right',
  updateIntervalSeconds: 30,
  lines: ['displayName', 'userId', 'timestamp'],
}

export function buildWatermarkConfig(
  overrides?: Partial<WatermarkConfig>
): WatermarkConfig {
  return { ...DEFAULT_WATERMARK, ...overrides }
}
