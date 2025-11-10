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
    // 🇬🇧 English - Course general
    'course',
    'class',
    'classroom',
    'curriculum',
    'program',
    'syllabus',
    'training',
    'workshop',

    // 🇬🇧 English - Course types
    'video course',
    'online course',
    'live class',
    'self-paced',
    'instructor-led',

    // 🇻🇳 Vietnamese - Course general
    'khóa học',
    'khoá học', // alternative spelling
    'lớp học',
    'lớp',
    'chương trình',
    'chương trình học',
    'khoá',
    'môn học',

    // 🇻🇳 Vietnamese - Course search
    'tìm khóa',
    'tìm khoá',
    'khóa nào',
    'khoá nào',
    'có khóa',
    'có khoá',
    'các khóa',
    'các khoá',

    // 🇻🇳 Vietnamese - Course types
    'khóa video',
    'khóa trực tuyến',
    'lớp trực tiếp',
    'học online',
    'học trực tuyến',

    // 🇯🇵 Japanese - Course general
    'コース',
    '講座',
    '授業',
    'クラス',
    'レッスン',
    'カリキュラム',
    'プログラム',

    // 🇯🇵 Japanese - Course types
    'ビデオコース',
    'オンラインコース',
    'ライブクラス',
    '動画講座',

    // JLPT levels (universal)
    'n5',
    'n4',
    'n3',
    'n2',
    'n1',
    'jlpt',
    'jlpt n5',
    'jlpt n4',
    'jlpt n3',
    'jlpt n2',
    'jlpt n1',

    // 🇬🇧 English - Level descriptions
    'beginner',
    'elementary',
    'intermediate',
    'advanced',
    'basic',
    'fundamental',

    // 🇻🇳 Vietnamese - Level descriptions
    'người mới',
    'người mới bắt đầu',
    'sơ cấp',
    'cơ bản',
    'trung cấp',
    'cao cấp',
    'nâng cao',
    'bắt đầu',

    // 🇯🇵 Japanese - Level descriptions
    '初級',
    '中級',
    '上級',
    '初心者',
    '基礎',
    '基本',
  ]

  // Lesson-specific keywords
  const lessonKeywords = [
    // 🇬🇧 English - Lesson
    'lesson',
    'module',
    'unit',
    'chapter',
    'section',
    'lecture',
    'video lesson',
    'study material',

    // 🇻🇳 Vietnamese - Lesson
    'bài học',
    'bài',
    'buổi học',
    'chương',
    'phần',
    'module',
    'nội dung bài',
    'tài liệu học',
    'video bài học',

    // 🇯🇵 Japanese - Lesson
    'レッスン',
    '課',
    '章',
    '授業',
    'ユニット',
    '教材',
  ]

  // Flashcard-specific keywords
  const flashcardKeywords = [
    // 🇬🇧 English - Flashcard general
    'flashcard',
    'flashcards',
    'flash card',
    'flash cards',
    'card',
    'cards',
    'deck',
    'decks',

    // 🇬🇧 English - Flashcard actions
    'create flashcard',
    'generate flashcard',
    'make flashcard',
    'create cards',
    'generate cards',
    'make cards',
    'add flashcard',

    // 🇬🇧 English - Flashcard search
    'find flashcard',
    'search flashcard',
    'show flashcard',
    'flashcard deck',
    'available flashcard',

    // 🇬🇧 English - Study related
    'vocabulary',
    'vocab',
    'memorize',
    'review',
    'practice',
    'study card',
    'memory card',
    'spaced repetition',

    // 🇻🇳 Vietnamese - Flashcard general
    'flashcard',
    'thẻ',
    'các thẻ',
    'thẻ học',
    'thẻ ghi nhớ',
    'bộ thẻ',
    'deck',

    // 🇻🇳 Vietnamese - Flashcard actions
    'tạo flashcard',
    'tạo flashcards',
    'tạo thẻ',
    'tạo thẻ học',
    'gen flashcard',
    'sinh flashcard',
    'làm flashcard',
    'thêm flashcard',

    // 🇻🇳 Vietnamese - Flashcard search
    'tìm flashcard',
    'tìm thẻ',
    'có flashcard',
    'có thẻ',
    'flashcard nào',
    'thẻ nào',
    'bộ thẻ nào',
    'xem flashcard',

    // 🇻🇳 Vietnamese - Study related
    'từ vựng',
    'từ vựng',
    'ôn tập',
    'luyện tập',
    'ghi nhớ',
    'học thuộc',
    'ôn luyện',

    // 🇯🇵 Japanese - Flashcard general
    'フラッシュカード',
    'カード',
    'デッキ',
    '単語カード',
    '暗記カード',

    // 🇯🇵 Japanese - Flashcard actions
    'カードを作成',
    'カードを生成',
    'フラッシュカードを作る',
    'カードを作る',
    'フラッシュカードを作成',

    // 🇯🇵 Japanese - Flashcard search
    'カードを探す',
    'フラッシュカードを探す',
    'カードはある',
    'デッキを見せて',

    // 🇯🇵 Japanese - Study related
    '単語',
    '語彙',
    '復習',
    '暗記',
    '覚える',
    '記憶',
  ]

  // Assessment-specific keywords (search for tests/exams)
  const assessmentKeywords = [
    // 🇬🇧 English - General assessment
    'test',
    'quiz',
    'exam',
    'examination',
    'assessment',
    'question',
    'questions',
    'answer',
    'answers',

    // 🇬🇧 English - Practice/Trial tests (10-30 questions, 15-45 min)
    'practice test',
    'trial test',
    'mini test',
    'practice quiz',
    'practice exam',
    'trial exam',
    'quick test',
    'short test',
    'sample test',

    // 🇬🇧 English - Mock/Full exams (100+ questions, 2-3 hours)
    'mock exam',
    'full exam',
    'jlpt exam',
    'simulation test',
    'mock test',
    'full test',
    'complete exam',
    'actual exam',
    'real exam',
    'final exam',

    // 🇻🇳 Vietnamese - General assessment
    'bài kiểm tra',
    'bài thi',
    'kiểm tra',
    'thi',
    'đề',
    'đề thi',
    'câu hỏi',
    'đáp án',
    'trả lời',

    // 🇻🇳 Vietnamese - Practice/Trial tests (TEST - ngắn, 10-30 câu)
    'test thực hành',
    'test thử',
    'bài test',
    'test luyện tập',
    'thử sức',
    'test mini',
    'test ngắn',
    'bài luyện tập',
    'test nhanh',
    'test mẫu',
    'luyện đề',

    // 🇻🇳 Vietnamese - Mock/Full exams (EXAM - đầy đủ, 100+ câu)
    'đề thi thử',
    'thi thử',
    'thi thử jlpt',
    'đề thi jlpt',
    'đề thi đầy đủ',
    'bài thi đầy đủ',
    'đề thi chính thức',
    'thi chính thức',
    'thi thật',
    'đề thi thật',
    'thi cuối kỳ',

    // 🇯🇵 Japanese - General assessment
    'テスト',
    '試験',
    '問題',
    '答え',
    '解答',
    '設問',

    // 🇯🇵 Japanese - Practice/Trial tests (TEST - 短い、10-30問)
    '練習テスト',
    '試験練習',
    'ミニテスト',
    '練習問題',
    '小テスト',
    'クイズ',
    '練習',
    'ドリル',

    // 🇯🇵 Japanese - Mock/Full exams (EXAM - 完全、100+問)
    '模擬試験',
    'jlpt試験',
    '本番試験',
    '実戦試験',
    '模試',
    '本試験',
    '実際の試験',
    '正式な試験',
  ]

  // Assessment History keywords (user's past attempts & progress)
  const assessmentHistoryKeywords = [
    // 🇬🇧 English - History/Past
    'history',
    'my test',
    'my tests',
    'my exam',
    'my exams',
    'my quiz',
    'my quizzes',
    'completed',
    'attempted',
    'past test',
    'past tests',
    'previous test',
    'previous tests',
    'did i',
    'have i',
    'i took',
    'i did',
    'tests i took',
    'exams i took',

    // 🇬🇧 English - Results/Scores
    'score',
    'scores',
    'result',
    'results',
    'grade',
    'grades',
    'performance',
    'how did i do',
    'how did i perform',
    'my score',
    'my result',
    'my grade',

    // 🇬🇧 English - Progress/Analysis
    'progress',
    'improvement',
    'trend',
    'statistics',
    'stats',
    'summary',
    'analysis',
    'review',
    'my progress',
    'progress summary',

    // 🇻🇳 Vietnamese - History/Past
    'lịch sử',
    'lịch sử làm bài',
    'đã làm',
    'đã thi',
    'bài đã làm',
    'bài tôi đã làm',
    'tôi đã',
    'mình đã',
    'các bài đã',
    'các bài đã làm',
    'bài làm cũ',
    'làm bài nào',

    // 🇻🇳 Vietnamese - Results/Scores
    'điểm',
    'điểm số',
    'kết quả',
    'kết quả thi',
    'thành tích',
    'làm được',
    'điểm của tôi',
    'kết quả của tôi',
    'tôi được bao nhiêu',
    'làm được bao nhiêu',

    // 🇻🇳 Vietnamese - Progress/Analysis
    'tiến độ',
    'tiến bộ',
    'cải thiện',
    'thống kê',
    'tổng hợp',
    'phân tích',
    'xem lại',
    'tiến độ học',
    'quá trình học',

    // 🇯🇵 Japanese - History/Past
    '履歴',
    'テスト履歴',
    '試験履歴',
    'した',
    '受けた',
    '受験した',
    'やった',
    '過去のテスト',
    '以前のテスト',

    // 🇯🇵 Japanese - Results/Scores
    'スコア',
    '点数',
    '成績',
    '結果',
    '得点',
    '私のスコア',
    '私の結果',

    // 🇯🇵 Japanese - Progress/Analysis
    '進捗',
    '進度',
    '改善',
    '統計',
    '分析',
    'レビュー',
    '進捗状況',
    '学習進捗',
  ]

  // Enrollment/Progress-specific keywords
  const enrollmentKeywords = [
    // 🇬🇧 English - Enrollment
    'enroll',
    'enrollment',
    'enrolled',
    'register',
    'registered',
    'registration',
    'signed up',
    'sign up',
    'my courses',
    'my classes',
    'enrolled courses',
    'registered courses',
    'courses i enrolled',
    'courses i registered',
    'courses i signed up',

    // 🇬🇧 English - Progress
    'progress',
    'progression',
    'advancement',
    'learning progress',
    'study progress',
    'course progress',
    'my progress',
    'how far',
    'complete',
    'completed',
    'completion',
    'completion status',
    'streak',
    'study streak',
    'learning streak',
    'stats',
    'statistics',
    'study time',
    'learning time',

    // 🇻🇳 Vietnamese - Enrollment
    'đăng ký',
    'ghi danh',
    'đã đăng ký',
    'đã ghi danh',
    'các khóa học',
    'khóa của tôi',
    'khóa học của tôi',
    'khoá của tôi',
    'khóa đã đăng ký',
    'khóa tôi đăng ký',
    'các khóa đã đăng ký',
    'khóa đang học',
    'đang học khóa',

    // 🇻🇳 Vietnamese - Progress
    'tiến độ',
    'tiến độ học',
    'tiến trình',
    'tiến trình học',
    'quá trình học',
    'học tập',
    'học được',
    'học đến đâu',
    'hoàn thành',
    'đã hoàn thành',
    'tỉ lệ hoàn thành',
    'chuỗi',
    'chuỗi ngày',
    'chuỗi học',
    'thống kê',
    'thống kê học tập',
    'thời gian học',

    // 🇯🇵 Japanese - Enrollment
    '登録',
    '受講',
    '受講中',
    'コース',
    '登録済み',
    '登録したコース',
    '受講しているコース',
    '私のコース',
    'マイコース',
    '受講コース',

    // 🇯🇵 Japanese - Progress
    '進捗',
    '進度',
    '進行',
    '学習進捗',
    '学習',
    '勉強',
    '完了',
    '完了状況',
    '連続',
    '連続記録',
    '統計',
    '学習統計',
    '学習時間',
    'どこまで',
  ]

  // Blog-specific keywords
  const blogKeywords = [
    // 🇬🇧 English - Blog general
    'blog',
    'blog post',
    'post',
    'article',
    'read',
    'reading',

    // 🇬🇧 English - Learning content
    'tips',
    'tip',
    'guide',
    'tutorial',
    'how to',
    'explanation',
    'advice',
    'strategy',
    'technique',
    'method',

    // 🇬🇧 English - Topics
    'grammar',
    'vocabulary',
    'kanji',
    'culture',
    'pronunciation',
    'listening',
    'speaking',
    'reading',
    'writing',

    // 🇻🇳 Vietnamese - Blog general
    'bài viết',
    'blog',
    'article',
    'đọc',
    // NOTE: 'bài' removed - too generic, conflicts with 'bài test', 'bài thi'
    'bài về', // Keep this - more specific (article about)

    // 🇻🇳 Vietnamese - Learning content
    'mẹo',
    'mẹo học',
    'hướng dẫn',
    'cách học',
    'giải thích',
    'lời khuyên',
    'chiến lược',
    'phương pháp',
    'kỹ thuật',
    'tips',
    'tricks',

    // 🇻🇳 Vietnamese - Topics
    'ngữ pháp',
    'từ vựng',
    'kanji',
    'chữ hán',
    'văn hóa',
    'phát âm',
    'nghe',
    'nói',
    'đọc',
    'viết',

    // 🇯🇵 Japanese - Blog general
    'ブログ',
    '記事',
    '投稿',
    'ポスト',
    '読む',

    // 🇯🇵 Japanese - Learning content
    'ヒント',
    'コツ',
    'ガイド',
    'チュートリアル',
    '説明',
    'アドバイス',
    '方法',
    'やり方',
    'テクニック',

    // 🇯🇵 Japanese - Topics
    '文法',
    '単語',
    '語彙',
    '漢字',
    '文化',
    '発音',
    'リスニング',
    'スピーキング',
    '読解',
    '作文',
  ]

  const hasCourseKeyword = courseKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasLessonKeyword = lessonKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasFlashcardKeyword = flashcardKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasAssessmentKeyword = assessmentKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasAssessmentHistoryKeyword = assessmentHistoryKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasEnrollmentKeyword = enrollmentKeywords.some((keyword) => lowerQuery.includes(keyword))
  const hasBlogKeyword = blogKeywords.some((keyword) => lowerQuery.includes(keyword))

  // Detect flashcard CREATION intent (highest priority for flashcard)
  const isFlashcardCreation =
    hasFlashcardKeyword &&
    (lowerQuery.includes('tạo') ||
      lowerQuery.includes('create') ||
      lowerQuery.includes('generate') ||
      lowerQuery.includes('make') ||
      lowerQuery.includes('gen') ||
      lowerQuery.includes('sinh') ||
      lowerQuery.includes('làm') ||
      lowerQuery.includes('thêm') ||
      lowerQuery.includes('作成') ||
      lowerQuery.includes('生成') ||
      lowerQuery.includes('作る'))

  // Check for flashcard SEARCH intent (also high priority)
  const isFlashcardSearch =
    hasFlashcardKeyword &&
    (lowerQuery.includes('tìm') ||
      lowerQuery.includes('search') ||
      lowerQuery.includes('find') ||
      lowerQuery.includes('show') ||
      lowerQuery.includes('list') ||
      lowerQuery.includes('deck') ||
      lowerQuery.includes('bộ') ||
      lowerQuery.includes('có') ||
      lowerQuery.includes('xem') ||
      lowerQuery.includes('hiển thị') ||
      lowerQuery.includes('探す') ||
      lowerQuery.includes('見せて') ||
      lowerQuery.includes('ある'))

  // Detect personal course query (MY courses = ENROLLMENT)
  const isPersonalCourseQuery =
    (lowerQuery.includes('của tôi') ||
      lowerQuery.includes('của mình') ||
      lowerQuery.includes('tôi đã') ||
      lowerQuery.includes('my ') ||
      lowerQuery.includes('đã đăng ký') ||
      lowerQuery.includes('đang học') ||
      lowerQuery.includes('enrolled') ||
      lowerQuery.includes('私の') ||
      lowerQuery.includes('マイ')) &&
    hasCourseKeyword

  // Detect available course query (FIND courses = COURSE)
  const isAvailableCourseQuery =
    (lowerQuery.includes('của website') ||
      lowerQuery.includes('của hệ thống') ||
      lowerQuery.includes('có những') ||
      lowerQuery.includes('có các') ||
      lowerQuery.includes('có khóa') ||
      lowerQuery.includes('có khoá') ||
      lowerQuery.includes('danh sách') ||
      lowerQuery.includes('available') ||
      lowerQuery.includes('all courses') ||
      lowerQuery.includes('tất cả') ||
      lowerQuery.includes('tìm') ||
      lowerQuery.includes('find') ||
      lowerQuery.includes('search') ||
      lowerQuery.includes('探す') ||
      lowerQuery.includes('利用可能')) &&
    hasCourseKeyword

  // Check for specific assessment queries (test, exam, quiz SEARCH)
  // CRITICAL: Strong assessment indicators (test, trial, mock, exam) should trigger ASSESSMENT even without explicit search words
  const hasStrongAssessmentKeyword =
    lowerQuery.includes('test') ||
    lowerQuery.includes('exam') ||
    lowerQuery.includes('quiz') ||
    lowerQuery.includes('trial') ||
    lowerQuery.includes('mock') ||
    lowerQuery.includes('practice') ||
    lowerQuery.includes('đề thi') ||
    lowerQuery.includes('bài test') ||
    lowerQuery.includes('bài thi') ||
    lowerQuery.includes('試験') ||
    lowerQuery.includes('テスト') ||
    lowerQuery.includes('模擬')

  const isAssessmentSearchQuery =
    hasAssessmentKeyword &&
    (hasStrongAssessmentKeyword || // Strong indicators don't need search words
      lowerQuery.includes('tìm') ||
      lowerQuery.includes('search') ||
      lowerQuery.includes('find') ||
      lowerQuery.includes('có những') ||
      lowerQuery.includes('có các') ||
      lowerQuery.includes('có bài') ||
      lowerQuery.includes('có đề') ||
      lowerQuery.includes('available') ||
      lowerQuery.includes('list') ||
      lowerQuery.includes('show') ||
      lowerQuery.includes('hiển thị') ||
      lowerQuery.includes('探す') ||
      lowerQuery.includes('見せて') ||
      lowerQuery.includes('ある') ||
      // Assessment suggestion patterns
      lowerQuery.includes('how about') ||
      lowerQuery.includes('what about') ||
      lowerQuery.includes('thế nào về') ||
      lowerQuery.includes('về việc') ||
      lowerQuery.includes('còn') ||
      lowerQuery.includes('はどう') ||
      lowerQuery.includes('について'))

  // Check for assessment HISTORY queries (user's past attempts)
  // Must be very specific to avoid false positives
  const isAssessmentHistoryQuery =
    hasAssessmentHistoryKeyword ||
    (hasAssessmentKeyword &&
      (lowerQuery.includes('lịch sử') ||
        lowerQuery.includes('đã làm') ||
        lowerQuery.includes('đã thi') ||
        lowerQuery.includes('history') ||
        lowerQuery.includes('my test') ||
        lowerQuery.includes('my exam') ||
        lowerQuery.includes('past') ||
        lowerQuery.includes('previous') ||
        lowerQuery.includes('kết quả') ||
        lowerQuery.includes('điểm') ||
        lowerQuery.includes('score') ||
        lowerQuery.includes('result') ||
        lowerQuery.includes('履歴') ||
        lowerQuery.includes('した') ||
        lowerQuery.includes('受けた')))

  // Check for BLOG-specific patterns (more specific than just keywords)
  // Blog queries usually ask about learning CONTENT/TIPS, not tests/courses
  const isBlogQuery =
    hasBlogKeyword &&
    !hasAssessmentKeyword && // Not if it has test/exam keywords
    !hasFlashcardKeyword && // Not if it has flashcard keywords
    (lowerQuery.includes('bài viết') || // Explicit "article"
      lowerQuery.includes('blog') || // Explicit "blog"
      lowerQuery.includes('article') || // Explicit "article"
      lowerQuery.includes('mẹo') || // Tips
      lowerQuery.includes('tips') ||
      lowerQuery.includes('hướng dẫn') || // Guide
      lowerQuery.includes('guide') ||
      lowerQuery.includes('cách học') || // How to learn
      lowerQuery.includes('how to') ||
      lowerQuery.includes('đọc') || // Read
      lowerQuery.includes('read') ||
      lowerQuery.includes('記事') || // Article (JP)
      lowerQuery.includes('ヒント') || // Tips (JP)
      lowerQuery.includes('コツ')) // Tips/tricks (JP)

  // Priority: Flashcard Creation > Flashcard Search > Assessment History > Assessment Search > Blog > Available Courses > Personal Courses/Enrollment > Course > Lesson > General
  // CRITICAL: Flashcard operations take HIGHEST priority to ensure correct tool is called
  // CRITICAL: Assessment History must come BEFORE Assessment Search (more specific)
  // CRITICAL: Assessment checks must come BEFORE Blog to avoid false positives with 'bài test'
  if (isFlashcardCreation) return QueryType.FLASHCARD
  if (isFlashcardSearch) return QueryType.FLASHCARD
  if (isAssessmentHistoryQuery) return QueryType.ASSESSMENT_HISTORY // NEW: User's test history
  if (isAssessmentSearchQuery) return QueryType.ASSESSMENT // Search for available tests
  if (isBlogQuery) return QueryType.BLOG // MOVED: After assessment checks
  if (isAvailableCourseQuery) return QueryType.COURSE // Ask about website courses = COURSE query
  if (isPersonalCourseQuery) return QueryType.ENROLLMENT // Ask about MY courses = ENROLLMENT query
  if (hasEnrollmentKeyword && !hasCourseKeyword) return QueryType.ENROLLMENT // Pure enrollment keywords
  if (hasCourseKeyword && !hasFlashcardKeyword) return QueryType.COURSE // CHANGED: Only if NO flashcard keyword
  if (hasFlashcardKeyword) return QueryType.FLASHCARD // MOVED: Any other flashcard keyword
  if (hasAssessmentKeyword) return QueryType.ASSESSMENT
  if (hasLessonKeyword) return QueryType.LESSON
  if (hasBlogKeyword) return QueryType.BLOG // Fallback: generic blog keywords

  return QueryType.GENERAL
}

export function isSearchQuery(query: string): boolean {
  const searchKeywords = [
    // 🇬🇧 English
    'find',
    'search',
    'look for',
    'show',
    'show me',
    'list',
    'display',
    'get',
    'available',

    // 🇻🇳 Vietnamese
    'tìm',
    'tìm kiếm',
    'cho tôi',
    'cho mình',
    'hiển thị',
    'xem',
    'có',
    'có những',
    'có các',
    'có gì',
    'danh sách',

    // 🇯🇵 Japanese
    '探す',
    '検索',
    '見せて',
    '表示',
    'ある',
    'ください',
  ]

  return searchKeywords.some((keyword) => query.toLowerCase().includes(keyword))
}

export function isRecommendationQuery(query: string): boolean {
  const recommendKeywords = [
    // 🇬🇧 English
    'recommend',
    'suggest',
    'advice',
    'suitable',
    'best',
    'which',
    'what should',
    'help me choose',

    // 🇻🇳 Vietnamese
    'gợi ý',
    'đề xuất',
    'phù hợp',
    'tốt nhất',
    'nên',
    'nên học',
    'giúp chọn',
    'chọn gì',

    // 🇯🇵 Japanese
    'おすすめ',
    '推奨',
    '適切',
    '提案',
    'どれがいい',
    '何がいい',
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
