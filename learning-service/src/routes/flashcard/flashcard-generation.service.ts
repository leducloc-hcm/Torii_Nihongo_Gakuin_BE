import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'

export interface GeneratedFlashcard {
  front: string
  back: string
  pronunciation?: string
  example?: string
  hint?: string
  tags?: string[]
}

export interface FlashcardGenerationResult {
  success: boolean
  flashcards?: GeneratedFlashcard[]
  metadata?: {
    topic: string
    level: string
    count: number
    language: string
  }
  error?: string
}

@Injectable()
export class FlashcardGenerationService {
  private openai: OpenAI

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    })
  }

  async generateFlashcards(
    topic: string,
    level: string,
    count: number = 20,
    language: string = 'vi',
  ): Promise<FlashcardGenerationResult> {
    try {
      console.log(`\n=== Generating ${count} flashcards for ${topic} (${level}) ===`)

      // Validate count
      if (count > 50) {
        count = 50
        console.log('Count limited to 50')
      }

      // Language mapping
      const langName =
        {
          vi: 'Vietnamese',
          en: 'English',
          ja: 'Japanese',
        }[language] || 'Vietnamese'

      const prompt = `Generate ${count} Japanese flashcards for the topic "${topic}" at ${level} level.

**Requirements:**
- Focus on ${topic} vocabulary/grammar/kanji appropriate for JLPT ${level}
- Provide meanings/explanations in ${langName}
- Include pronunciation in hiragana or romaji
- Add example sentences with translations
- Add relevant tags for categorization

**Output Format (JSON array):**
[
  {
    "front": "Japanese word/phrase/kanji",
    "back": "Meaning in ${langName}",
    "pronunciation": "Hiragana or Romaji reading",
    "example": "Example sentence in Japanese with ${langName} translation",
    "hint": "Helpful learning hints or mnemonic",
    "tags": ["tag1", "tag2", "tag3"]
  },
  ...
]

**Important:**
- Return ONLY valid JSON array
- No markdown code blocks
- No extra text or explanations
- Ensure all fields are properly formatted`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert Japanese language teacher specializing in creating effective flashcards for JLPT preparation.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      })

      let flashcardsJson = response.choices[0].message.content?.trim() || '[]'

      // Clean up markdown code blocks if present
      if (flashcardsJson.startsWith('```')) {
        const lines = flashcardsJson.split('\n')
        flashcardsJson = lines.slice(1, -1).join('\n')
        if (flashcardsJson.startsWith('json')) {
          flashcardsJson = flashcardsJson.slice(4).trim()
        }
      }

      const flashcards: GeneratedFlashcard[] = JSON.parse(flashcardsJson)

      console.log(`✅ Generated ${flashcards.length} flashcards successfully\n`)

      return {
        success: true,
        flashcards,
        metadata: {
          topic,
          level,
          count: flashcards.length,
          language,
        },
      }
    } catch (error) {
      console.error('ERROR in generateFlashcards:', error)
      return {
        success: false,
        error: `Failed to generate flashcards: ${error.message}`,
      }
    }
  }

  formatFlashcardsForDisplay(flashcards: GeneratedFlashcard[], language: string = 'vi'): string {
    const messages = {
      vi: {
        title: 'Các flashcard được tạo',
        front: 'Mặt trước',
        back: 'Mặt sau',
        pronunciation: 'Phát âm',
        example: 'Ví dụ',
        hint: 'Gợi ý nhớ',
        tags: 'Tags',
        actions: '✅ **Hành động:**\n[Tạo tất cả] [Chỉnh sửa] [Hủy]',
        warning:
          '⚠️ **LƯU Ý QUAN TRỌNG:**\n- Flashcards trên CHỈ là gợi ý từ AI\n- CHƯA được lưu vào database\n- Cần bấm "Tạo tất cả" để lưu vào hệ thống',
      },
      en: {
        title: 'Generated flashcards',
        front: 'Front',
        back: 'Back',
        pronunciation: 'Pronunciation',
        example: 'Example',
        hint: 'Hint',
        tags: 'Tags',
        actions: '✅ **Actions:**\n[Create All] [Edit] [Cancel]',
        warning:
          '⚠️ **IMPORTANT NOTE:**\n- These are AI suggestions only\n- NOT saved to database yet\n- Click "Create All" to save',
      },
      ja: {
        title: '生成されたフラッシュカード',
        front: '表',
        back: '裏',
        pronunciation: '発音',
        example: '例',
        hint: 'ヒント',
        tags: 'タグ',
        actions: '✅ **アクション:**\n[すべて作成] [編集] [キャンセル]',
        warning:
          '⚠️ **重要な注意:**\n- これらはAIの提案のみです\n- まだデータベースに保存されていません\n- 保存するには「すべて作成」をクリックしてください',
      },
    }

    const msg = messages[language] || messages.vi
    let output = `## ${msg.title}\n\n`

    flashcards.forEach((card, index) => {
      output += `---\n**Thẻ ${index + 1}:**\n`
      output += `🔹 ${msg.front}: ${card.front}\n`
      output += `🔸 ${msg.back}: ${card.back}\n`
      if (card.pronunciation) output += `🔊 ${msg.pronunciation}: ${card.pronunciation}\n`
      if (card.example) output += `📝 ${msg.example}: ${card.example}\n`
      if (card.hint) output += `💡 ${msg.hint}: ${card.hint}\n`
      if (card.tags && card.tags.length > 0) output += `🏷️ ${msg.tags}: ${card.tags.join(', ')}\n`
      output += `---\n\n`
    })

    output += `\n${msg.actions}\n\n${msg.warning}\n`

    return output
  }
}
