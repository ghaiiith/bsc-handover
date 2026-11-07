/** Learning tool slots — only visible tools render; architecture ready for future features. */
export type LearningToolId =
  | 'bookmark'
  | 'notes'
  | 'resources'
  | 'transcript'
  | 'ai_assistant'
  | 'quizzes'
  | 'certificates'

export interface LearningToolDefinition {
  id: LearningToolId
  /** Shown in the control bar when true. */
  visible: boolean
  /** Feature is wired and callable when true. */
  enabled: boolean
}

export const LEARNING_TOOL_DEFINITIONS: LearningToolDefinition[] = [
  { id: 'bookmark', visible: true, enabled: true },
  { id: 'notes', visible: false, enabled: false },
  { id: 'resources', visible: false, enabled: false },
  { id: 'transcript', visible: false, enabled: false },
  { id: 'ai_assistant', visible: false, enabled: false },
  { id: 'quizzes', visible: false, enabled: false },
  { id: 'certificates', visible: false, enabled: false },
]

export function getVisibleLearningTools(
  overrides?: Partial<Record<LearningToolId, boolean>>
): LearningToolDefinition[] {
  return LEARNING_TOOL_DEFINITIONS.filter((tool) => {
    if (overrides?.[tool.id] === false) return false
    return tool.visible
  })
}
