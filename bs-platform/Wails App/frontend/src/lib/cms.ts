import { api } from '@/lib/wails'
import type {
  CourseCurriculum,
  CourseListItem,
  CourseListResponse,
  PlatformActivityItem,
  SearchResult,
} from '@/types/cms'

const cache = new Map<string, { at: number; data: unknown }>()
const TTL = 30_000

function getCached<T>(key: string): T | null {
  const hit = cache.get(key)
  if (!hit || Date.now() - hit.at > TTL) return null
  return hit.data as T
}

function setCache(key: string, data: unknown) {
  cache.set(key, { at: Date.now(), data })
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

async function parseJSON<T>(raw: string): Promise<T> {
  return JSON.parse(raw) as T
}

export const cms = {
  async listCourses(params: Record<string, string> = {}): Promise<CourseListResponse> {
    const key = `courses:${JSON.stringify(params)}`
    const cached = getCached<CourseListResponse>(key)
    if (cached) return cached
    const raw = await api.CMSListCourses(JSON.stringify(params))
    const data = await parseJSON<CourseListResponse>(raw)
    setCache(key, data)
    return data
  },

  async getCourse(id: string): Promise<CourseListItem> {
    const key = `course:${id}`
    const cached = getCached<CourseListItem>(key)
    if (cached) return cached
    const raw = await api.CMSGetCourse(id)
    const data = await parseJSON<CourseListItem>(raw)
    setCache(key, data)
    return data
  },

  async createCourse(body: Record<string, string>) {
    const raw = await api.CMSCreateCourse(JSON.stringify(body))
    invalidateCache('courses')
    return parseJSON<{ courseId: string }>(raw)
  },

  async updateCourse(id: string, body: Record<string, unknown>) {
    const raw = await api.CMSUpdateCourse(id, JSON.stringify(body))
    invalidateCache('courses')
    invalidateCache(`course:${id}`)
    return parseJSON<CourseListItem>(raw)
  },

  async deleteCourse(id: string) {
    await api.CMSDeleteCourse(id)
    invalidateCache('courses')
    invalidateCache(`course:${id}`)
  },

  async courseAction(id: string, action: 'publish' | 'unpublish' | 'archive') {
    await api.CMSCourseAction(id, action)
    invalidateCache('courses')
    invalidateCache(`course:${id}`)
  },

  async duplicateCourse(id: string) {
    const raw = await api.CMSDuplicateCourse(id)
    invalidateCache('courses')
    return parseJSON<{ courseId: string }>(raw)
  },

  async bulkCourses(ids: string[], action: string) {
    await api.CMSBulkCourses(ids, action)
    invalidateCache('courses')
  },

  async getCurriculum(courseId: string): Promise<CourseCurriculum> {
    const key = `curriculum:${courseId}`
    const cached = getCached<CourseCurriculum>(key)
    if (cached) return cached
    const raw = await api.CMSGetCurriculum(courseId)
    const data = await parseJSON<CourseCurriculum>(raw)
    setCache(key, data)
    return data
  },

  async createSection(courseId: string, title: string, titleAr: string) {
    const raw = await api.CMSCreateSection(courseId, title, titleAr)
    invalidateCache(`curriculum:${courseId}`)
    return parseJSON<{ sectionId: string }>(raw)
  },

  async updateSection(courseId: string, sectionId: string, body: Record<string, string>) {
    await api.CMSUpdateSection(courseId, sectionId, JSON.stringify(body))
    invalidateCache(`curriculum:${courseId}`)
  },

  async deleteSection(courseId: string, sectionId: string) {
    await api.CMSDeleteSection(courseId, sectionId)
    invalidateCache(`curriculum:${courseId}`)
  },

  async reorderSections(courseId: string, sectionIds: string[]) {
    await api.CMSReorderSections(courseId, sectionIds)
    invalidateCache(`curriculum:${courseId}`)
  },

  async createLesson(courseId: string, body: Record<string, unknown>) {
    const raw = await api.CMSCreateLesson(courseId, JSON.stringify(body))
    invalidateCache(`curriculum:${courseId}`)
    return parseJSON<{ lessonId: string }>(raw)
  },

  async updateLesson(courseId: string, lessonId: string, body: Record<string, unknown>) {
    const raw = await api.CMSUpdateLesson(courseId, lessonId, JSON.stringify(body))
    invalidateCache(`curriculum:${courseId}`)
    return parseJSON(raw)
  },

  async deleteLesson(courseId: string, lessonId: string) {
    await api.CMSDeleteLesson(courseId, lessonId)
    invalidateCache(`curriculum:${courseId}`)
  },

  async duplicateLesson(courseId: string, lessonId: string) {
    const raw = await api.CMSDuplicateLesson(courseId, lessonId)
    invalidateCache(`curriculum:${courseId}`)
    return parseJSON<{ lessonId: string }>(raw)
  },

  async lessonAction(courseId: string, lessonId: string, action: string, extra?: Record<string, unknown>) {
    await api.CMSLessonAction(courseId, lessonId, action, extra ? JSON.stringify(extra) : '')
    invalidateCache(`curriculum:${courseId}`)
  },

  async reorderLessons(courseId: string, sectionId: string, lessonIds: string[]) {
    await api.CMSReorderLessons(courseId, sectionId, lessonIds)
    invalidateCache(`curriculum:${courseId}`)
  },

  async search(q: string): Promise<SearchResult[]> {
    const raw = await api.CMSSearch(q)
    const data = await parseJSON<{ results: SearchResult[] }>(raw)
    return data.results
  },

  async listInstructors(q?: string) {
    const raw = await api.CMSListInstructors(q ?? '')
    return parseJSON<{ instructors: { id: string; full_name: string; full_name_ar: string | null }[] }>(raw)
  },

  async platformActivity(limit = 50): Promise<PlatformActivityItem[]> {
    const raw = await api.CMSGetPlatformActivity(limit)
    const data = await parseJSON<{ items: PlatformActivityItem[] }>(raw)
    return data.items
  },
}
