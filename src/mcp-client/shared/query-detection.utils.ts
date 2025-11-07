export enum QueryType {
  COURSE = 'COURSE',
  LESSON = 'LESSON',
  FLASHCARD = 'FLASHCARD',
  ASSESSMENT = 'ASSESSMENT',
  ENROLLMENT = 'ENROLLMENT',
  PROGRESS = 'PROGRESS',
  BLOG = 'BLOG',
  GENERAL = 'GENERAL',
}

export function detectQueryType(query: string): QueryType {
  const lowerQuery = query.toLowerCase()

  const courseKeywords = [
    // English
    'course',
    'class',
    'curriculum',
    'program',
    'enroll',
    'register',
    'tuition',
    'fee',
    // Vietnamese
    'khóa học',
    'lớp học',
    'chương trình',
    'đăng ký',
    'học phí',
    'ghi danh',
    // Japanese
    'コース',
    '講座',
    '授業',
    '登録',
    '受講',
    // JLPT levels
    'n5',
    'n4',
    'n3',
    'n2',
    'n1',
    'jlpt',
    // Level descriptions
    'beginner',
    'elementary',
    'intermediate',
    'advanced',
    'người mới',
    'sơ cấp',
    'trung cấp',
    'cao cấp',
    '初級',
    '中級',
    '上級',
  ]

  // Lesson-specific keywords
  const lessonKeywords = [
    // English
    'lesson',
    'module',
    'unit',
    'chapter',
    'section',
    // Vietnamese
    'bài học',
    'bài',
    'chương',
    'phần',
    // Japanese
    'レッスン',
    '課',
    '章',
  ]

  // Flashcard-specific keywords
  const flashcardKeywords = [
    // English
    'flashcard',
    'flashcards', // plural form
    'card',
    'cards', // plural form
    'vocabulary',
    'vocab',
    'memorize',
    'review',
    'practice',
    'deck',
    'create flashcard',
    'generate flashcard',
    'make flashcard',
    // Vietnamese
    'thẻ',
    'các thẻ',
    'từ vựng',
    'ôn tập',
    'luyện tập',
    'ghi nhớ',
    'bộ thẻ',
    'tạo flashcard',
    'tạo flashcards',
    'tạo thẻ',
    'gen flashcard',
    // Japanese
    'フラッシュカード',
    '単語',
    '復習',
    '暗記',
    'カード',
    'デッキ',
    'カードを作成',
    'カードを生成',
  ]

  // Assessment-specific keywords
  const assessmentKeywords = [
    // English
    'test',
    'quiz',
    'exam',
    'assessment',
    'question',
    'answer',
    'score',
    'result',
    // Vietnamese
    'bài kiểm tra',
    'bài thi',
    'câu hỏi',
    'đáp án',
    'điểm',
    'kết quả',
    // Japanese
    'テスト',
    '試験',
    '問題',
    '答え',
    '点数',
    '結果',
  ]

  // Enrollment/Progress-specific keywords
  const enrollmentKeywords = [
    // English - Enrollment
    'enroll',
    'enrollment',
    'enrolled',
    'register',
    'registered',
    'registration',
    'signed up',
    'sign up',
    'my courses',
    // English - Progress
    'progress',
    'progression',
    'advancement',
    'learning',
    'study',
    'complete',
    'completion',
    'streak',
    'stats',
    'statistics',
    // Vietnamese - Enrollment
    'đăng ký',
    'ghi danh',
    'đã đăng ký',
    'các khóa học',
    'khóa của tôi',
    'khóa đã đăng ký',
    // Vietnamese - Progress
    'tiến độ',
    'tiến trình',
    'quá trình học',
    'học tập',
    'hoàn thành',
    'chuỗi',
    'thống kê',
    // Japanese - Enrollment
    '登録', // touroku
    '受講', // jukou
    'コース', // kousu
    '登録済み', // touroku zumi
    // Japanese - Progress
    '進捗', // shinchoku
    '進度', // shindo
    '進行', // shinkou
    '学習', // gakushuu
    '完了', // kanryou
    '統計', // toukei
  ]

  // Blog-specific keywords
  const blogKeywords = [
    // English
    'blog',
    'post',
    'article',
    'read',
    'tips',
    'guide',
    'tutorial',
    'explanation',
    'grammar',
    'culture',
    'strategy',
    // Vietnamese
    'bài viết',
    'blog',
    'article',
    'đọc',
    'mẹo',
    'hướng dẫn',
    'giải thích',
    'ngữ pháp',
    'văn hóa',
    'chiến lược',
    'tips',
    'mẹo học',
    'bài về',
    // Japanese
    'ブログ', // blog
    '記事', // kiji - article
    '投稿', // toukou - post
    '文法', // bunpou - grammar
    '文化', // bunka - culture
    'ヒント', // hint - tips
    'ガイド', // guide
  ]

  const hasCourseKeyword = courseKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasLessonKeyword = lessonKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasFlashcardKeyword = flashcardKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasAssessmentKeyword = assessmentKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasEnrollmentKeyword = enrollmentKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasBlogKeyword = blogKeywords.some((keyword) => lowerQuery.includes(keyword))

  // Check for flashcard CREATION intent (high priority)
  const isFlashcardCreation =
    hasFlashcardKeyword &&
    (lowerQuery.includes('tạo') ||
      lowerQuery.includes('create') ||
      lowerQuery.includes('generate') ||
      lowerQuery.includes('make') ||
      lowerQuery.includes('gen'))

  // Priority: Flashcard Creation > Blog > Enrollment > Course > Flashcard > Assessment > Lesson > General
  // CRITICAL: Flashcard creation takes HIGHEST priority to ensure tool is called
  if (isFlashcardCreation) return QueryType.FLASHCARD
  if (hasBlogKeyword) return QueryType.BLOG
  if (hasEnrollmentKeyword) return QueryType.ENROLLMENT
  if (hasCourseKeyword) return QueryType.COURSE
  if (hasFlashcardKeyword) return QueryType.FLASHCARD
  if (hasAssessmentKeyword) return QueryType.ASSESSMENT
  if (hasLessonKeyword) return QueryType.LESSON

  return QueryType.GENERAL
}

export function isSearchQuery(query: string): boolean {
  const searchKeywords = [
    'find',
    'search',
    'look for',
    'show',
    'list',
    'tìm',
    'tìm kiếm',
    'cho tôi',
    'hiển thị',
    '探す',
    '検索',
    '見せて',
  ]

  return searchKeywords.some((keyword) => query.toLowerCase().includes(keyword))
}

export function isRecommendationQuery(query: string): boolean {
  const recommendKeywords = [
    'recommend',
    'suggest',
    'advice',
    'suitable',
    'best',
    'gợi ý',
    'đề xuất',
    'phù hợp',
    'tốt nhất',
    'nên',
    'おすすめ',
    '推奨',
    '適切',
  ]

  return recommendKeywords.some((keyword) => query.toLowerCase().includes(keyword))
}

/**
 * Detect if query requires multiple tool types
 * Returns which tool categories are needed
 */
export interface MultiToolRequirement {
  requiresCourse: boolean
  requiresLesson: boolean
  requiresFlashcard: boolean
  requiresAssessment: boolean
  requiresBlog: boolean
  toolCategories: QueryType[]
}

export function detectMultiToolRequirement(query: string): MultiToolRequirement {
  const lowerQuery = query.toLowerCase()

  // Course keywords
  const courseKeywords = ['khóa học', 'course', 'khoá', 'コース', '講座', 'curriculum', 'program']

  // Lesson keywords
  const lessonKeywords = [
    'bài học',
    'lesson',
    'chi tiết bài',
    'nội dung bài',
    'レッスン',
    '課',
    'module',
    'unit',
    'chapter',
  ]

  // Flashcard keywords
  const flashcardKeywords = ['flashcard', 'thẻ', 'từ vựng', 'vocabulary', 'フラッシュカード', '単語']

  // Assessment keywords
  const assessmentKeywords = ['test', 'quiz', 'exam', 'bài kiểm tra', 'bài thi', 'テスト', '試験']

  // Blog keywords
  const blogKeywords = ['blog', 'post', 'article', 'bài viết', 'tips', 'guide', 'mẹo', 'hướng dẫn', 'ブログ', '記事']

  const requiresCourse = courseKeywords.some((keyword) => lowerQuery.includes(keyword))
  const requiresLesson = lessonKeywords.some((keyword) => lowerQuery.includes(keyword))
  const requiresFlashcard = flashcardKeywords.some((keyword) => lowerQuery.includes(keyword))
  const requiresAssessment = assessmentKeywords.some((keyword) => lowerQuery.includes(keyword))
  const requiresBlog = blogKeywords.some((keyword) => lowerQuery.includes(keyword))

  const toolCategories: QueryType[] = []
  if (requiresCourse) toolCategories.push(QueryType.COURSE)
  if (requiresLesson) toolCategories.push(QueryType.LESSON)
  if (requiresFlashcard) toolCategories.push(QueryType.FLASHCARD)
  if (requiresAssessment) toolCategories.push(QueryType.ASSESSMENT)
  if (requiresBlog) toolCategories.push(QueryType.BLOG)

  return {
    requiresCourse,
    requiresLesson,
    requiresFlashcard,
    requiresAssessment,
    requiresBlog,
    toolCategories,
  }
}

/**
 * Check if query explicitly asks for multiple tool types
 */
export function requiresMultipleTools(query: string): boolean {
  const multiToolRequirement = detectMultiToolRequirement(query)
  return multiToolRequirement.toolCategories.length > 1
}

/**
 * Suggest which specific tools should be called together
 */
export function suggestToolCombination(query: string): string[] {
  const lowerQuery = query.toLowerCase()
  const tools: string[] = []
  const requirement = detectMultiToolRequirement(query)

  // Check for LIVE course keywords
  const isLiveCourse =
    lowerQuery.includes('live') ||
    lowerQuery.includes('trực tuyến') ||
    lowerQuery.includes('lịch học') ||
    lowerQuery.includes('schedule') ||
    lowerQuery.includes('class time')

  // Determine course tools
  if (requirement.requiresCourse) {
    if (isLiveCourse) {
      // For LIVE courses, use search_live_courses (includes schedules)
      tools.push('search_live_courses')
    } else if (
      lowerQuery.includes('chi tiết') ||
      lowerQuery.includes('detail') ||
      lowerQuery.includes('詳細') ||
      requirement.requiresLesson
    ) {
      // For detailed info or when lessons are needed, use get_course_details
      // Note: get_course_details now includes modules + lessons automatically
      tools.push('get_course_details')
    } else if (isSearchQuery(query) || lowerQuery.includes('tìm') || lowerQuery.includes('find')) {
      tools.push('search_courses')
    }

    if (isRecommendationQuery(query)) {
      tools.push('get_recommended_courses')
    }
  }

  return [...new Set(tools)] // Remove duplicates
}

/**
 * Generate hint for AI about multi-tool usage based on query
 */
export function generateMultiToolHint(query: string): string {
  const requirement = detectMultiToolRequirement(query)
  const suggestedTools = suggestToolCombination(query)

  if (!requiresMultipleTools(query)) {
    return ''
  }

  const categories = requirement.toolCategories.join(' and ')
  const toolsList = suggestedTools.join(', ')

  return `HINT: This query requires information about ${categories}. Consider calling multiple tools: [${toolsList}] to provide a complete answer.`
}
