export const PROFILE_DEGREES = [
  { value: 'bachelor', labelAr: 'بكالوريوس / ليسانس', labelEn: 'Bachelor\'s' },
  { value: 'master', labelAr: 'ماجستير', labelEn: 'Master\'s' },
  { value: 'phd', labelAr: 'دكتوراه', labelEn: 'PhD' },
  { value: 'diploma', labelAr: 'دبلوم', labelEn: 'Diploma' },
  { value: 'certificate', labelAr: 'شهادة مهنية', labelEn: 'Professional Certificate' },
  { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
] as const

export const ENGLISH_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

export const MAX_PROFILE_SKILLS = 30
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024
export const MAX_CV_BYTES = 10 * 1024 * 1024
