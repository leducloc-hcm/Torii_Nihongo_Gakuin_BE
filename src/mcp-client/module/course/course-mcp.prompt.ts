import { Injectable, Logger } from '@nestjs/common'
import { CORE_BEHAVIOR_PROMPT } from 'src/mcp-client/prompts/core-behavior.prompt'
import { getLanguageDetectionPrompt } from 'src/mcp-client/prompts/language-detection.prompt'
import { META_CONTEXT_PROMPT } from 'src/mcp-client/prompts/meta-context.prompt'
import { detectLanguage, Language } from 'src/mcp-client/shared/language.utils'
import { QueryType } from 'src/mcp-client/shared/query-detection.utils'

@Injectable()
export class PromptService {
  private readonly logger = new Logger(PromptService.name)

  getSystemPrompt(queryType: QueryType, userName?: string, userQuery?: string): string {
    const greeting = userName ? `Hello ${userName}!` : 'Hello!'

    // Detect language from user query if provided
    let detectedLang = Language.ENGLISH
    if (userQuery) {
      detectedLang = detectLanguage(userQuery)
      this.logger.debug(`Detected language: ${detectedLang} for query: ${userQuery.substring(0, 50)}...`)
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

    const typeSpecificPrompt = this.getTypeSpecificPrompt(queryType)

    return basePrompt + typeSpecificPrompt
  }

  private getTypeSpecificPrompt(queryType: QueryType): string {
    switch (queryType) {
      case QueryType.COURSE:
        return `Focus: Course Information
- Use search_courses to find relevant courses
- Use get_course_details for detailed course information
- Use recommend_courses to suggest courses based on user's level
- Explain course structure, modules, and expected outcomes
- Highlight prerequisites and target JLPT levels

IMPORTANT - Course Links & Thumbnails:
- When mentioning a course, ALWAYS include a clickable link using this format:
  [Course Name](http://localhost:3000/customer/explore-course/{slug})
- The slug field is available in course data
- Example Vietnamese: [Khóa học N5](http://localhost:3000/customer/explore-course/n5-course)
- Example English: [N5 Course](http://localhost:3000/customer/explore-course/n5-course)
- Example Japanese: [N5コース](http://localhost:3000/customer/explore-course/n5-course)
- Make it easy for users to navigate to course details by clicking the link
- Remember: Course name in link should match the language of your response

IMPORTANT - Course Thumbnails (NEW):
- Course data includes a "thumbnailUrl" field with the course image URL
- You can display course thumbnails in your response using markdown image syntax
- Format: ![Course Title](thumbnailUrl)
- Example: ![Khóa học N5](https://cdn.example.com/n5-course.jpg)
- Place the image BEFORE the course description for visual appeal
- If thumbnailUrl is null or empty, skip the image (don't show broken image)
- Images will be automatically lazy-loaded and responsive in the chat UI`

      case QueryType.GENERAL:
      default:
        return `Focus: General Assistance
- Answer general questions about Japanese language learning
- Provide study tips and learning strategies
- Explain JLPT structure and requirements
- Guide students through platform features
- Use appropriate tools based on the question context`
    }
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
6. **IMPORTANT: For each course mentioned, include thumbnail and clickable link:**
   - If course has thumbnailUrl, display it: ![Course Title](thumbnailUrl)
   - Then add clickable link: [Course Name](http://localhost:3000/customer/explore-course/{slug})
   - Use the "slug" and "thumbnailUrl" fields from the course data
   - Course name in the link text should match your response language
   - Example Vietnamese:
     ![Khóa học N5](https://cdn.example.com/n5.jpg)
     [Khóa học N5 cho người mới bắt đầu](http://localhost:3000/customer/explore-course/n5-beginner)
   - Example English:
     ![N5 Course](https://cdn.example.com/n5.jpg)
     [N5 Beginner Course](http://localhost:3000/customer/explore-course/n5-beginner)
   - If thumbnailUrl is null/empty, skip the image and just show the link
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
