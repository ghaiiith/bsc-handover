/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    go?: {
      app?: {
        App?: Record<string, (...args: any[]) => Promise<any>>
      }
    }
  }
}

function app(): Record<string, (...args: any[]) => Promise<any>> {
  const bridge = window.go?.app?.App
  if (!bridge) {
    throw new Error('Wails bridge unavailable — run with `wails dev`')
  }
  return bridge
}

export const api = {
  Login: (email: string, password: string) => app().Login(email, password),
  LoginWithGoogle: () => app().LoginWithGoogle(),
  Logout: () => app().Logout(),
  GetSession: () => app().GetSession(),
  GetSettings: () => app().GetSettings(),
  SaveSettings: (s: unknown) => app().SaveSettings(s),
  DetectFFmpeg: () => app().DetectFFmpeg(),
  GetDashboardStats: () => app().GetDashboardStats(),
  ListCourses: () => app().ListCourses(),
  ListLessons: (courseId: string) => app().ListLessons(courseId),
  GetActivity: (limit: number) => app().GetActivity(limit),
  ExportLogs: (path: string) => app().ExportLogs(path),
  ListQueueJobs: () => app().ListQueueJobs(),
  ImportVideos: (req: unknown) => app().ImportVideos(req),
  PauseQueue: () => app().PauseQueue(),
  ResumeQueue: () => app().ResumeQueue(),
  CancelJob: (id: string) => app().CancelJob(id),
  RetryJob: (id: string) => app().RetryJob(id),
  ReorderQueue: (ids: string[]) => app().ReorderQueue(ids),
  ProbeVideo: (path: string) => app().ProbeVideo(path),
  PickVideoFiles: () => app().PickVideoFiles(),
  PickVideoFolder: () => app().PickVideoFolder(),
  SaveLogExport: () => app().SaveLogExport(),
  GetSystemStats: () => app().GetSystemStats(),
  CMSListCourses: (queryJSON: string) => app().CMSListCourses(queryJSON),
  CMSGetCourse: (courseId: string) => app().CMSGetCourse(courseId),
  CMSCreateCourse: (bodyJSON: string) => app().CMSCreateCourse(bodyJSON),
  CMSUpdateCourse: (courseId: string, bodyJSON: string) => app().CMSUpdateCourse(courseId, bodyJSON),
  CMSDeleteCourse: (courseId: string) => app().CMSDeleteCourse(courseId),
  CMSCourseAction: (courseId: string, action: string) => app().CMSCourseAction(courseId, action),
  CMSDuplicateCourse: (courseId: string) => app().CMSDuplicateCourse(courseId),
  CMSBulkCourses: (courseIds: string[], action: string) => app().CMSBulkCourses(courseIds, action),
  CMSGetCurriculum: (courseId: string) => app().CMSGetCurriculum(courseId),
  CMSCreateSection: (courseId: string, title: string, titleAr: string) =>
    app().CMSCreateSection(courseId, title, titleAr),
  CMSUpdateSection: (courseId: string, sectionId: string, bodyJSON: string) =>
    app().CMSUpdateSection(courseId, sectionId, bodyJSON),
  CMSDeleteSection: (courseId: string, sectionId: string) => app().CMSDeleteSection(courseId, sectionId),
  CMSReorderSections: (courseId: string, sectionIds: string[]) => app().CMSReorderSections(courseId, sectionIds),
  CMSCreateLesson: (courseId: string, bodyJSON: string) => app().CMSCreateLesson(courseId, bodyJSON),
  CMSGetLesson: (courseId: string, lessonId: string) => app().CMSGetLesson(courseId, lessonId),
  CMSUpdateLesson: (courseId: string, lessonId: string, bodyJSON: string) =>
    app().CMSUpdateLesson(courseId, lessonId, bodyJSON),
  CMSDeleteLesson: (courseId: string, lessonId: string) => app().CMSDeleteLesson(courseId, lessonId),
  CMSDuplicateLesson: (courseId: string, lessonId: string) => app().CMSDuplicateLesson(courseId, lessonId),
  CMSLessonAction: (courseId: string, lessonId: string, action: string, extraJSON: string) =>
    app().CMSLessonAction(courseId, lessonId, action, extraJSON),
  CMSReorderLessons: (courseId: string, sectionId: string, lessonIds: string[]) =>
    app().CMSReorderLessons(courseId, sectionId, lessonIds),
  CMSSearch: (query: string) => app().CMSSearch(query),
  CMSListInstructors: (query: string) => app().CMSListInstructors(query),
  CMSGetPlatformActivity: (limit: number) => app().CMSGetPlatformActivity(limit),
  CMSGetLessonProtection: (courseId: string, lessonId: string) =>
    app().CMSGetLessonProtection(courseId, lessonId),
  CMSValidateLessonProtection: (courseId: string, lessonId: string) =>
    app().CMSValidateLessonProtection(courseId, lessonId),
}

export function onWailsEvent(event: string, handler: (...args: unknown[]) => void) {
  // @ts-expect-error wails runtime
  if (typeof window.runtime !== 'undefined') {
    // @ts-expect-error wails runtime
    window.runtime.EventsOn(event, handler)
    return () => {
      // @ts-expect-error wails runtime
      window.runtime.EventsOff(event)
    }
  }
  return () => undefined
}
