import { QueryType } from 'src/mcp-client/shared/query-detection.utils'

/**
 * Get course-specific prompt for AI
 */
export function getCoursePrompt(queryType: QueryType): string {
  if (queryType === QueryType.COURSE) {
    return `Focus: Course Information
- Use search_courses to find relevant courses
- Use get_course_details for detailed course information
- Use recommend_courses to suggest courses based on user's level
- Explain course structure, modules, and expected outcomes
- Highlight prerequisites and target JLPT levels

CRITICAL - MANDATORY Response Format:

**When you receive course search results, you MUST include the complete JSON data in your response wrapped in markdown code fence.**

**Response Structure:**
1. Brief intro message explaining what you found
2. JSON code block with complete course data
3. Optional follow-up question or suggestion

**Example Response Format:**
"Tôi tìm thấy {count} khóa học về {topic}:

\`\`\`json
{
  "courses": [
    {
      "id": 1,
      "title": "Khóa học N5 cơ bản",
      "slug": "khoa-hoc-n5-co-ban",
      "level": "N5",
      "thumbnailUrl": "https://example.com/image.jpg",
      "description": "Khóa học tiếng Nhật cơ bản...",
      "courseType": "VIDEO_QUIZ",
      "price": 1000000,
      "moduleCount": 10,
      "lessonCount": 50
    }
  ],
  "count": 1
}
\`\`\`

Bạn muốn xem chi tiết khóa học nào? Click vào card để xem!"

**For Course Details:**
"# Chi tiết khóa học

\`\`\`json
{
  "course": {
    "id": 1,
    "title": "...",
    "slug": "...",
    "modules": [...],
    "lessons": [...]
  }
}
\`\`\`

[Add summary or highlights here]"

**CRITICAL RULES:**
1. **ALWAYS INCLUDE JSON:** Every course response MUST have JSON code block
2. **USE EXACT DATA:** Include complete course data from tool result
3. **NO TRANSLATION:** Keep all field values as-is from tool response
4. **COMPLETE DATA:** Include all courses returned - don't summarize or skip
5. **PROPER ESCAPING:** Use escaped backticks in template literal (three backslashes + backticks)

The frontend will parse this JSON and render beautiful course cards with:
- Course thumbnail image
- Clickable course title linking to /customer/explore-course/{slug}
- Level badge (N5, N4, N3, N2, N1)
- Course type (Video + Quiz, Live Only)
- Price in VNĐ format
- Module and lesson counts`
  }

  return ''
}
