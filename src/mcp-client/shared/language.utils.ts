export enum Language {
  VIETNAMESE = 'vi',
  ENGLISH = 'en',
  JAPANESE = 'ja',
}

export function detectLanguage(text: string): Language {
  const vietnamesePattern = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
  if (vietnamesePattern.test(text)) {
    return Language.VIETNAMESE
  }

  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/
  if (japanesePattern.test(text)) {
    return Language.JAPANESE
  }
  return Language.ENGLISH
}

export function getLanguageName(lang: Language, inLanguage: Language = lang): string {
  const names = {
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
