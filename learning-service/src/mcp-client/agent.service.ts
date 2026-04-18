import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
import { McpBaseService } from "src/mcp-client/mcp-client.service";
import {
  AgentResponse,
  ClaudeMessageParam,
  ClaudeTool,
  ExecuteToolsRequest,
  ExecuteToolsResponse,
  FastMCPResult,
  MCPToolResult,
  transformMCPToolToClaude,
} from "src/mcp-client/mcp.model";
import { CourseMcpClient } from "src/mcp-client/module/course/course-mcp.service";
import { EnrollmentMcpClient } from "src/mcp-client/module/enrollment/enrollment-mcp.service";
import { ASSESSMENT_MCP_PROMPT } from "src/mcp-client/module/assessment/assessment-mcp.prompt";
import {
  ASSESSMENT_HISTORY_MCP_PROMPT,
  getAssessmentHistoryPrompt,
} from "src/mcp-client/module/assessment_history/history-mcp.prompt";
import { QueryType } from "src/mcp-client/shared/query-detection.utils";
import {
  validateQuery,
  getValidationPrompts,
  detectLanguage,
} from "src/mcp-client/shared/validation.utils";
import {
  getEnabledMCPServers,
  MCP_SERVERS,
} from "src/shared/config/mcp-servers.config";
import { CLAUDE_CONFIG } from "src/shared/config/claude.config";
import { AgentRole } from "src/mcp-client/shared/agent-routing.utils";
import { getAgentRolePrompt } from "src/mcp-client/prompts/agent-role.prompt";

interface ToolRegistryItem {
  serverKey: string;
  serverUrl: string;
  tool: ClaudeTool;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly anthropic: Anthropic;
  private allTools: ClaudeTool[] = [];
  private toolRegistry: ToolRegistryItem[] = [];
  private toolsLoaded = false;
  private readonly roleServerPolicies: Record<
    AgentRole,
    { allowedServers: string[]; fallbackServers: string[] }
  > = {
    [AgentRole.SENSEI]: {
      allowedServers: ["sensei", "course", "flashcard", "blog"],
      fallbackServers: ["enrollment"],
    },
    [AgentRole.ASSESSMENT]: {
      allowedServers: ["assessment", "assessmentHistory"],
      fallbackServers: ["course"],
    },
    [AgentRole.ANALYTICS]: {
      allowedServers: ["enrollment", "assessmentHistory"],
      fallbackServers: ["course"],
    },
  };

  constructor(
    private readonly mcpBase: McpBaseService,
    private readonly courseMcp: CourseMcpClient,
    private readonly enrollmentMcp: EnrollmentMcpClient,
  ) {
    const runtimeApiKey = (process.env.CLAUDE_API_KEY || CLAUDE_CONFIG.apiKey)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!runtimeApiKey) {
      throw new Error(
        "CLAUDE_API_KEY is missing. Please set CLAUDE_API_KEY in learning-service/.env and restart the service.",
      );
    }

    this.anthropic = new Anthropic({
      apiKey: runtimeApiKey,
    });
  }

  private getRuntimeModel(): string {
    return (
      process.env.CLAUDE_MODEL ||
      CLAUDE_CONFIG.model ||
      "claude-sonnet-4-6"
    )
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }

  /**
   * Load all available tools from MCP servers
   */
  async loadTools(): Promise<void> {
    if (this.toolsLoaded) return;

    //this.logger.log('Loading tools from MCP servers...')
    const tools: ClaudeTool[] = [];
    const registry: ToolRegistryItem[] = [];

    try {
      for (const [serverKey, server] of Object.entries(MCP_SERVERS)) {
        if (!server.enabled) {
          continue;
        }

        try {
          const mcpTools = await this.mcpBase.listTools(server.url);
          const claudeTools = mcpTools.map(transformMCPToolToClaude);
          tools.push(...claudeTools);
          for (const tool of claudeTools) {
            registry.push({
              serverKey,
              serverUrl: server.url,
              tool,
            });
          }
          //this.logger.log(`Loaded ${claudeTools.length} tools from ${server.name}`)
        } catch (error) {
          //this.logger.error(`Failed to load tools from ${server.name}:`, error.message)
        }
      }

      this.allTools = tools;
      this.toolRegistry = registry;
      this.toolsLoaded = true;
      //this.logger.log(`Total tools loaded: ${tools.length}`)
    } catch (error) {
      //this.logger.error('Failed to load MCP tools:', error)
    }
  }

  /**
   * Helper: Extract system prompt strings from messages, separating them from user/assistant messages.
   * Anthropic requires system to be a top-level parameter, not in the messages array.
   */
  private extractSystemAndMessages(
    messages: ClaudeMessageParam[],
    extraSystemParts: string[] = [],
  ): { system: string; userMessages: ClaudeMessageParam[] } {
    const systemParts: string[] = [...extraSystemParts];
    const userMessages: ClaudeMessageParam[] = [];

    for (const msg of messages) {
      if ((msg as any).role === "system") {
        // Extract system content
        const content = (msg as any).content;
        if (typeof content === "string") {
          systemParts.push(content);
        }
      } else {
        userMessages.push(msg);
      }
    }

    return {
      system: systemParts.join("\n\n"),
      userMessages,
    };
  }

  async getResponse(
    messages: ClaudeMessageParam[],
    useTools = true,
    forceTools = false,
    originalQuery?: string,
    agentRole?: AgentRole,
    collaboratorRoles: AgentRole[] = [],
    queryType?: string,
  ): Promise<AgentResponse> {
    if (!this.toolsLoaded) {
      await this.loadTools();
    }

    // 🔒 VALIDATION: Check domain constraints and JLPT levels
    if (originalQuery) {
      const validation = validateQuery(originalQuery);
      if (!validation.isValid && validation.suggestedResponse) {
        //this.logger.warn(`❌ Query validation failed: ${validation.errorMessage}`)
        return {
          content: validation.suggestedResponse,
          requiresApproval: false,
          finishReason: "stop",
        };
      }
    }

    // 🎯 INJECT VALIDATION PROMPTS: Add domain and JLPT validation prompts
    const validationPrompts = getValidationPrompts();
    const rolePrompt = getAgentRolePrompt(agentRole || AgentRole.SENSEI);

    // Build system parts (Anthropic requires system as a top-level param)
    const systemParts: string[] = [rolePrompt, validationPrompts];

    if (collaboratorRoles.length > 0) {
      systemParts.unshift(
        `Collaborator roles available: ${collaboratorRoles.join(", ")}. Use tools and responses that stay consistent with the primary role while considering collaborator context when needed.`,
      );
    }

    // Separate system messages from user/assistant messages
    const { system, userMessages } = this.extractSystemAndMessages(
      messages,
      systemParts,
    );

    try {
      const routedTools = this.getToolsForRole(agentRole, collaboratorRoles);

      // For GRAMMAR/TRANSLATION, lock the tool choice to the single relevant tool
      // but only if the tool actually exists in routedTools (sensei MCP must be reachable)
      let toolChoice: Anthropic.Messages.ToolChoice | undefined = undefined;
      if (useTools && routedTools.length > 0) {
        const toolExists = (name: string) =>
          routedTools.some((t) => t.name === name);

        if (
          queryType === "GRAMMAR" &&
          toolExists("explain_grammar_personalized")
        ) {
          toolChoice = {
            type: "tool",
            name: "explain_grammar_personalized",
          };
        } else if (
          queryType === "TRANSLATION" &&
          toolExists("translate_with_level_context")
        ) {
          toolChoice = {
            type: "tool",
            name: "translate_with_level_context",
          };
        } else {
          toolChoice = forceTools ? { type: "any" } : { type: "auto" };
        }
      }

      const runtimeModel = this.getRuntimeModel();
      if (!runtimeModel) {
        throw new Error(
          "CLAUDE_MODEL is missing. Please set CLAUDE_MODEL in learning-service/.env and restart the service.",
        );
      }

      const completionOptions: Anthropic.Messages.MessageCreateParamsNonStreaming =
        {
          model: runtimeModel,
          system,
          messages: userMessages,
          tools: useTools && routedTools.length > 0 ? routedTools : undefined,
          tool_choice: toolChoice,
          temperature: CLAUDE_CONFIG.temperature,
          max_tokens: CLAUDE_CONFIG.maxTokens,
        };

      const response = await this.anthropic.messages.create(completionOptions);

      // Extract text content and tool_use blocks from response
      const textContent = response.content
        .filter(
          (block): block is Anthropic.Messages.TextBlock =>
            block.type === "text",
        )
        .map((block) => block.text)
        .join("");

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock =>
          block.type === "tool_use",
      );

      if (toolUseBlocks.length > 0) {
        return {
          content: textContent || null,
          toolCalls: toolUseBlocks.map((tc) => ({
            id: tc.id,
            name: tc.name,
            arguments: JSON.stringify(tc.input),
          })),
          requiresApproval: false,
          finishReason:
            response.stop_reason === "tool_use"
              ? "tool_calls"
              : (response.stop_reason as any),
        };
      }

      return {
        content: textContent || null,
        requiresApproval: false,
        finishReason:
          response.stop_reason === "end_turn"
            ? "stop"
            : (response.stop_reason as any),
      };
    } catch (error) {
      ////this.logger.error('Claude API error:', error)
      const message = error instanceof Error ? error.message : String(error);

      const isInvalidApiKeyError =
        /invalid.*api.key/i.test(message) ||
        /authentication/i.test(message) ||
        (/\b401\b/.test(message) && /api.key/i.test(message));

      const isPermissionError =
        /permission/i.test(message) ||
        /forbidden/i.test(message) ||
        /\b403\b/.test(message);

      if (isInvalidApiKeyError) {
        const lang = originalQuery ? detectLanguage(originalQuery) : "vi";

        const localizedMessage =
          lang === "ja"
            ? "Claude APIキーが無効、期限切れ、または無効化されています。管理者に有効なCLAUDE_API_KEYへ更新してサービスを再起動してもらってください。"
            : lang === "en"
              ? "The Claude API key is invalid, expired, or revoked. Please ask your admin to update CLAUDE_API_KEY and restart the service."
              : "Claude API key hiện tại không hợp lệ, đã hết hạn, hoặc đã bị thu hồi. Vui lòng cập nhật CLAUDE_API_KEY hợp lệ và khởi động lại service.";

        return {
          content: localizedMessage,
          requiresApproval: false,
          finishReason: "stop",
        };
      }

      if (isPermissionError) {
        const lang = originalQuery ? detectLanguage(originalQuery) : "vi";

        const localizedMessage =
          lang === "ja"
            ? "現在のClaude APIキーには必要な権限がありません。管理者に、APIキーの権限を確認してもらってください。"
            : lang === "en"
              ? "The current Claude API key does not have the required permissions. Please ask your admin to check the API key permissions."
              : "API key Claude hiện tại chưa có quyền cần thiết. Vui lòng kiểm tra quyền của API key.";

        return {
          content: localizedMessage,
          requiresApproval: false,
          finishReason: "stop",
        };
      }

      throw new Error(`AI service error: ${message}`);
    }
  }

  async executeApprovedTools(
    request: ExecuteToolsRequest,
  ): Promise<ExecuteToolsResponse> {
    const results: MCPToolResult[] = [];

    if (request.toolCalls.length > 1) {
      //this.logger.log(
      //  `Executing ${request.toolCalls.length} tools in parallel: ${request.toolCalls.map((tc) => tc.name).join(', ')}`,
      //)
    }

    const toolCallsStartTime = Date.now();
    const toolPromises = request.toolCalls.map(async (toolCall) => {
      try {
        const result = await this.executeToolCall(
          toolCall.name,
          toolCall.arguments,
          request.userId,
        );
        if (result.result) {
          //this.logger.log(`  Result preview: ${JSON.stringify(result.result).substring(0, 200)}...`)
        }
        //this.logger.log(`=== Tool ${toolCall.name} completed ===\n`)

        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: result.result,
          error: result.error,
          executedAt: result.executedAt,
        };
      } catch (error) {
        //this.logger.error(`Failed to execute tool ${toolCall.name}:`, error.message)
        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          result: null,
          error: error instanceof Error ? error.message : String(error),
          executedAt: new Date(),
        };
      }
    });

    results.push(...(await Promise.all(toolPromises)));
    const toolCallsTime = Date.now() - toolCallsStartTime;
    //this.logger.log(`⏱️  Tool calls completed in ${toolCallsTime}ms`)

    const fastResponse = this.tryBuildFastStructuredResponse(
      request.queryType,
      results,
    );

    if (fastResponse) {
      this.logger.log(
        `⚡ Fast-path response generated for queryType=${request.queryType} (skip second Claude call).`,
      );
      return {
        results,
        finalResponse: fastResponse,
        hasMoreTools: false,
      };
    }

    // Build tool_result messages for Claude
    // Anthropic format: user message with tool_result content blocks
    const toolResultContents: Anthropic.Messages.ToolResultBlockParam[] =
      results.map((result) => ({
        type: "tool_result" as const,
        tool_use_id: result.toolCallId,
        content: result.error || JSON.stringify(result.result),
      }));

    // Build the assistant message that contains the tool_use blocks
    const assistantToolUseContent: Anthropic.Messages.ContentBlockParam[] =
      request.toolCalls.map((tc) => ({
        type: "tool_use" as const,
        id: tc.id,
        name: tc.name,
        input: tc.arguments,
      }));

    // Build message chain: existing messages + assistant(tool_use) + user(tool_result)
    const existingMessages = (request.messages || []).filter(
      (m) => (m as any).role !== "system",
    );

    const messages: ClaudeMessageParam[] = [
      ...existingMessages,
      {
        role: "assistant",
        content: assistantToolUseContent,
      } as ClaudeMessageParam,
      {
        role: "user",
        content: toolResultContents,
      } as ClaudeMessageParam,
    ];

    // Build system prompt parts
    const systemParts: string[] = [];

    // Add format instructions based on query type before final response
    //this.logger.log(`🔍 QueryType for final response: "${request.queryType}" (type: ${typeof request.queryType})`)

    // Inject module-specific system prompt for ASSESSMENT or ASSESSMENT_HISTORY
    if (
      request.queryType === "ASSESSMENT" ||
      request.queryType === QueryType.ASSESSMENT
    ) {
      //this.logger.log('📋 Injecting ASSESSMENT module system prompt')
      systemParts.push(ASSESSMENT_MCP_PROMPT);
    } else if (
      request.queryType === "ASSESSMENT_HISTORY" ||
      request.queryType === QueryType.ASSESSMENT_HISTORY
    ) {
      //this.logger.log('📊 Injecting ASSESSMENT_HISTORY module system prompt')
      systemParts.push(
        getAssessmentHistoryPrompt(
          QueryType.ASSESSMENT_HISTORY,
          request.userId,
        ),
      );
    }

    // 🔒 INJECT VALIDATION PROMPTS
    const validationPrompts = getValidationPrompts();
    const resolvedRole =
      request.agentRole === AgentRole.ASSESSMENT ||
      request.agentRole === AgentRole.ANALYTICS ||
      request.agentRole === AgentRole.SENSEI
        ? (request.agentRole as AgentRole)
        : AgentRole.SENSEI;

    const rolePrompt = getAgentRolePrompt(resolvedRole);
    systemParts.unshift(validationPrompts);
    systemParts.unshift(rolePrompt);

    // Extract any system messages from existing messages
    const { system: existingSystem, userMessages: cleanMessages } =
      this.extractSystemAndMessages(messages, systemParts);

    // Add user instructions for specific query types
    let formatInstruction: string | undefined;

    if (
      request.queryType === "COURSE" ||
      request.queryType === QueryType.COURSE
    ) {
      //this.logger.log('📋 Adding COURSE format instructions to messages')
      formatInstruction = `CRITICAL INSTRUCTION - READ CAREFULLY:

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
    } else if (
      request.queryType === "BLOG" ||
      request.queryType === QueryType.BLOG
    ) {
      //this.logger.log('📋 Adding BLOG format instructions to messages')
      formatInstruction = `CRITICAL INSTRUCTION - READ CAREFULLY:

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
    } else if (
      request.queryType === "FLASHCARD" ||
      request.queryType === QueryType.FLASHCARD
    ) {
      //this.logger.log('📋 Adding FLASHCARD format instructions to messages')

      // Check if this is a generation request
      const isFlashcardGeneration = results.some(
        (r) => r.toolName === "generate_flashcard_suggestions",
      );

      if (isFlashcardGeneration) {
        //this.logger.log('🎴 Flashcard GENERATION detected - using formatted text response')
        formatInstruction = `CRITICAL INSTRUCTION - FLASHCARD GENERATION FORMAT:

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
      } else {
        //this.logger.log('🔍 Flashcard SEARCH detected - using JSON format')
        formatInstruction = `CRITICAL INSTRUCTION - READ CAREFULLY:

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
    } else if (
      request.queryType === "GRAMMAR" ||
      request.queryType === QueryType.GRAMMAR
    ) {
      formatInstruction = `The tool explain_grammar_personalized has returned a result.

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
    } else if (
      request.queryType === "TRANSLATION" ||
      request.queryType === QueryType.TRANSLATION
    ) {
      formatInstruction = `The tool translate_with_level_context has returned a result.

Do two things:
1. Write a short formatted response (clean translation → vocabulary table with ⚠️ for above-level words → grammar patterns → learning tip), responding in the same language the user wrote in.
2. After the explanation, output the raw tool result data inside a JSON code block like this:
\`\`\`json
{...the data object from the tool result...}
\`\`\`

IMPORTANT: The JSON code block MUST contain the inner data object (with fields: type, original_text, translation, vocabulary, grammar_patterns, learning_tip). Do not omit or modify any fields.`;
    } else if (
      request.queryType !== "ASSESSMENT" &&
      request.queryType !== QueryType.ASSESSMENT &&
      request.queryType !== "ASSESSMENT_HISTORY" &&
      request.queryType !== QueryType.ASSESSMENT_HISTORY &&
      request.queryType !== "COURSE" &&
      request.queryType !== QueryType.COURSE &&
      request.queryType !== "BLOG" &&
      request.queryType !== QueryType.BLOG &&
      request.queryType !== "FLASHCARD" &&
      request.queryType !== QueryType.FLASHCARD
    ) {
      //this.logger.warn(`⚠️ No format instructions added - queryType was: "${request.queryType}"`)
    }

    // If we have format instructions, append to last user message
    if (formatInstruction) {
      cleanMessages.push({
        role: "user",
        content: formatInstruction,
      });
    }

    const runtimeModel = this.getRuntimeModel();
    if (!runtimeModel) {
      return {
        results,
        finalResponse: undefined,
        hasMoreTools: false,
      };
    }

    const finalCompletionOptions: Anthropic.Messages.MessageCreateParamsNonStreaming =
      {
        model: runtimeModel,
        system: existingSystem,
        messages: cleanMessages,
        temperature: CLAUDE_CONFIG.temperature,
        max_tokens: CLAUDE_CONFIG.maxTokens,
      };

    try {
      //this.logger.log('🔄 Calling Claude with tool results...')
      const claudeStartTime = Date.now();

      const finalResponse = await this.anthropic.messages.create(
        finalCompletionOptions,
      );

      const claudeTime = Date.now() - claudeStartTime;
      //this.logger.log(`✅ Claude response received in ${claudeTime}ms`)

      // Extract text from content blocks
      const responseText = finalResponse.content
        .filter(
          (block): block is Anthropic.Messages.TextBlock =>
            block.type === "text",
        )
        .map((block) => block.text)
        .join("");

      const hasMoreToolUse = finalResponse.content.some(
        (block) => block.type === "tool_use",
      );

      if (!responseText) {
        //this.logger.warn('⚠️ Claude returned empty content in final response')
      } else {
        //this.logger.log(`✅ Final response: ${responseText.substring(0, 200)}...`)
      }

      return {
        results,
        finalResponse: responseText || undefined,
        hasMoreTools: hasMoreToolUse,
      };
    } catch (error) {
      //this.logger.error('❌ Failed to get final response from Claude:', error.message)

      // Return results but with no final response
      return {
        results,
        finalResponse: undefined,
        hasMoreTools: false,
      };
    }
  }

  private async executeToolCall(
    toolName: string,
    args: Record<string, any>,
    userId?: number,
  ): Promise<MCPToolResult> {
    // Determine which MCP server to use based on tool name
    const serverUrl = this.getServerUrlForTool(toolName);

    if (!serverUrl) {
      throw new Error(`No MCP server found for tool: ${toolName}`);
    }

    // Auto-inject user_id for tools that require authenticated user context
    const lowerToolName = toolName.toLowerCase();
    const requiresUserId =
      lowerToolName.includes("my_assessment") ||
      lowerToolName.includes("progress_summary") ||
      lowerToolName.includes("history") ||
      lowerToolName.includes("enrollment") ||
      lowerToolName.includes("my_") || // Any "my_*" tool requires user_id
      lowerToolName.includes("user_");

    if (requiresUserId && userId) {
      // ALWAYS override user_id with authenticated userId to prevent security issues
      if (args.user_id && args.user_id !== userId) {
        //this.logger.warn(
        //  `⚠️  Overriding user_id=${args.user_id} with authenticated userId=${userId} for tool: ${toolName}`,
        //)
      } else {
        //this.logger.log(`🔐 Auto-injecting user_id=${userId} for tool: ${toolName}`)
      }
      args = { ...args, user_id: userId };
    }

    //this.logger.debug(`Calling MCP server: ${serverUrl}`)
    //this.logger.debug(`Tool: ${toolName}, Args: ${JSON.stringify(args)}`)

    const result: FastMCPResult = await this.mcpBase.executeTool(
      serverUrl,
      toolName,
      args,
    );

    //this.logger.debug(`MCP Response:`)
    //this.logger.debug(`  Success: ${result.success}`)
    //this.logger.debug(`  Error: ${result.error || 'none'}`)
    //this.logger.debug(`  Data: ${result.data ? JSON.stringify(result.data).substring(0, 300) : 'null'}`)

    return {
      toolCallId: "", // Will be set by the caller
      toolName: toolName,
      result: result.success ? result.data : null,
      error: result.error || undefined,
      executedAt: new Date(),
    };
  }

  private getServerUrlForTool(toolName: string): string | null {
    const registryMatch = this.toolRegistry.find((item) => {
      return item.tool.name === toolName;
    });

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

    // Assessment History tools (user's past attempts, progress, results)
    if (
      lowerToolName.includes("my_assessment") ||
      lowerToolName.includes("attempt_result") ||
      lowerToolName.includes("progress_summary") ||
      lowerToolName.includes("history")
    ) {
      return MCP_SERVERS.assessmentHistory.url;
    }

    // Assessment Search tools (find available tests/exams)
    if (
      lowerToolName.includes("assessment") ||
      lowerToolName.includes("test") ||
      lowerToolName.includes("quiz") ||
      lowerToolName.includes("exam")
    ) {
      return MCP_SERVERS.assessment.url;
    }

    // Default to first enabled server
    const enabledServers = getEnabledMCPServers();
    return enabledServers.length > 0 ? enabledServers[0].url : null;
  }

  getAvailableTools(): ClaudeTool[] {
    return this.allTools;
  }

  private tryBuildFastStructuredResponse(
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
      const courses = this.extractArrayFromToolResults(results, [
        "courses",
        "course_list",
        "items",
        "data",
      ]);
      if (!courses) {
        return undefined;
      }

      return this.toJsonCodeBlock({ courses, count: courses.length });
    }

    if (type === "BLOG") {
      const blogs = this.extractArrayFromToolResults(results, [
        "blogs",
        "posts",
        "articles",
        "items",
        "data",
      ]);
      if (!blogs) {
        return undefined;
      }

      return this.toJsonCodeBlock({ blogs, count: blogs.length });
    }

    if (type === "FLASHCARD") {
      const decks = this.extractArrayFromToolResults(results, [
        "decks",
        "flashcards",
        "items",
        "data",
      ]);
      if (!decks) {
        return undefined;
      }

      return this.toJsonCodeBlock({ decks, count: decks.length });
    }

    if (type === "ASSESSMENT") {
      const assessments = this.extractArrayFromToolResults(results, [
        "results",
        "assessments",
        "items",
        "data",
      ]);

      if (!assessments) {
        return undefined;
      }

      return this.toJsonCodeBlock({
        type: "assessment_search",
        results: assessments,
        count: assessments.length,
      });
    }

    return undefined;
  }

  private extractArrayFromToolResults(
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

  private toJsonCodeBlock(payload: Record<string, any>): string {
    return `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
  }

  private getToolsForRole(
    primaryRole?: AgentRole,
    collaboratorRoles: AgentRole[] = [],
  ): ClaudeTool[] {
    if (!primaryRole && collaboratorRoles.length === 0) {
      return this.allTools;
    }

    const targetRoles = [primaryRole, ...collaboratorRoles].filter(
      (role): role is AgentRole => !!role,
    );

    const allowedServers = new Set<string>();
    const fallbackServers = new Set<string>();

    for (const role of targetRoles) {
      const policy = this.roleServerPolicies[role];
      if (!policy) {
        continue;
      }

      for (const server of policy.allowedServers) {
        allowedServers.add(server);
      }

      for (const server of policy.fallbackServers) {
        fallbackServers.add(server);
      }
    }

    if (allowedServers.size === 0 && fallbackServers.size === 0) {
      return this.allTools;
    }

    const allowedTools = this.toolRegistry
      .filter((item) => allowedServers.has(item.serverKey))
      .map((item) => item.tool);

    const fallbackTools = this.toolRegistry
      .filter((item) => fallbackServers.has(item.serverKey))
      .map((item) => item.tool);

    const seenToolNames = new Set<string>();
    const filteredTools = [...allowedTools, ...fallbackTools].filter((tool) => {
      if (seenToolNames.has(tool.name)) {
        return false;
      }

      seenToolNames.add(tool.name);
      return true;
    });

    if (filteredTools.length === 0) {
      this.logger.warn(
        `No server-policy tools matched for roles [${targetRoles.join(", ")}]. Falling back to full toolset (${this.allTools.length} tools).`,
      );
      return this.allTools;
    }

    this.logger.log(
      `Primary role ${primaryRole || "N/A"} with collaborators [${collaboratorRoles.join(", ") || "none"}] using ${filteredTools.length}/${this.allTools.length} tools.`,
    );
    return filteredTools;
  }
}
