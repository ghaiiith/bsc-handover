/**
 * Re-exports the unified CV Builder client for profile-related routes.
 * All CV Builder API calls go through `@/lib/cv/cv-builder-server`.
 */
export {
  editWithCvBuilder,
  extractCvText,
  isCvBuilderConfigured,
  parseCvFile,
  parseCvText,
} from '@/lib/cv/cv-builder-server'
