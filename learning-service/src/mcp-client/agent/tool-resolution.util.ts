import { MCP_SERVERS } from "src/shared/config/mcp-servers.config";
import { ToolRegistryItem } from "src/mcp-client/agent/role-tools-policy.util";

export function shouldInjectUserId(toolName: string): boolean {
  const lowerToolName = toolName.toLowerCase();
  return (
    lowerToolName.includes("my_assessment") ||
    lowerToolName.includes("progress_summary") ||
    lowerToolName.includes("history") ||
    lowerToolName.includes("enrollment") ||
    lowerToolName.includes("my_") ||
    lowerToolName.includes("user_")
  );
}

export function resolveServerUrlForTool(
  toolName: string,
  toolRegistry: ToolRegistryItem[],
  enabledServerUrls: string[],
): string | null {
  const registryMatch = toolRegistry.find(
    (item) => item.tool.name === toolName,
  );
  if (registryMatch) {
    return registryMatch.serverUrl;
  }

  const lowerToolName = toolName.toLowerCase();

  if (lowerToolName.includes("course")) {
    return MCP_SERVERS.course.url;
  }

  if (
    lowerToolName.includes("enrollment") ||
    lowerToolName.includes("progress") ||
    lowerToolName.includes("learning")
  ) {
    return MCP_SERVERS.enrollment.url;
  }

  if (
    lowerToolName.includes("flashcard") ||
    lowerToolName.includes("deck") ||
    lowerToolName.includes("generate_flashcard")
  ) {
    return MCP_SERVERS.flashcard.url;
  }

  if (
    lowerToolName.includes("blog") ||
    lowerToolName.includes("post") ||
    lowerToolName.includes("article")
  ) {
    return MCP_SERVERS.blog.url;
  }

  if (
    lowerToolName.includes("my_assessment") ||
    lowerToolName.includes("attempt_result") ||
    lowerToolName.includes("progress_summary") ||
    lowerToolName.includes("history")
  ) {
    return MCP_SERVERS.assessmentHistory.url;
  }

  if (
    lowerToolName.includes("assessment") ||
    lowerToolName.includes("test") ||
    lowerToolName.includes("quiz") ||
    lowerToolName.includes("exam")
  ) {
    return MCP_SERVERS.assessment.url;
  }

  if (
    lowerToolName.includes("grammar") ||
    lowerToolName.includes("translate") ||
    lowerToolName.includes("explain") ||
    lowerToolName.includes("sensei") ||
    lowerToolName.includes("vocabulary") ||
    lowerToolName.includes("kanji") ||
    lowerToolName.includes("reading") ||
    lowerToolName.includes("listen")
  ) {
    return MCP_SERVERS.sensei.url;
  }

  return enabledServerUrls.length > 0 ? enabledServerUrls[0] : null;
}
