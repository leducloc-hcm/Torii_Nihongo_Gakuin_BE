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
import { getAssessmentHistoryPrompt } from '../assessment_history/history-mcp.prompt'

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

    // Check for assessment history query
    if (queryType === QueryType.ASSESSMENT_HISTORY) {
      return getAssessmentHistoryPrompt(userId)
    }

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

  getFinalResponsePrompt(toolResults: any[], queryType?: QueryType): string {
    const resultsText = toolResults
      .map((result) => {
        const data = result.error ? `Error: ${result.error}` : JSON.stringify(result.result, null, 2)
        return `Tool: ${result.toolName}\nResult: ${data}`
      })
      .join('\n\n')

    // Special handling for COURSE queries - use JSON format
    if (queryType === QueryType.COURSE) {
      return `Based on the tool results below, provide a response following the EXACT format specified in the course-specific prompt.

Tool Results:
${resultsText}

**CRITICAL - YOU MUST USE JSON FORMAT:**

1. **ALWAYS INCLUDE JSON CODE BLOCK** - Every course response MUST contain the complete JSON data wrapped in markdown code fence:
   \`\`\`json
   {
     "courses": [...complete course data...],
     "count": number
   }
   \`\`\`

2. **Response Structure:**
   - Brief intro message in the user's language (Vietnamese/English/Japanese)
   - JSON code block with ALL courses from tool results
   - Optional follow-up question or suggestion

3. **Include Complete Data** for each course:
   - id (number)
   - title (string)
   - slug (string) - REQUIRED for navigation
   - level (string): N5, N4, N3, N2, or N1
   - thumbnailUrl (string or null)
   - description (string)
   - courseType (string): VIDEO_QUIZ or LIVE_ONLY
   - price (number)
   - moduleCount (number)
   - lessonCount (number)

4. **DO NOT:**
   - Translate or modify course data
   - Summarize or skip courses
   - Use plain text lists instead of JSON
   - Create markdown links/images (frontend handles this)

5. **Example Response:**
   "Tôi tìm thấy 10 khóa học phù hợp:
   
   \`\`\`json
   {
     "courses": [
       {
         "id": 1,
         "title": "Course N5",
         "slug": "course-n5",
         "level": "N5",
         "thumbnailUrl": null,
         "courseType": "VIDEO_QUIZ",
         "price": 10000,
         "moduleCount": 5,
         "lessonCount": 20
       }
     ],
     "count": 10
   }
   \`\`\`
   
   Bạn muốn xem chi tiết khóa nào?"

The frontend will automatically render beautiful course cards from this JSON data.`
    }

    // Special handling for BLOG queries - use JSON format
    if (queryType === QueryType.BLOG) {
      return `Based on the tool results below, provide a response following the EXACT format specified in the blog-specific prompt.

Tool Results:
${resultsText}

**CRITICAL - YOU MUST USE JSON FORMAT:**

1. **ALWAYS INCLUDE JSON CODE BLOCK** - Every blog response MUST contain the complete JSON data wrapped in markdown code fence

2. **Response Structure:**
   - Brief intro message in the user's language
   - JSON code block with ALL blog posts from tool results
   - Optional follow-up suggestion

3. **Include Complete Data** for each blog:
   - id, title, slug, date, image, excerpt, tags

The frontend will automatically render beautiful blog cards from this JSON data.`
    }

    // Default format for other query types
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
6. If any tool returned an error, acknowledge it gracefully in the appropriate language
7. When mentioning missing courses/data, use proper perspective
8. End with helpful next steps or suggestions in the user's language
9. Keep the tone friendly and encouraging`
  }
}
