export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export type ChatUserRole = 'student' | 'instructor' | 'admin' | 'company' | 'freelancer' | null

export interface GeneralChatRequest {
  messages: ChatMessage[]
  pageContext: string
  userRole: ChatUserRole
}

export interface GeneralChatResponse {
  reply: string
}

export interface GeneralChatErrorResponse {
  error: string
  message: string
}
