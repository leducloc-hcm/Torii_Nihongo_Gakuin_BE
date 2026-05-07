import { QueryType } from "src/mcp-client/shared/query-detection.utils";
import { MCPToolResult } from "src/mcp-client/mcp.model";

export function buildFormatInstruction(
  queryType: string | undefined,
  results: MCPToolResult[],
): string | undefined {
  if (!queryType) {
    return undefined;
  }

  if (queryType === "COURSE" || queryType === QueryType.COURSE) {
    return `CRITICAL INSTRUCTION - READ CAREFULLY:

You MUST respond with ONLY the JSON code block below. NOTHING ELSE.

DO NOT write:
- "Đây là các khóa học..." ❌
- "Website có..." ❌
- "Bạn muốn..." ❌
- Any greeting, intro, or follow-up text ❌

Your ENTIRE response must be EXACTLY this format:

\`\`\`json
{
  "courses": [complete array of all course objects from tool result],
  "count": total number
}
\`\`\`

That's it. Nothing before the \`\`\`json. Nothing after the closing \`\`\`.

Include in each course: id, title, slug, level, thumbnailUrl, courseType, price, moduleCount, lessonCount
Use EXACT data from tool result - do not modify.`;
  }

  if (queryType === "BLOG" || queryType === QueryType.BLOG) {
    return `CRITICAL INSTRUCTION - READ CAREFULLY:

You MUST respond with ONLY the JSON code block below. NOTHING ELSE.

DO NOT write:
- "Tôi tìm thấy..." ❌
- "Dưới đây là..." ❌
- "Bạn muốn..." ❌
- Any greeting, intro, or follow-up text ❌

Your ENTIRE response must be EXACTLY this format:

\`\`\`json
{
  "blogs": [complete array of all blog objects from tool result],
  "count": total number
}
\`\`\`

That's it. Nothing before the \`\`\`json. Nothing after the closing \`\`\`.

Include in each blog: id, title, slug, date, image, excerpt, tags
Use EXACT data from tool result - do not modify.`;
  }

  if (queryType === "FLASHCARD" || queryType === QueryType.FLASHCARD) {
    const isFlashcardGeneration = results.some(
      (r) => r.toolName === "generate_flashcard_suggestions",
    );

    if (isFlashcardGeneration) {
      return `CRITICAL INSTRUCTION - FLASHCARD GENERATION FORMAT:

The tool generate_flashcard_suggestions has returned flashcard data.

You MUST format the response using this EXACT pattern:

📚 Đã tạo [COUNT] flashcards về [TOPIC] (cấp độ [LEVEL])!

**Thẻ 1:**
🔹 Mặt trước: [front]
🔸 Mặt sau: [back]
🔊 Phát âm: [pronunciation]
📝 Ví dụ: [example]
💡 Gợi ý nhớ: [hint]

**Thẻ 2:**
🔹 Mặt trước: [front]
🔸 Mặt sau: [back]
🔊 Phát âm: [pronunciation]
📝 Ví dụ: [example]
💡 Gợi ý nhớ: [hint]

(repeat for ALL cards - show EVERY card, no truncation!)

---

⚠️ **LƯU Ý QUAN TRỌNG:** Các flashcard này CHƯA được lưu vào hệ thống!
Bạn cần xác nhận để lưu vào tài khoản của mình.

[Tạo tất cả] [Chỉnh sửa] [Hủy]

MANDATORY RULES:
- ✅ MUST start each card with "**Thẻ [number]:**"
- ✅ MUST use emojis: 🔹 🔸 🔊 📝 💡
- ✅ MUST show ALL cards (no "...see more" or truncation)
- ✅ MUST include action buttons at the end
- ✅ MUST include "CHƯA được lưu" warning
- ❌ DO NOT use JSON format for generation!
- ❌ DO NOT say "decks": [] or "count": 0`;
    }

    return `CRITICAL INSTRUCTION - READ CAREFULLY:

You MUST respond with ONLY the JSON code block below. NOTHING ELSE.

DO NOT write:
- "Đây là bộ flashcard..." ❌
- "Website có..." ❌
- "Bạn muốn xem..." ❌
- Any greeting, intro, or follow-up text ❌

Your ENTIRE response must be EXACTLY this format:

\`\`\`json
{
  "decks": [complete array of all flashcard deck objects from tool result],
  "count": total number
}
\`\`\`

That's it. Nothing before the \`\`\`json. Nothing after the closing \`\`\`.

Include in each deck: id, title, level, card_count, owner_name, createdAt, updatedAt
Use EXACT data from tool result - do not modify.`;
  }

  if (queryType === "GRAMMAR" || queryType === QueryType.GRAMMAR) {
    return `The tool explain_grammar_personalized has returned a result.

MANDATORY — Do BOTH parts in order:

PART 1 — Write a SHORT, structured explanation (under 250 words) in the SAME language the user wrote in:
- Grammar point + level
- Meaning / usage
- Structure / conjugation pattern
- 2–3 example sentences (Japanese / romaji / translation)
- 1–2 common pitfalls (notes)

PART 2 — You MUST append this JSON block EXACTLY at the very end of your response (no text after it):

\`\`\`json
{"type":"grammar_explanation","grammar_point":"FILL","level":"FILL","meaning":"FILL","structure":"FILL","notes":"FILL","examples":[{"jp":"FILL","romaji":"FILL","translation":"FILL"},{"jp":"FILL","romaji":"FILL","translation":"FILL"},{"jp":"FILL","romaji":"FILL","translation":"FILL"}]}
\`\`\`

Replace every "FILL" with the actual value from the tool result. Use the inner explanation object fields.

RULES:
- ✅ The \`\`\`json block is REQUIRED — never omit it
- ✅ All examples must have jp, romaji, translation
- ✅ notes must be a string (join array items with " • " if array)
- ❌ Do NOT add any text after the closing \`\`\` fence`;
  }

  if (queryType === "TRANSLATION" || queryType === QueryType.TRANSLATION) {
    return `The tool translate_with_level_context has returned a result.

Do two things:
1. Write a short formatted response (clean translation → vocabulary table with ⚠️ for above-level words → grammar patterns → learning tip), responding in the same language the user wrote in.
2. After the explanation, output the raw tool result data inside a JSON code block like this:
\`\`\`json
{...the data object from the tool result...}
\`\`\`

IMPORTANT: The JSON code block MUST contain the inner data object (with fields: type, original_text, translation, vocabulary, grammar_patterns, learning_tip). Do not omit or modify any fields.`;
  }

  if (queryType === "ASSESSMENT" || queryType === QueryType.ASSESSMENT) {
    const toolResult = results[0]?.result;
    const data = toolResult?.data;
    const count = data?.count ?? data?.results?.length ?? 0;

    if (count === 0) {
      return `CRITICAL ANTI-HALLUCINATION RULE:

The assessment search tool returned 0 results (count = 0, results = []).

⛔ You MUST NOT invent, fabricate, or suggest ANY assessment names, IDs, or titles.
⛔ Do NOT write fake entries like "N3 Grammar Basics", "N3 Vocabulary Practice", etc.
⛔ Do NOT display any table, list, or numbered items for assessments that don't exist.

✅ Instead, respond ONLY with:
1. A short honest message (in the user's language) that no matching assessments are currently published.
2. Suggest what the user CAN do: e.g. ask an admin to publish assessments, try a different level/type, or explore other learning resources (courses, flashcards, blog posts).

DO NOT add any JSON block. DO NOT use tool calls. This is a text-only response.`;
    }

    return `CRITICAL INSTRUCTION — ASSESSMENT RESULTS:

The assessment search tool returned ${count} result(s). The data is in the tool result above.

YOU MUST:
✅ Use ONLY the IDs, titles, levels, and types from the tool result — no fabrication
✅ Respond with a JSON code block in this exact format:

\`\`\`json
{
  "type": "assessment_search",
  "results": [copy exact array from tool result],
  "count": ${count}
}
\`\`\`

✅ After the JSON block, you MAY add a short helpful note (2-3 lines max) in the user's language.

⛔ DO NOT invent assessment names or IDs not present in the tool result.
⛔ DO NOT include assessments that are not in the tool result data.`;
  }

  if (
    queryType === "ASSESSMENT_HISTORY" ||
    queryType === QueryType.ASSESSMENT_HISTORY
  ) {
    const toolResult = results[0]?.result;
    const data = toolResult?.data;
    const count =
      data?.count ?? data?.history?.length ?? data?.attempts?.length ?? 0;

    if (count === 0) {
      return `CRITICAL ANTI-HALLUCINATION RULE:

The assessment history tool returned 0 results (no submitted attempts found for this user).

⛔ You MUST NOT invent, fabricate, or guess any test scores, assessment names, or performance data.
⛔ Do NOT write fake scores like "80/100" or suggest specific weakness areas without real data.

✅ Instead, respond ONLY with:
1. An honest message (in the user's language) that the user has no completed assessments yet.
2. Encourage them to take their first assessment and suggest searching for available tests.

DO NOT add any JSON block. This is a text-only response.`;
    }

    return `CRITICAL INSTRUCTION — ASSESSMENT HISTORY:

The assessment history tool returned ${count} attempt record(s). Use ONLY this real data.

YOU MUST:
✅ Respond in the SAME language the user wrote in
✅ Summarize actual scores, dates, and performance from the tool result
✅ Highlight genuine weak areas if the data contains section scores
✅ Give learning suggestions based on ACTUAL low scores — do not invent gaps

⛔ DO NOT fabricate scores, test names, or weakness areas not present in the data.
⛔ DO NOT use placeholder data like "80/100" unless that exact number is in the tool result.`;
  }

  return undefined;
}
