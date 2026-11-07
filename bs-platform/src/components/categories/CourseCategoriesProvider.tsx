'use client'

import { createContext, useContext } from 'react'
import { COURSE_CATEGORIES, type CategoryOption } from '@/lib/constants'

const CourseCategoriesContext = createContext<CategoryOption[]>(COURSE_CATEGORIES)

export function CourseCategoriesProvider({
  value,
  children,
}: {
  value: CategoryOption[]
  children: React.ReactNode
}) {
  return (
    <CourseCategoriesContext.Provider value={value}>
      {children}
    </CourseCategoriesContext.Provider>
  )
}

/**
 * Active course categories from context (fed by the locale layout). Falls back
 * to the seeded constant when used outside a provider.
 */
export function useCourseCategories(): CategoryOption[] {
  return useContext(CourseCategoriesContext)
}
