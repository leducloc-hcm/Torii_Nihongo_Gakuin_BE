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

CRITICAL - MANDATORY Display Format for EVERY Course:

**YOU MUST follow this EXACT format for each course:**

**Structure for each course:**

Optional Line (if thumbnailUrl is valid):
   - Image: ![Course Title](thumbnailUrl)
   - ONLY if thumbnailUrl is NOT null AND NOT empty string ("")
   - If thumbnailUrl is null/empty → SKIP this line

Next Line: Course heading with link (MANDATORY)
   - Format: ### [Course Title](http://localhost:3000/customer/explore-course/slug)
   - Use heading level 3 (three hash marks)
   - **CRITICAL: Use EXACT course title from tool data - DO NOT translate or modify**
   - **CRITICAL: Use EXACT slug from tool data**
   - Make the course title a clickable link
   - This heading with link is REQUIRED for every course

Following Lines: Course details as bullet points
   - Dash Cấp độ colon space Level (N5/N4/N3/N2/N1)
   - Dash Loại colon space Type (Video + Quiz, Live Only, etc.)
   - Dash Giá colon space Price VNĐ

**COMPLETE EXAMPLE Vietnamese (with thumbnail):**
Line 1: Thumbnail image
Line 2: Three hashes space open bracket Course Title close bracket open paren localhost URL with slug close paren
Line 3: Dash Cấp độ colon space N5
Line 4: Dash Loại colon space Video + Quiz
Line 5: Dash Giá colon space 10.000 VNĐ

Example output format:
Image with course thumbnail
Heading with link: Level 3 heading containing clickable link to course page
Bullet: Course level information
Bullet: Course type information  
Bullet: Price information

**COMPLETE EXAMPLE Vietnamese (without thumbnail):**
Line 1: Three hashes space open bracket Course Title close bracket open paren localhost URL with slug close paren
Line 2: Dash Cấp độ colon space N5
Line 3: Dash Loại colon space Live Only
Line 4: Dash Giá colon space 10.000 VNĐ

**IMPORTANT:** The heading (three hashes) makes the title stand out visually while the link makes it clickable

**CRITICAL RULES:**
1. **USE EXACT DATA:** Use the EXACT "title" and "slug" from tool response - DO NOT translate, DO NOT modify, DO NOT interpret
2. **THUMBNAIL CHECK:** Check thumbnailUrl field - if it exists AND is not empty string (""), DISPLAY the image using EXACT URL
3. **MANDATORY LINK:** ALWAYS show clickable link for every course using format: http://localhost:3000/customer/explore-course/{EXACT_SLUG}
4. **NO SUMMARIZATION:** Show ALL courses returned by tool - display each one with full details
5. **EXAMPLE:** If tool returns "N5 Course" → Display "N5 Course" (NOT "Khóa học N5")
6. **EXAMPLE:** If thumbnailUrl = "" (empty string) → Skip image, but MUST show link and details`
  }

  return ''
}
