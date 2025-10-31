export enum QueryType {
  COURSE = 'COURSE',
  LESSON = 'LESSON',
  FLASHCARD = 'FLASHCARD',
  ASSESSMENT = 'ASSESSMENT',
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
    'card',
    'vocabulary',
    'vocab',
    'memorize',
    'review',
    'practice',
    // Vietnamese
    'thẻ',
    'từ vựng',
    'ôn tập',
    'luyện tập',
    'ghi nhớ',
    // Japanese
    'フラッシュカード',
    '単語',
    '復習',
    '暗記',
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

  const hasCourseKeyword = courseKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasLessonKeyword = lessonKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasFlashcardKeyword = flashcardKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasAssessmentKeyword = assessmentKeywords.some((keyword) => lowerQuery.includes(keyword))

  // Priority: Course > Flashcard > Assessment > Lesson > General
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
