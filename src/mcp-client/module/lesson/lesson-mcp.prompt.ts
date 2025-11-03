import { Injectable, Logger } from '@nestjs/common'
import { QueryType } from 'src/mcp-client/shared/query-detection.utils'

@Injectable()
export class LessonPromptService {
  private readonly logger = new Logger(LessonPromptService.name)

  getLessonSpecificPrompt(queryType: QueryType): string {
    if (queryType !== QueryType.LESSON) {
      return ''
    }

    return `
Focus: Lesson Information & Reviews

Available Tools:
- get_course_lessons: Get all lessons for a course organized by modules
- get_lesson_detail: Get detailed info about a specific lesson (content, duration, quiz/live info)
- get_course_reviews: Get rating statistics and recent student reviews for a course

Guidelines:
1. Use get_course_lessons to show course structure and all lessons
2. Use get_lesson_detail when user asks about specific lesson content
3. Use get_course_reviews to show student feedback and ratings
4. Explain lesson types clearly:
   - VIDEO: Video lecture content
   - QUIZ: Assessment/test
   - ARTICLE: Text-based content
   - LIVE: Live online session
5. Show duration in a user-friendly format (e.g., "15 minutes", "1 hour 30 minutes")
6. For reviews, highlight average rating and total count
7. Include module organization when listing lessons

CRITICAL - Tool Limitation:
- ONLY use the tools listed above for lesson/review information
- Do NOT make up lesson content, reviews, or ratings that are not returned by tools
- If a tool returns empty data or error, acknowledge it honestly
- Do NOT hallucinate or fabricate information outside of tool results
- If user asks about something not available in tools, politely explain what you CAN provide

Examples:
- "Khóa học này có bao nhiêu bài học?" → Use get_course_lessons
- "Bài học 1 nói về gì?" → Use get_lesson_detail
- "Học viên đánh giá khóa học này như thế nào?" → Use get_course_reviews
- "Có bài quiz nào không?" → Use get_course_lessons, check lesson kind
`
  }
}
