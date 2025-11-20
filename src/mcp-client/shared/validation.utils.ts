import { DOMAIN_CONSTRAINTS_PROMPT } from '../prompts/domain-constraints.prompt'
import { JLPT_LEVEL_VALIDATION_PROMPT } from '../prompts/jlpt-validation.prompt'

export function isJapaneseLearningQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase()

  const japaneseKeywords = [
    // English
    'japanese',
    'japan',
    'jlpt',
    'n1',
    'n2',
    'n3',
    'n4',
    'n5',
    'kanji',
    'hiragana',
    'katakana',
    'grammar',
    'vocabulary',
    'pronunciation',
    'speaking',
    'listening',
    'reading',
    'writing',
    'keigo',
    'honorific',
    'polite',
    'casual',
    'formal',
    'sensei',
    'san',
    'kun',
    'chan',
    'sama',
    'anime',
    'manga',
    'culture',
    'business japanese',
    'conversation',
    'dialogue',
    'phrase',
    'sentence',

    'tiếng nhật',
    'tieng nhat',
    'nhật bản',
    'nhat ban',
    'jlpt',
    'kanji',
    'hiragana',
    'katakana',
    'ngữ pháp',
    'ngu phap',
    'từ vựng',
    'tu vung',
    'phát âm',
    'phat am',
    'nói',
    'nghe',
    'đọc',
    'viết',
    'kính ngữ',
    'kinh ngu',
    'lịch sự',
    'lich su',
    'thường',
    'trang trọng',
    'hội thoại',
    'hoi thoai',
    'câu',
    'cau',
    'văn phạm',
    'van pham',
    'học tiếng nhật',
    'hoc tieng nhat',

    // Japanese
    '日本語',
    '日本',
    'にほんご',
    'ニホンゴ',
    '文法',
    '語彙',
    '発音',
    '会話',
    '漢字',
    'ひらがな',
    'カタカナ',
    '敬語',
    '丁寧語',
    '謙譲語',
    '尊敬語',
    'リスニング',
    'スピーキング',
    '読解',
    '作文',
    '初級',
    '中級',
    '上級',
    '基礎',
    '基本',
  ]

  // Check for Japanese learning keywords
  const hasJapaneseKeywords = japaneseKeywords.some((keyword) => lowerQuery.includes(keyword))

  // Check for course-related content (assume Japanese courses)
  const courseKeywords = ['khóa học', 'course', 'lesson', 'bài học', 'コース', '講座']
  const hasCourseKeywords = courseKeywords.some((keyword) => lowerQuery.includes(keyword))

  // Check for flashcard-related content (assume Japanese flashcards)
  const flashcardKeywords = ['flashcard', 'thẻ', 'vocabulary', 'từ vựng', 'フラッシュカード']
  const hasFlashcardKeywords = flashcardKeywords.some((keyword) => lowerQuery.includes(keyword))

  // Check for assessment-related content (assume JLPT assessments)
  const assessmentKeywords = ['test', 'quiz', 'exam', 'bài thi', 'kiểm tra', 'テスト', '試験']
  const hasAssessmentKeywords = assessmentKeywords.some((keyword) => lowerQuery.includes(keyword))

  // 🆕 Check for blog-related content (assume Japanese learning blog posts)
  const blogKeywords = ['blog', 'bài viết', 'blog post', 'article', 'ブログ', '記事']
  const hasBlogKeywords = blogKeywords.some((keyword) => lowerQuery.includes(keyword))

  // 🆕 Check for website context (queries about website features are valid)
  const websiteContextKeywords = [
    'website',
    'hệ thống',
    'platform',
    'trang web',
    'ứng dụng',
    'app',
    'của website',
    'của hệ thống',
    'có sẵn',
    'hiện có',
    'available',
  ]
  const hasWebsiteContext = websiteContextKeywords.some((keyword) => lowerQuery.includes(keyword))

  return (
    hasJapaneseKeywords ||
    hasCourseKeywords ||
    hasFlashcardKeywords ||
    hasAssessmentKeywords ||
    hasBlogKeywords ||
    hasWebsiteContext
  )
}

/**
 * Check if a query mentions invalid JLPT levels
 */
export function hasInvalidJLPTLevel(query: string): { hasInvalid: boolean; invalidLevels: string[] } {
  const lowerQuery = query.toLowerCase()
  const invalidLevels: string[] = []

  // Patterns for invalid JLPT levels
  const invalidPatterns = [
    // Direct invalid levels
    /n0\b/gi,
    /n6\b/gi,
    /n7\b/gi,
    /n8\b/gi,
    /n9\b/gi,
    /n10\b/gi,
    /level\s*0/gi,
    /level\s*6/gi,
    /level\s*7/gi,
    /level\s*8/gi,
    /level\s*9/gi,
    /level\s*10/gi,
    /cấp\s*0/gi,
    /cấp\s*6/gi,
    /cấp\s*7/gi,
    /cấp\s*8/gi,
    /cấp\s*9/gi,
    /cấp\s*10/gi,

    // Range expressions beyond valid levels
    />\s*n5/gi, // Higher than N5 (could be valid N4-N1)
    /<\s*n1/gi, // Lower than N1 (could be valid N2-N5)
    /cao\s*hơn\s*n1/gi, // Higher than N1 (invalid)
    /thấp\s*hơn\s*n5/gi, // Lower than N5 (invalid)
    /trên\s*n1/gi, // Above N1 (invalid)
    /dưới\s*n5/gi, // Below N5 (invalid)
    /above\s*n1/gi, // Above N1 (invalid)
    /below\s*n5/gi, // Below N5 (invalid)
  ]

  invalidPatterns.forEach((pattern) => {
    const matches = query.match(pattern)
    if (matches) {
      invalidLevels.push(...matches)
    }
  })

  return {
    hasInvalid: invalidLevels.length > 0,
    invalidLevels: [...new Set(invalidLevels)], // Remove duplicates
  }
}

/**
 * Generate domain constraint error message
 */
export function generateDomainConstraintMessage(language: 'vi' | 'en' | 'ja' = 'vi'): string {
  const messages = {
    vi: `Xin lỗi, tôi chỉ có thể hỗ trợ các chủ đề liên quan đến học tiếng Nhật. Tôi được thiết kế chuyên biệt để hỗ trợ ôn thi JLPT, ngữ pháp tiếng Nhật, từ vựng, kanji và các tài liệu học tập liên quan.

Có điều gì về học tiếng Nhật mà tôi có thể giúp bạn không? 📚🇯🇵`,

    en: `I'm sorry, but I can only help with Japanese language learning topics. I'm specifically designed to assist with JLPT preparation, Japanese grammar, vocabulary, kanji, and related study materials.

Is there anything about learning Japanese that I can help you with instead? 📚🇯🇵`,

    ja: `申し訳ございませんが、日本語学習に関連するトピックのみお手伝いできます。私は特にJLPT準備、日本語文法、語彙、漢字、および関連する学習教材をサポートするよう設計されています。

代わりに、日本語学習について何かお手伝いできることはございますか？📚🇯🇵`,
  }

  return messages[language]
}

/**
 * Generate JLPT level validation error message
 */
export function generateJLPTValidationMessage(language: 'vi' | 'en' | 'ja' = 'vi'): string {
  const messages = {
    vi: `Xin lỗi, chỉ có các khóa học từ N1 đến N5 thôi. Hệ thống JLPT chỉ bao gồm 5 cấp độ:

📊 CÁC CẤP ĐỘ JLPT HỢP LỆ:
• N5 - Sơ cấp (Beginner)
• N4 - Cơ bản (Elementary) 
• N3 - Trung cấp sơ bộ (Pre-intermediate)
• N2 - Trung cấp (Intermediate)
• N1 - Cao cấp (Advanced)

Bạn có muốn tìm khóa học ở cấp độ nào trong số này không? 🎌`,

    en: `Sorry, we only have courses from N1 to N5. The JLPT system only includes 5 levels:

📊 VALID JLPT LEVELS:
• N5 - Beginner
• N4 - Elementary
• N3 - Pre-intermediate
• N2 - Intermediate
• N1 - Advanced

Would you like to find courses at any of these levels? 🎌`,

    ja: `申し訳ございませんが、N1からN5までのコースのみございます。JLPT制度には5つのレベルのみ含まれています：

📊 有効なJLPTレベル：
• N5 - 初級
• N4 - 初中級
• N3 - 中級前半
• N2 - 中級後半
• N1 - 上級

これらのレベルのいずれかでコースをお探しでしょうか？🎌`,
  }

  return messages[language]
}

/**
 * Detect language from query for appropriate error message
 */
export function detectLanguage(query: string): 'vi' | 'en' | 'ja' {
  const lowerQuery = query.toLowerCase()

  // Vietnamese indicators
  const viKeywords = ['tìm', 'khóa học', 'bài học', 'học tập', 'của tôi', 'có', 'được', 'làm']
  const hasVietnamese = viKeywords.some((keyword) => lowerQuery.includes(keyword))

  // Japanese indicators (hiragana, katakana, kanji)
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(query)

  // English indicators (if no Vietnamese or Japanese)
  if (hasJapanese) return 'ja'
  if (hasVietnamese) return 'vi'
  return 'en' // Default to English
}

/**
 * Validate query against domain constraints and JLPT levels
 */
export interface ValidationResult {
  isValid: boolean
  violationType: 'domain' | 'jlpt' | null
  errorMessage?: string
  suggestedResponse?: string
}

export function validateQuery(query: string): ValidationResult {
  // Check domain constraints
  if (!isJapaneseLearningQuery(query)) {
    const language = detectLanguage(query)
    return {
      isValid: false,
      violationType: 'domain',
      errorMessage: 'Query is not related to Japanese learning',
      suggestedResponse: generateDomainConstraintMessage(language),
    }
  }

  // Check JLPT level validation
  const jlptValidation = hasInvalidJLPTLevel(query)
  if (jlptValidation.hasInvalid) {
    const language = detectLanguage(query)
    return {
      isValid: false,
      violationType: 'jlpt',
      errorMessage: `Invalid JLPT levels found: ${jlptValidation.invalidLevels.join(', ')}`,
      suggestedResponse: generateJLPTValidationMessage(language),
    }
  }

  return {
    isValid: true,
    violationType: null,
  }
}

/**
 * Get combined system prompts for domain and JLPT validation
 */
export function getValidationPrompts(): string {
  return `${DOMAIN_CONSTRAINTS_PROMPT}

${JLPT_LEVEL_VALIDATION_PROMPT}

🎯 VALIDATION WORKFLOW:
1. Check if query is Japanese learning related
2. Check for invalid JLPT levels
3. If invalid, respond with appropriate error message
4. If valid, proceed with normal processing

CRITICAL: Always validate BEFORE calling any tools or processing the request!`
}
