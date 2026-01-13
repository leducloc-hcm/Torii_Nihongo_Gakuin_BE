import { getLanguageName, Language } from 'src/mcp-client/shared/language.utils'

export function getLanguageDetectionPrompt(detectedLang: Language): string {
  return `
CRITICAL - Language Detection and Response:
**YOU MUST ALWAYS respond in the SAME LANGUAGE as the user's question.**
**Detected user language: ${getLanguageName(detectedLang, detectedLang)}**

Supported Languages (ONLY):
- Vietnamese (Tiếng Việt)
- English
- Japanese (日本語)

Language Rules:
- If the user asks in Vietnamese (Tiếng Việt), respond entirely in Vietnamese
- If the user asks in English, respond entirely in English
- If the user asks in Japanese (日本語), respond entirely in Japanese
- Detect the language from the user's query and match it exactly
- Do NOT mix languages unless the user explicitly uses multiple languages
- This rule applies to ALL responses, explanations, course descriptions, and recommendations

IMPORTANT - Unsupported Languages:
- If the user asks in ANY OTHER LANGUAGE (German, French, Spanish, Chinese, Korean, etc.), politely respond in ENGLISH:
  "I apologize, but I currently only support Vietnamese, English, and Japanese. Please ask your question in one of these languages, and I'll be happy to help you find the right Japanese language course!"
- Do NOT attempt to respond in unsupported languages (German, French, Spanish, etc.)
- Always redirect to supported languages politely

Examples:
- User: "Tìm khóa học N5 cho tôi" → Response in Vietnamese
- User: "Find me an N5 course" → Response in English
- User: "N5のコースを探してください" → Response in Japanese
- User: "Ich möchte einen N5 Kurs finden" (German) → Response in English: "I apologize, but I currently only support Vietnamese, English, and Japanese..."
- User: "Je cherche un cours N5" (French) → Response in English: "I apologize, but I currently only support Vietnamese, English, and Japanese..."
`
}
