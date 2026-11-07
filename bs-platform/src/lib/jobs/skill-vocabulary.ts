/**
 * Controlled skill vocabulary for job posts (report BS-14).
 *
 * Each entry has a canonical display `skill` and a set of lowercase `aliases`
 * matched (as substrings/words) against the job title + description to suggest
 * relevant skills as selectable chips. Free-text entry remains as a fallback.
 */
export interface SkillVocabEntry {
  skill: string
  aliases: string[]
}

export const SKILL_VOCABULARY: SkillVocabEntry[] = [
  // Programming
  { skill: 'JavaScript', aliases: ['javascript', 'js '] },
  { skill: 'TypeScript', aliases: ['typescript', 'ts '] },
  { skill: 'React', aliases: ['react', 'react.js', 'reactjs'] },
  { skill: 'Next.js', aliases: ['next.js', 'nextjs', 'next js'] },
  { skill: 'Node.js', aliases: ['node.js', 'nodejs', 'node js'] },
  { skill: 'Vue', aliases: ['vue', 'vue.js', 'vuejs'] },
  { skill: 'Angular', aliases: ['angular'] },
  { skill: 'Python', aliases: ['python', 'django', 'flask'] },
  { skill: 'PHP', aliases: ['php', 'laravel'] },
  { skill: 'Laravel', aliases: ['laravel'] },
  { skill: 'Java', aliases: ['java ', ' java', 'spring boot'] },
  { skill: 'C#', aliases: ['c#', '.net', 'asp.net'] },
  { skill: 'Go', aliases: ['golang', ' go '] },
  { skill: 'SQL', aliases: ['sql', 'mysql', 'postgres', 'postgresql'] },
  { skill: 'REST APIs', aliases: ['rest api', 'restful', 'api development'] },
  { skill: 'Frontend', aliases: ['frontend', 'front-end', 'front end'] },
  { skill: 'Backend', aliases: ['backend', 'back-end', 'back end'] },
  { skill: 'Full Stack', aliases: ['full stack', 'full-stack', 'fullstack'] },
  { skill: 'برمجة', aliases: ['برمجة', 'مطور', 'تطوير'] },
  // Mobile
  { skill: 'Flutter', aliases: ['flutter'] },
  { skill: 'React Native', aliases: ['react native'] },
  { skill: 'Android', aliases: ['android', 'kotlin'] },
  { skill: 'iOS', aliases: ['ios', 'swift'] },
  { skill: 'تطبيقات الموبايل', aliases: ['موبايل', 'تطبيقات'] },
  // Design
  { skill: 'UI/UX', aliases: ['ui/ux', 'ui ux', 'user experience', 'واجهات'] },
  { skill: 'Figma', aliases: ['figma'] },
  { skill: 'Photoshop', aliases: ['photoshop'] },
  { skill: 'Illustrator', aliases: ['illustrator'] },
  { skill: 'Graphic Design', aliases: ['graphic design', 'graphic', 'تصميم', 'جرافيك'] },
  // Data & AI
  { skill: 'Data Analysis', aliases: ['data analysis', 'data analyst', 'analytics', 'تحليل بيانات'] },
  { skill: 'Machine Learning', aliases: ['machine learning', 'ml ', 'ذكاء اصطناعي'] },
  { skill: 'AI', aliases: [' ai ', 'artificial intelligence'] },
  { skill: 'Power BI', aliases: ['power bi', 'tableau'] },
  { skill: 'Excel', aliases: ['excel'] },
  // Video & Media
  { skill: 'Video Editing', aliases: ['video editing', 'premiere', 'مونتاج', 'فيديو'] },
  { skill: 'After Effects', aliases: ['after effects', 'motion graphics'] },
  { skill: 'Photography', aliases: ['photography', 'تصوير'] },
  // Marketing
  { skill: 'Digital Marketing', aliases: ['digital marketing', 'تسويق رقمي', 'تسويق'] },
  { skill: 'SEO', aliases: ['seo'] },
  { skill: 'Social Media', aliases: ['social media', 'سوشيال ميديا', 'وسائل التواصل'] },
  { skill: 'Google Ads', aliases: ['google ads', 'إعلانات'] },
  { skill: 'Content Writing', aliases: ['content writing', 'copywriting', 'كتابة محتوى'] },
  // Business
  { skill: 'Project Management', aliases: ['project management', 'إدارة مشاريع'] },
  { skill: 'Accounting', aliases: ['accounting', 'محاسبة'] },
  { skill: 'Sales', aliases: ['sales', 'مبيعات'] },
  { skill: 'Customer Service', aliases: ['customer service', 'خدمة العملاء'] },
  { skill: 'Communication', aliases: ['communication', 'تواصل'] },
]

/**
 * Suggest canonical skills whose aliases appear in the given text, excluding any
 * already selected. Returns at most `limit` suggestions.
 */
export function suggestSkillsFromText(
  text: string,
  exclude: string[] = [],
  limit = 12
): string[] {
  const hay = ` ${text.toLowerCase()} `
  const excluded = new Set(exclude.map((s) => s.trim().toLowerCase()))
  const out: string[] = []
  for (const entry of SKILL_VOCABULARY) {
    if (excluded.has(entry.skill.toLowerCase())) continue
    if (entry.aliases.some((a) => hay.includes(a))) {
      out.push(entry.skill)
      if (out.length >= limit) break
    }
  }
  return out
}
