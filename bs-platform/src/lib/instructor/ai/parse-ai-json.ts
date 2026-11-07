export function extractJsonFromAiResponse(text: string): unknown {
  const trimmed = text.trim()
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed
  return JSON.parse(jsonStr)
}

export function safeParseAiJson(text: string): unknown | null {
  try {
    return extractJsonFromAiResponse(text)
  } catch {
    return null
  }
}
