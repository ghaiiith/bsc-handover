export interface QuizQuestionReview {
  selected: number
  correctIndex: number
  isCorrect: boolean
}

export type QuizAttemptReview = Record<string, QuizQuestionReview>
