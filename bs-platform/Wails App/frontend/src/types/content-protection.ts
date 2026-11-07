export type EncryptionStatus = 'none' | 'pending' | 'encrypted' | 'failed'
export type ProtectionStatus = 'standard' | 'protected' | 'degraded'
export type AssetHealthStatus = 'unknown' | 'healthy' | 'degraded' | 'critical'

export interface AssetHealthReport {
  overall: AssetHealthStatus
  checkedAt: string
  issues: string[]
}

export interface StudioProtectionStatus {
  lessonId: string
  courseId: string
  encryptionStatus: EncryptionStatus
  protectionStatus: ProtectionStatus
  assetHealth: AssetHealthStatus
  assetHealthDetails: AssetHealthReport | null
  lastValidationAt: string | null
  keyRegistered: boolean
  encryptionVersion: number
  processingVersion: number
}
