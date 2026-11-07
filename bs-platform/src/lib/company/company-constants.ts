/**
 * Controlled lists for the company profile (Company-Profile-Fields spec).
 * Values are stable English slugs stored in the DB; labels are bilingual so the
 * UI can render either language and filtering stays stable.
 */

export interface Option {
  value: string
  ar: string
  en: string
}

export const COMPANY_TYPES: Option[] = [
  { value: 'limited', ar: 'محدودة', en: 'Limited (LLC)' },
  { value: 'sole', ar: 'فردية', en: 'Sole proprietorship' },
  { value: 'foreign_branch', ar: 'فرع شركة أجنبية', en: 'Foreign company branch' },
  { value: 'ngo', ar: 'منظمة', en: 'NGO / organisation' },
  { value: 'government', ar: 'حكومي', en: 'Government' },
]

export const COMPANY_SECTORS: Option[] = [
  { value: 'banking', ar: 'مصارف', en: 'Banking' },
  { value: 'telecom', ar: 'اتصالات', en: 'Telecom' },
  { value: 'retail', ar: 'تجارة وتجزئة', en: 'Trade & retail' },
  { value: 'construction', ar: 'إنشاءات', en: 'Construction' },
  { value: 'oil_gas', ar: 'نفط وغاز', en: 'Oil & gas' },
  { value: 'health', ar: 'صحة', en: 'Health' },
  { value: 'education', ar: 'تعليم', en: 'Education' },
  { value: 'ngo_grants', ar: 'منظمات ومنح', en: 'NGOs & grants' },
  { value: 'it', ar: 'تقنية معلومات', en: 'Information technology' },
  { value: 'logistics', ar: 'نقل ولوجستيك', en: 'Transport & logistics' },
  { value: 'hospitality', ar: 'ضيافة', en: 'Hospitality' },
  { value: 'manufacturing', ar: 'صناعة', en: 'Manufacturing' },
  { value: 'media', ar: 'إعلام', en: 'Media' },
]

export const COMPANY_SIZES: Option[] = [
  { value: '1-10', ar: '1-10', en: '1-10' },
  { value: '11-50', ar: '11-50', en: '11-50' },
  { value: '51-200', ar: '51-200', en: '51-200' },
  { value: '201-500', ar: '201-500', en: '201-500' },
  { value: '500+', ar: '500+', en: '500+' },
]

export const IRAQI_GOVERNORATES: Option[] = [
  { value: 'baghdad', ar: 'بغداد', en: 'Baghdad' },
  { value: 'basra', ar: 'البصرة', en: 'Basra' },
  { value: 'nineveh', ar: 'نينوى', en: 'Nineveh' },
  { value: 'erbil', ar: 'أربيل', en: 'Erbil' },
  { value: 'najaf', ar: 'النجف', en: 'Najaf' },
  { value: 'karbala', ar: 'كربلاء', en: 'Karbala' },
  { value: 'dhi_qar', ar: 'ذي قار', en: 'Dhi Qar' },
  { value: 'anbar', ar: 'الأنبار', en: 'Anbar' },
  { value: 'diyala', ar: 'ديالى', en: 'Diyala' },
  { value: 'kirkuk', ar: 'كركوك', en: 'Kirkuk' },
  { value: 'babil', ar: 'بابل', en: 'Babil' },
  { value: 'wasit', ar: 'واسط', en: 'Wasit' },
  { value: 'salahuddin', ar: 'صلاح الدين', en: 'Salah al-Din' },
  { value: 'qadisiyyah', ar: 'القادسية', en: 'Qadisiyyah' },
  { value: 'maysan', ar: 'ميسان', en: 'Maysan' },
  { value: 'dohuk', ar: 'دهوك', en: 'Dohuk' },
  { value: 'sulaymaniyah', ar: 'السليمانية', en: 'Sulaymaniyah' },
  { value: 'muthanna', ar: 'المثنى', en: 'Muthanna' },
]

export const COMPANY_BENEFITS: Option[] = [
  { value: 'transport', ar: 'نقل', en: 'Transport' },
  { value: 'health_insurance', ar: 'تأمين صحي', en: 'Health insurance' },
  { value: 'training_budget', ar: 'ميزانية تدريب', en: 'Training budget' },
  { value: 'flexible_hours', ar: 'دوام مرن', en: 'Flexible hours' },
  { value: 'hybrid', ar: 'هجين', en: 'Hybrid' },
]

export const CONTACT_METHODS: Option[] = [
  { value: 'email', ar: 'البريد الإلكتروني', en: 'Email' },
  { value: 'whatsapp', ar: 'واتساب', en: 'WhatsApp' },
  { value: 'in_platform', ar: 'رسائل المنصة', en: 'In-platform messaging' },
]

export const VERIFICATION_TIERS: Record<string, { ar: string; en: string }> = {
  unverified: { ar: 'غير موثّقة', en: 'Unverified' },
  domain_verified: { ar: 'بريد نطاق موثّق', en: 'Verified email domain' },
  verified: { ar: 'شركة موثّقة', en: 'Verified company' },
}

export function optionLabel(list: Option[], value: string | null | undefined, isAr: boolean): string {
  const o = list.find((x) => x.value === value)
  return o ? (isAr ? o.ar : o.en) : ''
}
