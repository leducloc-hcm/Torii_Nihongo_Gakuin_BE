export enum QueryType {
  COURSE = 'COURSE',
  LESSON = 'LESSON',
  FLASHCARD = 'FLASHCARD',
  ASSESSMENT = 'ASSESSMENT',
  ASSESSMENT_HISTORY = 'ASSESSMENT_HISTORY',
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

  // Assessment-specific keywords (search for tests/exams)
  const assessmentKeywords = [
    // English
    'test',
    'quiz',
    'exam',
    'assessment',
    'question',
    'answer',
    // Vietnamese
    'bài kiểm tra',
    'bài thi',
    'câu hỏi',
    'đáp án',
    'đề thi',
    'practice test',
    'mock exam',
    // Japanese
    'テスト',
    '試験',
    '問題',
    '答え',
  ]

  // Assessment History keywords (user's past attempts & progress)
  const assessmentHistoryKeywords = [
    // English - History
    'history',
    'my test',
    'my exam',
    'my quiz',
    'completed',
    'attempted',
    'past test',
    'previous test',
    'did i',
    'have i',
    // English - Results
    'score',
    'result',
    'grade',
    'performance',
    'how did i',
    // English - Progress
    'progress',
    'improvement',
    'trend',
    'statistics',
    'stats',
    'summary',
    // Vietnamese - History
    'lịch sử',
    'đã làm',
    'đã thi',
    'bài đã làm',
    'tôi đã',
    'mình đã',
    'các bài đã',
    // Vietnamese - Results
    'điểm',
    'kết quả',
    'điểm số',
    'thành tích',
    'làm được',
    // Vietnamese - Progress
    'tiến độ',
    'tiến bộ',
    'cải thiện',
    'thống kê',
    'tổng hợp',
    // Japanese - History
    '履歴', // rireki
    'した', // past tense
    '受けた', // uketa - took (test)
    // Japanese - Progress
    '進捗', // shinchoku
    '改善', // kaizen
    '統計', // toukei
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
  const hasAssessmentHistoryKeyword = assessmentHistoryKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasEnrollmentKeyword = enrollmentKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasBlogKeyword = blogKeywords.some((keyword) => lowerQuery.includes(keyword))

  const isFlashcardCreation =
    hasFlashcardKeyword &&
    (lowerQuery.includes('tạo') ||
      lowerQuery.includes('create') ||
      lowerQuery.includes('generate') ||
      lowerQuery.includes('make') ||
      lowerQuery.includes('gen'))

  // Check for flashcard SEARCH intent (also high priority)
  const isFlashcardSearch =
    hasFlashcardKeyword &&
    (lowerQuery.includes('tìm') ||
      lowerQuery.includes('search') ||
      lowerQuery.includes('find') ||
      lowerQuery.includes('show') ||
      lowerQuery.includes('list') ||
      lowerQuery.includes('deck') ||
      lowerQuery.includes('bộ'))

  const isPersonalCourseQuery =
    (lowerQuery.includes('của tôi') ||
      lowerQuery.includes('của mình') ||
      lowerQuery.includes('my ') ||
      lowerQuery.includes('đã đăng ký') ||
      lowerQuery.includes('enrolled')) &&
    hasCourseKeyword

  const isAvailableCourseQuery =
    (lowerQuery.includes('của website') ||
      lowerQuery.includes('có những') ||
      lowerQuery.includes('có các') ||
      lowerQuery.includes('danh sách') ||
      lowerQuery.includes('available') ||
      lowerQuery.includes('all courses') ||
      lowerQuery.includes('tất cả')) &&
    hasCourseKeyword

  // Check for specific assessment queries (test, exam, quiz SEARCH)
  const isAssessmentSearchQuery =
    hasAssessmentKeyword &&
    (lowerQuery.includes('tìm') ||
      lowerQuery.includes('search') ||
      lowerQuery.includes('find') ||
      lowerQuery.includes('có những') ||
      lowerQuery.includes('có các') ||
      lowerQuery.includes('available') ||
      lowerQuery.includes('list') ||
      lowerQuery.includes('show'))

  // Check for assessment HISTORY queries (user's past attempts)
  const isAssessmentHistoryQuery = hasAssessmentHistoryKeyword

  // Priority: Flashcard Creation > Flashcard Search > Blog > Assessment History > Assessment Search > Available Courses > Personal Courses/Enrollment > Course > Lesson > General
  // CRITICAL: Flashcard operations take HIGHEST priority to ensure correct tool is called
  // CRITICAL: Assessment History must come BEFORE Assessment Search (more specific)
  if (isFlashcardCreation) return QueryType.FLASHCARD
  if (isFlashcardSearch) return QueryType.FLASHCARD
  if (hasBlogKeyword) return QueryType.BLOG
  if (isAssessmentHistoryQuery) return QueryType.ASSESSMENT_HISTORY // NEW: User's test history
  if (isAssessmentSearchQuery) return QueryType.ASSESSMENT // Search for available tests
  if (isAvailableCourseQuery) return QueryType.COURSE // Ask about website courses = COURSE query
  if (isPersonalCourseQuery) return QueryType.ENROLLMENT // Ask about MY courses = ENROLLMENT query
  if (hasEnrollmentKeyword && !hasCourseKeyword) return QueryType.ENROLLMENT // Pure enrollment keywords
  if (hasCourseKeyword && !hasFlashcardKeyword) return QueryType.COURSE // CHANGED: Only if NO flashcard keyword
  if (hasFlashcardKeyword) return QueryType.FLASHCARD // MOVED: Any other flashcard keyword
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
