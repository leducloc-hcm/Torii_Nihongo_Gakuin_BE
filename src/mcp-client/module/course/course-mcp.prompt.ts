import { Injectable, Logger } from '@nestjs/common'
import { CORE_BEHAVIOR_PROMPT } from 'src/mcp-client/prompts/core-behavior.prompt'
import { getLanguageDetectionPrompt } from 'src/mcp-client/prompts/language-detection.prompt'
import { META_CONTEXT_PROMPT } from 'src/mcp-client/prompts/meta-context.prompt'
import { detectLanguage, Language } from 'src/mcp-client/shared/language.utils'
import { QueryType } from 'src/mcp-client/shared/query-detection.utils'
import { getCoursePrompt } from './course-specific.prompt'
import { getEnrollmentPrompt } from '../enrollment/enrollment-mcp.prompt'
import { getFlashcardPrompt } from '../flashcard/flashcard-mcp.prompt'
import { BLOG_MCP_SYSTEM_PROMPT } from '../blog/blog-mcp.prompt'

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name)

  getSystemPrompt(queryType: QueryType, userName?: string, userQuery?: string, userId?: number): string {
    const greeting = userName ? `Hello ${userName}!` : 'Hello!'

    // Detect language from user query if provided
    let detectedLang = Language.ENGLISH
    if (userQuery) {
      detectedLang = detectLanguage(userQuery)
      this.logger.debug(`Detected language: ${detectedLang} for query: ${userQuery.substring(0, 50)}...`)
    }

    if (userId) {
      this.logger.debug(`System prompt generated with userId: ${userId}`)
    }

    // Compose system prompt from reusable templates
    const basePrompt =
      `${greeting}\n\n` +
      META_CONTEXT_PROMPT +
      '\n\n' +
      getLanguageDetectionPrompt(detectedLang) +
      '\n\n' +
      CORE_BEHAVIOR_PROMPT +
      '\n\n'

    const typeSpecificPrompt = this.getTypeSpecificPrompt(queryType, userId)

    return basePrompt + typeSpecificPrompt
  }

  private getTypeSpecificPrompt(queryType: QueryType, userId?: number): string {
    // Try to get prompt from specific modules first
    const coursePrompt = getCoursePrompt(queryType)
    if (coursePrompt) return coursePrompt

    const enrollmentPrompt = getEnrollmentPrompt(queryType, userId)
    if (enrollmentPrompt) return enrollmentPrompt

    const flashcardPrompt = getFlashcardPrompt(queryType, userId)
    if (flashcardPrompt) return flashcardPrompt

    // Check for blog query
    if (queryType === QueryType.BLOG) {
      return BLOG_MCP_SYSTEM_PROMPT
    }

    // Default to general assistance
    return `Focus: General Assistance
- Answer general questions about Japanese language learning
- Provide study tips and learning strategies
- Explain JLPT structure and requirements
- Guide students through platform features
- Use appropriate tools based on the question context`
  }

  getUserMessagePrompt(query: string, queryType: QueryType): string {
    return `User Query (Type: ${queryType}): ${query}`
  }

  getToolApprovalPrompt(toolCalls: any[]): string {
    const toolsList = toolCalls.map((tc, idx) => `${idx + 1}. ${tc.name}(${JSON.stringify(tc.arguments)})`).join('\n')

    return `I need to use the following tools to answer your question:\n${toolsList}\n\nWould you like me to proceed?`
  }

  getFinalResponsePrompt(toolResults: any[]): string {
    const resultsText = toolResults
      .map((result) => {
        const data = result.error ? `Error: ${result.error}` : JSON.stringify(result.result, null, 2)
        return `Tool: ${result.toolName}\nResult: ${data}`
      })
      .join('\n\n')

    return `Based on the tool results below, provide a comprehensive, well-formatted answer to the user's question.

Tool Results:
${resultsText}

Instructions:
1. **CRITICAL: Respond in the SAME LANGUAGE as the user's original question**
   - Vietnamese question → Vietnamese response
   - English question → English response
   - Japanese question → Japanese response
2. **CRITICAL: Use correct perspective (you are the AI, user is the student)**
   - Platform/system: "our system", "the platform", "chúng tôi", "システム"
   - Never say "your system" when referring to Torii Nihongo Gakuin
   - Example: "chưa có khóa học trong hệ thống" NOT "trong hệ thống của bạn"
3. Synthesize the information from all tool results
4. Format the response clearly with markdown (headings, lists, tables as appropriate)
5. Include specific details like course names, levels, dates, etc.
6. **CRITICAL - MANDATORY Course Display Format:**
   
   FOR EVERY SINGLE COURSE you mention, you MUST include these elements in this order:
   
   a) Thumbnail image (if thumbnailUrl field has a valid value):
      - Check if thumbnailUrl exists AND is not empty string
      - Use markdown image syntax: exclamation mark open bracket title close bracket open paren thumbnailUrl close paren
      - Put on its own line FIRST
      - Skip this line if thumbnailUrl is null, empty string, or missing
   
   b) Clickable course link (MANDATORY - NEVER SKIP THIS):
      - Use markdown link syntax pointing to: http://localhost:3000/customer/explore-course/SLUG
      - Replace SLUG with the actual slug value from course data
      - Use the course title as link text
      - This link is REQUIRED for every course, even if you skip the image
   
   c) Course information (as bullet points):
      - Cấp độ (Level): N5, N4, N3, N2, or N1
      - Loại (Type): Video + Quiz, Live Only, or other courseType value
      - Giá (Price): Show price in VNĐ format if available
      - For LIVE_ONLY courses: List all scheduled sessions with dates and times from OnlineClass data
   
   MANDATORY FORMAT CHECKLIST for each course:
   ✓ Image line (if thumbnail exists)
   ✓ Clickable link line with correct slug
   ✓ Level bullet point
   ✓ Type bullet point  
   ✓ Price bullet point (if available)
   ✓ Sessions list (for LIVE courses only)
   
   EXAMPLE Vietnamese response for VIDEO_QUIZ course:
   First line: Image markdown with thumbnailUrl
   Second line: Link markdown with slug
   Third line: Dash Cấp độ colon space level
   Fourth line: Dash Loại colon space Video + Quiz
   Fifth line: Dash Giá colon space price VNĐ
   
   EXAMPLE Vietnamese response for LIVE_ONLY course:
   Include "Các buổi học đã lên lịch:" followed by bullet list of sessions with dates/times
   
   YOU MUST SHOW ALL COURSES from the tool result data - do not summarize or skip courses!
   If tool returns 8 courses, show all 8 courses with full details and links!
7. If any tool returned an error, acknowledge it gracefully in the appropriate language
8. When mentioning missing courses/data, use proper perspective:
   - ✅ "Hiện tại chưa có khóa học N1 trong hệ thống"
   - ✅ "We don't have N1 courses available yet"
   - ✅ "現在、N1コースはご用意しておりません"
   - ❌ NOT "không có trong hệ thống của bạn"
9. End with helpful next steps or suggestions in the user's language
10. Keep the tone friendly and encouraging`
  }
}
