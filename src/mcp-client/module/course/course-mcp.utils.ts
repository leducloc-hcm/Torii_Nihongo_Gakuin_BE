export enum Language {
  VIETNAMESE = 'vi',
  ENGLISH = 'en',
  JAPANESE = 'ja',
}

export function detectLanguage(text: string): Language {
  if (!text || text.trim().length === 0) {
    return Language.ENGLISH // Default to English
  }

  const cleanText = text.toLowerCase().trim()

  // Vietnamese detection - check for common Vietnamese words and diacritics
  const vietnamesePatterns = [
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/,
    /\b(tôi|bạn|của|và|với|là|có|không|được|cho|từ|đến|về|trong|ngoài|trên|dưới|giữa|sau|trước|khóa|học|tiếng|nhật|người|việt)\b/,
  ]

  // Japanese detection - check for hiragana, katakana, and kanji
  const japanesePatterns = [
    /[\u3040-\u309F]/, // Hiragana
    /[\u30A0-\u30FF]/, // Katakana
    /[\u4E00-\u9FAF]/, // Kanji (common)
    /[\uFF66-\uFF9F]/, // Half-width katakana
  ]

  // Count matches for each language
  let vietnameseScore = 0
  let japaneseScore = 0

  // Check Vietnamese patterns
  for (const pattern of vietnamesePatterns) {
    if (pattern.test(cleanText)) {
      vietnameseScore++
    }
  }

  // Check Japanese patterns
  for (const pattern of japanesePatterns) {
    if (pattern.test(text)) {
      // Use original text for Japanese detection
      japaneseScore++
    }
  }

  // Determine language based on scores
  if (vietnameseScore > 0 && vietnameseScore >= japaneseScore) {
    return Language.VIETNAMESE
  }

  if (japaneseScore > 0) {
    return Language.JAPANESE
  }

  return Language.ENGLISH
}

export function getLanguageName(lang: Language, inLanguage: Language = Language.ENGLISH): string {
  const names: Record<Language, Record<Language, string>> = {
    [Language.VIETNAMESE]: {
      [Language.VIETNAMESE]: 'Tiếng Việt',
      [Language.ENGLISH]: 'Vietnamese',
      [Language.JAPANESE]: 'ベトナム語',
    },
    [Language.ENGLISH]: {
      [Language.VIETNAMESE]: 'Tiếng Anh',
      [Language.ENGLISH]: 'English',
      [Language.JAPANESE]: '英語',
    },
    [Language.JAPANESE]: {
      [Language.VIETNAMESE]: 'Tiếng Nhật',
      [Language.ENGLISH]: 'Japanese',
      [Language.JAPANESE]: '日本語',
    },
  }

  return names[lang]?.[inLanguage] || 'Unknown'
}
