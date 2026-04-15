import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

export interface GeneratedFlashcard {
  front: string;
  back: string;
  pronunciation?: string;
  example?: string;
  hint?: string;
  tags?: string[];
}

export interface FlashcardGenerationResult {
  success: boolean;
  flashcards?: GeneratedFlashcard[];
  metadata?: {
    topic: string;
    level: string;
    count: number;
    language: string;
  };
  error?: string;
}

@Injectable()
export class FlashcardGenerationService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>("OPENAI_API_KEY"),
    });
  }

  async generateFlashcards(
    topic: string,
    level: string,
    count: number = 20,
    language: string = "vi",
    prompt?: string,
  ): Promise<FlashcardGenerationResult> {
    try {
      const normalizedLevel = this.normalizeLevel(level);
      const normalizedLanguage = this.normalizeLanguage(language);
      const generationTopic = (prompt || topic || "").trim();

      if (!generationTopic) {
        return {
          success: false,
          error: "Missing topic/prompt for flashcard generation",
        };
      }

      console.log(
        `\n=== Generating ${count} flashcards for ${generationTopic} (${normalizedLevel}) ===`,
      );

      // Validate count
      if (count > 50) {
        count = 50;
        console.log("Count limited to 50");
      }

      if (count < 1) {
        count = 1;
      }

      // Language mapping
      const langName =
        {
          vi: "Vietnamese",
          en: "English",
          ja: "Japanese",
        }[normalizedLanguage] || "Vietnamese";

      const requestPrompt = `Create ${count} Japanese flashcards.

Learner request:
"${generationTopic}"

Constraints:
- Target JLPT level: ${normalizedLevel}
- Explanation language: ${langName}
- Include only content appropriate for JLPT ${normalizedLevel}
- Prefer practical words/phrases/grammar patterns used in real conversations and exams
- Keep front concise and unambiguous
- Keep back clear and easy to memorize
- pronunciation: hiragana preferred, fallback to romaji
- example: one short Japanese sentence + ${langName} translation in the same line
- hint: short mnemonic or usage cue
- tags: 1-4 short tags

Return STRICT JSON only, with this exact structure:
{
  "flashcards": [
    {
      "front": "...",
      "back": "...",
      "pronunciation": "...",
      "example": "...",
      "hint": "...",
      "tags": ["..."]
    }
  ]
}

Rules:
- No markdown
- No comments
- No extra keys
- Exactly ${count} items in flashcards
- Do not include empty front/back values`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert JLPT curriculum designer. Produce pedagogically sound Japanese flashcards and always return strict JSON only.",
          },
          { role: "user", content: requestPrompt },
        ],
        temperature: 0.4,
        max_tokens: 4000,
      });

      let flashcardsJson = response.choices[0].message.content?.trim() || "[]";

      // Clean up markdown code blocks if present
      if (flashcardsJson.startsWith("```")) {
        const lines = flashcardsJson.split("\n");
        flashcardsJson = lines.slice(1, -1).join("\n");
        if (flashcardsJson.startsWith("json")) {
          flashcardsJson = flashcardsJson.slice(4).trim();
        }
      }

      const parsed = this.extractJson(flashcardsJson);
      const rawCards = Array.isArray(parsed) ? parsed : parsed?.flashcards;
      const flashcards = this.normalizeFlashcards(rawCards, count);

      if (flashcards.length === 0) {
        return {
          success: false,
          error: "AI did not return valid flashcards",
        };
      }

      console.log(
        `✅ Generated ${flashcards.length} flashcards successfully\n`,
      );

      return {
        success: true,
        flashcards,
        metadata: {
          topic: generationTopic,
          level: normalizedLevel,
          count: flashcards.length,
          language: normalizedLanguage,
        },
      };
    } catch (error: any) {
      console.error("ERROR in generateFlashcards:", error);
      return {
        success: false,
        error: `Failed to generate flashcards: ${error.message}`,
      };
    }
  }

  private normalizeLevel(level: string): string {
    const normalized = (level || "").toUpperCase();
    return ["N5", "N4", "N3", "N2", "N1"].includes(normalized)
      ? normalized
      : "N5";
  }

  private normalizeLanguage(language: string): string {
    const normalized = (language || "").toLowerCase();
    return ["vi", "en", "ja"].includes(normalized) ? normalized : "vi";
  }

  private extractJson(raw: string): any {
    try {
      return JSON.parse(raw);
    } catch {
      const objectStart = raw.indexOf("{");
      const objectEnd = raw.lastIndexOf("}");
      if (objectStart !== -1 && objectEnd > objectStart) {
        return JSON.parse(raw.slice(objectStart, objectEnd + 1));
      }

      const arrayStart = raw.indexOf("[");
      const arrayEnd = raw.lastIndexOf("]");
      if (arrayStart !== -1 && arrayEnd > arrayStart) {
        return JSON.parse(raw.slice(arrayStart, arrayEnd + 1));
      }

      throw new Error("Unable to parse JSON from AI response");
    }
  }

  private normalizeFlashcards(
    rawCards: any,
    count: number,
  ): GeneratedFlashcard[] {
    if (!Array.isArray(rawCards)) {
      return [];
    }

    return rawCards
      .map((card: any) => {
        const front = String(card?.front || "").trim();
        const back = String(card?.back || "").trim();

        if (!front || !back) {
          return null;
        }

        const pronunciation = card?.pronunciation
          ? String(card.pronunciation).trim()
          : undefined;
        const example = card?.example ? String(card.example).trim() : undefined;
        const hint = card?.hint ? String(card.hint).trim() : undefined;
        const tags = Array.isArray(card?.tags)
          ? card.tags
              .map((tag: unknown) => String(tag).trim())
              .filter(Boolean)
              .slice(0, 4)
          : undefined;

        return {
          front,
          back,
          pronunciation,
          example,
          hint,
          tags,
        };
      })
      .filter(Boolean)
      .slice(0, count) as GeneratedFlashcard[];
  }

  formatFlashcardsForDisplay(
    flashcards: GeneratedFlashcard[],
    language: string = "vi",
  ): string {
    const messages = {
      vi: {
        title: "Các flashcard được tạo",
        front: "Mặt trước",
        back: "Mặt sau",
        pronunciation: "Phát âm",
        example: "Ví dụ",
        hint: "Gợi ý nhớ",
        tags: "Tags",
        actions: "✅ **Hành động:**\n[Tạo tất cả] [Chỉnh sửa] [Hủy]",
        warning:
          '⚠️ **LƯU Ý QUAN TRỌNG:**\n- Flashcards trên CHỈ là gợi ý từ AI\n- CHƯA được lưu vào database\n- Cần bấm "Tạo tất cả" để lưu vào hệ thống',
      },
      en: {
        title: "Generated flashcards",
        front: "Front",
        back: "Back",
        pronunciation: "Pronunciation",
        example: "Example",
        hint: "Hint",
        tags: "Tags",
        actions: "✅ **Actions:**\n[Create All] [Edit] [Cancel]",
        warning:
          '⚠️ **IMPORTANT NOTE:**\n- These are AI suggestions only\n- NOT saved to database yet\n- Click "Create All" to save',
      },
      ja: {
        title: "生成されたフラッシュカード",
        front: "表",
        back: "裏",
        pronunciation: "発音",
        example: "例",
        hint: "ヒント",
        tags: "タグ",
        actions: "✅ **アクション:**\n[すべて作成] [編集] [キャンセル]",
        warning:
          "⚠️ **重要な注意:**\n- これらはAIの提案のみです\n- まだデータベースに保存されていません\n- 保存するには「すべて作成」をクリックしてください",
      },
    };

    const msg = messages[language] || messages.vi;
    let output = `## ${msg.title}\n\n`;

    flashcards.forEach((card, index) => {
      output += `---\n**Thẻ ${index + 1}:**\n`;
      output += `🔹 ${msg.front}: ${card.front}\n`;
      output += `🔸 ${msg.back}: ${card.back}\n`;
      if (card.pronunciation)
        output += `🔊 ${msg.pronunciation}: ${card.pronunciation}\n`;
      if (card.example) output += `📝 ${msg.example}: ${card.example}\n`;
      if (card.hint) output += `💡 ${msg.hint}: ${card.hint}\n`;
      if (card.tags && card.tags.length > 0)
        output += `🏷️ ${msg.tags}: ${card.tags.join(", ")}\n`;
      output += `---\n\n`;
    });

    output += `\n${msg.actions}\n\n${msg.warning}\n`;

    return output;
  }
}
