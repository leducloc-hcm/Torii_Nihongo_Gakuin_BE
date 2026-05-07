import { MCPToolResult } from "src/mcp-client/mcp.model";

export function tryBuildFastStructuredResponse(
  queryType: string | undefined,
  results: MCPToolResult[],
): string | undefined {
  if (!queryType || results.length === 0) {
    return undefined;
  }

  const hasFlashcardGeneration = results.some(
    (r) => r.toolName === "generate_flashcard_suggestions",
  );

  const type = queryType.toUpperCase();
  if (type === "FLASHCARD" && hasFlashcardGeneration) {
    return undefined;
  }

  if (type === "COURSE") {
    const courses = extractArrayFromToolResults(results, [
      "courses",
      "course_list",
      "items",
      "data",
    ]);
    if (!courses) {
      return undefined;
    }

    return toJsonCodeBlock({ courses, count: courses.length });
  }

  if (type === "BLOG") {
    const blogs = extractArrayFromToolResults(results, [
      "blogs",
      "posts",
      "articles",
      "items",
      "data",
    ]);
    if (!blogs) {
      return undefined;
    }

    return toJsonCodeBlock({ blogs, count: blogs.length });
  }

  if (type === "FLASHCARD") {
    const decks = extractArrayFromToolResults(results, [
      "decks",
      "flashcards",
      "items",
      "data",
    ]);
    if (!decks) {
      return undefined;
    }

    return toJsonCodeBlock({ decks, count: decks.length });
  }

  if (type === "ASSESSMENT") {
    const assessments = extractArrayFromToolResults(results, [
      "results",
      "assessments",
      "items",
      "data",
    ]);

    if (!assessments) {
      return undefined;
    }

    return toJsonCodeBlock({
      type: "assessment_search",
      results: assessments,
      count: assessments.length,
    });
  }

  if (type === "ENROLLMENT") {
    const enrollments = extractArrayFromToolResults(results, [
      "enrollments",
      "courses",
      "items",
      "data",
    ]);

    if (!enrollments) {
      return undefined;
    }

    return toJsonCodeBlock({ enrollments, count: enrollments.length });
  }

  return undefined;
}

function extractArrayFromToolResults(
  results: MCPToolResult[],
  candidateKeys: string[],
): any[] | undefined {
  for (const result of results) {
    const payload = result.result;
    if (!payload || typeof payload !== "object") {
      continue;
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    for (const key of candidateKeys) {
      const value = (payload as Record<string, any>)[key];
      if (Array.isArray(value)) {
        return value;
      }
    }

    const nestedData = (payload as Record<string, any>).data;
    if (nestedData && typeof nestedData === "object") {
      if (Array.isArray(nestedData)) {
        return nestedData;
      }

      for (const key of candidateKeys) {
        const value = (nestedData as Record<string, any>)[key];
        if (Array.isArray(value)) {
          return value;
        }
      }
    }
  }

  return undefined;
}

function toJsonCodeBlock(payload: Record<string, any>): string {
  return `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}
